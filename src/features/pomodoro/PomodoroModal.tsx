import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, Volume2, VolumeX, Minimize2, Ticket } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { useBackHandler } from '../../store/useConfigStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const PomodoroModal = () => {
    const { pomodoro, updatePomodoro } = useTaskStore();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        if (!pomodoro.isOpen || pomodoro.isMinimized) return;
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, [pomodoro.isOpen, pomodoro.isMinimized]);

    useBackHandler(pomodoro.isOpen && !pomodoro.isMinimized, () => {
        updatePomodoro({ isOpen: false });
        return true;
    });

    if (!pomodoro.isOpen || pomodoro.isMinimized) return null;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // A mágica da régua física: A cada minuto (ou segundo), transladamos o X
    // Bloco tem w-16 (64px). O centro do bloco '0' fica a 32px de distância da borda.
    // Assim, se o tempo for 25 min, a régua é movida exatamente para o 25!
    const dialTranslationX = `calc(50% - ${(pomodoro.timeLeft / 60) * 64 + 32}px)`;
    
    // Progresso do Ticket (De 0 a 3600 segundos)
    const ticketProgress = (pomodoro.accumulatedSeconds / 3600) * 100;

    return (
      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
            
            <button onClick={() => updatePomodoro({ isOpen: false })} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-red-500 text-white transition-colors z-[210]">
               <X size={24} />
            </button>

            {/* O RÁDIO RELÓGIO (Skeuomorphism) */}
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-lg bg-zinc-800 p-6 md:p-10 rounded-[3rem] shadow-[inset_0_10px_30px_rgba(0,0,0,0.5),0_20px_50px_rgba(0,0,0,0.8)] border-4 border-zinc-700 relative overflow-hidden">
                
                {/* Grelha do Rádio Superior (Detalhe visual) */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-30 pointer-events-none">
                    {Array.from({length: 12}).map((_, i) => (
                        <div key={i} className="w-1.5 h-6 bg-black rounded-full shadow-inner" />
                    ))}
                </div>

                {/* Tela Digital Embutida */}
                <div className="mt-8 bg-black border-[6px] md:border-8 border-zinc-900 rounded-3xl p-6 shadow-[inset_0_0_20px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col items-center justify-center">
                    <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay" />
                    
                    <div className="text-red-600 font-mono font-bold text-sm md:text-lg tracking-[0.3em] uppercase drop-shadow-[0_0_8px_rgba(220,38,38,0.6)] mb-2">
                        {format(currentTime, "dd MMM yyyy - EEEE", { locale: ptBR })}
                    </div>
                    
                    <div className="text-red-500 font-mono font-black text-6xl md:text-[5.5rem] leading-none tracking-widest drop-shadow-[0_0_25px_rgba(239,68,68,0.9)]">
                        {formatTime(pomodoro.timeLeft)}
                    </div>

                    <div className="absolute bottom-4 left-6 text-red-700/80 font-mono font-bold text-xs uppercase tracking-widest flex gap-4">
                        <span className={pomodoro.mode === 'focus' ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : ''}>FOCUS</span>
                        <span className={pomodoro.mode === 'break' ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : ''}>BREAK</span>
                    </div>

                    <div className="absolute bottom-4 right-6 text-red-700/80 font-mono font-bold text-xs flex items-center gap-1.5">
                       <Ticket size={12} className="shrink-0" />
                       <div className="w-16 h-1.5 bg-red-950 rounded-full overflow-hidden">
                           <div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={{ width: `${ticketProgress}%` }} />
                       </div>
                    </div>
                </div>

                {/* Régua Física do Dial de Minutos */}
                <div className="mt-10 mb-8 relative h-24 md:h-28 bg-[#f4f1e1] rounded-xl border-y-8 border-zinc-900 overflow-hidden shadow-[inset_0_10px_20px_rgba(0,0,0,0.5)] flex items-center">
                    
                    {/* Fio de Marcação Vermelho Central */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-1 md:w-1.5 bg-red-600 z-10 -translate-x-1/2 shadow-sm rounded-full drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                    
                    {/* A Fita Deslizante */}
                    <motion.div 
                        className="flex items-end h-full whitespace-nowrap"
                        animate={{ x: dialTranslationX }}
                        transition={{ type: 'tween', ease: 'linear', duration: 1 }}
                    >
                       {Array.from({ length: 61 }).map((_, i) => (
                           <div key={i} className="flex flex-col items-center justify-end w-16 h-full pb-1 border-r-[3px] border-zinc-400">
                              {(i % 5 === 0) && <span className="text-xl md:text-2xl font-black text-zinc-800 mb-1">{i}</span>}
                              {!(i % 5 === 0) && <div className="h-4 w-1 bg-zinc-400 mb-0.5" />}
                           </div>
                       ))}
                    </motion.div>
                </div>

                {/* Controles de Configuração e Ação */}
                <div className="flex flex-col md:flex-row gap-6 justify-between">
                    
                    <div className="bg-zinc-900 p-4 rounded-2xl border-2 border-zinc-700 shadow-inner flex-1 flex flex-col justify-center gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest w-12">Foco</span>
                            <input 
                               type="range" min="5" max="60" step="5" value={pomodoro.focusDuration} 
                               disabled={pomodoro.isActive}
                               onChange={e => {
                                  const val = Number(e.target.value);
                                  updatePomodoro({ focusDuration: val, timeLeft: pomodoro.mode === 'focus' ? val * 60 : pomodoro.timeLeft });
                               }}
                               className="flex-1 accent-red-500 disabled:opacity-50"
                            />
                            <span className="text-xs font-bold text-zinc-300 w-8">{pomodoro.focusDuration}m</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest w-12">Pausa</span>
                            <input 
                               type="range" min="1" max="15" step="1" value={pomodoro.breakDuration} 
                               disabled={pomodoro.isActive}
                               onChange={e => {
                                  const val = Number(e.target.value);
                                  updatePomodoro({ breakDuration: val, timeLeft: pomodoro.mode === 'break' ? val * 60 : pomodoro.timeLeft });
                               }}
                               className="flex-1 accent-blue-500 disabled:opacity-50"
                            />
                            <span className="text-xs font-bold text-zinc-300 w-8">{pomodoro.breakDuration}m</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-zinc-900 p-3 rounded-2xl border-2 border-zinc-700 shadow-inner">
                        <button onClick={() => updatePomodoro({ soundEnabled: !pomodoro.soundEnabled })} className="p-3 text-zinc-400 hover:text-white transition-colors" title="Alternar Som do Relógio">
                            {pomodoro.soundEnabled ? <Volume2 size={24} className="text-emerald-500"/> : <VolumeX size={24} />}
                        </button>

                        <button onClick={() => updatePomodoro({ isActive: !pomodoro.isActive })} className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-[inset_0_2px_5px_rgba(255,255,255,0.4),0_5px_15px_rgba(220,38,38,0.5)] hover:scale-105 active:scale-95 transition-all">
                            {pomodoro.isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                        </button>

                        <button onClick={() => updatePomodoro({ isActive: false, mode: 'focus', timeLeft: pomodoro.focusDuration * 60 })} className="p-3 text-zinc-400 hover:text-white transition-colors" title="Resetar Timer">
                            <Square size={24} fill="currentColor" />
                        </button>
                    </div>

                </div>

                {/* Botão de Minimizar Integrado ao Rádio */}
                <div className="mt-6 flex justify-center">
                    <button onClick={() => updatePomodoro({ isMinimized: true })} className="px-6 py-2 bg-zinc-900 text-zinc-400 hover:text-white border-2 border-zinc-700 rounded-full font-bold text-xs uppercase tracking-widest shadow-md flex items-center gap-2">
                        Minimizar <Minimize2 size={14} />
                    </button>
                </div>

            </motion.div>
        </motion.div>
      </AnimatePresence>
    );
};