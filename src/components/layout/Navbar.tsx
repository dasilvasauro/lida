import { CheckCircle2, Repeat, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';

export type Tab = 'tasks' | 'habits' | 'shop' | 'profile';

interface NavbarProps {
    currentTab: Tab;
    setCurrentTab: (tab: Tab) => void;
}

export const Navbar = ({ currentTab, setCurrentTab }: NavbarProps) => {
    const tabs = [
        { id: 'tasks', icon: CheckCircle2, label: 'Tarefas' },
        { id: 'habits', icon: Repeat, label: 'Hábitos' },
        { id: 'shop', icon: ShoppingBag, label: 'Loja' },
        { id: 'profile', icon: User, label: 'Perfil' },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 px-4 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
                <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as Tab)}
                className={`relative flex items-center justify-center p-3 rounded-full transition-colors ${
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
                <span className="relative z-10">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </span>
                </button>
            );
        })}
        </div>
        </div>
    );
};
