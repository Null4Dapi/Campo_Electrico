import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, Color, Float32BufferAttribute, LineSegments } from 'three';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { calculateElectricField } from '../physics/calculus';

const STEPS = 400;
const STEP_SIZE = 0.15;
const MIN_DIST = 0.5; // Radio de la carga
const NUM_LINES_PER_CHARGE = 32; // Cantidad de líneas en 3D

export function FieldArrows() {
  const charges = useSimulatorStore((state) => state.charges);
  const showFieldLines = useSimulatorStore((state) => state.showFieldLines);
  
  const arrowsMeshRef = useRef<InstancedMesh>(null);
  const linesRef = useRef<LineSegments>(null);
  
  const dummy = useMemo(() => new Object3D(), []);
  const baseUp = useMemo(() => new Vector3(0, 1, 0), []);

  useFrame(() => {
    if (!showFieldLines || !linesRef.current || !arrowsMeshRef.current) return;
    
    const chargesData = charges.map(c => ({
      id: c.id,
      position: c.position,
      value: c.type === 'positive' ? c.value : -c.value,
      type: c.type
    }));

    const linePositions: number[] = [];
    const lineColors: number[] = [];
    let arrowIndex = 0;

    chargesData.forEach(sourceCharge => {
      const isPos = sourceCharge.type === 'positive';
      const color = isPos ? new Color('#ef4444') : new Color('#3b82f6'); 

      const phi = Math.PI * (3 - Math.sqrt(5)); // Ángulo dorado para la esfera de Fibonacci

      for (let i = 0; i < NUM_LINES_PER_CHARGE; i++) {
        // Distribución de puntos de inicio en 3D usando Esfera de Fibonacci
        const y = 1 - (i / (NUM_LINES_PER_CHARGE - 1)) * 2; // y va de 1 a -1
        const radius = Math.sqrt(1 - y * y);
        const theta = phi * i;

        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;

        const startX = sourceCharge.position[0] + x * (MIN_DIST + 0.05);
        const startY = sourceCharge.position[1] + y * (MIN_DIST + 0.05);
        const startZ = sourceCharge.position[2] + z * (MIN_DIST + 0.05);
        
        let currentPos = new Vector3(startX, startY, startZ);
        
        for (let step = 0; step < STEPS; step++) {
          const { direction, magnitude } = calculateElectricField(
            [currentPos.x, currentPos.y, currentPos.z], 
            chargesData
          );
          
          if (magnitude < 1e-5) break;
          
          const sign = isPos ? 1 : -1;
          const dirVec = new Vector3(...direction).multiplyScalar(sign);
          
          const nextPos = currentPos.clone().add(dirVec.clone().multiplyScalar(STEP_SIZE));
          
          linePositions.push(currentPos.x, currentPos.y, currentPos.z);
          linePositions.push(nextPos.x, nextPos.y, nextPos.z);
          
          // Atenuar un poco las líneas lejanas u oscurecerlas si lo deseamos. 
          // Por simplicidad, mantenemos el color base.
          lineColors.push(color.r, color.g, color.b);
          lineColors.push(color.r, color.g, color.b);
          
          // Cada cierta cantidad de pasos, colocamos una flecha (cono)
          if (step % 40 === 20 && arrowIndex < arrowsMeshRef.current.count) {
            dummy.position.copy(nextPos);
            const actualFieldDir = new Vector3(...direction);
            dummy.quaternion.setFromUnitVectors(baseUp, actualFieldDir);
            dummy.scale.setScalar(0.7);
            dummy.updateMatrix();
            arrowsMeshRef.current.setMatrixAt(arrowIndex, dummy.matrix);
            arrowsMeshRef.current.setColorAt(arrowIndex, color);
            arrowIndex++;
          }

          let hit = false;
          for (const c of chargesData) {
            if (c.id === sourceCharge.id) continue;
            const dist = nextPos.distanceTo(new Vector3(...c.position));
            if (dist <= MIN_DIST) {
              hit = true;
              break;
            }
          }
          
          if (hit) break;
          if (Math.abs(nextPos.x) > 30 || Math.abs(nextPos.y) > 30 || Math.abs(nextPos.z) > 30) break; // Límite espacial 3D
          
          currentPos = nextPos;
        }
      }
    });

    for (let i = arrowIndex; i < arrowsMeshRef.current.count; i++) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      arrowsMeshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    arrowsMeshRef.current.instanceMatrix.needsUpdate = true;
    if (arrowsMeshRef.current.instanceColor) {
      arrowsMeshRef.current.instanceColor.needsUpdate = true;
    }

    linesRef.current.geometry.setAttribute('position', new Float32BufferAttribute(linePositions, 3));
    linesRef.current.geometry.setAttribute('color', new Float32BufferAttribute(lineColors, 3));
  });

  if (!showFieldLines) return null;

  // Calculamos un máximo seguro de flechas (20 charges * 32 lines * 10 arrows per line = 6400 max)
  const MAX_ARROWS = 10000;

  return (
    <group renderOrder={10}>
      <lineSegments ref={linesRef} renderOrder={10}>
        <bufferGeometry />
        <lineBasicMaterial 
          vertexColors 
          transparent 
          opacity={0.85} 
          linewidth={1}
          depthTest={true}
          depthWrite={false}
        />
      </lineSegments>

      <instancedMesh ref={arrowsMeshRef} args={[undefined, undefined, MAX_ARROWS]} renderOrder={11}>
        <coneGeometry args={[0.08, 0.25, 8]} />
        <meshBasicMaterial depthTest={true} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

