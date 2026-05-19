import { reactive } from 'vue'
import type { ConductorType, BSSolution } from './physics'
import type { Vec3 } from '../../composables/usePhysics'

interface BSState {
  conductorType: ConductorType
  I: number
  wireLength: number   // m
  loopRadius: number   // m
  solenoidLength: number  // m
  solenoidRadius: number  // m
  solenoidTurns: number
  solvePoint: Vec3 | null
  solution: BSSolution | null
}

const state = reactive<BSState>({
  conductorType: 'wire',
  I: 10,
  wireLength: 1,
  loopRadius: 0.05,
  solenoidLength: 0.2,
  solenoidRadius: 0.02,
  solenoidTurns: 10,
  solvePoint: null,
  solution: null,
})

export function useBiotStore() {
  function getSceneScale(): number {
    if (state.conductorType === 'wire') return 2.5 / state.wireLength
    if (state.conductorType === 'loop') return 1.5 / state.loopRadius
    return 2.5 / state.solenoidLength
  }

  function loadPreset(name: 'wire' | 'loop' | 'solenoid') {
    state.conductorType = name
    state.solvePoint = null
    state.solution = null
    if (name === 'wire') {
      state.I = 10; state.wireLength = 1
    } else if (name === 'loop') {
      state.I = 5; state.loopRadius = 0.05
    } else {
      state.I = 2; state.solenoidLength = 0.2; state.solenoidRadius = 0.02; state.solenoidTurns = 10
    }
  }

  return { state, getSceneScale, loadPreset }
}
