import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { useReflectionStore } from '../../store/useReflectionStore';
import type { Reflection, ReflectionColor } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const ReflectionCreatorModal = ({ isOpen, onClose, reflectionToEdit }: { isOpen: boolean; onClose: () => void; reflectionToEdit?: Reflection | null }) => {
  const { addReflection, updateReflection, deleteReflection } = useReflectionStore();
  
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<ReflectionColor>('zinc');
  const [cards, setCards] = useState<string[]>(['']);

  const colors: { id: ReflectionColor; class: string }[] = [
    { id: 'zinc', class: 'bg-zinc-500' }, { id: 'blue', class: 'bg-blue-500' },
    { id: 'emerald', class: 'bg-emerald-500' }, { id: 'amber', class: 'bg-amber-500' },
    { id: 'rose', class: 'bg-rose-500' }, { id: 'purple', class: 'bg-purple-500' },
    { id: 'cyan', class: 'bg-cyan-500' }, { id: 'indigo', class: 'bg-indigo-500' },
  ];

  useEffect(() => {
    if (isOpen && reflectionToEdit) {
      setTitle(reflectionToEdit.title); setColor(reflectionToEdit.color); setCards(reflectionToEdit.cards);
    } else if (isOpen) {
      setTitle(''); setColor('zinc'); setCards(['']);
    }
  }, [isOpen, reflectionToEdit]);

  const handleSave = () => {
    const validCards = cards.map(c => c.trim()).filter(c => c.length > 0);
    if (!title.trim() || validCards.length === 0) return;

    if (reflectionToEdit) {
      updateReflection(reflectionToEdit.id, { title, color, cards: validCards });
    } else {
      addReflection({ id: uuidv4(), title, color, cards: validCards, createdAt: Date.now() });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4">
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.3 }} className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          
          <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold">{reflectionToEdit ? 'Editar Reflexão' : 'Nova Reflexão'}</h3>
            <button onClick={onClose} className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-6 scrollbar-hide">
            <input type="text" maxLength={40} placeholder="Título da Reflexão (Ex: Ansiedade)" value={title} onChange={e => setTitle(e.target.value)} className="w-full text-2xl font-bold bg-transparent outline-none placeholder:text-zinc-400" autoFocus />
            
            <div>
              <span className="text-xs font-bold uppercase text-zinc-500 mb-3 block">Cor Determinante</span>
              <div className="flex gap-2">
                {colors.map(c => (
                  <button key={c.id} onClick={() => setColor(c.id)} className={`w-8 h-8 rounded-full transition-transform ${c.class} ${color === c.id ? 'scale-125 ring-2 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900 ring-zinc-900 dark:ring-zinc-100' : 'hover:scale-110 opacity-70'}`} />
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <span className="text-xs font-bold uppercase text-zinc-500 block">Cards (Sequência)</span>
              {cards.map((cardText, i) => (
                <div key={i} className="flex gap-2 relative group">
                  <textarea maxLength={300} value={cardText} onChange={e => { const n = [...cards]; n[i] = e.target.value; setCards(n); }} placeholder="Escreva o texto deste card..." className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl text-sm outline-none resize-none h-24" />
                  {cards.length > 1 && (
                     <button onClick={() => setCards(cards.filter((_, idx) => idx !== i))} className="absolute right-2 top-2 p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
              <button onClick={() => setCards([...cards, ''])} className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-bold text-sm">
                <Plus size={16} /> Adicionar Card
              </button>
            </div>
            
            {reflectionToEdit && (
               <button onClick={() => { deleteReflection(reflectionToEdit.id); onClose(); }} className="w-full p-4 mt-6 text-red-500 font-bold hover:bg-red-500/10 rounded-xl transition-colors">Excluir Reflexão</button>
            )}
          </div>

          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
            <button onClick={handleSave} disabled={!title.trim() || !cards.some(c => c.trim())} className="w-full py-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black font-bold disabled:opacity-50 transition-opacity">Salvar Reflexão</button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};