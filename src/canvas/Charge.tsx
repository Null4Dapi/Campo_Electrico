import { useState, memo } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useCursor, Html } from '@react-three/drei';
import { Plane, Vector3 } from 'three';
import type { Charge as ChargeType } from '../types';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { calculateForceAndEnergy } from '../physics/calculus';

interface ChargeProps {
  charge: ChargeType;
}

const intersection = new Vector3();
const xyPlane = new Plane();
const xzPlane = new Plane();
const planeNormalXY = new Vector3(0, 0, 1);
const planeNormalXZ = new Vector3(0, 1, 0);

export const Charge = memo(function Charge({ charge }: ChargeProps) {
  const updateCharge = useSimulatorStore((state) => state.updateCharge);
  const setIsDraggingGlobal = useSimulatorStore((state) => state.setIsDragging);
  const selectedChargeId = useSimulatorStore((state) => state.selectedChargeId);
  const selectCharge = useSimulatorStore((state) => state.selectCharge);
  const snapToGrid = useSimulatorStore((state) => state.snapToGrid);
  const allCharges = useSimulatorStore((state) => state.charges);
  const interactionMode = useSimulatorStore((state) => state.interactionMode);
  
  const [hovered, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  
  useCursor(hovered || dragging, dragging ? 'grabbing' : 'grab', 'auto');

  const get = useThree((state) => state.get);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (interactionMode === 'pan') return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    setIsDraggingGlobal(true);
    selectCharge(charge.id); // Selecciona la carga actual durante el evento de clic
    const controls = get().controls;
    if (controls) {
      (controls as unknown as { enabled: boolean }).enabled = false;
    }
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (interactionMode === 'pan') return;
    e.stopPropagation();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
    setIsDraggingGlobal(false);
    const controls = get().controls;
    if (controls) {
      (controls as unknown as { enabled: boolean }).enabled = true;
    }
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (dragging) {
      e.stopPropagation();
      
      let x = charge.position[0];
      let y = charge.position[1];
      let z = charge.position[2];

      if (e.shiftKey) {
        // Restringe el movimiento al plano XY manteniendo la coordenada Z constante
        xyPlane.setFromNormalAndCoplanarPoint(planeNormalXY, new Vector3(0, 0, charge.position[2]));
        const res = e.ray.intersectPlane(xyPlane, intersection);
        if (res) {
          x = intersection.x;
          y = intersection.y;
        }
      } else {
        // Restringe el movimiento al plano XZ manteniendo la coordenada Y constante
        xzPlane.setFromNormalAndCoplanarPoint(planeNormalXZ, new Vector3(0, charge.position[1], 0));
        const res = e.ray.intersectPlane(xzPlane, intersection);
        if (res) {
          x = intersection.x;
          z = intersection.z;
        }
      }

      if (snapToGrid) {
        x = Math.round(x * 2) / 2; // Aplica alineación a incrementos de 0.5m
        y = Math.round(y * 2) / 2;
        z = Math.round(z * 2) / 2;
      }
      updateCharge(charge.id, { position: [x, y, z] });
    }
  };

  const isSelected = selectedChargeId === charge.id;
  const isTest = charge.type === 'test';
  
  let color = '#3b82f6';
  if (charge.type === 'positive') color = '#ef4444';
  if (charge.type === 'test') color = '#22c55e'; // Aplica color específico para cargas de prueba
  
  // Calcula los datos físicos locales si el elemento es una carga de prueba
  let testData = null;
  if (isTest) {
    // Calcula la fuerza considerando únicamente las fuentes de campo, omitiendo la propia carga de prueba
    testData = calculateForceAndEnergy(charge.position, charge.value, allCharges);
  }

  let forceDir = new Vector3(0, 1, 0);
  let forceLength = 0;
  if (isTest && testData && testData.fieldMagnitude > 0) {
    forceDir = new Vector3(...testData.force).normalize();
    // Escala la longitud del vector basándose en el logaritmo del campo para mantener proporción y visibilidad
    forceLength = Math.max(0.6, Math.min(3, Math.log10(testData.fieldMagnitude + 1) * 0.5));
  }

  return (
    <group position={charge.position}>
      {/* Representación gráfica del vector de fuerza para la carga de prueba */}
      {isTest && testData && testData.fieldMagnitude > 0 && (
        <arrowHelper 
          args={[forceDir, new Vector3(0,0,0), forceLength, 0x22c55e, 0.3, 0.2]} 
        />
      )}
      
      {/* Malla principal representativa de la carga */}
      <mesh
        onPointerOver={(e) => { 
          if (interactionMode !== 'pan') {
            e.stopPropagation(); 
            setHover(true); 
          }
        }}
        onPointerOut={() => setHover(false)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
      >
        <sphereGeometry args={[isTest ? 0.1 : 0.25, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.3} 
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : (hovered ? 0.4 : 0.2)}
        />
      </mesh>

      {/* Indicador de coordenadas espaciales activo durante la manipulación */}
      {dragging && (
        <Html position={[0, 0.6, 0]} center className="pointer-events-none">
          <div className="bg-slate-900/90 text-white text-[11px] px-2 py-1 rounded-lg font-mono shadow-xl border border-white/20 whitespace-nowrap z-50">
            ({charge.position[0].toFixed(2)}, {charge.position[2].toFixed(2)})
          </div>
        </Html>
      )}
    </group>
  );
});
