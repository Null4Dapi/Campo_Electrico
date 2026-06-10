import { useRef, useEffect, useMemo } from 'react'
import type { ElementRef } from 'react'
import { Plane, Vector3 } from 'three'
import { OrbitControls, Grid, Line, Text } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { useSimulatorStore } from '../store/useSimulatorStore'
import { Charge } from './Charge'
import { FieldArrows } from './FieldArrows'
import { EquipotentialSurfaces } from './EquipotentialSurfaces'
import { TapeMeasure } from './TapeMeasure'
import { calculateElectricField, calculateElectricPotential } from '../physics/calculus'

function syncCameraZoom(camera: { zoom: number; updateProjectionMatrix: () => void }, zoom: number) {
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
}

type OrbitControlsImpl = ElementRef<typeof OrbitControls>;

function AxisLabel({ position, label, color }: { position: [number, number, number], label: string, color: string }) {
  return (
    <Text 
      position={position}
      fontSize={1.5} 
      color={color}
      anchorX="center"
      anchorY="middle"
    >
      {label}
    </Text>
  );
}

export function Scene() {
  const charges = useSimulatorStore((state) => state.charges)
  const resetCameraTrigger = useSimulatorStore((state) => state.resetCameraTrigger)
  const gridVisible = useSimulatorStore((state) => state.gridVisible)
  const zoom = useSimulatorStore((state) => state.zoom)
  const theme = useSimulatorStore((state) => state.theme)
  const cameraView = useSimulatorStore((state) => state.cameraView)
  const setCameraView = useSimulatorStore((state) => state.setCameraView)
  const interactionMode = useSimulatorStore((state) => state.interactionMode)
  
  const camera = useThree((state) => state.camera)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const lastUpdateTime = useRef(0)

  // Define el plano base para el cálculo de intersecciones espaciales del cursor
  const xzPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), [])
  const intersectPoint = useMemo(() => new Vector3(), [])
  
  // Establece las coordenadas destino predeterminadas para los ángulos de cámara
  const viewPositions = useMemo(() => ({
    isometric: new Vector3(10, 10, 10),
    top: new Vector3(0, 15, 0),
    front: new Vector3(0, 0, 15),
    right: new Vector3(15, 0, 0)
  }), []);
  const targetLookAt = useMemo(() => new Vector3(0, 0, 0), []);

  // Transforma las estructuras de carga a un formato con signo explícito para cálculos físicos
  const chargesData = useMemo(() => {
    return charges.map(c => ({
      position: c.position,
      value: c.type === 'positive' ? c.value : -c.value
    }));
  }, [charges]);

  useEffect(() => {
    if (resetCameraTrigger > 0) {
      setCameraView('isometric');
      if (controlsRef.current) {
        controlsRef.current.reset();
      }
    }
  }, [resetCameraTrigger, setCameraView]);

  useEffect(() => {
    syncCameraZoom(camera, zoom / 100);
  }, [zoom, camera]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.threeControls = controlsRef.current;
    }
  }, []);

  // Rastrea la intersección del cursor en el espacio tridimensional aplicando limitación de frecuencia para optimización del CPU
  useFrame(({ raycaster, camera }) => {
    // Aplica interpolación lineal para suavizar la transición hacia vistas predefinidas
    if (cameraView !== 'custom') {
      const targetPos = viewPositions[cameraView as keyof typeof viewPositions];
      if (targetPos) {
        camera.position.lerp(targetPos, 0.05);
        if (controlsRef.current) {
          controlsRef.current.target.lerp(targetLookAt, 0.05);
          controlsRef.current.update();
        }
      }
    }

    const now = performance.now();
    if (now - lastUpdateTime.current < 50) return; // Aplica restricción de tasa de actualización a 20 cuadros por segundo
    lastUpdateTime.current = now;

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

      // Evita valores asintóticos inestables cuando la intersección es adyacente a una carga
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

  const bgColor = useMemo(() => theme === 'dark' ? '#000000' : '#f8fafc', [theme])
  const gridCellColor = useMemo(() => theme === 'dark' ? '#444444' : '#D0D2D4', [theme])
  const gridSectionColor = useMemo(() => theme === 'dark' ? '#888888' : '#A0A2A4', [theme])

  const xColor = theme === 'dark' ? '#f87171' : '#dc2626';
  const yColor = theme === 'dark' ? '#4ade80' : '#16a34a';
  const zColor = theme === 'dark' ? '#60a5fa' : '#2563eb';

  return (
    <>
      <color attach="background" args={[bgColor]} />
      
      <OrbitControls 
        ref={controlsRef} 
        makeDefault 
        onStart={() => {
          if (cameraView !== 'custom') setCameraView('custom');
        }}
        mouseButtons={{
          LEFT: interactionMode === 'pan' ? 2 : 0, // Configura el botón izquierdo para traslación (2) o rotación (0)
          MIDDLE: 1, // Configura el botón central para control de profundidad
          RIGHT: interactionMode === 'pan' ? 0 : 2
        }}
      />
      
      {gridVisible && (
        <group>
          <Grid 
            position={[0, 0, 0]} 
            args={[100, 100]} 
            cellSize={1} 
            cellThickness={1} 
            cellColor={gridCellColor} 
            sectionSize={5} 
            sectionThickness={1.5} 
            sectionColor={gridSectionColor} 
            fadeDistance={80} 
            fadeStrength={1}
            infiniteGrid
          />
          {/* Representación visual de los ejes principales con estilo minimalista */}
          {/* Representación gráfica del Eje X */}
          <Line points={[[0, 0, 0], [40, 0, 0]]} color={xColor} lineWidth={2} transparent opacity={0.7} />
          <Line points={[[-40, 0, 0], [0, 0, 0]]} color={xColor} lineWidth={1.5} transparent opacity={0.25} dashed dashScale={1} dashSize={0.5} gapSize={0.5} />
          <AxisLabel position={[42, 0, 0]} label="X" color={xColor} />
          <AxisLabel position={[-42, 0, 0]} label="-X" color={xColor} />
          
          {/* Representación gráfica del Eje Y */}
          <Line points={[[0, 0, 0], [0, 40, 0]]} color={yColor} lineWidth={2} transparent opacity={0.7} />
          <Line points={[[0, -40, 0], [0, 0, 0]]} color={yColor} lineWidth={1.5} transparent opacity={0.25} dashed dashScale={1} dashSize={0.5} gapSize={0.5} />
          <AxisLabel position={[0, 42, 0]} label="Y" color={yColor} />
          <AxisLabel position={[0, -42, 0]} label="-Y" color={yColor} />

          {/* Representación gráfica del Eje Z */}
          <Line points={[[0, 0, 0], [0, 0, 40]]} color={zColor} lineWidth={2} transparent opacity={0.7} />
          <Line points={[[0, 0, -40], [0, 0, 0]]} color={zColor} lineWidth={1.5} transparent opacity={0.25} dashed dashScale={1} dashSize={0.5} gapSize={0.5} />
          <AxisLabel position={[0, 0, 42]} label="Z" color={zColor} />
          <AxisLabel position={[0, 0, -42]} label="-Z" color={zColor} />
        </group>
      )}

      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />

      <FieldArrows />
      <EquipotentialSurfaces />
      <TapeMeasure />

      {charges.map((charge) => (
        <Charge key={charge.id} charge={charge} />
      ))}
    </>
  )
}
