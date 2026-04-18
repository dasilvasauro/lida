import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, CheckCircle2 } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';

export const FocusMode = () => {
    const { activeFocusSession, stopFocus, tasks, toggleTaskCompletion, isFocusModeOpen, toggleFocusMode } = useTaskStore();
    const [timeLeft, setTimeLeft] = useState(0);
    const [messageIndex, setMessageIndex] = useState(0);

    const messages = [
        "Mantenha o foco no agora",
        "Você está progredindo",
        "Respire fundo e continue",
        "Sua visão está mais próxima",
        "O esforço de hoje é o fruto de amanhã",
        "Apenas você e sua tarefa"
    ];

    const task = tasks.find(t => t.id === activeFocusSession?.taskId);

    useEffect(() => {
        if (!activeFocusSession) return;

        const interval = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - activeFocusSession.startTime) / 1000);
            const remaining = activeFocusSession.duration - elapsedSeconds;

            if (remaining <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        // Troca mensagem a cada 15 segundos
        const msgInterval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 15000);

        return () => {
            clearInterval(interval);
            clearInterval(msgInterval);
        };
    }, [activeFocusSession]);

    if (!activeFocusSession || !task || !isFocusModeOpen) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const handleFinish = () => {
        toggleTaskCompletion(task.id);
        stopFocus();
    };

    return (
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white p-8"
        >
        {/* Background Animado (Pulso Suave) */}
        <motion.div
        animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-zinc-800 rounded-full blur-[120px] w-[300px] h-[300px] m-auto"
        />

        {/* Botões de Saída */}
        <div className="absolute top-8 right-8 flex gap-4">
            {/* Agora ele apenas oculta a tela, mas não dá stopFocus() */}
            <button onClick={() => toggleFocusMode(false)} className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <Minimize2 size={24} />
            </button>
        </div>

        {/* Conteúdo Central */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
        <span className="text-zinc-500 uppercase tracking-[0.3em] text-sm font-bold">Em Foco</span>
        <h2 className="text-2xl font-light tracking-tight text-zinc-300">{task.title}</h2>

        <div className="text-8xl md:text-9xl font-black tabular-nums tracking-tighter">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>

        <AnimatePresence mode="wait">
        <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-zinc-400 italic text-lg h-8"
        >
        {messages[messageIndex]}
        </motion.p>
        </AnimatePresence>

        {timeLeft === 0 && (
            <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleFinish}
            className="mt-8 flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-bold shadow-xl shadow-white/10"
            >
            <CheckCircle2 size={24} /> Concluir Sessão
            </motion.button>
        )}
        </div>

        {/* Barra de progresso inferior */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-900">
        <motion.div
        initial={{ width: "100%" }}
        animate={{ width: `${(timeLeft / activeFocusSession.duration) * 100}%` }}
        transition={{ duration: 1, ease: "linear" }}
        className="h-full bg-blue-500"
        />
        </div>
        </motion.div>
    );
};
