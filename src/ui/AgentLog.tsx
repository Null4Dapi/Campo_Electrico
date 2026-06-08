import { useEffect, useRef, useState } from 'react';
import { supabaseClient } from '../services/supabaseClient';
import type { ChatMessage } from '../services/supabaseClient';
import { useSimulatorStore } from '../store/useSimulatorStore';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export function AgentLog() {
  const isChatOpen = useSimulatorStore((state) => state.isChatOpen);
  const toggleChat = useSimulatorStore((state) => state.toggleChat);
  const setIsChatOpen = useSimulatorStore((state) => state.setIsChatOpen);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const sessionId = useSimulatorStore((state) => state.sessionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cargar al montar e iniciar listeners
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await supabaseClient.getMessages(sessionId);
        setMessages(data);
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    };

    void fetchMessages();

    // Escuchar el evento de mensaje agregado
    const handleChatUpdated = () => {
      void fetchMessages();
    };

    window.addEventListener('chat-message-added', handleChatUpdated);
    return () => {
      window.removeEventListener('chat-message-added', handleChatUpdated);
    };
  }, [sessionId]);

  // Hacer scroll automático al final cuando hay nuevos mensajes o se abre
  useEffect(() => {
    if (isChatOpen && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    }
  }, [messages, isChatOpen]);

  const clearChatSession = useSimulatorStore((state) => state.clearChatSession);

  // Limpiar el historial local y de la base de datos
  const handleClearHistory = () => {
    clearChatSession();
    setMessages([]);
  };



  return (
    <div className="absolute top-[80px] left-4 lg:left-6 z-30 pointer-events-auto flex flex-col items-start gap-2.5 max-w-[calc(100vw-2rem)]">
      
      {/* Botón Disparador Sutil (Chat Icon) */}
      <button
        onClick={toggleChat}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 border ${
          isChatOpen
            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/35 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            : 'bg-white/80 dark:bg-zinc-950/80 text-zinc-500 dark:text-zinc-400 border-black/10 dark:border-white/10 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/20 dark:hover:border-white/20 shadow-md'
        }`}
        title={isChatOpen ? 'Cerrar Chat' : 'Abrir Chat'}
        aria-label="Alternar Chat de Copiloto"
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
          className="transition-transform duration-300 hover:scale-105"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      {/* Panel Desplegable (Compacto, Sutil y Responsivo) */}
      {isChatOpen && (
        <div className="w-[280px] sm:w-[320px] max-w-full h-[280px] sm:h-[320px] relative border border-black/10 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
          {/* Background blur layer */}
          <div className="absolute inset-0 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl rounded-2xl -z-10 pointer-events-none" />
          
          {/* Cabecera Minimalista */}
          <div className="px-3.5 py-2.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center gap-1.5 opacity-80">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 tracking-wider uppercase font-sans">
                Copiloto Chat
              </span>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleClearHistory}
                className="text-[9px] text-zinc-500 hover:text-red-400 uppercase tracking-widest font-mono cursor-pointer transition-colors"
                title="Limpiar historial de conversación"
              >
                Clear
              </button>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Historial Scrollable */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3.5 space-y-3.5 flex flex-col custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-2 text-zinc-500">
                <div className="text-[10px] leading-relaxed">No hay mensajes recientes.<br />Escribe un comando abajo para comenzar.</div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || index}
                    className={`flex flex-col max-w-[90%] ${
                      isUser ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <span className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest mb-0.5">
                      {isUser ? 'Tú' : 'IA'}
                    </span>
                    <div
                      className={`text-[11px] leading-relaxed px-3 py-2 rounded-xl ${
                        isUser
                          ? 'bg-blue-500/10 text-blue-900 dark:text-blue-100 rounded-tr-none border border-blue-500/20'
                          : 'bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 rounded-tl-none'
                      }`}
                    >
                      {isUser ? (
                        msg.content
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({node, ...props}) => <p className="my-1.5 wrap-break-word" {...props} />,
                            li: ({node, ...props}) => <li className="ml-4 list-disc my-0.5" {...props} />,
                            code: ({node, className, children, ...props}) => {
                              const match = /language-(\w+)/.exec(className || '');
                              return !match ? (
                                <code className="bg-black/5 dark:bg-white/5 rounded border border-black/5 dark:border-white/5 px-1 py-0.5 text-[10px] font-mono text-indigo-600 dark:text-indigo-300" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <code className="block my-1 px-2 py-1 bg-black/5 dark:bg-white/5 rounded border border-black/5 dark:border-white/5 text-[10px] font-mono text-indigo-600 dark:text-indigo-300 overflow-x-auto" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            strong: ({node, ...props}) => <strong className="font-semibold text-zinc-900 dark:text-zinc-100" {...props} />
                          }}
                        >
                          {msg.content.replace(/<actions>[\s\S]*?<\/actions>/g, '').trim()}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
