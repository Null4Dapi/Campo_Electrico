import { useRef, useEffect, useMemo } from 'react'
import type { ElementRef } from 'react'
import { Plane, Vector3 } from 'three'
import { OrbitControls, Grid } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { useSimulatorStore } from '../store/useSimulatorStore'
import { Charge } from './Charge'
import { FieldArrows } from './FieldArrows'
import { EquipotentialSurfaces } from './EquipotentialSurfaces'
import { calculateElectricField, calculateElectricPotential } from '../physics/calculus'

function syncCameraZoom(camera: { zoom: number; updateProjectionMatrix: () => void }, zoom: number) {
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
}

type OrbitControlsImpl = ElementRef<typeof OrbitControls>;

export function Scene() {
  const charges = useSimulatorStore((state) => state.charges)
  const resetCameraTrigger = useSimulatorStore((state) => state.resetCameraTrigger)
  const gridVisible = useSimulatorStore((state) => state.gridVisible)
  const zoom = useSimulatorStore((state) => state.zoom)
  const theme = useSimulatorStore((state) => state.theme)
  
  const three = useThree()
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  // Plano para intersección del cursor
  const xzPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), [])
  const intersectPoint = useMemo(() => new Vector3(), [])

  // Mapear cargas a ChargeData con signo para cálculos físicos
  const chargesData = useMemo(() => {
    return charges.map(c => ({
      position: c.position,
      value: c.type === 'positive' ? c.value : -c.value
    }));
  }, [charges]);

  useEffect(() => {
    if (resetCameraTrigger > 0) {
      three.camera.position.set(0, 5, 10);
      three.camera.lookAt(0, 0, 0);
      if (controlsRef.current) {
        controlsRef.current.reset();
      }
    }
  }, [resetCameraTrigger, three.camera]);

  useEffect(() => {
    syncCameraZoom(three.camera, zoom / 100);
  }, [zoom, three.camera]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.threeState = three;
      window.threeScene = three.scene;
      window.threeControls = controlsRef.current;
    }
  }, [three, three.scene]);

  // Rastrear posición del mouse e interactuar con el DOM directamente (60fps sin react lagging)
  useFrame(({ raycaster }) => {
    raycaster.ray.intersectPlane(xzPlane, intersectPoint);
    if (intersectPoint) {
      const x = intersectPoint.x;
      const z = intersectPoint.z;

      let eMag = 0;
      let potential = 0;

      if (chargesData.length > 0) {
        const { magnitude } = calculateElectricField([x, 0, z], chargesData);
        eMag = magnitude;
        potential = calculateElectricPotential([x, 0, z], chargesData);
      }

      let eText = eMag.toFixed(2);
      let vText = potential.toFixed(2);

      // Evitar desbordamiento si el cursor está muy cerca de una carga
      let insideCharge = false;
      for (const c of chargesData) {
        const dx = x - c.position[0];
        const dz = z - c.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.3) {
          insideCharge = true;
          break;
        }
      }

      if (insideCharge) {
        eText = '∞';
        vText = potential >= 0 ? '+∞' : '−∞';
      } else {
        if (eMag >= 1e6) {
          eText = eMag.toExponential(2);
        }
        if (Math.abs(potential) >= 1e6) {
          vText = potential.toExponential(2);
        }
      }

      const elX = document.getElementById('telemetry-x');
      const elZ = document.getElementById('telemetry-z');
      const elE = document.getElementById('telemetry-e');
      const elV = document.getElementById('telemetry-v');

      if (elX) elX.innerText = x.toFixed(2);
      if (elZ) elZ.innerText = z.toFixed(2);
      if (elE) elE.innerText = eText;
      if (elV) elV.innerText = vText;
    }
  });

  const bgColor = theme === 'dark' ? '#000000' : '#f8fafc'
  const gridCellColor = theme === 'dark' ? '#444444' : '#D0D2D4'
  const gridSectionColor = theme === 'dark' ? '#888888' : '#A0A2A4'

  return (
    <>
      <color attach="background" args={[bgColor]} />
      
      <OrbitControls ref={controlsRef} makeDefault />
      
      {gridVisible && (
        <Grid 
          position={[0, 0, 0]} 
          args={[20, 20]} 
          cellSize={1} 
          cellThickness={1} 
          cellColor={gridCellColor} 
          sectionSize={5} 
          sectionThickness={1.5} 
          sectionColor={gridSectionColor} 
          fadeDistance={30} 
        />
      )}

      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />

      <FieldArrows />
      <EquipotentialSurfaces />

      {charges.map((charge) => (
        <Charge key={charge.id} charge={charge} />
      ))}
    </>
  )
}
