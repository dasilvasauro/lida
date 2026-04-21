import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Star, XCircle } from 'lucide-react';

interface RewardToastProps {
    isVisible: boolean;
    xp: number;
    gold: number;
    isFailed?: boolean;
}

export const RewardToast = ({ isVisible, xp, gold, isFailed }: RewardToastProps) => {
    return (
        <AnimatePresence>
        {isVisible && (
            <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 px-6 py-3.5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] z-50 flex items-center gap-4 font-bold border border-zinc-800 dark:border-zinc-200"
            >
            {isFailed ? (
                <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                <XCircle size={18} />
                <span className="uppercase text-[10px] tracking-widest font-black">Recompensa Anulada</span>
                </div>
            ) : (
                <>
                <div className="flex items-center gap-2">
                <Star size={16} className="text-zinc-400 dark:text-zinc-500" />
                <span>+{xp} XP</span>
                </div>
                <div className="w-px h-4 bg-zinc-700 dark:bg-zinc-300" />
                <div className="flex items-center gap-2">
                <Coins size={16} className="text-zinc-400 dark:text-zinc-500" />
                <span>+{gold} Ouro</span>
                </div>
                </>
            )}
            </motion.div>
        )}
        </AnimatePresence>
    );
};
