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

  if (!charges || charges.length === 0) {
    self.postMessage({
      positions: new Float32Array(0),
      normals: new Float32Array(0),
      colors: new Float32Array(0)
    });
    return;
  }

  if (!marchingCubes || marchingCubes.resolution !== resolution) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marchingCubes = new MarchingCubes(resolution, { flatShading: false } as any, false, false, 800000);
  }

  marchingCubes.reset();

  const SOFTENING = 1e-10;
  const ke = 8.98755e9;

  const precomputedCharges = charges.map((c) => ({
    x: c.position[0],
    y: c.position[1],
    z: c.position[2],
    kq: ke * (c.value * 1e-9)
  }));

  const halfRes = resolution / 2;
  for (let z = 0; z < resolution; z++) {
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

  const maxAbsQ = Math.max(...charges.map((c) => Math.abs(c.value * 1e-9)));
  const maxV_estimated = (ke * maxAbsQ) / 0.4;
  
  const numLayers = 15; // Configura la volumetría a 15 capas para incrementar la densidad visual
  const deltaV = maxV_estimated / numLayers;
  
  const isolations: number[] = [];
  for (let i = 1; i <= numLayers; i++) {
    isolations.push(i * deltaV);
    isolations.push(-i * deltaV);
  }

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

    const absIso = Math.abs(iso);
    const intensity = 0.3 + 0.7 * (absIso / maxV_estimated);

    const r = iso > 0 ? 0.9 * intensity : 0.15;
    const g = 0.15;
    const b = iso > 0 ? 0.15 : 0.9 * intensity;

    for (let i = 0; i < count; i++) {
      allPositions.push(posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2]);
      allNormals.push(normArray[i * 3], normArray[i * 3 + 1], normArray[i * 3 + 2]);
      allColors.push(r, g, b);
    }
  }

  const positions = new Float32Array(allPositions);
  const normals = new Float32Array(allNormals);
  const colors = new Float32Array(allColors);

  workerScope.postMessage(
    { positions, normals, colors },
    [positions.buffer, normals.buffer, colors.buffer]
  );
};
