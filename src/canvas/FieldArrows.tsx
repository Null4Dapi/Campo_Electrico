import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, Color, Float32BufferAttribute, LineSegments } from 'three';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { calculateElectricField, calculateElectricPotential } from '../physics/calculus';

const STEPS = 400;
const STEP_SIZE = 0.15;
const MIN_DIST = 0.5; // Radio de la carga
const NUM_LINES_PER_CHARGE = 32; // Cantidad de líneas en 3D

const darkNeutral = new Color('#121214'); // color oscuro de fondo (gris/negro mate)
const positiveColor = new Color('#ef4444');
const negativeColor = new Color('#3b82f6');

export function FieldArrows() {
  const charges = useSimulatorStore((state) => state.charges);
  const showFieldLines = useSimulatorStore((state) => state.showFieldLines);
  
  const arrowsMeshRef = useRef<InstancedMesh>(null);
  const linesRef = useRef<LineSegments>(null);
  
  const dummy = useMemo(() => new Object3D(), []);
  const baseUp = useMemo(() => new Vector3(0, 1, 0), []);

  useFrame(() => {
    const arrowsMesh = arrowsMeshRef.current;
    const lines = linesRef.current;
    if (!showFieldLines || !lines || !arrowsMesh) return;
    
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
        
        let currentX = startX;
        let currentY = startY;
        let currentZ = startZ;
        
        const tempPositions: number[] = [];
        const tempColors: number[] = [];
        const tempArrows: { pos: [number, number, number], dir: [number, number, number], V: number }[] = [];
        let discardLine = false;
        
        for (let step = 0; step < STEPS; step++) {
          // Heun's Method (RK2) - Paso 1: Obtener dirección y magnitud en posición actual
          const { direction: dir1, magnitude } = calculateElectricField(
            [currentX, currentY, currentZ], 
            chargesData
          );
          
          if (magnitude < 1e-5) break;
          
          const sign = isPos ? 1 : -1;
          const stepX1 = dir1[0] * sign * STEP_SIZE;
          const stepY1 = dir1[1] * sign * STEP_SIZE;
          const stepZ1 = dir1[2] * sign * STEP_SIZE;
          
          // Predicción Euler
          const predX = currentX + stepX1;
          const predY = currentY + stepY1;
          const predZ = currentZ + stepZ1;
          
          // Paso 2: Obtener dirección en posición predicha
          const { direction: dir2 } = calculateElectricField(
            [predX, predY, predZ],
            chargesData
          );
          
          const stepX2 = dir2[0] * sign * STEP_SIZE;
          const stepY2 = dir2[1] * sign * STEP_SIZE;
          const stepZ2 = dir2[2] * sign * STEP_SIZE;
          
          // Paso corregido promedio
          const vx = 0.5 * (stepX1 + stepX2);
          const vy = 0.5 * (stepY1 + stepY2);
          const vz = 0.5 * (stepZ1 + stepZ2);
          
          const nextX = currentX + vx;
          const nextY = currentY + vy;
          const nextZ = currentZ + vz;
          
          tempPositions.push(currentX, currentY, currentZ);
          tempPositions.push(nextX, nextY, nextZ);
          
          // Calcular potencial en el punto medio del segmento
          const midX = (currentX + nextX) / 2;
          const midY = (currentY + nextY) / 2;
          const midZ = (currentZ + nextZ) / 2;
          const V = calculateElectricPotential([midX, midY, midZ], chargesData);
          
          // Mapear potencial a un gradiente continuo continuo: Azul -> Violeta -> Rojo
          const V_norm = Math.tanh(V / 8.0); // Mapeado en [-1, 1]
          const s = (V_norm + 1) / 2; // Mapeado en [0, 1]
          
          const cGrad = new Color();
          cGrad.lerpColors(negativeColor, positiveColor, s);
          
          // Desvanecer el color hacia darkNeutral para zonas con campo E muy débil
          const E_norm = Math.tanh(magnitude / 6.0); // Campo normalizado [0, 1]
          const c = new Color();
          c.lerpColors(darkNeutral, cGrad, E_norm);
          
          tempColors.push(c.r, c.g, c.b);
          tempColors.push(c.r, c.g, c.b);
          
          // Cada cierta cantidad de pasos, colocamos una flecha (cono)
          if (step % 40 === 20) {
            tempArrows.push({
              pos: [nextX, nextY, nextZ],
              dir: dir1,
              V
            });
          }

          let hit = false;
          for (let cIdx = 0; cIdx < chargesData.length; cIdx++) {
            const c = chargesData[cIdx];
            if (c.id === sourceCharge.id) continue;
            const dx = nextX - c.position[0];
            const dy = nextY - c.position[1];
            const dz = nextZ - c.position[2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (dist <= 0.55) { // Zona de captura ligeramente mayor
              hit = true;
              
              if (!isPos && c.type === 'positive') {
                discardLine = true;
              }
              
              // Ajustar el último punto para que termine exactamente en la superficie de la carga (0.5 m)
              if (dist > 0) {
                const ratio = 0.5 / dist;
                const finalX = c.position[0] + dx * ratio;
                const finalY = c.position[1] + dy * ratio;
                const finalZ = c.position[2] + dz * ratio;
                
                tempPositions[tempPositions.length - 3] = finalX;
                tempPositions[tempPositions.length - 2] = finalY;
                tempPositions[tempPositions.length - 1] = finalZ;
              }
              break;
            }
          }
          
          if (hit) break;
          if (Math.abs(nextX) > 30 || Math.abs(nextY) > 30 || Math.abs(nextZ) > 30) break; // Límite espacial 3D
          
          currentX = nextX;
          currentY = nextY;
          currentZ = nextZ;
        }

        if (!discardLine) {
          linePositions.push(...tempPositions);
          lineColors.push(...tempColors);

          for (let arrIdx = 0; arrIdx < tempArrows.length; arrIdx++) {
            const arr = tempArrows[arrIdx];
            if (arrowIndex < arrowsMesh.count) {
              dummy.position.set(arr.pos[0], arr.pos[1], arr.pos[2]);
              dummy.quaternion.setFromUnitVectors(baseUp, new Vector3(...arr.dir));
              dummy.scale.setScalar(0.7);
              dummy.updateMatrix();
              arrowsMesh.setMatrixAt(arrowIndex, dummy.matrix);

              const V_norm = Math.tanh(arr.V / 8.0);
              const s = (V_norm + 1) / 2;
              
              const cGrad = new Color();
              cGrad.lerpColors(negativeColor, positiveColor, s);
              
              // Atenuar flechas según el campo local
              const { magnitude: arrowE } = calculateElectricField(arr.pos, chargesData);
              const E_norm = Math.tanh(arrowE / 6.0);
              const c = new Color();
              c.lerpColors(darkNeutral, cGrad, E_norm);
              
              arrowsMesh.setColorAt(arrowIndex, c);
              arrowIndex++;
            }
          }
        }
      }
    });

    for (let i = arrowIndex; i < arrowsMesh.count; i++) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      arrowsMesh.setMatrixAt(i, dummy.matrix);
    }
    
    arrowsMesh.instanceMatrix.needsUpdate = true;
    if (arrowsMesh.instanceColor) {
      arrowsMesh.instanceColor.needsUpdate = true;
    }

    lines.geometry.setAttribute('position', new Float32BufferAttribute(linePositions, 3));
    lines.geometry.setAttribute('color', new Float32BufferAttribute(lineColors, 3));
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

