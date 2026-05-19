import { OrbitControls, Grid } from '@react-three/drei'
import { useSimulatorStore } from '../store/useSimulatorStore'
import { Charge } from './Charge'
import { FieldArrows } from './FieldArrows'
import { EquipotentialSurfaces } from './EquipotentialSurfaces'

export function Scene() {
  const charges = useSimulatorStore((state) => state.charges)

  return (
    <>
      <color attach="background" args={['#000000']} />
      
      <OrbitControls makeDefault />
      
      <Grid 
        position={[0, 0, 0]} 
        args={[20, 20]} 
        cellSize={1} 
        cellThickness={1} 
        cellColor="#444" 
        sectionSize={5} 
        sectionThickness={1.5} 
        sectionColor="#888" 
        fadeDistance={30} 
      />

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
