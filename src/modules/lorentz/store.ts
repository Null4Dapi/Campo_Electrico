import { reactive } from 'vue'
import { ELEMENTARY_CHARGE, PROTON_MASS, ELECTRON_MASS, type LorentzSolution } from '../../composables/useMagneticPhysics'

export type ParticleType = 'proton' | 'electron' | 'alpha' | 'custom'

interface LorentzState {
  particleType: ParticleType
  q: number    // C
  m: number    // kg
  vx: number   // m/s
  vy: number   // m/s
  vz: number   // m/s
  Bx: number   // T
  By: number   // T
  Bz: number   // T
  numPeriods: number
  isPlaying: boolean
  solution: LorentzSolution | null
}

const state = reactive<LorentzState>({
  particleType: 'proton',
  q: +ELEMENTARY_CHARGE,
  m: PROTON_MASS,
  vx: 1e6,
  vy: 0,
  vz: 0,
  Bx: 0,
  By: 0,
  Bz: 0.01,
  numPeriods: 3,
  isPlaying: true,
  solution: null,
})

export function useLorentzStore() {
  function setParticle(type: ParticleType) {
    state.particleType = type
    if (type === 'proton') {
      state.q = +ELEMENTARY_CHARGE; state.m = PROTON_MASS
    } else if (type === 'electron') {
      state.q = -ELEMENTARY_CHARGE; state.m = ELECTRON_MASS
    } else if (type === 'alpha') {
      state.q = +2 * ELEMENTARY_CHARGE; state.m = 4 * PROTON_MASS
    }
  }

  function loadPreset(name: 'circular' | 'helical' | 'electron') {
    if (name === 'circular') {
      setParticle('proton')
      state.vx = 1e6; state.vy = 0; state.vz = 0
      state.Bx = 0;   state.By = 0; state.Bz = 0.01
      state.numPeriods = 3
    } else if (name === 'helical') {
      setParticle('proton')
      state.vx = 1e6; state.vy = 0; state.vz = 5e5
      state.Bx = 0;   state.By = 0; state.Bz = 0.01
      state.numPeriods = 4
    } else if (name === 'electron') {
      setParticle('electron')
      state.vx = 2e7; state.vy = 0; state.vz = 0
      state.Bx = 0;   state.By = 0; state.Bz = 0.5
      state.numPeriods = 3
    }
  }

  return { state, setParticle, loadPreset }
}
