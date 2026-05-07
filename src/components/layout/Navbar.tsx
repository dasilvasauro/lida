import { useState } from 'react';
import { CheckCircle2, Repeat, ShoppingBag, User, NotebookPen, ChevronLeft } from 'lucide-react';
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from 'framer-motion';

export type Tab = 'tasks' | 'habits' | 'notes' | 'shop' | 'profile';

interface NavbarProps {
    currentTab: Tab;
    setCurrentTab: (tab: Tab) => void;
}

export const Navbar = ({ currentTab, setCurrentTab }: NavbarProps) => {
    const tabs = [
        { id: 'tasks', icon: CheckCircle2, label: 'Tarefas' },
        { id: 'habits', icon: Repeat, label: 'Hábitos' },
        { id: 'notes', icon: NotebookPen, label: 'Notas' },
        { id: 'shop', icon: ShoppingBag, label: 'Loja' },
        { id: 'profile', icon: User, label: 'Perfil' },
    ];

    // === SISTEMA DE GESTO DE VOLTAR (CUSTOM BACK GESTURE) ===
    const dragX = useMotionValue(0);
    const [isGesturing, setIsGesturing] = useState(false);
    
    // O brilho (glow) aumenta de acordo com a distância do deslize
    const glowOpacity = useTransform(dragX, [0, 150], [0, 0.6]);
    const glowScale = useTransform(dragX, [0, 150], [0.8, 1.1]);

    const handlePan = (_: any, info: any) => {
        // Apenas detecta se o movimento for para a direita (positivo)
        if (info.offset.x > 0) {
            dragX.set(info.offset.x);
            if (!isGesturing) setIsGesturing(true);
        }
    };

    const handlePanEnd = (_: any, info: any) => {
        // Se o deslize foi maior que 80px ou a velocidade foi alta, dispara o Voltar
        if (info.offset.x > 80 || info.velocity.x > 500) {
            // Dispara o evento global de voltar definido no App.tsx
            window.dispatchEvent(new CustomEvent('lida-internal-back'));
        }
        
        // Reseta o estado visual
        setIsGesturing(false);
        
        // CORREÇÃO AQUI: animate ao invés de motion.animate
        animate(dragX, 0, { type: 'spring', stiffness: 500, damping: 30 });
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[400px] flex justify-center">
            
            {/* EFEITO DE GLOW (RASTRO DO GESTO) */}
            <motion.div 
                style={{ opacity: glowOpacity, scale: glowScale, x: '-50%' }}
                className="absolute left-1/2 top-0 w-full h-full bg-blue-500/40 blur-[40px] rounded-full pointer-events-none"
            />

            <motion.div 
                onPan={handlePan}
                onPanEnd={handlePanEnd}
                className="relative flex items-center justify-between w-full gap-1 px-3 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] touch-none select-none"
            >
                {/* INDICADOR VISUAL DO GESTO (Seta lateral que surge ao puxar) */}
                <AnimatePresence>
                    {isGesturing && (
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="absolute -left-12 top-1/2 -translate-y-1/2 bg-blue-500 text-white p-2 rounded-full shadow-lg"
                        >
                            <ChevronLeft size={20} strokeWidth={3} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = currentTab === tab.id;

                    return (
                        <button
                        key={tab.id}
                        onClick={() => setCurrentTab(tab.id as Tab)}
                        className={`relative flex items-center justify-center p-3 rounded-full transition-colors flex-1 ${
                            isActive ? 'text-white dark:text-black' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                        }`}
                        >
                        {isActive && (
                            <motion.div
                            layoutId="nav-pill"
                            className="absolute inset-0 bg-zinc-900 dark:bg-zinc-100 rounded-full"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex flex-col items-center gap-1">
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        </span>
                        </button>
                    );
                })}
            </motion.div>
        </div>
    );
};