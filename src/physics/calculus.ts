export const ke = 8.98755e9; // N·m²/C²
export const SOFTENING = 1e-10; // Restricción para evitar singularidades en cálculos de campo eléctrico y potencial

export interface ChargeData {
  position: [number, number, number];
  value: number; // en nC
}

/**
 * Calcula el campo eléctrico E(P) por superposición de N cargas.
 * Retorna el vector dirección y la magnitud real en N/C.
 */
export function calculateElectricField(
  point: [number, number, number],
  charges: ChargeData[]
): { direction: [number, number, number]; magnitude: number } {
  let Ex = 0, Ey = 0, Ez = 0;

  for (const charge of charges) {
    const q = charge.value * 1e-9; // nC → C
    const dx = point[0] - charge.position[0];
    const dy = point[1] - charge.position[1];
    const dz = point[2] - charge.position[2];
    
    // Softening: r² + ε² para evitar división por cero catastrófica
    const r2 = dx * dx + dy * dy + dz * dz + SOFTENING;
    const r3 = Math.pow(r2, 1.5);
    const factor = (ke * q) / r3;
    
    Ex += factor * dx;
    Ey += factor * dy;
    Ez += factor * dz;
  }

  const magnitude = Math.sqrt(Ex * Ex + Ey * Ey + Ez * Ez);
  if (magnitude === 0) return { direction: [0, 0, 0], magnitude: 0 };

  return {
    direction: [Ex / magnitude, Ey / magnitude, Ez / magnitude],
    magnitude,
  };
}

/**
 * Calcula el Potencial Eléctrico V(P) por superposición.
 * Usado para el algoritmo superficies equipotenciales.
 */
export function calculateElectricPotential(
  point: [number, number, number],
  charges: ChargeData[]
): number {
  let V = 0;
  for (const charge of charges) {
    const q = charge.value * 1e-9; // nC → C
    const dx = point[0] - charge.position[0];
    const dy = point[1] - charge.position[1];
    const dz = point[2] - charge.position[2];
    
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz + SOFTENING);
    V += (ke * q) / r;
  }
  return V;
}
