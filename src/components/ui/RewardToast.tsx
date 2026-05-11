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
    const [isDismissed, setIsDismissed] = useState(false); // Estado para controlar o Swipe to Dismiss
    
    const xpCounter = useMotionValue(0);
    const goldCounter = useMotionValue(0);
    const displayedXp = useTransform(xpCounter, Math.round);
    const displayedGold = useTransform(goldCounter, Math.round);

    useEffect(() => {
        setIsDismissed(false); // Reseta o dismiss sempre que houver uma nova recompensa
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

    // BLINDAGEM DE ESTILOS: Usamos cores hexadecimais explícitas para garantir 100% de contraste
    const getThemeConfig = () => {
        let container = "";
        let textMain = ""; 
        let textMuted = ""; 
        
        const isDark = ['dark-amoled', 'soft-dark', 'navy', 'darcula', 'matrix'].includes(theme);

        switch(theme) {
            case 'light': 
            case 'light-gray':
            case 'macos':
                container = "bg-white border-zinc-200 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]";
                textMain = "#09090b"; // Preto carvão
                textMuted = "#71717a"; // Cinza médio
                break;
            case 'dark-amoled': 
                container = "bg-zinc-950 border-zinc-700 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]";
                textMain = "#ffffff"; // Branco puro
                textMuted = "#a1a1aa"; 
                break;
            case 'soft-dark': 
                container = "bg-zinc-800 border-zinc-600 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]";
                textMain = "#ffffff"; // Branco puro contrastando com o cinza do fundo
                textMuted = "#d4d4d8"; 
                break;
            case 'butter': 
                container = "bg-[#fffbf0] border-[#d4b982] shadow-[0_25px_50px_-12px_rgba(184,134,11,0.2)]";
                textMain = "#362d1e";
                textMuted = "#857451";
                break;
            case 'navy': 
                container = "bg-[#0a192f] border-[#233554] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)]";
                textMain = "#ffffff";
                textMuted = "#8892b0";
                break;
            case 'darcula': 
                container = "bg-[#282a36] border-[#6272a4] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]";
                textMain = "#ffffff";
                textMuted = "#bd93f9";
                break;
            case 'matrix': 
                container = "bg-black border-[#00ff41] shadow-[0_0_40px_rgba(0,255,65,0.2)]";
                textMain = "#00ff41";
                textMuted = "#00aa00";
                break;
            case 'pink': 
                container = "bg-white border-pink-300 shadow-[0_25px_50px_-12px_rgba(236,72,153,0.3)]";
                textMain = "#500724"; 
                textMuted = "#db2777"; 
                break;
            case 'todoist': 
                container = "bg-white border-red-200 shadow-[0_25px_50px_-12px_rgba(225,29,72,0.3)]";
                textMain = "#09090b";
                textMuted = "#71717a";
                break;
            case 'orange': 
                container = "bg-white border-orange-200 shadow-[0_25px_50px_-12px_rgba(249,115,22,0.3)]";
                textMain = "#431407"; 
                textMuted = "#ea580c"; 
                break;
            default:
                container = "bg-white border-zinc-200 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]";
                textMain = "#09090b";
                textMuted = "#71717a";
        }

        return {
            container,
            textMain,
            textMuted,
            modus: theme === 'matrix' ? '#00ff41' : isDark ? '#60a5fa' : '#2563eb', // Azul brilhante ou escuro
            magic: theme === 'matrix' ? '#00ff41' : isDark ? '#c084fc' : '#9333ea', // Roxo
            boost: theme === 'matrix' ? '#00ff41' : isDark ? '#fb923c' : '#ea580c', // Laranja
            xp: theme === 'matrix' ? '#00ff41' : '#a855f7', // Roxo principal
            gold: theme === 'matrix' ? '#00ff41' : '#eab308', // Dourado
            divider: theme === 'matrix' ? 'rgba(0,255,65,0.3)' : 'rgba(150,150,150,0.2)'
        };
    };

    const cfg = getThemeConfig();

    return (
        <AnimatePresence>
        {breakdown && !isDismissed && (
            <motion.div
                drag="x" // Permite arrastar horizontalmente
                dragConstraints={{ left: 0, right: 0 }} // Elástico em ambas as direções
                dragElastic={0.8}
                onDragEnd={(e, { offset, velocity }) => {
                    // Se puxou muito para o lado ou muito rápido, descarta o toast
                    if (Math.abs(offset.x) > 80 || Math.abs(velocity.x) > 400) {
                        setIsDismissed(true);
                    }
                }}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: isDismissed ? 300 : 0, y: isDismissed ? 0 : 20, scale: 0.9 }}
                className={`fixed bottom-28 md:bottom-12 left-1/2 md:left-auto md:right-12 -translate-x-1/2 md:translate-x-0 w-[92%] max-w-sm p-6 rounded-[2rem] z-[1000] border-2 transition-colors duration-300 cursor-grab active:cursor-grabbing ${cfg.container}`}
                style={{ touchAction: 'none' }} // Impede que o celular role a tela enquanto arrasta o toast
            >
                {breakdown.isFailed ? (
                    <div className="flex items-center justify-center gap-3 text-red-500 py-2">
                        <XCircle size={24} />
                        <span className="uppercase text-sm tracking-widest font-black" style={{ color: cfg.textMain }}>Recompensa Anulada</span>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-5 pb-3 border-b" style={{ borderColor: cfg.divider }}>
                            <CheckCircle2 size={18} className="text-emerald-500" />
                            <span className="text-xs uppercase font-black tracking-[0.15em]" style={{ color: cfg.textMain }}>Recompensa Obtida</span>
                        </div>

                        <div className="space-y-3.5 mb-6 text-sm font-bold">
                            {visibleSteps.includes(0) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className="flex justify-between items-center" style={{ color: cfg.textMuted }}>
                                    <span>Valor Base</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.baseXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.baseGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                            {visibleSteps.includes(1) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className="flex justify-between items-center" style={{ color: cfg.modus }}>
                                    <span className="flex items-center gap-2"><Zap size={14} fill="currentColor" className="opacity-20" /> Modus Operandi</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.modusXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.modusGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                            {visibleSteps.includes(2) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className="flex justify-between items-center" style={{ color: cfg.magic }}>
                                    <span className="flex items-center gap-2"><Dices size={14} /> Dado Mágico</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.magicXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.magicGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                            {visibleSteps.includes(3) && (
                                <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className="flex justify-between items-center" style={{ color: cfg.boost }}>
                                    <span className="flex items-center gap-2"><TrendingUp size={14} /> Boosts Ativos</span>
                                    <div className="flex gap-3"><span className="flex items-center gap-1">+{breakdown.boostXp} <Star size={12}/></span><span className="flex items-center gap-1">+{breakdown.boostGold} <Coins size={12}/></span></div>
                                </motion.div>
                            )}
                        </div>

                        <div className="flex justify-between items-center pt-5 border-t-2" style={{ borderColor: cfg.divider }}>
                            <span className="text-sm font-black uppercase tracking-widest" style={{ color: cfg.textMain }}>Total Acumulado</span>
                            <div className="flex gap-4 text-xl">
                                <span className="font-black flex items-center gap-1.5" style={{ color: cfg.xp }}><motion.span>{displayedXp}</motion.span> <Star size={20} fill="currentColor" className="opacity-20" /></span>
                                <span className="font-black flex items-center gap-1.5" style={{ color: cfg.gold }}><motion.span>{displayedGold}</motion.span> <Coins size={20} fill="currentColor" className="opacity-20" /></span>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        )}
        </AnimatePresence>
    );
};