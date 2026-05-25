import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ban } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';

interface QuitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuitterModal = ({ isOpen, onClose, onSuccess }: QuitterModalProps) => {
  const { addQuitterItem } = useHabitStore();
  const [title, setTitle] = useState('');

  const handleSave = () => {
    if (!title.trim()) return;
    addQuitterItem(title.trim());
    setTitle('');
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-3xl p-8 shadow-2xl border border-red-500/20 relative">
          
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
             <X size={20} className="text-zinc-500" />
          </button>

          <div className="flex flex-col items-center text-center mb-8">
             <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
                 <Ban size={32} />
             </div>
             <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">O Desapego</h2>
             <p className="text-sm text-zinc-500 mt-2 leading-relaxed">Qual hábito tóxico ou vício você está pronto para abandonar hoje?</p>
          </div>

          <input 
            type="text" maxLength={40} placeholder="Ex: Fumar, Redes Sociais..." 
            value={title} onChange={(e) => setTitle(e.target.value)} 
            className="w-full text-center text-2xl font-bold bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 outline-none pb-4 mb-8 focus:border-red-500 transition-colors" autoFocus 
          />

          <button onClick={handleSave} disabled={!title.trim()} className="w-full py-4 rounded-xl bg-red-600 text-white font-bold text-lg disabled:opacity-50 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20">
             Firmar Compromisso
          </button>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};