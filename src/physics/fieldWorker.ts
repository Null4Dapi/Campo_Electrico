import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

type WorkerChargeInput = {
  position: [number, number, number];
  value: number;
};

type WorkerInput = {
  charges: WorkerChargeInput[];
  resolution: number;
  limits: number;
  center: [number, number, number];
};

let marchingCubes: InstanceType<typeof MarchingCubes> | null = null;

type WorkerScope = {
  onmessage: (event: MessageEvent<WorkerInput>) => void;
  postMessage: (message: {
    positions: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
  }, transfer?: Transferable[]) => void;
};

const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { charges, resolution, limits, center } = e.data;
  console.log("Worker input:", { charges, resolution, limits, center });

  // Validación de seguridad para evitar cálculos vacíos
  if (!charges || charges.length === 0) {
    console.log("Worker: charges is empty, returning empty buffers");
    self.postMessage({
      positions: new Float32Array(0),
      normals: new Float32Array(0),
      colors: new Float32Array(0)
    });
    return;
  }

  if (!marchingCubes || marchingCubes.resolution !== resolution) {
    marchingCubes = new MarchingCubes(resolution, { flatShading: false } as any, false, false, 800000);
  }

  marchingCubes.reset();

  // 1. Rellenar el campo escalar con el potencial eléctrico optimizado
  const SOFTENING = 1e-10;
  const ke = 8.98755e9;

  // Precomputar kq (Coulomb * carga en Coulombs) para evitar conversiones en el bucle interno
  const precomputedCharges = charges.map((c) => ({
    x: c.position[0],
    y: c.position[1],
    z: c.position[2],
    kq: ke * (c.value * 1e-9) // Convertir nC a C y multiplicar por ke
  }));

  const halfRes = resolution / 2;
  for (let z = 0; z < resolution; z++) {
    // Mapeo simétrico de coordenadas que coincide exactamente con el espacio [-1, 1] local del Mesh
    const pz = (z / halfRes - 1) * limits + center[2];
    for (let y = 0; y < resolution; y++) {
      const py = (y / halfRes - 1) * limits + center[1];
      for (let x = 0; x < resolution; x++) {
        const px = (x / halfRes - 1) * limits + center[0];
        
        let V = 0;
        for (let i = 0; i < precomputedCharges.length; i++) {
          const c = precomputedCharges[i];
          const dx = px - c.x;
          const dy = py - c.y;
          const dz = pz - c.z;
          const r = Math.sqrt(dx * dx + dy * dy + dz * dz + SOFTENING);
          V += c.kq / r;
        }
        
        marchingCubes.setCell(x, y, z, V);
      }
    }
  }

  // 2. Calcular niveles de aislamiento adaptativos basados en las cargas
  //    Para una carga puntual: V = ke * q / r → r = ke * q / V
  //    Queremos superficies a radios visibles: ~0.8, ~1.5, ~3.0 unidades del centro
  const maxAbsQ = Math.max(...charges.map((c) => Math.abs(c.value * 1e-9)));
  
  // Niveles de potencial que producen esferas de radio razonable
  const targetRadii = [0.8, 1.5, 3.0]; // Radios deseados en unidades de la escena
  const isolations: number[] = [];
  
  for (const r of targetRadii) {
    const isoVal = ke * maxAbsQ / r;
    isolations.push(isoVal);   // Positivo (cargas +)
    isolations.push(-isoVal);  // Negativo (cargas -)
  }

  // 3. Extraer isosuperficies para cada nivel
  const allPositions: number[] = [];
  const allNormals: number[] = [];
  const allColors: number[] = [];

  for (const iso of isolations) {
    marchingCubes.isolation = iso;
    marchingCubes.update();

    const count = marchingCubes.count;
    if (count === 0) continue;

    const posArray = marchingCubes.geometry.attributes.position.array;
    const normArray = marchingCubes.geometry.attributes.normal.array;

    // Color: rojo para potencial positivo, azul para negativo
    // Intensidad variable según la cercanía al campo (capas internas más brillantes)
    const absIso = Math.abs(iso);
    const maxIso = ke * maxAbsQ / targetRadii[0];
    const intensity = 0.4 + 0.6 * (absIso / maxIso); // 0.4 a 1.0

    const r = iso > 0 ? 0.9 * intensity : 0.15;
    const g = 0.15;
    const b = iso > 0 ? 0.15 : 0.9 * intensity;

    for (let i = 0; i < count; i++) {
      allPositions.push(posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2]);
      allNormals.push(normArray[i * 3], normArray[i * 3 + 1], normArray[i * 3 + 2]);
      allColors.push(r, g, b);
    }
  }

  // 4. Transferir buffers al hilo principal
  const positions = new Float32Array(allPositions);
  const normals = new Float32Array(allNormals);
  const colors = new Float32Array(allColors);

  console.log("Worker output generated:", {
    positions: positions.length,
    normals: normals.length,
    colors: colors.length
  });

  workerScope.postMessage(
    { positions, normals, colors },
    [positions.buffer, normals.buffer, colors.buffer]
  );
};
