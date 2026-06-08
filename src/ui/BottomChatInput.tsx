import { useState, useEffect, useRef } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { supabaseClient } from '../services/supabaseClient';
import { aiService } from '../services/aiService';
import { TelemetryHUD } from './TelemetryHUD';

export function BottomChatInput() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setIsChatOpen = useSimulatorStore((state) => state.setIsChatOpen);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Obtener sessionId desde el store global de Zustand
  const sessionId = useSimulatorStore((state) => state.sessionId);

  // Ajustar la altura del textarea automáticamente
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Cerrar menús al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowCommands(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isLoading) return;

    setInput('');
    setIsLoading(true);
    setError(null);
    setShowCommands(false);
    setIsChatOpen(true);

    try {
      // 1. Guardar mensaje del usuario
      await supabaseClient.saveMessage('user', messageText.trim(), sessionId);
      window.dispatchEvent(new CustomEvent('chat-message-added'));

      // 2. Obtener historial de chat para alimentar a la IA
      const history = await supabaseClient.getMessages(sessionId);

      // 3. Consultar Copiloto IA (vía Supabase Edge Function)
      const response = await aiService.getChatResponse(history);

      // 4. Guardar respuesta de la IA
      await supabaseClient.saveMessage('assistant', response, sessionId);
      window.dispatchEvent(new CustomEvent('chat-message-added'));

    } catch (err: unknown) {
      console.error('Error in handleSend:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión';
      setError(errorMessage);
      
      // Intentar guardar un mensaje de error simulado del asistente
      await supabaseClient.saveMessage(
        'assistant',
        `❌ **Error:** No se pudo completar tu petición. ${errorMessage}`,
        sessionId
      );
      window.dispatchEvent(new CustomEvent('chat-message-added'));
    } finally {
      setIsLoading(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Mostrar lista de comandos rápidos si empieza con '/'
    if (value.startsWith('/')) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
  };

  const SUGGESTIONS = [
    "¿Qué te gustaría crear?",
    "Añade una carga...",
    "Crea un dipolo",
    "Añade un cuadripolo en el origen",
    "Oculta las líneas de campo",
    "Agrega una carga positiva de 5nC",
    "Accede a los comandos rápidos con '/'",
  ];

  const [placeholderText, setPlaceholderText] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Animación del placeholder
  useEffect(() => {
    const currentSuggestion = SUGGESTIONS[suggestionIndex];
    const typingSpeed = isDeleting ? 30 : 60; // Velocidad de borrado y escritura
    const currentLength = placeholderText.length;
    
    if (!isDeleting && currentLength === currentSuggestion.length) {
      // Ha terminado de escribir. Pausa de ~15-20 segundos antes de borrar
      const pauseTimer = setTimeout(() => setIsDeleting(true), 18000); 
      return () => clearTimeout(pauseTimer);
    } else if (isDeleting && currentLength === 0) {
      // Ha terminado de borrar. Pasa a la siguiente sugerencia
      setIsDeleting(false);
      setSuggestionIndex((prev) => (prev + 1) % SUGGESTIONS.length);
      return;
    }

    const timer = setTimeout(() => {
      setPlaceholderText(currentSuggestion.substring(0, currentLength + (isDeleting ? -1 : 1)));
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [placeholderText, isDeleting, suggestionIndex]);

  const selectCommand = (commandText: string) => {
    handleSend(commandText);
    setShowCommands(false);
  };

  const openManualActions = () => {
    setShowCommands((current) => !current);
    textareaRef.current?.focus();
  };

  const quickCommands = [
    { cmd: 'Crea un dipolo eléctrico', desc: 'Carga positiva y negativa separadas' },
    { cmd: 'Añade un cuadripolo', desc: '4 cargas alternas en cuadrado' },
    { cmd: 'Borra todas las cargas', desc: 'Limpia la escena por completo' },
    { cmd: 'Oculta las líneas de campo', desc: 'Desactiva la visualización de líneas' },
    { cmd: 'Muestra la cuadrícula', desc: 'Activa la cuadrícula de referencia' },
    { cmd: 'Centra la cámara', desc: 'Restablece la vista original' },
  ];

  return (
    <div className="absolute bottom-6 left-0 w-full z-20 pointer-events-none flex justify-center px-4 sm:px-0">
      <div ref={containerRef} className="w-full max-w-xl relative pointer-events-auto flex flex-col items-center gap-3">
        
        {/* Telemetría Centrada encima del input */}
        <TelemetryHUD />

        {/* Sugerencias de comandos '/' */}
        {showCommands && (
          <div className="absolute bottom-full left-0 w-full mb-2 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl z-30">
            {/* Background blur layer */}
            <div className="absolute inset-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl -z-10 pointer-events-none" />
            <div className="relative z-10">
              <div className="px-3 py-1.5 bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 text-[10px] text-zinc-600 dark:text-zinc-400 font-semibold tracking-wider uppercase font-mono">
                Comandos rápidos del Simulador
              </div>
              <div className="max-h-48 overflow-y-auto">
                {quickCommands.map((qc, index) => (
                  <button
                    key={index}
                    onClick={() => selectCommand(qc.cmd)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 border-b border-black/5 dark:border-white/5 last:border-0 text-left text-xs text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{qc.cmd}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{qc.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Principal */}
        <div className="w-full relative border border-black/10 dark:border-white/10 rounded-2xl p-2.5 flex flex-row items-end gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] focus-within:border-black/20 dark:focus-within:border-white/20 transition-all duration-300">
          {/* Background blur layer */}
          <div className="absolute inset-0 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl rounded-2xl -z-10 pointer-events-none" />
          
          {/* Caja de Texto */}
          <textarea
            ref={textareaRef}
            id="chat-textarea"
            name="chat-textarea"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText || " "}
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none resize-none border-0 px-2 py-1.5 leading-relaxed h-8 max-h-32 relative z-10 custom-scrollbar"
            disabled={isLoading}
          />

          {/* Controles: Error y Botón de Enviar */}
          <div className="flex items-center gap-2 mb-0.5 relative z-10 shrink-0">
            {error && (
              <span className="text-[10px] text-red-400 max-w-[120px] truncate" title={error}>
                {error}
              </span>
            )}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                input.trim() && !isLoading
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-md cursor-pointer active:scale-95'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-default'
              }`}
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white dark:border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
