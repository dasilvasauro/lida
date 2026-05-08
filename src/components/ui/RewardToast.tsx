import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Coins, Star, XCircle, Zap, Dices, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useConfigStore } from '../../store/useConfigStore';

export interface RewardBreakdown {
    baseXp: number; baseGold: number;
    modusXp: number; modusGold: number;
    magicXp: number; magicGold: number;
    boostXp: number; boostGold: number;
    totalXp: number; totalGold: number;
    isFailed?: boolean;
}

interface RewardToastProps {
    breakdown: RewardBreakdown | null;
}

export const RewardToast = ({ breakdown }: RewardToastProps) => {
    const { theme } = useConfigStore();
    const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
    
    const xpCounter = useMotionValue(0);
    const goldCounter = useMotionValue(0);
    const displayedXp = useTransform(xpCounter, Math.round);
    const displayedGold = useTransform(goldCounter, Math.round);

    useEffect(() => {
        if (!breakdown || breakdown.isFailed) {
            xpCounter.set(0); goldCounter.set(0);
            setVisibleSteps([]);
            return;
        }
        
        setVisibleSteps([0]); 
        let currentXp = breakdown.baseXp;
        let currentGold = breakdown.baseGold;
        
        animate(xpCounter, currentXp, { duration: 0.4 });
        animate(goldCounter, currentGold, { duration: 0.4 });

        const steps = [];
        if (breakdown.modusXp > 0 || breakdown.modusGold > 0) steps.push({ id: 1, x: breakdown.modusXp, g: breakdown.modusGold });
        if (breakdown.magicXp > 0 || breakdown.magicGold > 0) steps.push({ id: 2, x: breakdown.magicXp, g: breakdown.magicGold });
        if (breakdown.boostXp > 0 || breakdown.boostGold > 0) steps.push({ id: 3, x: breakdown.boostXp, g: breakdown.boostGold });

        let delay = 800; 
        steps.forEach((step, idx) => {
            setTimeout(() => {
                setVisibleSteps(prev => [...prev, step.id]);
                currentXp += step.x; currentGold += step.g;
                animate(xpCounter, currentXp, { duration: 0.5, type: 'spring', stiffness: 100 });
                animate(goldCounter, currentGold, { duration: 0.5, type: 'spring', stiffness: 100 });
            }, delay * (idx + 1));
        });
        
    }, [breakdown, xpCounter, goldCounter]);

    const getThemeConfig = () => {
        let container = "";
        let textMain = ""; // Cor para "Recompensa Obtida", "Total", e valores
        let textMuted = ""; // Cor para labels "Valor Base", etc.
        
        // Identificadores de brilho
        const isDark = ['dark-amoled', 'soft-dark', 'navy', 'darcula', 'matrix'].includes(theme);

        switch(theme) {
            case 'light': 
            case 'light-gray':
            case 'macos':
                container = "bg-white border-zinc-200 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]";
                textMain = "text-zinc-950";
                textMuted = "text-zinc-500";
                break;
            case 'dark-amoled': 
                container = "bg-zinc-950 border-zinc-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]";
                textMain = "text-white";
                textMuted = "text-zinc-400";
                break;
            case 'soft-dark': 
                container = "bg-zinc-800 border-zinc-700 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]";
                textMain = "text-white";
                textMuted = "text-zinc-300";
                break;
            case 'butter': 
                container = "bg-[#fdf6e3] border-[#e8ce95] shadow-[0_25px_50px_-12px_rgba(184,134,11,0.2)]";
                textMain = "text-[#362d1e]";
                textMuted = "text-[#857451]";
                break;
            case 'navy': 
                container = "bg-[#0a192f] border-[#233554] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)]";
                textMain = "text-[#e6f1ff]";
                textMuted = "text-[#8892b0]";
                break;
            case 'darcula': 
                container = "bg-[#282a36] border-[#6272a4] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]";
                textMain = "text-[#f8f8f2]";
                textMuted = "text-[#bd93f9]";
                break;
            case 'matrix': 
                container = "bg-black border-[#00ff41] shadow-[0_0_40px_rgba(0,255,65,0.2)]";
                textMain = "text-[#00ff41]";
                textMuted = "text-[#00ff41]/70";
                break;
            case 'pink': 
                container = "bg-white border-pink-200 shadow-[0_25px_50px_-12px_rgba(236,72,153,0.2)]";
                textMain = "text-pink-950";
                textMuted = "text-pink-600";
                break;
            case 'todoist': 
                container = "bg-white border-red-100 shadow-[0_25px_50px_-12px_rgba(225,29,72,0.2)]";
                textMain = "text-zinc-950";
                textMuted = "text-zinc-500";
                break;
            case 'orange': 
                container = "bg-white border-orange-100 shadow-[0_25px_50px_-12px_rgba(249,115,22,0.2)]";
                textMain = "text-orange-950";
                textMuted = "text-orange-600";
                break;
            default:
                container = "bg-white text-black border-zinc-200";
                textMain = "text-black";
                textMuted = "text-zinc-500";
        }

        return {
            container,
            textMain,
            textMuted,
            // Cores de acento otimizadas para contraste
            modus: theme === 'matrix' ? 'text-[#00ff41]' : isDark ? 'text-blue-400' : 'text-blue-600',
            magic: theme === 'matrix' ? 'text-[#00ff41]' : isDark ? 'text-purple-400' : 'text-purple-600',
            boost: theme === 'matrix' ? 'text-[#00ff41]' : isDark ? 'text-orange-400' : 'text-orange-600',
            xp: theme === 'matrix' ? 'text-[#00ff41]' : 'text-purple-500',
            gold: theme === 'matrix' ? 'text-[#00ff41]' : 'text-yellow-500',
            divider: theme === 'matrix' ? 'border-[#00ff41]/20' : 'border-current opacity-10'
        };
    };

    const cfg = getThemeConfig();

    return (
        <AnimatePresence>
        {breakdown && (
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className={`fixed bottom-28 md:bottom-12 left-1/2 md:left-auto md:right-12 -translate-x-1/2 md:translate-x-0 w-[92%] max-w-sm p-6 rounded-[2rem] z-[1000] border-2 transition-colors duration-300 ${cfg.container}`}
            >
                {breakdown.isFailed ? (
                    <div className="flex items-center justify-center gap-3 text-red-500 py-2">
                        <XCircle size={24} />
                        <span className="uppercase text-sm tracking-widest font-black">Recompensa Anulada</span>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <div className={`flex items-center gap-2 mb-5 pb-3 border-b ${cfg.divider}`}>
                            <CheckCircle2 size={18} className="text-emerald-500" />
                            <span className={`text-xs uppercase font-black tracking-[0.15em] ${cfg.textMain}`}>Recompensa Obtida</span>
                        </div>

                        <div className="space-y-3.5 mb-6 text-sm font-bold">
                            {visibleSteps.includes(0) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className={`flex justify-between items-center ${cfg.textMuted}`}>
                                    <span>Valor Base</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.baseXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.baseGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                            {visibleSteps.includes(1) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className={`flex justify-between items-center ${cfg.modus}`}>
                                    <span className="flex items-center gap-2"><Zap size={14} fill="currentColor" className="opacity-20" /> Modus Operandi</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.modusXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.modusGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                            {visibleSteps.includes(2) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className={`flex justify-between items-center ${cfg.magic}`}>
                                    <span className="flex items-center gap-2"><Dices size={14} /> Dado Mágico</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.magicXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.magicGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                            {visibleSteps.includes(3) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className={`flex justify-between items-center ${cfg.boost}`}>
                                    <span className="flex items-center gap-2"><TrendingUp size={14} /> Boosts Ativos</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.boostXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.boostGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                        </div>

                        <div className={`flex justify-between items-center pt-5 border-t-2 ${cfg.divider}`}>
                            <span className={`text-sm font-black uppercase tracking-widest ${cfg.textMain}`}>Total Acumulado</span>
                            <div className="flex gap-4 text-xl">
                                <span className={`${cfg.xp} font-black flex items-center gap-1.5`}><motion.span>{displayedXp}</motion.span> <Star size={20} fill="currentColor" className="opacity-20" /></span>
                                <span className={`${cfg.gold} font-black flex items-center gap-1.5`}><motion.span>{displayedGold}</motion.span> <Coins size={20} fill="currentColor" className="opacity-20" /></span>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        )}
        </AnimatePresence>
    );
};