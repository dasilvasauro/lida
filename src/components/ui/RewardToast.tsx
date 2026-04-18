import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Star } from 'lucide-react';

interface RewardToastProps {
    isVisible: boolean;
    xp: number;
    gold: number;
}

export const RewardToast = ({ isVisible, xp, gold }: RewardToastProps) => {
    return (
        <AnimatePresence>
        {isVisible && (
            <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4 font-bold border border-zinc-700 dark:border-zinc-300"
            >
            <div className="flex items-center gap-1.5 text-amber-400 dark:text-amber-600">
            <Star size={18} fill="currentColor" /> +{xp} XP
            </div>
            <div className="w-px h-4 bg-zinc-700 dark:bg-zinc-300" />
            <div className="flex items-center gap-1.5 text-yellow-500 dark:text-yellow-600">
            <Coins size={18} fill="currentColor" /> +{gold} Ouro
            </div>
            </motion.div>
        )}
        </AnimatePresence>
    );
};
