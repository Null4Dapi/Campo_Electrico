import { useState, memo } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';

export const RightToolbar = memo(function RightToolbar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const addCharge = useSimulatorStore((state) => state.addCharge);
  const clearScene = useSimulatorStore((state) => state.clearScene);
  const triggerResetCamera = useSimulatorStore((state) => state.triggerResetCamera);
  const selectedChargeId = useSimulatorStore((state) => state.selectedChargeId);
  const selectCharge = useSimulatorStore((state) => state.selectCharge);

  const showFieldLines = useSimulatorStore((state) => state.showFieldLines);
  const showEquipotential = useSimulatorStore((state) => state.showEquipotential);
  const gridVisible = useSimulatorStore((state) => state.gridVisible);
  const snapToGrid = useSimulatorStore((state) => state.snapToGrid);

  const toggleFieldLines = useSimulatorStore((state) => state.toggleFieldLines);
  const toggleEquipotential = useSimulatorStore((state) => state.toggleEquipotential);
  const toggleGridVisible = useSimulatorStore((state) => state.toggleGridVisible);
  const toggleSnapToGrid = useSimulatorStore((state) => state.toggleSnapToGrid);

  const zoom = useSimulatorStore((state) => state.zoom);
  const setZoom = useSimulatorStore((state) => state.setZoom);

  return (
    <div className="absolute right-4 lg:right-6 top-0 h-full pointer-events-none flex items-center z-20">
      <div className="pointer-events-auto flex flex-col gap-2.5 p-2 relative border border-black/10 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] items-center">
        {/* Background blur layer */}
        <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl rounded-2xl -z-10 pointer-events-none" />
        
        {/* Modo Compacto (Una Sola Columna) */}
        {!isExpanded && (
          <div className="flex flex-col gap-2.5 items-center">
            {/* Botón de Selección (Pointer) */}
            <button
              onClick={() => selectCharge(null)}
              className={`group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95 border ${
                selectedChargeId === null
                  ? 'bg-black/10 dark:bg-white/15 text-zinc-900 dark:text-white border-black/10 dark:border-white/15 shadow-[0_0_12px_rgba(0,0,0,0.1)] dark:shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
              }`}
              title="Modo Selección"
              aria-label="Modo Selección"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 3 10.07 19.97 12.58 12.58 19.97 10.07 3 3"></polygon>
                <line x1="13" y1="13" x2="19" y2="19"></line>
              </svg>
            </button>

            {/* Añadir Carga Positiva (q⁺) */}
            <button
              onClick={() => addCharge('positive')}
              className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/15 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95"
              title="Añadir Carga Positiva (+1 nC)"
              aria-label="Añadir Carga Positiva (+1 nC)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.1" />
                <text x="9" y="15.5" textAnchor="middle" fontSize="11" fontWeight="bold" fontFamily="sans-serif" fill="currentColor">q</text>
                <text x="16" y="11.5" textAnchor="middle" fontSize="9" fontWeight="bold" fontFamily="sans-serif" fill="currentColor">+</text>
              </svg>
            </button>

            {/* Añadir Carga Negativa (q⁻) */}
            <button
              onClick={() => addCharge('negative')}
              className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-500/15 hover:shadow-[0_0_12px_rgba(59,130,246,0.2)] flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95"
              title="Añadir Carga Negativa (-1 nC)"
              aria-label="Añadir Carga Negativa (-1 nC)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.1" />
                <text x="9" y="15.5" textAnchor="middle" fontSize="11" fontWeight="bold" fontFamily="sans-serif" fill="currentColor">q</text>
                <text x="16" y="10.5" textAnchor="middle" fontSize="9" fontWeight="bold" fontFamily="sans-serif" fill="currentColor">-</text>
              </svg>
            </button>

            <div className="w-6 h-px bg-black/10 dark:bg-white/10 my-0.5" />
            <button
              onClick={() => setIsExpanded(true)}
              className="group relative w-8 h-8 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors duration-300 cursor-pointer"
              title="Expandir Herramientas"
              aria-label="Expandir Herramientas"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:-translate-x-px transition-transform">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </div>
        )}

        {/* Modo Expandido (Diseño de Doble Columna Compacta) */}
        {isExpanded && (
          <div className="grid grid-cols-2 gap-2 items-center animate-in fade-in slide-in-from-right-2 duration-300 w-[80px] sm:w-[90px]">
            {/* Fila 1: Pointer de Selección (span 2) */}
            <div className="col-span-2 flex justify-center">
              <button
                onClick={() => selectCharge(null)}
                className={`group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95 border ${
                  selectedChargeId === null
                    ? 'bg-black/10 dark:bg-white/15 text-zinc-900 dark:text-white border-black/10 dark:border-white/15 shadow-[0_0_12px_rgba(0,0,0,0.1)] dark:shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
                }`}
                title="Modo Selección"
                aria-label="Modo Selección"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 3 10.07 19.97 12.58 12.58 19.97 10.07 3 3"></polygon>
                  <line x1="13" y1="13" x2="19" y2="19"></line>
                </svg>
              </button>
            </div>

            <div className="col-span-2 h-px bg-black/10 dark:bg-white/10 my-0.5" />

            {/* Fila 2: Cargas q⁺ y q⁻ */}
            <button
              onClick={() => addCharge('positive')}
              className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/15 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95"
              title="Añadir Carga Positiva (+1 nC)"
              aria-label="Añadir Carga Positiva (+1 nC)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.1" />
                <text x="9" y="15.5" textAnchor="middle" fontSize="11" fontWeight="bold" fontFamily="sans-serif" fill="currentColor">q</text>
                <text x="16" y="11.5" textAnchor="middle" fontSize="9" fontWeight="bold" fontFamily="sans-serif" fill="currentColor">+</text>
              </svg>
            </button>

            <button
              onClick={() => addCharge('negative')}
              className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-500/15 hover:shadow-[0_0_12px_rgba(59,130,246,0.2)] flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95"
              title="Añadir Carga Negativa (-1 nC)"
              aria-label="Añadir Carga Negativa (-1 nC)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.1" />
                <text x="9" y="15.5" textAnchor="middle" fontSize="11" fontWeight="bold" fontFamily="sans-serif" fill="currentColor">q</text>
                <text x="16" y="10.5" textAnchor="middle" fontSize="9" fontWeight="bold" fontFamily="sans-serif" fill="currentColor">-</text>
              </svg>
            </button>

            <div className="col-span-2 h-px bg-black/10 dark:bg-white/10 my-0.5" />

            {/* Fila 3: Visualización - Líneas y Equipotenciales */}
            <button
              onClick={toggleFieldLines}
              className={`group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95 border ${
                showFieldLines
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
              }`}
              title="Alternar Líneas de Campo"
              aria-label="Alternar Líneas de Campo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18"></path>
                <path d="M3 12h18"></path>
                <path d="M18.36 5.64 5.64 18.36"></path>
                <path d="M18.36 18.36 5.64 5.64"></path>
              </svg>
            </button>

            <button
              onClick={toggleEquipotential}
              className={`group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95 border ${
                showEquipotential
                  ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
              }`}
              title="Alternar Superficies Equipotenciales"
              aria-label="Alternar Superficies Equipotenciales"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </button>

            {/* Fila 4: Visualización - Cuadrícula e Imán (Snap) */}
            <button
              onClick={toggleGridVisible}
              className={`group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95 border ${
                gridVisible
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
              }`}
              title="Alternar Cuadrícula"
              aria-label="Alternar Cuadrícula"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="M9 3v18"></path>
                <path d="M15 3v18"></path>
                <path d="M3 9h18"></path>
                <path d="M3 15h18"></path>
              </svg>
            </button>

            <button
              onClick={toggleSnapToGrid}
              className={`group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95 border ${
                snapToGrid
                  ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
              }`}
              title="Ajustar a la Cuadrícula"
              aria-label="Ajustar a la Cuadrícula"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6-6 6 6v6a6 6 0 0 1-12 0Z"></path>
                <path d="M12 3v12"></path>
              </svg>
            </button>

            <div className="col-span-2 h-px bg-black/10 dark:bg-white/10 my-0.5" />

            {/* Fila 5: Escena - Cámara y Papelera */}
            <button
              onClick={triggerResetCamera}
              className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95"
              title="Restablecer Cámara"
              aria-label="Restablecer Cámara"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:rotate-90 transition-transform duration-500">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </button>

            <button
              onClick={clearScene}
              className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-red-500/80 hover:text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95"
              title="Limpiar Todo"
              aria-label="Limpiar Todo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>

            <div className="col-span-2 h-px bg-black/10 dark:bg-white/10 my-0.5" />

            {/* Fila 6: Controles de Zoom Horizontal */}
            <div className="col-span-2 flex items-center justify-center gap-1 py-1.5 px-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl w-full">
              <button
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                className="w-7 h-7 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center cursor-pointer transition-colors active:scale-90"
                title="Disminuir Zoom"
                aria-label="Disminuir Zoom"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
              <span className="text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-300 w-11 text-center select-none whitespace-nowrap">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                className="w-7 h-7 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center cursor-pointer transition-colors active:scale-90"
                title="Aumentar Zoom"
                aria-label="Aumentar Zoom"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
            </div>

            <div className="col-span-2 h-px bg-black/10 dark:bg-white/10 my-0.5" />

            {/* Fila 7: Ayuda & Botón de Contraer */}
            <div className="relative">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors duration-300 cursor-pointer active:scale-95 border ${
                  showHelp 
                    ? 'border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)] bg-blue-500/10' 
                    : 'border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title="Ayuda del Simulador"
                aria-label="Ayuda del Simulador"
              >
                <span className="text-xs font-semibold font-sans">?</span>
              </button>

              {showHelp && (
                <div className="absolute right-14 bottom-0 w-60 sm:w-64 border border-black/10 dark:border-white/10 p-4 rounded-xl shadow-2xl text-xs text-zinc-800 dark:text-zinc-300 flex flex-col gap-2 pointer-events-auto leading-relaxed z-30 animate-in fade-in slide-in-from-right-3 duration-250">
                  {/* Background blur layer */}
                  <div className="absolute inset-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl rounded-xl -z-10 pointer-events-none" />
                  <h4 className="font-bold text-zinc-900 dark:text-white uppercase text-[10px] tracking-wider mb-1 relative z-10">Controles del Simulador</h4>
                  <p className="relative z-10">🖱️ <strong>Girar cámara</strong>: Clic izquierdo + arrastrar</p>
                  <p className="relative z-10">🤚 <strong>Panorámica</strong>: Clic derecho + arrastrar</p>
                  <p className="relative z-10">🔍 <strong>Zoom</strong>: Rueda del mouse / scroll</p>
                  <p className="relative z-10">🔘 <strong>Seleccionar carga</strong>: Haz clic en la esfera de la carga</p>
                  <p className="relative z-10">✨ <strong>Mover carga</strong>: Clic + arrastrar carga seleccionada</p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setIsExpanded(false);
                setShowHelp(false);
              }}
              className="group relative w-8 h-8 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors duration-300 cursor-pointer"
              title="Contraer Barra"
              aria-label="Contraer Barra"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-px transition-transform">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        )}

      </div>
    </div>
  );
});
