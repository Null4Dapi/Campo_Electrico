import { create } from 'zustand';
import type { SimulatorState, ChargeType } from '../types';

export const useSimulatorStore = create<SimulatorState>((set) => ({
  charges: [
    // Carga de prueba inicial en el origen
    { id: crypto.randomUUID(), position: [0, 0, 0], value: 1, type: 'positive' }
  ],
  showFieldLines: true,
  showEquipotential: true,
  isSimulating: true,
  isDragging: false,

  addCharge: (type: ChargeType) => set((state) => ({
    charges: [...state.charges, {
      id: crypto.randomUUID(),
      position: [Math.random() * 4 - 2, 0, Math.random() * 4 - 2],
      value: 1,
      type,
    }]
  })),

  removeCharge: (id) => set((state) => ({
    charges: state.charges.filter((c) => c.id !== id)
  })),

  updateCharge: (id, updates) => set((state) => ({
    charges: state.charges.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),

  clearScene: () => set({ charges: [] }),
  toggleFieldLines: () => set((state) => ({ showFieldLines: !state.showFieldLines })),
  toggleEquipotential: () => set((state) => ({ showEquipotential: !state.showEquipotential })),
  setIsDragging: (isDragging) => set({ isDragging }),
}));
