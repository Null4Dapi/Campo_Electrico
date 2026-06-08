import { memo, useEffect, useRef, useState } from 'react';
import { DoubleSide } from 'three';
import { useSimulatorStore } from '../store/useSimulatorStore';
import FieldWorker from '../physics/fieldWorker?worker';

export const EquipotentialSurfaces = memo(function EquipotentialSurfaces() {
  const charges = useSimulatorStore((state) => state.charges);
  const showEquipotential = useSimulatorStore((state) => state.showEquipotential);
  const isDragging = useSimulatorStore((state) => state.isDragging);

  const [geometryData, setGeometryData] = useState<{
    positions: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
  } | null>(null);

  // Guardar datos dinámicos de transformación
  const [transform, setTransform] = useState<{
    center: [number, number, number];
    limits: number;
  }>({
    center: [0, 0, 0],
    limits: 5,
  });

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Instanciar el Web Worker usando Vite
    const worker = new FieldWorker();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{
      positions: Float32Array;
      normals: Float32Array;
      colors: Float32Array;
    }>) => {
      const { positions, normals, colors } = e.data;
      setGeometryData({ positions, normals, colors });
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!showEquipotential || charges.length === 0 || !workerRef.current) {
      setGeometryData(null);
      return;
    }

    // Mapear cargas a signed values (valor real físico)
    const chargesData = charges.map((c) => ({
      position: c.position,
      value: c.type === 'positive' ? c.value : -c.value,
    }));

    // Resolución: 16 durante arrastre (interactividad rápida, 60fps), 32 en reposo (alta calidad)
    const resolution = isDragging ? 16 : 32;

    // Calcular límites y centro de la escena de manera dinámica
    let minX = -5, maxX = 5;
    let minY = -3, maxY = 3;
    let minZ = -5, maxZ = 5;

    if (charges.length > 0) {
      minX = Math.min(...charges.map(c => c.position[0])) - 4;
      maxX = Math.max(...charges.map(c => c.position[0])) + 4;
      minY = -4; // Grosor vertical para evaluar el volumen
      maxY = 4;
      minZ = Math.min(...charges.map(c => c.position[2])) - 4;
      maxZ = Math.max(...charges.map(c => c.position[2])) + 4;
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const limitX = (maxX - minX) / 2;
    const limitY = (maxY - minY) / 2;
    const limitZ = (maxZ - minZ) / 2;
    const limits = Math.max(limitX, limitY, limitZ);

    const center: [number, number, number] = [centerX, centerY, centerZ];
    setTransform({ center, limits });

    workerRef.current.postMessage({
      charges: chargesData,
      resolution,
      limits,
      center,
    });
  }, [charges, showEquipotential, isDragging]);

  if (!showEquipotential || !geometryData || geometryData.positions.length === 0) {
    return null;
  }

  return (
    <mesh 
      position={transform.center} 
      scale={[transform.limits, transform.limits, transform.limits]}
      renderOrder={1}
    >
      <bufferGeometry key={geometryData.positions.length}>
        <bufferAttribute
          attach="attributes-position"
          args={[geometryData.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-normal"
          args={[geometryData.normals, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[geometryData.colors, 3]}
        />
      </bufferGeometry>
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={0.35}
        side={DoubleSide}
        depthWrite={false}
        roughness={0.2}
        metalness={0.1}
        emissive="#000000"
      />
    </mesh>
  );
});
