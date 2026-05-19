import { useSimulatorStore } from '../store/useSimulatorStore';

export function ControlsMenu() {
  const addCharge = useSimulatorStore((state) => state.addCharge);
  const clearScene = useSimulatorStore((state) => state.clearScene);
  const showFieldLines = useSimulatorStore((state) => state.showFieldLines);
  const showEquipotential = useSimulatorStore((state) => state.showEquipotential);
  const toggleFieldLines = useSimulatorStore((state) => state.toggleFieldLines);
  const toggleEquipotential = useSimulatorStore((state) => state.toggleEquipotential);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
      {/* Toggles and Actions */}
      <div className="flex gap-4 px-6 py-3 bg-neutral-900/60 backdrop-blur-md border border-white/10 rounded-full shadow-2xl text-sm text-neutral-300">
        <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
          <input 
            type="checkbox" 
            checked={showFieldLines} 
            onChange={toggleFieldLines} 
            className="accent-white"
          />
          Líneas de Campo
        </label>
        
        <div className="w-px h-5 bg-white/20" />

        <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
          <input 
            type="checkbox" 
            checked={showEquipotential} 
            onChange={toggleEquipotential} 
            className="accent-white"
          />
          Equipotenciales
        </label>

        <div className="w-px h-5 bg-white/20" />

        <button 
          onClick={clearScene}
          className="hover:text-red-400 transition-colors uppercase text-xs font-bold tracking-wider"
        >
          Limpiar
        </button>
      </div>

      {/* Primary Actions (Add charges) */}
      <div className="flex gap-4">
        <button
          onClick={() => addCharge('positive')}
          className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/50 text-red-500 flex items-center justify-center text-2xl font-light hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]"
          title="Agregar carga positiva"
        >
          +
        </button>
        <button
          onClick={() => addCharge('negative')}
          className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/50 text-blue-500 flex items-center justify-center text-2xl font-light hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.6)]"
          title="Agregar carga negativa"
        >
          −
        </button>
      </div>
    </div>
  );
}
