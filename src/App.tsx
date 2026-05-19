import { Canvas } from '@react-three/fiber'
import { Scene } from './canvas/Scene'
import { ControlsMenu } from './ui/ControlsMenu'

function App() {
  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <Scene />
      </Canvas>
      <ControlsMenu />
    </div>
  )
}

export default App
