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
  resetCameraTrigger: number;
  selectedChargeId: string | null;
  isInspectorMinimized: boolean;
  snapToGrid: boolean;
  gridVisible: boolean;
  showSettings: boolean;
  zoom: number;
  isChatOpen: boolean;
  sessionId: string;
  theme: 'dark' | 'light';
  
  // Acciones
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  addCharge: (type: ChargeType) => void;
  addChargeAt: (type: ChargeType, position: [number, number, number], value: number) => void;
  removeCharge: (id: string) => void;
  updateCharge: (id: string, updates: Partial<Charge>) => void;
  clearScene: () => void;
  toggleFieldLines: () => void;
  toggleEquipotential: () => void;
  setShowFieldLines: (show: boolean) => void;
  setShowEquipotential: (show: boolean) => void;
  setIsDragging: (isDragging: boolean) => void;
  triggerResetCamera: () => void;
  selectCharge: (id: string | null) => void;
  toggleInspectorMinimized: () => void;
  setInspectorMinimized: (minimized: boolean) => void;
  toggleSnapToGrid: () => void;
  toggleGridVisible: () => void;
  setGridVisible: (visible: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  toggleSettings: () => void;
  setShowSettings: (show: boolean) => void;
  setZoom: (zoom: number) => void;
  toggleSimulating: () => void;
  setSimulating: (simulating: boolean) => void;
  toggleChat: () => void;
  setIsChatOpen: (open: boolean) => void;
  clearChatSession: () => void;
}
