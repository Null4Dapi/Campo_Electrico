import { useEffect, useRef, useState } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { BufferGeometry, Float32BufferAttribute, Mesh, DoubleSide } from 'three';

// Instanciar el worker usando la API de módulos de Vite
const worker = new Worker(new URL('../physics/fieldWorker.ts', import.meta.url), { type: 'module' });

export function EquipotentialSurfaces() {
  const charges = useSimulatorStore((state) => state.charges);
  const showEquipotential = useSimulatorStore((state) => state.showEquipotential);
  const isDragging = useSimulatorStore((state) => state.isDragging);

  const meshRef = useRef<Mesh>(null);
  const [geometryData, setGeometryData] = useState<{
    positions: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
  } | null>(null);
  const [meshTransform, setMeshTransform] = useState<{ center: [number, number, number], limits: number }>({ center: [0,0,0], limits: 5 });

  useEffect(() => {
    if (!showEquipotential || charges.length === 0) return;

    const chargesData = charges.map((c) => ({
      position: c.position,
      value: c.type === 'positive' ? c.value : -c.value,
    }));

    // Calcular el bounding box de todas las cargas
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    chargesData.forEach(c => {
      minX = Math.min(minX, c.position[0]);
      minY = Math.min(minY, c.position[1]);
      minZ = Math.min(minZ, c.position[2]);
      maxX = Math.max(maxX, c.position[0]);
      maxY = Math.max(maxY, c.position[1]);
      maxZ = Math.max(maxZ, c.position[2]);
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const rangeX = (maxX - minX) / 2;
    const rangeY = (maxY - minY) / 2;
    const rangeZ = (maxZ - minZ) / 2;

    // limits = rango máximo + margen (4.0 cubre el radio target 3.0)
    const limits = Math.max(rangeX, Math.max(rangeY, rangeZ)) + 4.0;
    const center: [number, number, number] = [centerX, centerY, centerZ];

    worker.postMessage({
      charges: chargesData,
      resolution: isDragging ? 16 : 32, // Grilla adaptativa según PLANNING.md
      limits,
      center,
    });

    const handleMessage = (e: MessageEvent) => {
      setGeometryData(e.data);
      setMeshTransform({ center, limits });
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, [charges, showEquipotential, isDragging]);

  useEffect(() => {
    if (meshRef.current && geometryData) {
      const { positions, normals, colors } = geometryData;
      const geometry = meshRef.current.geometry as BufferGeometry;

      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

      geometry.computeBoundingSphere();
    }
  }, [geometryData]);

  if (!showEquipotential || charges.length === 0) return null;

  return (
    // Escalamos por 'limits' porque MarchingCubes genera vértices normalizados de -1 a 1
    // Posicionamos en el 'center' del bounding box de las cargas
    <mesh ref={meshRef} position={meshTransform.center} scale={[meshTransform.limits, meshTransform.limits, meshTransform.limits]} renderOrder={0}>
      <bufferGeometry />
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={0.25}
        side={DoubleSide}
        roughness={0.3}
        metalness={0.1}
        depthWrite={false}
      />
    </mesh>
  );
}
