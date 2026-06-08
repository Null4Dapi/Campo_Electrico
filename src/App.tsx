import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './canvas/Scene'
import { HeaderNavbar } from './ui/HeaderNavbar'
import { RightToolbar } from './ui/RightToolbar'
import { RightInspector } from './ui/RightInspector'
import { BottomChatInput } from './ui/BottomChatInput'
import { AgentLog } from './ui/AgentLog'
import { useSimulatorStore } from './store/useSimulatorStore'

function App() {
  const theme = useSimulatorStore((state) => state.theme)

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="relative w-screen h-screen bg-slate-50 dark:bg-black overflow-hidden font-sans select-none text-zinc-900 dark:text-white transition-colors duration-500">
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }} gl={{ preserveDrawingBuffer: true }}>
        <Scene />
      </Canvas>
      <HeaderNavbar />
      <RightToolbar />
      <RightInspector />
      <AgentLog />
      <BottomChatInput />
    </div>
  )
}

export default App
