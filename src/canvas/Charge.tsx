import { useState, memo } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { Plane, Vector3 } from 'three';
import type { Charge as ChargeType } from '../types';
import { useSimulatorStore } from '../store/useSimulatorStore';

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
  
  const [hovered, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  
  useCursor(hovered || dragging, dragging ? 'grabbing' : 'grab', 'auto');

  const get = useThree((state) => state.get);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    setIsDraggingGlobal(true);
    selectCharge(charge.id); // Seleccionar esta carga al hacer clic
    const controls = get().controls;
    if (controls) {
      (controls as unknown as { enabled: boolean }).enabled = false;
    }
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
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
        // Mover en el plano XY (manteniendo Z constante)
        xyPlane.setFromNormalAndCoplanarPoint(planeNormalXY, new Vector3(0, 0, charge.position[2]));
        const res = e.ray.intersectPlane(xyPlane, intersection);
        if (res) {
          x = intersection.x;
          y = intersection.y;
        }
      } else {
        // Mover en el plano XZ (manteniendo Y constante)
        xzPlane.setFromNormalAndCoplanarPoint(planeNormalXZ, new Vector3(0, charge.position[1], 0));
        const res = e.ray.intersectPlane(xzPlane, intersection);
        if (res) {
          x = intersection.x;
          z = intersection.z;
        }
      }

      if (snapToGrid) {
        x = Math.round(x * 2) / 2; // snap a incrementos de 0.5m
        y = Math.round(y * 2) / 2;
        z = Math.round(z * 2) / 2;
      }
      updateCharge(charge.id, { position: [x, y, z] });
    }
  };

  const isSelected = selectedChargeId === charge.id;
  const color = charge.type === 'positive' ? '#ef4444' : '#3b82f6';

  return (
    <group position={charge.position}>
      {/* Carga principal */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
        onPointerOut={() => setHover(false)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.3} 
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : (hovered ? 0.4 : 0.2)}
        />
      </mesh>
    </group>
  );
});
