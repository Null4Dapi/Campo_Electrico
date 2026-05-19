import { addVec, subVec, magVec, scaleVec, crossVec, type Vec3 } from '../../composables/usePhysics'
export { type Vec3 }

export const MU0 = 4 * Math.PI * 1e-7  // T·m/A

export type ConductorType = 'wire' | 'loop' | 'solenoid'

type Seg = { pos: Vec3; dl: Vec3 }

// Wire along Z axis from z = -L/2 to z = L/2, current in +Z
export function wireSegs(L: number, N = 200): Seg[] {
  const dz = L / N
  return Array.from({ length: N }, (_, i) => ({
    pos: { x: 0, y: 0, z: -L / 2 + (i + 0.5) * dz },
    dl:  { x: 0, y: 0, z: dz },
  }))
}

// Loop in XY plane, radius R, current CCW from above → B in +Z at center
export function loopSegs(R: number, N = 300): Seg[] {
  const dphi = (2 * Math.PI) / N
  return Array.from({ length: N }, (_, i) => {
    const phi = i * dphi
    return {
      pos: { x: R * Math.cos(phi), y: R * Math.sin(phi), z: 0 },
      dl:  { x: -R * Math.sin(phi) * dphi, y: R * Math.cos(phi) * dphi, z: 0 },
    }
  })
}

// Solenoid along Z axis, radius R, length L, N_turns turns → B in +Z inside
export function solenoidSegs(R: number, Lz: number, N_turns: number, perTurn = 50): Seg[] {
  const N = N_turns * perTurn
  const dt = 1 / N
  return Array.from({ length: N }, (_, i) => {
    const t = i * dt
    const phi = 2 * Math.PI * N_turns * t
    const dphi = 2 * Math.PI * N_turns * dt
    return {
      pos: { x: R * Math.cos(phi), y: R * Math.sin(phi), z: -Lz / 2 + Lz * t },
      dl:  { x: -R * Math.sin(phi) * dphi, y: R * Math.cos(phi) * dphi, z: Lz * dt },
    }
  })
}

// Numerical Biot-Savart integrator: dB = (μ₀I/4π) dl × r̂ / r²
export function bField(segs: Seg[], I: number, rp: Vec3): Vec3 {
  let B: Vec3 = { x: 0, y: 0, z: 0 }
  const k = (MU0 * I) / (4 * Math.PI)
  for (const s of segs) {
    const r = subVec(rp, s.pos)
    const r2 = r.x ** 2 + r.y ** 2 + r.z ** 2
    if (r2 < 1e-18) continue
    B = addVec(B, scaleVec(crossVec(s.dl, r), k / (r2 * Math.sqrt(r2))))
  }
  return B
}

// ── Analytical formulas ───────────────────────────────────────────────────────

// Infinite wire: B = μ₀I / (2πd)  where d = perpendicular distance
export const wireB_inf = (I: number, d: number) =>
  d > 1e-10 ? (MU0 * I) / (2 * Math.PI * d) : 0

// Loop at center: B = μ₀I / (2R)
export const loopB_center = (I: number, R: number) => (MU0 * I) / (2 * R)

// Loop on axis at distance z: B = μ₀IR² / [2(R²+z²)^(3/2)]
export const loopB_axis = (I: number, R: number, z: number) =>
  (MU0 * I * R ** 2) / (2 * (R ** 2 + z ** 2) ** 1.5)

// Solenoid interior: B = μ₀nI  where n = N/L
export const solenoidB_inside = (I: number, N: number, L: number) =>
  MU0 * (N / L) * I

// ── Solution object ───────────────────────────────────────────────────────────

export interface BSSolution {
  conductorType: ConductorType
  I: number
  wireLength: number
  loopRadius: number
  solenoidLength: number
  solenoidRadius: number
  solenoidTurns: number
  sceneScale: number
  Bcenter: number   // B at reference point for wire/loop (T)
  Binside: number   // B inside solenoid (T)
  Bat_P: Vec3 | null
  Bmag_P: number | null
}

export function solveBiot(p: {
  conductorType: ConductorType
  I: number
  wireLength: number
  loopRadius: number
  solenoidLength: number
  solenoidRadius: number
  solenoidTurns: number
  solvePoint: Vec3 | null
  sceneScale: number
}): BSSolution {
  let Bcenter = 0, Binside = 0
  let Bat_P: Vec3 | null = null, Bmag_P: number | null = null

  if (p.conductorType === 'wire') {
    Bcenter = wireB_inf(p.I, 1 / p.sceneScale)
  } else if (p.conductorType === 'loop') {
    Bcenter = loopB_center(p.I, p.loopRadius)
  } else {
    Binside = solenoidB_inside(p.I, p.solenoidTurns, p.solenoidLength)
  }

  if (p.solvePoint) {
    const sc = p.sceneScale
    const phys: Vec3 = {
      x: p.solvePoint.x / sc,
      y: p.solvePoint.y / sc,
      z: p.solvePoint.z / sc,
    }
    let segs: Seg[]
    if (p.conductorType === 'wire') segs = wireSegs(p.wireLength)
    else if (p.conductorType === 'loop') segs = loopSegs(p.loopRadius)
    else segs = solenoidSegs(p.solenoidRadius, p.solenoidLength, p.solenoidTurns)
    Bat_P = bField(segs, p.I, phys)
    Bmag_P = magVec(Bat_P)
  }

  return {
    conductorType: p.conductorType,
    I: p.I,
    wireLength: p.wireLength,
    loopRadius: p.loopRadius,
    solenoidLength: p.solenoidLength,
    solenoidRadius: p.solenoidRadius,
    solenoidTurns: p.solenoidTurns,
    sceneScale: p.sceneScale,
    Bcenter,
    Binside,
    Bat_P,
    Bmag_P,
  }
}
