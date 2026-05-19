export const k_e = 8.99e9 // N·m²/C²

export interface Vec3 {
  x: number
  y: number
  z: number
}

export function addVec(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function subVec(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function magVec(v: Vec3): number {
  return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2)
}

export function normVec(v: Vec3): Vec3 {
  const m = magVec(v)
  if (m < 1e-12) return { x: 0, y: 0, z: 0 }
  return { x: v.x / m, y: v.y / m, z: v.z / m }
}

export function scaleVec(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

export function dotVec(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function crossVec(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export interface ChargeData {
  q_nC: number
  x: number
  y: number
  z: number
}

export function eFieldFromCharge(q_nC: number, rq: Vec3, rp: Vec3): Vec3 {
  const q = q_nC * 1e-9
  const r = subVec(rp, rq)
  const r2 = r.x ** 2 + r.y ** 2 + r.z ** 2
  if (r2 < 1e-8) return { x: 0, y: 0, z: 0 }
  const mag = k_e * q / r2
  return scaleVec(normVec(r), mag)
}

export function totalEField(charges: ChargeData[], rp: Vec3): Vec3 {
  return charges.reduce(
    (acc, c) => addVec(acc, eFieldFromCharge(c.q_nC, { x: c.x, y: c.y, z: c.z }, rp)),
    { x: 0, y: 0, z: 0 } as Vec3
  )
}

export function ePotentialFromCharge(q_nC: number, rq: Vec3, rp: Vec3): number {
  const q = q_nC * 1e-9
  const r = subVec(rp, rq)
  const dist = magVec(r)
  if (dist < 1e-4) return 0
  return k_e * q / dist
}

export function totalEPotential(charges: ChargeData[], rp: Vec3): number {
  return charges.reduce(
    (acc, c) => acc + ePotentialFromCharge(c.q_nC, { x: c.x, y: c.y, z: c.z }, rp),
    0
  )
}

export function traceFieldLine(
  charges: ChargeData[],
  startPos: Vec3,
  maxSteps = 200,
  stepSize = 0.05
): Vec3[] {
  const line: Vec3[] = [startPos]
  let currentPos = { ...startPos }

  for (let i = 0; i < maxSteps; i++) {
    const E = totalEField(charges, currentPos)
    const Emag = magVec(E)
    if (Emag < 1e-6) break

    // Direction of the field
    const dir = normVec(E)
    
    // Step forward
    currentPos = addVec(currentPos, scaleVec(dir, stepSize))
    line.push({ ...currentPos })

    // Stop if we get too close to any charge (sink)
    let tooClose = false
    for (const c of charges) {
      const dist = magVec(subVec(currentPos, { x: c.x, y: c.y, z: c.z }))
      if (dist < 0.1) {
        tooClose = true
        break
      }
    }
    if (tooClose) break
    
    // Stop if we go way out of bounds
    if (magVec(currentPos) > 10) break
  }

  return line
}

export function formatNum(n: number, d = 4): string {
  if (Math.abs(n) === 0) return '0'
  if (Math.abs(n) >= 0.001 && Math.abs(n) < 100000) return n.toFixed(d)
  const exp = Math.floor(Math.log10(Math.abs(n)))
  const base = n / Math.pow(10, exp)
  return `${base.toFixed(2)} × 10<sup>${exp}</sup>`
}
