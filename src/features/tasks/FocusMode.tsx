import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, CheckCircle2 } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';

export const FocusMode = () => {
    const { activeFocusSession, stopFocus, tasks, toggleTaskCompletion, isFocusModeOpen, toggleFocusMode, markTaskFailed } = useTaskStore();

    const task = tasks.find(t => t.id === activeFocusSession?.taskId);

    const [timeLeft, setTimeLeft] = useState(0);
    const [isOvertime, setIsOvertime] = useState(false);
    const [messageIndex, setMessageIndex] = useState(0);

    const messages = [
        "Mantenha o foco no agora",
        "Você está progredindo",
        "Respire fundo e continue",
        "Apenas você e sua tarefa",
        "Seja como a água",
        "Corpo são, e mente sã",
        "Jai Guru Deva Om"
    ];

    useEffect(() => {
        if (!activeFocusSession || !task || !isFocusModeOpen) return;

        const calculateTime = () => {
            const elapsedSeconds = Math.floor((Date.now() - activeFocusSession.startTime) / 1000);
            const remaining = activeFocusSession.duration - elapsedSeconds;

            const overtime = remaining < 0;

            if (overtime && !task.isFailed) {
                markTaskFailed(task.id);
            }

            setTimeLeft(Math.abs(remaining));
            setIsOvertime(overtime);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);

        const msgInterval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 15000);

        return () => {
            clearInterval(interval);
            clearInterval(msgInterval);
        };
    }, [activeFocusSession, isFocusModeOpen, task]);

    if (!activeFocusSession || !task || !isFocusModeOpen) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const handleFinish = () => {
        toggleTaskCompletion(task.id);
        stopFocus();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white p-8">
        {/* Background Animado */}
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className={`absolute inset-0 rounded-full blur-[120px] w-[300px] h-[300px] m-auto ${isOvertime ? 'bg-zinc-600' : 'bg-zinc-800'}`} />

        <div className="absolute top-8 right-8 flex gap-4">
        <button onClick={() => toggleFocusMode(false)} className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
        <Minimize2 size={24} />
        </button>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
        <span className="text-zinc-500 uppercase tracking-[0.3em] text-sm font-bold">
        {isOvertime ? 'Tempo Excedido' : 'Em Foco'}
        </span>
        <h2 className="text-2xl font-light tracking-tight text-zinc-300">{task.title}</h2>

        {/* Temporizador com visual de falha */}
        <div className={`text-8xl md:text-9xl font-black tabular-nums tracking-tighter ${isOvertime ? 'text-zinc-600' : 'text-zinc-200'}`}>
        {isOvertime ? '+' : ''}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>

        <AnimatePresence mode="wait">
        <motion.p key={isOvertime ? 'overtime' : messageIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-zinc-400 italic text-lg h-8">
        {isOvertime ? "A tarefa não rendeu recompensas, mas o foco continua." : messages[messageIndex]}
        </motion.p>
        </AnimatePresence>

        <motion.button initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={handleFinish} className="mt-8 flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-bold shadow-xl shadow-white/10">
        <CheckCircle2 size={24} /> Concluir Sessão
        </motion.button>
        </div>

        {/* Barra de progresso (some se excedeu) */}
        {!isOvertime && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-900">
            <motion.div initial={{ width: "100%" }} animate={{ width: `${(timeLeft / activeFocusSession.duration) * 100}%` }} transition={{ duration: 1, ease: "linear" }} className="h-full bg-zinc-500" />
            </div>
        )}
        </motion.div>
    );
};
