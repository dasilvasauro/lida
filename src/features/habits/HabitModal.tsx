import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import type { Habit } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface HabitModalProps {
    isOpen: boolean;
    onClose: () => void;
    habitToEdit?: Habit | null;
    onSuccess?: (message: string) => void;
}

export const HabitModal = ({ isOpen, onClose, habitToEdit, onSuccess }: HabitModalProps) => {
    const { addHabit, updateHabit } = useHabitStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [goal, setGoal] = useState<number>(1); // <-- Meta diária

    useEffect(() => {
        if (habitToEdit && isOpen) {
            setTitle(habitToEdit.title);
            setDescription(habitToEdit.description || '');
            setGoal(habitToEdit.goal || 1);
        } else if (isOpen) {
            setTitle('');
            setDescription('');
            setGoal(1);
        }
    }, [habitToEdit, isOpen]);

    const handleSave = () => {
        if (!title.trim()) return;

        if (habitToEdit) {
            updateHabit(habitToEdit.id, { title, description, goal });
            onSuccess?.('Hábito atualizado com sucesso!');
        } else {
            addHabit({ id: uuidv4(), createdAt: Date.now(), title, description, goal });
            onSuccess?.('Novo hábito forjado!');
        }
        onClose();
    };

    return (
        <AnimatePresence>
        {isOpen && (
            <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
            <motion.div layoutId={habitToEdit ? undefined : "fab-habit"} className="fixed bottom-0 left-0 right-0 md:bottom-6 max-w-md mx-auto bg-zinc-50 dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.4)] z-50 overflow-hidden flex flex-col">

            <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold">{habitToEdit ? 'Editar Hábito' : 'Forjar Hábito'}</h3>
            <button onClick={onClose} className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-8">
            <div className="space-y-2">
            <input type="text" placeholder="Qual será o novo hábito?" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600" autoFocus />
            <textarea placeholder="Detalhes ou motivação (Opcional)..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full resize-none bg-transparent border-none outline-none text-sm text-zinc-600 dark:text-zinc-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 h-16" />
            </div>

            {/* SLIDER DE META DIÁRIA */}
            <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Meta Diária (Vezes)</span>
            <span className="font-black text-2xl text-emerald-500">{goal}</span>
            </div>
            <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
            className="w-full accent-emerald-500"
            />
            </div>
            </div>

            <div className="p-6 bg-zinc-100 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
            <button onClick={handleSave} disabled={!title.trim()} className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold text-lg disabled:opacity-50 transition-opacity hover:opacity-90">
            {habitToEdit ? 'Salvar Alterações' : 'Iniciar Consistência'}
            </button>
            </div>

            </motion.div>
            </>
        )}
        </AnimatePresence>
    );
};
