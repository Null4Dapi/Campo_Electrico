import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, Color, Float32BufferAttribute, LineSegments, BufferGeometry } from 'three';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { calculateElectricField, calculateElectricPotential } from '../physics/calculus';

const STEPS = 400;
const STEP_SIZE = 0.15;
const MIN_DIST = 0.5; // Radio de la carga
const NUM_LINES_PER_CHARGE = 32; // Cantidad de líneas en 3D

// Colores pre-alocados y reutilizables (evitar GC pressure)
const darkNeutral = new Color('#121214');
const positiveColor = new Color('#ef4444');
const negativeColor = new Color('#3b82f6');
const tempColorGrad = new Color();
const tempColorFinal = new Color();
const tempArrowColorGrad = new Color();
const tempArrowColorFinal = new Color();
const tempVec3 = new Vector3();

export const FieldArrows = memo(function FieldArrows() {
  const charges = useSimulatorStore((state) => state.charges);
  const showFieldLines = useSimulatorStore((state) => state.showFieldLines);
  
  const arrowsMeshRef = useRef<InstancedMesh>(null);
  const linesRef = useRef<LineSegments>(null);
  
  const dummy = useMemo(() => new Object3D(), []);
  const baseUp = useMemo(() => new Vector3(0, 1, 0), []);

  // Cache para dirty-checking: solo recalcular cuando charges cambie
  const prevChargesRef = useRef<string>('');
  const prevShowRef = useRef(true);
  // Cache de buffers pre-alocados para reutilizar entre frames
  const posAttrRef = useRef<Float32BufferAttribute | null>(null);
  const colAttrRef = useRef<Float32BufferAttribute | null>(null);

  useFrame(() => {
    const arrowsMesh = arrowsMeshRef.current;
    const lines = linesRef.current;
    if (!lines || !arrowsMesh) return;

    // Si no se muestran las líneas, limpiar y salir
    if (!showFieldLines) {
      if (prevShowRef.current) {
        // Acabamos de ocultar: limpiar geometría
        const emptyPos = new Float32Array(0);
        const emptyCol = new Float32Array(0);
        lines.geometry.setAttribute('position', new Float32BufferAttribute(emptyPos, 3));
        lines.geometry.setAttribute('color', new Float32BufferAttribute(emptyCol, 3));
        for (let i = 0; i < arrowsMesh.count; i++) {
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          arrowsMesh.setMatrixAt(i, dummy.matrix);
        }
        arrowsMesh.instanceMatrix.needsUpdate = true;
        prevShowRef.current = false;
      }
      return;
    }
    prevShowRef.current = true;

    // Dirty check: serializar posiciones y valores de cargas para comparar
    const chargesKey = charges.map(c => 
      `${c.id}:${c.position[0].toFixed(4)},${c.position[1].toFixed(4)},${c.position[2].toFixed(4)},${c.value},${c.type}`
    ).join('|');

    if (chargesKey === prevChargesRef.current) {
      return; // Nada cambió, saltar recálculo
    }
    prevChargesRef.current = chargesKey;

    // Mapear cargas (solo cuando hay cambios)
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
        const y = 1 - (i / (NUM_LINES_PER_CHARGE - 1)) * 2;
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
          // Heun's Method (RK2) - Paso 1
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
          
          // Paso 2: dirección en posición predicha
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
          
          // Mapear potencial a gradiente: Azul -> Violeta -> Rojo (usando colores pre-alocados)
          const V_norm = Math.tanh(V / 8.0);
          const s = (V_norm + 1) / 2;
          
          tempColorGrad.lerpColors(negativeColor, positiveColor, s);
          
          // Desvanecer hacia darkNeutral para zonas con campo E débil
          const E_norm = Math.tanh(magnitude / 6.0);
          tempColorFinal.lerpColors(darkNeutral, tempColorGrad, E_norm);
          
          tempColors.push(tempColorFinal.r, tempColorFinal.g, tempColorFinal.b);
          tempColors.push(tempColorFinal.r, tempColorFinal.g, tempColorFinal.b);
          
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
            
            if (dist <= 0.55) {
              hit = true;
              
              if (!isPos && c.type === 'positive') {
                discardLine = true;
              }
              
              // Ajustar último punto para terminar en la superficie (0.5 m)
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
          if (Math.abs(nextX) > 30 || Math.abs(nextY) > 30 || Math.abs(nextZ) > 30) break;
          
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
              tempVec3.set(arr.dir[0], arr.dir[1], arr.dir[2]);
              dummy.quaternion.setFromUnitVectors(baseUp, tempVec3);
              dummy.scale.setScalar(0.7);
              dummy.updateMatrix();
              arrowsMesh.setMatrixAt(arrowIndex, dummy.matrix);

              const V_norm = Math.tanh(arr.V / 8.0);
              const s = (V_norm + 1) / 2;
              
              tempArrowColorGrad.lerpColors(negativeColor, positiveColor, s);
              
              // Atenuar flechas según el campo local
              const { magnitude: arrowE } = calculateElectricField(arr.pos, chargesData);
              const E_norm = Math.tanh(arrowE / 6.0);
              tempArrowColorFinal.lerpColors(darkNeutral, tempArrowColorGrad, E_norm);
              
              arrowsMesh.setColorAt(arrowIndex, tempArrowColorFinal);
              arrowIndex++;
            }
          }
        }
      }
    });

    // Ocultar flechas no usadas
    for (let i = arrowIndex; i < arrowsMesh.count; i++) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      arrowsMesh.setMatrixAt(i, dummy.matrix);
    }
    
    arrowsMesh.instanceMatrix.needsUpdate = true;
    if (arrowsMesh.instanceColor) {
      arrowsMesh.instanceColor.needsUpdate = true;
    }

    // Actualizar geometría de líneas reutilizando buffers cuando sea posible
    const posArray = new Float32Array(linePositions);
    const colArray = new Float32Array(lineColors);
    
    const geom = lines.geometry as BufferGeometry;
    const existingPosAttr = posAttrRef.current;
    
    if (existingPosAttr && existingPosAttr.count === posArray.length / 3) {
      // Mismo tamaño: reutilizar buffer existente
      existingPosAttr.set(posArray);
      existingPosAttr.needsUpdate = true;
      colAttrRef.current!.set(colArray);
      colAttrRef.current!.needsUpdate = true;
    } else {
      // Tamaño diferente: crear nuevos buffers
      const newPosAttr = new Float32BufferAttribute(posArray, 3);
      const newColAttr = new Float32BufferAttribute(colArray, 3);
      geom.setAttribute('position', newPosAttr);
      geom.setAttribute('color', newColAttr);
      posAttrRef.current = newPosAttr;
      colAttrRef.current = newColAttr;
    }
  });

  if (!showFieldLines) return null;

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
});
