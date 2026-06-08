import { useSimulatorStore } from '../store/useSimulatorStore';

export function HeaderNavbar() {
  const theme = useSimulatorStore((state) => state.theme);
  const toggleTheme = useSimulatorStore((state) => state.toggleTheme);

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.warn('No se encontró el canvas para exportar la escena.');
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        console.warn('No se pudo generar la imagen JPEG de la escena.');
        return;
      }

      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `campo-electrico-escena-${new Date().toISOString().slice(0, 10)}.jpeg`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.92);
  };

  return (
    <header className="absolute top-0 left-0 w-full pt-5 pb-16 px-6 sm:px-8 flex items-start justify-between z-30 select-none bg-linear-to-b from-slate-50/90 via-slate-50/60 dark:from-zinc-950/90 dark:via-zinc-950/60 to-transparent pointer-events-none transition-colors duration-500">
      
      {/* Lado Izquierdo: Título */}
      <div className="flex items-center pointer-events-auto">
        <div className="flex flex-col drop-shadow-md">
          <h1 className="text-sm sm:text-base font-bold tracking-widest text-zinc-900 dark:text-white uppercase font-serif drop-shadow-lg transition-colors duration-300">
            Campo Eléctrico 3D
          </h1>
          <span className="text-[9px] sm:text-[10px] text-blue-600 dark:text-blue-400 font-serif tracking-widest font-semibold uppercase leading-none mt-1 transition-colors duration-300">
            Simulador de Cargas
          </span>
        </div>
      </div>

      {/* Lado Derecho: Controles */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Toggle Theme */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all duration-300 active:scale-95 cursor-pointer backdrop-blur-md"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>

        {/* Exportar */}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] rounded-full text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all duration-300 active:scale-95 cursor-pointer backdrop-blur-md"
          title="Exportar escena como JPEG"
          aria-label="Exportar escena como JPEG"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span className="hidden md:inline">Exportar Escena</span>
        </button>
      </div>
    </header>
  );
}
