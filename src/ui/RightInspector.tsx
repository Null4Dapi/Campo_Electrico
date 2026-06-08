import { useSimulatorStore } from '../store/useSimulatorStore';

export function RightInspector() {
  const charges = useSimulatorStore((state) => state.charges);
  const selectedChargeId = useSimulatorStore((state) => state.selectedChargeId);
  const isInspectorMinimized = useSimulatorStore((state) => state.isInspectorMinimized);
  const selectCharge = useSimulatorStore((state) => state.selectCharge);
  const updateCharge = useSimulatorStore((state) => state.updateCharge);
  const removeCharge = useSimulatorStore((state) => state.removeCharge);
  const toggleInspectorMinimized = useSimulatorStore((state) => state.toggleInspectorMinimized);
  const setInspectorMinimized = useSimulatorStore((state) => state.setInspectorMinimized);

  const selectedCharge = charges.find((c) => c.id === selectedChargeId);

  if (!selectedCharge) return null;

  const handlePositionChange = (axis: 'x' | 'y' | 'z', valueStr: string) => {
    const num = parseFloat(valueStr);
    if (!isNaN(num)) {
      const currentPos = [...selectedCharge.position];
      if (axis === 'x') currentPos[0] = num;
      else if (axis === 'y') currentPos[1] = num;
      else currentPos[2] = num;
      updateCharge(selectedCharge.id, { position: currentPos as [number, number, number] });
    }
  };

  const handleValueChange = (valueStr: string) => {
    const num = parseFloat(valueStr);
    if (!isNaN(num) && num > 0) {
      updateCharge(selectedCharge.id, { value: num });
    }
  };
  const togglePolarity = () => {
    const newType = selectedCharge.type === 'positive' ? 'negative' : 'positive';
    updateCharge(selectedCharge.id, { type: newType });
  };

  const isPositive = selectedCharge.type === 'positive';

  return (
    <div className="absolute top-[80px] right-4 lg:right-6 z-30 pointer-events-auto flex flex-col items-end gap-2.5 max-w-[calc(100vw-2rem)]">
      
      {/* Botón Disparador Sutil (Gear Icon) */}
      <button
        onClick={toggleInspectorMinimized}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 border ${
          !isInspectorMinimized
            ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/35 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
            : 'bg-white/80 dark:bg-zinc-950/80 text-zinc-500 dark:text-zinc-400 border-black/10 dark:border-white/10 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/20 dark:hover:border-white/20 shadow-md'
        }`}
        title={!isInspectorMinimized ? 'Cerrar Propiedades' : 'Abrir Propiedades'}
        aria-label="Alternar Panel de Propiedades"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-500 hover:rotate-45"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      {/* Panel Desplegable (Compacto, Sutil y Responsivo) */}
      {!isInspectorMinimized && (
        <div className="w-[280px] sm:w-[320px] max-w-full relative border border-black/10 dark:border-white/10 p-5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-zinc-900 dark:text-white flex flex-col gap-5 transition-all duration-300 animate-in fade-in slide-in-from-top-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* Background blur layer */}
          <div className="absolute inset-0 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl rounded-2xl -z-10 pointer-events-none" />
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
              <span className="text-xs text-zinc-800 dark:text-zinc-100 uppercase tracking-widest font-bold">Propiedades</span>
            </div>
            
            <button 
              onClick={() => setInspectorMinimized(true)}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer group"
              title="Minimizar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:rotate-90">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Badge de tipo de carga */}
          <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${
            isPositive 
              ? 'bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
              : 'bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] transition-colors duration-300 ${isPositive ? 'bg-red-500 text-red-500' : 'bg-blue-500 text-blue-500'}`} />
            <span className={`text-[13px] font-bold tracking-wide transition-colors duration-300 ${isPositive ? 'text-red-400' : 'text-blue-400'}`}>
              {isPositive ? 'Carga Positiva (+)' : 'Carga Negativa (−)'}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {/* Posición X */}
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                <span>Coordenada X</span>
                <div className="flex items-center gap-1 bg-black/5 dark:bg-zinc-900/80 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 focus-within:border-black/30 dark:focus-within:border-white/30 focus-within:ring-1 focus-within:ring-black/10 dark:focus-within:ring-white/10 transition-all">
                  <input
                    type="number"
                    id="coord-x"
                    name="coord-x"
                    step="0.1"
                    value={Number(selectedCharge.position[0].toFixed(2))}
                    onChange={(e) => handlePositionChange('x', e.target.value)}
                    className="w-14 bg-transparent text-right font-mono text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-zinc-500 text-xs font-mono">m</span>
                </div>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={selectedCharge.position[0]}
                onChange={(e) => handlePositionChange('x', e.target.value)}
                className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-white hover:accent-zinc-700 dark:hover:accent-zinc-300 transition-all"
              />
            </div>

            {/* Posición Y */}
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                <span>Coordenada Y</span>
                <div className="flex items-center gap-1 bg-black/5 dark:bg-zinc-900/80 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 focus-within:border-black/30 dark:focus-within:border-white/30 focus-within:ring-1 focus-within:ring-black/10 dark:focus-within:ring-white/10 transition-all">
                  <input
                    type="number"
                    id="coord-y"
                    name="coord-y"
                    step="0.1"
                    value={Number(selectedCharge.position[1].toFixed(2))}
                    onChange={(e) => handlePositionChange('y', e.target.value)}
                    className="w-14 bg-transparent text-right font-mono text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-zinc-500 text-xs font-mono">m</span>
                </div>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={selectedCharge.position[1]}
                onChange={(e) => handlePositionChange('y', e.target.value)}
                className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-white hover:accent-zinc-700 dark:hover:accent-zinc-300 transition-all"
              />
            </div>

            {/* Posición Z */}
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                <span>Coordenada Z</span>
                <div className="flex items-center gap-1 bg-black/5 dark:bg-zinc-900/80 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 focus-within:border-black/30 dark:focus-within:border-white/30 focus-within:ring-1 focus-within:ring-black/10 dark:focus-within:ring-white/10 transition-all">
                  <input
                    type="number"
                    id="coord-z"
                    name="coord-z"
                    step="0.1"
                    value={Number(selectedCharge.position[2].toFixed(2))}
                    onChange={(e) => handlePositionChange('z', e.target.value)}
                    className="w-14 bg-transparent text-right font-mono text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-zinc-500 text-xs font-mono">m</span>
                </div>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={selectedCharge.position[2]}
                onChange={(e) => handlePositionChange('z', e.target.value)}
                className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-white hover:accent-zinc-700 dark:hover:accent-zinc-300 transition-all"
              />
            </div>

            {/* Valor de Carga */}
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                <span>Magnitud |Q|</span>
                <div className="flex items-center gap-1 bg-black/5 dark:bg-zinc-900/80 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 focus-within:border-black/30 dark:focus-within:border-white/30 focus-within:ring-1 focus-within:ring-black/10 dark:focus-within:ring-white/10 transition-all">
                  <input
                    type="number"
                    id="magnitude"
                    name="magnitude"
                    min="0.1"
                    step="0.1"
                    value={selectedCharge.value}
                    onChange={(e) => handleValueChange(e.target.value)}
                    className="w-14 bg-transparent text-right font-mono text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-zinc-500 text-xs font-mono">nC</span>
                </div>
              </div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={selectedCharge.value}
                onChange={(e) => handleValueChange(e.target.value)}
                className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-white hover:accent-zinc-700 dark:hover:accent-zinc-300 transition-all"
              />
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent my-1" />

          <div className="flex flex-col gap-3">
            {/* Invertir Polaridad */}
            <button
              onClick={togglePolarity}
              className={`w-full py-2.5 rounded-xl text-[13px] font-semibold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                isPositive 
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3 4 7l4 4"></path>
                <path d="M4 7h16"></path>
                <path d="m16 21 4-4-4-4"></path>
                <path d="M20 17H4"></path>
              </svg>
              Cambiar a {isPositive ? 'Carga Negativa (−)' : 'Carga Positiva (+)'}
            </button>

            {/* Eliminar Carga */}
            <button
              onClick={() => {
                selectCharge(null);
                removeCharge(selectedCharge.id);
              }}
              className="w-full py-2.5 rounded-xl bg-red-500/10 dark:bg-red-950/30 border border-red-500/20 text-red-600 dark:text-red-400 text-[13px] font-bold uppercase tracking-wider hover:bg-red-600 hover:text-white hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              Eliminar Carga
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
