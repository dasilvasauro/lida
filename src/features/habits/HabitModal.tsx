import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { useConfigStore } from '../../store/useConfigStore';
import type { Habit } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface HabitModalProps { isOpen: boolean; onClose: () => void; habitToEdit?: Habit | null; onSuccess?: (message: string) => void; }

export const HabitModal = ({ isOpen, onClose, habitToEdit, onSuccess }: HabitModalProps) => {
    const { addHabit, updateHabit } = useHabitStore();
    const { enableEditWindow, hasDismissedEditWarning, dismissEditWarning } = useConfigStore();

    const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [goal, setGoal] = useState<number>(1);

    useEffect(() => {
        if (habitToEdit && isOpen) { setTitle(habitToEdit.title); setDescription(habitToEdit.description || ''); setGoal(habitToEdit.goal || 1); } 
        else if (isOpen) { setTitle(''); setDescription(''); setGoal(1); }
    }, [habitToEdit, isOpen]);

    const handleSave = () => {
        if (!title.trim()) return;
        if (habitToEdit) { updateHabit(habitToEdit.id, { title, description, goal }); onSuccess?.('Hábito atualizado com sucesso!'); } 
        else { addHabit({ id: uuidv4(), createdAt: Date.now(), title, description, goal }); onSuccess?.('Novo hábito forjado!'); }
        onClose();
    };

    return (
        <AnimatePresence>
        {isOpen && (
            <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div 
               initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
               className="fixed bottom-0 left-0 right-0 md:bottom-6 max-w-md mx-auto bg-zinc-50 dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col">

            <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold">{habitToEdit ? 'Editar Hábito' : 'Forjar Hábito'}</h3>
            <button onClick={onClose} className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
            
            {/* ALERTA DE EDIÇÃO E PUNIÇÕES (MODO HARDCORE) */}
            {enableEditWindow && !hasDismissedEditWarning && !habitToEdit && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl relative flex gap-3 items-start text-amber-600 dark:text-amber-500 mb-2">
                    <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                    <div className="pr-6">
                        <h4 className="font-bold text-sm mb-1">Custo da Desorganização</h4>
                        <p className="text-xs opacity-90 leading-relaxed mb-3">Você tem exatos <b>10 minutos</b> após criar um item para editá-lo de graça. Após isso, custará Vouchers. Pense bem antes de criar!<br/><br/><i>(Desativável na aba de Perfil)</i></p>
                        <button onClick={(e) => { e.preventDefault(); dismissEditWarning(); }} className="text-xs font-bold underline hover:opacity-70 transition-opacity">Entendido, não mostrar novamente.</button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
            <input type="text" maxLength={120} placeholder="Qual será o novo hábito?" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600" autoFocus />
            <textarea maxLength={500} placeholder="Detalhes ou motivação (Opcional)..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full resize-none bg-transparent border-none outline-none text-sm text-zinc-600 dark:text-zinc-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 h-16" />
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Meta Diária (Vezes)</span>
            <span className="font-black text-2xl text-emerald-500">{goal}</span>
            </div>
            <input type="range" min="1" max="10" step="1" value={goal} onChange={(e) => setGoal(Number(e.target.value))} className="w-full accent-emerald-500" />
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