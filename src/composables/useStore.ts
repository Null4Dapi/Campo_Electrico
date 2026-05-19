import { reactive } from 'vue'

export interface Charge {
  id: number
  q_nC: number
  x: number
  y: number
  z: number
}

export type Plane = 'xy' | 'xz' | 'yz'

export interface SolvePoint {
  x: number
  y: number
  z: number
}

interface AppState {
  charges: Charge[]
  chargeCounter: number
  resolution: number
  plane: Plane
  showVectors: boolean
  showPotential: boolean
  solvePoint: SolvePoint | null
}

const state = reactive<AppState>({
  charges: [],
  chargeCounter: 0,
  resolution: 7,
  plane: 'xy',
  showVectors: true,
  showPotential: false,
  solvePoint: null,
})

export function useStore() {
  function addCharge(q_nC: number, x: number, y: number, z: number) {
    state.charges.push({ id: state.chargeCounter++, q_nC, x, y, z })
  }

  function removeCharge(id: number) {
    const idx = state.charges.findIndex(c => c.id === id)
    if (idx !== -1) state.charges.splice(idx, 1)
  }

  function loadPreset(name: 'dipole' | 'triangle' | 'square') {
    state.charges = []
    state.chargeCounter = 0
    state.solvePoint = null
    if (name === 'dipole') {
      addCharge(+2, -0.5, 0, 0)
      addCharge(-2, +0.5, 0, 0)
    } else if (name === 'triangle') {
      addCharge(+3, 0.0, 0.8, 0)
      addCharge(+3, -0.7, -0.4, 0)
      addCharge(-3, +0.7, -0.4, 0)
    } else if (name === 'square') {
      addCharge(+2, -0.5, +0.5, 0)
      addCharge(-2, +0.5, +0.5, 0)
      addCharge(-2, -0.5, -0.5, 0)
      addCharge(+2, +0.5, -0.5, 0)
    }
  }

  return { state, addCharge, removeCharge, loadPreset }
}
