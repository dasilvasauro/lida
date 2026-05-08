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
        
    }, [breakdown]);

    // LÓGICA DE ESTILOS DINÂMICOS BASEADA NO TEMA
    const getThemeConfig = () => {
        let containerClass = "";
        let isDarkTheme = ['dark-amoled', 'soft-dark', 'navy', 'darcula', 'matrix'].includes(theme);

        switch(theme) {
            case 'light': containerClass = "bg-white border-zinc-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-zinc-900"; break;
            case 'dark-amoled': containerClass = "bg-zinc-900 border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-white"; break;
            case 'soft-dark': containerClass = "bg-zinc-800 border-zinc-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-zinc-100"; break;
            case 'butter': containerClass = "bg-[#fdf6e3] border-[#e8ce95] shadow-[0_20px_50px_rgba(212,185,130,0.4)] text-[#362d1e]"; break;
            case 'navy': containerClass = "bg-[#112240] border-[#233554] shadow-[0_20px_50px_rgba(2,12,27,0.7)] text-[#e6f1ff]"; break;
            case 'darcula': containerClass = "bg-[#282a36] border-[#6272a4] shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-[#f8f8f2]"; break;
            case 'macos': containerClass = "bg-white border-blue-500 shadow-[0_15px_40px_rgba(59,130,246,0.3)] text-zinc-900"; break;
            case 'matrix': containerClass = "bg-black border-[#00ff41] shadow-[0_15px_40px_rgba(0,255,65,0.2)] text-[#00ff41]"; break;
            case 'pink': containerClass = "bg-white border-pink-500 shadow-[0_15px_40px_rgba(236,72,153,0.3)] text-zinc-900"; break;
            case 'todoist': containerClass = "bg-white border-red-500 shadow-[0_15px_40px_rgba(225,29,72,0.3)] text-zinc-900"; break;
            case 'light-gray': containerClass = "bg-[#f4f4f5] border-zinc-300 shadow-[0_15px_40px_rgba(0,0,0,0.15)] text-zinc-900"; break;
            case 'orange': containerClass = "bg-white border-orange-500 shadow-[0_15px_40px_rgba(249,115,22,0.3)] text-zinc-900"; break;
            default: containerClass = "bg-zinc-900 border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-white"; break;
        }

        const isMatrix = theme === 'matrix';
        return {
            container: containerClass,
            subtext: isMatrix ? "text-[#00aa00]" : "opacity-60 font-medium",
            primary: isMatrix ? "text-[#00ff41]" : "text-emerald-500",
            modus: isMatrix ? "text-[#00ff41]" : isDarkTheme ? 'text-blue-400' : 'text-blue-600',
            magic: isMatrix ? "text-[#00ff41]" : isDarkTheme ? 'text-purple-400' : 'text-purple-600',
            boost: isMatrix ? "text-[#00ff41]" : isDarkTheme ? 'text-orange-400' : 'text-orange-600',
            divider: isMatrix ? "border-[#00aa00]/30" : "border-current opacity-10"
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
                className={`fixed bottom-28 md:bottom-12 left-1/2 md:left-auto md:right-32 -translate-x-1/2 md:translate-x-0 w-[90%] max-w-sm p-6 rounded-3xl z-50 border-2 ${cfg.container}`}
            >
                {breakdown.isFailed ? (
                    <div className="flex items-center justify-center gap-3 text-red-500 py-2">
                        <XCircle size={24} />
                        <span className="uppercase text-sm tracking-widest font-black">Recompensa Anulada</span>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <div className={`flex items-center gap-2 mb-4 pb-3 border-b ${cfg.divider}`}>
                            <CheckCircle2 size={16} className={cfg.primary} />
                            <span className="text-xs uppercase font-black tracking-widest opacity-80">Recompensa Obtida</span>
                        </div>

                        <div className="space-y-3 mb-5 text-sm font-bold">
                            {visibleSteps.includes(0) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className={`flex justify-between items-center ${cfg.subtext}`}>
                                    <span>Valor Base</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.baseXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.baseGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                            {visibleSteps.includes(1) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className={`flex justify-between items-center ${cfg.modus}`}>
                                    <span className="flex items-center gap-1.5"><Zap size={14}/> Modus Operandi</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.modusXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.modusGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                            {visibleSteps.includes(2) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className={`flex justify-between items-center ${cfg.magic}`}>
                                    <span className="flex items-center gap-1.5"><Dices size={14}/> Dado Mágico</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.magicXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.magicGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                            {visibleSteps.includes(3) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className={`flex justify-between items-center ${cfg.boost}`}>
                                    <span className="flex items-center gap-1.5"><TrendingUp size={14}/> Boosts Ativos</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.boostXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.boostGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                        </div>

                        <div className={`flex justify-between items-center pt-4 border-t ${cfg.divider}`}>
                            <span className="text-sm font-black uppercase tracking-widest">Total</span>
                            <div className="flex gap-4 text-lg">
                                <span className={`${theme === 'matrix' ? 'text-[#00ff41]' : 'text-purple-500'} font-black flex items-center gap-1.5`}><motion.span>{displayedXp}</motion.span> <Star size={18}/></span>
                                <span className={`${theme === 'matrix' ? 'text-[#00ff41]' : 'text-yellow-500'} font-black flex items-center gap-1.5`}><motion.span>{displayedGold}</motion.span> <Coins size={18}/></span>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        )}
        </AnimatePresence>
    );
};