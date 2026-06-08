export function TelemetryHUD() {
  return (
    <div className="w-fit relative px-4 py-1.5 rounded-full border border-black/5 dark:border-white/5 whitespace-nowrap flex flex-row items-center justify-center gap-4 sm:gap-6 text-[10px] font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] select-none opacity-80 hover:opacity-100 transition-opacity">
      {/* Background blur layer */}
      <div className="absolute inset-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md rounded-full -z-10 pointer-events-none" />
      {/* Coordenadas */}
      <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-300">
        <span className="text-[9px] text-zinc-600 dark:text-zinc-500 font-bold uppercase tracking-wider">Pos</span>
        <span><span id="telemetry-x">0.00</span>, <span id="telemetry-z">0.00</span> <span className="text-zinc-600 dark:text-zinc-500 text-[9px]">m</span></span>
      </div>

      {/* Separador */}
      <div className="w-px h-2.5 bg-black/10 dark:bg-white/10" />

      {/* E */}
      <div className="flex items-center gap-1.5 text-amber-600/90 dark:text-yellow-400/90">
        <span className="text-[9px] text-amber-600/60 dark:text-yellow-500/60 font-bold uppercase tracking-wider">E</span>
        <span><span id="telemetry-e">0.00</span> <span className="text-amber-600/60 dark:text-yellow-500/60 text-[9px]">N/C</span></span>
      </div>

      {/* Separador */}
      <div className="w-px h-2.5 bg-black/10 dark:bg-white/10" />

      {/* V */}
      <div className="flex items-center gap-1.5 text-purple-600/90 dark:text-purple-400/90">
        <span className="text-[9px] text-purple-600/60 dark:text-purple-400/60 font-bold uppercase tracking-wider">V</span>
        <span><span id="telemetry-v">0.00</span> <span className="text-purple-600/60 dark:text-purple-400/60 text-[9px]">V</span></span>
      </div>
    </div>
  );
}
