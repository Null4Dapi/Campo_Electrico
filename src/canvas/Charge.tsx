import { useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { Plane, Vector3 } from 'three';
import type { Charge as ChargeType } from '../types';
import { useSimulatorStore } from '../store/useSimulatorStore';

interface ChargeProps {
  charge: ChargeType;
}

const xzPlane = new Plane(new Vector3(0, 1, 0), 0);
const intersection = new Vector3();

export function Charge({ charge }: ChargeProps) {
  const updateCharge = useSimulatorStore((state) => state.updateCharge);
  const setIsDraggingGlobal = useSimulatorStore((state) => state.setIsDragging);
  
  const [hovered, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  
  useCursor(hovered || dragging, dragging ? 'grabbing' : 'grab', 'auto');

  // Disable OrbitControls when dragging
  const get = useThree((state) => state.get);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    setIsDraggingGlobal(true);
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
      e.ray.intersectPlane(xzPlane, intersection);
      if (intersection) {
        updateCharge(charge.id, { position: [intersection.x, 0, intersection.z] });
      }
    }
  };

  const color = charge.type === 'positive' ? '#ef4444' : '#3b82f6';

  return (
    <mesh
      position={charge.position}
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
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}
