import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { MeshStandardMaterial } from 'three';
import { calculateElectricPotential } from './calculus';

const material = new MeshStandardMaterial();
let marchingCubes: any = null;

self.onmessage = (e) => {
  const { charges, resolution, limits, center } = e.data;

  if (!marchingCubes || marchingCubes.resolution !== resolution) {
    marchingCubes = new MarchingCubes(resolution, material, false, false, 800000);
  }

  marchingCubes.reset();

  // 1. Rellenar el campo escalar con el potencial eléctrico
  const halfsize = resolution / 2.0;
  for (let z = 0; z < resolution; z++) {
    const pz = ((z - halfsize) / halfsize) * limits + center[2];
    for (let y = 0; y < resolution; y++) {
      const py = ((y - halfsize) / halfsize) * limits + center[1];
      for (let x = 0; x < resolution; x++) {
        const px = ((x - halfsize) / halfsize) * limits + center[0];
        const potential = calculateElectricPotential([px, py, pz], charges);
        marchingCubes.setCell(x, y, z, potential);
      }
    }
  }

  // 2. Calcular niveles de aislamiento adaptativos basados en las cargas
  //    Para una carga puntual: V = ke * q / r → r = ke * q / V
  //    Queremos superficies a radios visibles: ~0.8, ~1.5, ~3.0 unidades del centro
  const ke = 8.98755e9;
  const maxAbsQ = Math.max(...charges.map((c: any) => Math.abs(c.value * 1e-9)));
  
  // Niveles de potencial que producen esferas de radio razonable
  const targetRadii = [0.8, 1.5, 3.0]; // Radios deseados en unidades de la escena
  const isolations: number[] = [];
  
  for (const r of targetRadii) {
    const isoVal = ke * maxAbsQ / r;
    isolations.push(isoVal);   // Positivo (cargas +)
    isolations.push(-isoVal);  // Negativo (cargas -)
  }

  // 3. Extraer isosuperficies para cada nivel
  let allPositions: number[] = [];
  let allNormals: number[] = [];
  let allColors: number[] = [];

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

  self.postMessage(
    { positions, normals, colors },
    [positions.buffer, normals.buffer, colors.buffer]
  );
};
