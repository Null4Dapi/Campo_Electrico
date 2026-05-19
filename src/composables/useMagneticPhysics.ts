import type { Vec3 } from './usePhysics'
import { magVec, normVec, subVec, addVec, scaleVec, crossVec, dotVec } from './usePhysics'

export const ELEMENTARY_CHARGE = 1.602176634e-19  // C
export const PROTON_MASS       = 1.67262192e-27   // kg
export const ELECTRON_MASS     = 9.1093837e-31    // kg

export interface ParticlePreset {
  name: string
  symbol: string
  q: number   // C
  m: number   // kg
  color: string
}

export const PARTICLE_PRESETS: ParticlePreset[] = [
  { name: 'Protón',        symbol: 'p⁺', q: +ELEMENTARY_CHARGE,      m: PROTON_MASS,             color: '#ef4444' },
  { name: 'Electrón',      symbol: 'e⁻', q: -ELEMENTARY_CHARGE,      m: ELECTRON_MASS,            color: '#60a5fa' },
  { name: 'Partícula α',   symbol: 'α',  q: +2 * ELEMENTARY_CHARGE,  m: 4 * PROTON_MASS,          color: '#f59e0b' },
  { name: 'Personalizado', symbol: '?',  q: +ELEMENTARY_CHARGE,      m: PROTON_MASS,              color: '#a78bfa' },
]

export type MotionType = 'circular' | 'helical' | 'linear' | 'none'

export interface TrajectoryPoint {
  pos: Vec3
  vel: Vec3
}

export interface LorentzSolution {
  trajectory: TrajectoryPoint[]    // scaled for scene
  rawTrajectory: TrajectoryPoint[] // physical units (unscaled)
  T_c:        number   // cyclotron period (s)
  omega_c:    number   // cyclotron angular frequency (rad/s)
  r_c:        number   // cyclotron radius (m)
  v_perp:     number   // speed perpendicular to B (m/s)
  v_par:      number   // speed parallel to B (m/s)
  v0mag:      number   // total initial speed (m/s)
  pitch:      number   // helix pitch (m)
  motionType: MotionType
  sceneScale: number   // scene units per meter (for legend)
  Fmag_init:  number   // |F| at t=0 (N)
}

// ── RK4 integrator ───────────────────────────────────────────────────────────

function lorentzAccel(vel: Vec3, q: number, m: number, B: Vec3): Vec3 {
  return scaleVec(crossVec(vel, B), q / m)
}

function rk4Step(pos: Vec3, vel: Vec3, dt: number, q: number, m: number, B: Vec3) {
  const a1 = lorentzAccel(vel, q, m, B)

  const v2 = addVec(vel, scaleVec(a1, dt / 2))
  const a2 = lorentzAccel(v2, q, m, B)

  const v3 = addVec(vel, scaleVec(a2, dt / 2))
  const a3 = lorentzAccel(v3, q, m, B)

  const v4 = addVec(vel, scaleVec(a3, dt))
  const a4 = lorentzAccel(v4, q, m, B)

  return {
    pos: {
      x: pos.x + (vel.x + 2*v2.x + 2*v3.x + v4.x) * dt / 6,
      y: pos.y + (vel.y + 2*v2.y + 2*v3.y + v4.y) * dt / 6,
      z: pos.z + (vel.z + 2*v2.z + 2*v3.z + v4.z) * dt / 6,
    } as Vec3,
    vel: {
      x: vel.x + (a1.x + 2*a2.x + 2*a3.x + a4.x) * dt / 6,
      y: vel.y + (a1.y + 2*a2.y + 2*a3.y + a4.y) * dt / 6,
      z: vel.z + (a1.z + 2*a2.z + 2*a3.z + a4.z) * dt / 6,
    } as Vec3,
  }
}

// ── Main solver ───────────────────────────────────────────────────────────────

export interface LorentzParams {
  q: number     // C
  m: number     // kg
  v0: Vec3      // m/s
  B: Vec3       // T
  numPeriods: number
}

export function solveLorentz(p: LorentzParams): LorentzSolution {
  const { q, m, v0, B, numPeriods } = p
  const Bmag   = magVec(B)
  const v0mag  = magVec(v0)
  const r0: Vec3 = { x: 0, y: 0, z: 0 }

  // Initial Lorentz force magnitude
  const F_init = crossVec(v0, B)
  const Fmag_init = Math.abs(q) * magVec(F_init)

  if (Bmag < 1e-30 || v0mag < 1e-12) {
    // Degenerate case: straight line or stationary
    const N = 200
    const tTotal = v0mag > 0 ? 2e-6 : 1
    const dt = tTotal / N
    const traj: TrajectoryPoint[] = []
    let pos = { ...r0 }, vel = { ...v0 }
    for (let i = 0; i <= N; i++) {
      traj.push({ pos: { ...pos }, vel: { ...vel } })
      pos = addVec(pos, scaleVec(vel, dt))
    }
    return {
      trajectory: traj, rawTrajectory: traj,
      T_c: Infinity, omega_c: 0, r_c: 0,
      v_perp: v0mag, v_par: 0, v0mag,
      pitch: 0, motionType: 'linear', sceneScale: 1, Fmag_init,
    }
  }

  const Bdir = normVec(B)
  const v_par_scalar = dotVec(v0, Bdir)
  const v_par_vec = scaleVec(Bdir, v_par_scalar)
  const v_perp_vec = subVec(v0, v_par_vec)
  const v_perp = magVec(v_perp_vec)
  const v_par  = Math.abs(v_par_scalar)

  const omega_c = Math.abs(q) * Bmag / m
  const T_c     = 2 * Math.PI / omega_c
  const r_c     = m * v_perp / (Math.abs(q) * Bmag)
  const pitch   = v_par * T_c

  const motionType: MotionType =
    v_perp < v0mag * 0.001 ? 'linear'   :
    v_par  < v0mag * 0.001 ? 'circular' :
    'helical'

  // Integrate
  const STEPS_PER_PERIOD = 150
  const totalSteps = Math.ceil(numPeriods * STEPS_PER_PERIOD)
  const dt = T_c / STEPS_PER_PERIOD

  const rawTraj: TrajectoryPoint[] = []
  let pos = { ...r0 }, vel = { ...v0 }
  for (let i = 0; i <= totalSteps; i++) {
    rawTraj.push({ pos: { ...pos }, vel: { ...vel } })
    const next = rk4Step(pos, vel, dt, q, m, B)
    pos = next.pos; vel = next.vel
  }

  // Scene scaling: fit trajectory into ≈ 1.5 scene units radius
  const TARGET_R = 1.5
  const TARGET_H = 3.5  // half-height for helical stretch
  const radiusScale = r_c > 0 ? TARGET_R / r_c : 1
  const totalHeight = pitch * numPeriods
  const heightScale = totalHeight > 0.01 ? TARGET_H / (totalHeight * 0.5) : radiusScale
  const sceneScale  = Math.min(radiusScale, heightScale)

  const trajectory = rawTraj.map(pt => ({
    pos: scaleVec(pt.pos, sceneScale),
    vel: pt.vel,
  }))

  return {
    trajectory, rawTrajectory: rawTraj,
    T_c, omega_c, r_c, v_perp, v_par, v0mag,
    pitch, motionType, sceneScale, Fmag_init,
  }
}

export { crossVec, dotVec }
