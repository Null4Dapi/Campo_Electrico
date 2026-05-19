export type ChargeType = 'positive' | 'negative';

export interface Charge {
  id: string;                    // crypto.randomUUID()
  position: [number, number, number]; // [x, y, z] en unidades de escena Three.js
  value: number;                 // magnitud en nanoCulombios (nC). Ej: 1 = 1nC
  type: ChargeType;
}

export interface SimulatorState {
  charges: Charge[];
  showFieldLines: boolean;
  showEquipotential: boolean;
  isSimulating: boolean;
  isDragging: boolean;
  
  // Acciones
  addCharge: (type: ChargeType) => void;
  removeCharge: (id: string) => void;
  updateCharge: (id: string, updates: Partial<Charge>) => void;
  clearScene: () => void;
  toggleFieldLines: () => void;
  toggleEquipotential: () => void;
  setIsDragging: (isDragging: boolean) => void;
}
