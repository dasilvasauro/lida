import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, AlertTriangle, Repeat, Trash2 } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { useConfigStore, useBackHandler } from '../../store/useConfigStore';
import type { RoutineTemplate, ItemColor } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface RoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  routineToEdit?: RoutineTemplate | null;
  onSuccess?: (message: string) => void;
}

export const RoutineModal = ({ isOpen, onClose, routineToEdit, onSuccess }: RoutineModalProps) => {
  const { addRoutine, updateRoutine } = useTaskStore();
  const { enableEditWindow, hasDismissedEditWarning, dismissEditWarning } = useConfigStore();

  const [title, setTitle] = useState('');
  const [items, setItems] = useState<string[]>(['']);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); 
  const [color, setColor] = useState<ItemColor>('indigo'); 
  
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const colors: { id: ItemColor; class: string }[] = [
    { id: 'indigo', class: 'bg-indigo-500' }, { id: 'blue', class: 'bg-blue-500' },
    { id: 'emerald', class: 'bg-emerald-500' }, { id: 'amber', class: 'bg-amber-500' },
    { id: 'rose', class: 'bg-rose-500' }, { id: 'purple', class: 'bg-purple-500' },
    { id: 'cyan', class: 'bg-cyan-500' }, { id: 'zinc', class: 'bg-zinc-500' },
  ];

  useEffect(() => {
    if (routineToEdit && isOpen) {
      setTitle(routineToEdit.title);
      setItems(routineToEdit.items.length > 0 ? routineToEdit.items : ['']);
      setSelectedWeekdays(routineToEdit.weekdays);
      setColor(routineToEdit.color || 'indigo');
    } else if (isOpen) {
      setTitle('');
      setItems(['']);
      setSelectedWeekdays([1, 2, 3, 4, 5]);
      setColor('indigo');
    }
    if (isOpen) setShowConfirmClose(false);
  }, [routineToEdit, isOpen]);

  const checkIsDirty = () => {
    if (routineToEdit) {
      return title !== routineToEdit.title || 
             JSON.stringify(items) !== JSON.stringify(routineToEdit.items) ||
             JSON.stringify(selectedWeekdays) !== JSON.stringify(routineToEdit.weekdays) ||
             color !== routineToEdit.color;
    }
    return title.trim().length > 0 || items.some(i => i.trim().length > 0);
  };

  const handleRequestClose = () => checkIsDirty() ? setShowConfirmClose(true) : onClose();

  useEffect(() => {
    const handleGlobalClose = () => { if (isOpen) handleRequestClose(); };
    window.addEventListener('request-modal-close', handleGlobalClose);
    return () => window.removeEventListener('request-modal-close', handleGlobalClose);
  }, [isOpen, title, items, selectedWeekdays, color, routineToEdit]);

  // === INTERCEPTAÇÃO DE NAVEGAÇÃO ===
  useBackHandler(isOpen && !showConfirmClose, () => { handleRequestClose(); return true; });
  useBackHandler(showConfirmClose, () => { setShowConfirmClose(false); return true; });

  const toggleWeekday = (day: number) => {
      setSelectedWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSave = () => {
    const validItems = items.filter(i => i.trim().length > 0);
    if (!title.trim() || validItems.length === 0 || selectedWeekdays.length === 0) return;

    if (routineToEdit) {
      updateRoutine(routineToEdit.id, { title, items: validItems, weekdays: selectedWeekdays, color });
      onSuccess?.('Rotina atualizada!');
    } else {
      addRoutine({
        id: uuidv4(),
        title,
        items: validItems,
        weekdays: selectedWeekdays,
        color,
        createdAt: Date.now()
      });
      onSuccess?.('Rotina forjada!');
    }
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleRequestClose} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.3 }} className="fixed bottom-0 left-0 right-0 md:bottom-6 max-w-md mx-auto bg-zinc-50 dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-indigo-500">
                    <Repeat size={20} />
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{routineToEdit ? 'Editar Rotina' : 'Nova Rotina'}</h3>
                </div>
                <button onClick={handleRequestClose} className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-8 scrollbar-hide">
                
                {/* ALERTA DE EDIÇÃO E PUNIÇÕES (MODO HARDCORE) */}
                {enableEditWindow && !hasDismissedEditWarning && !routineToEdit && (
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
                  <input type="text" maxLength={120} placeholder="Nome da Rotina (Ex: Manhã Focada)" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600" autoFocus />
                </div>

                <div>
                  <span className="text-xs font-bold uppercase text-zinc-500 mb-3 block">Cor da Rotina</span>
                  <div className="flex gap-2">
                    {colors.map(c => (
                      <button key={c.id} onClick={() => setColor(c.id)} className={`w-8 h-8 rounded-full transition-transform ${c.class} ${color === c.id ? 'scale-125 ring-2 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900 ring-zinc-900 dark:ring-zinc-100' : 'hover:scale-110 opacity-70'}`} />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">Dias da Semana</span>
                  <div className="flex justify-between">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                      <button key={i} onClick={() => toggleWeekday(i)} className={`w-10 h-10 rounded-full text-xs font-bold border transition-all ${selectedWeekdays.includes(i) ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-500/30' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-xs uppercase tracking-widest text-zinc-500 block font-bold">Itens da Rotina (Obrigatório)</span>
                  
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                         <div className="w-5 h-5 rounded-md border-2 border-zinc-300 dark:border-zinc-700 shrink-0" />
                         <input 
                            type="text" maxLength={120} value={item} 
                            placeholder={`Item ${index + 1}`}
                            onChange={(e) => { const newItems = [...items]; newItems[index] = e.target.value; setItems(newItems); }} 
                            onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); setItems([...items, '']); } }}
                            className="flex-1 bg-transparent border-b border-zinc-200 dark:border-zinc-800 p-2 text-sm outline-none focus:border-indigo-500 transition-colors" 
                         />
                         {items.length > 1 && (
                            <button onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                         )}
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setItems([...items, ''])} className="w-full flex items-center justify-center gap-2 p-3 mt-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-bold text-sm">
                    <Plus size={16} /> Adicionar Item
                  </button>
                </div>
              </div>

              <div className="p-6 pb-28 md:pb-6 bg-zinc-100 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
                <button onClick={handleSave} disabled={!title.trim() || items.filter(i => i.trim().length > 0).length === 0 || selectedWeekdays.length === 0} className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg disabled:opacity-50 transition-all hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">
                  {routineToEdit ? 'Salvar Alterações' : 'Forjar Rotina'}
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmClose && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black mb-2 dark:text-white">Descartar alterações?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">Você preencheu algumas informações. Se fechar agora, elas serão perdidas.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmClose(false)} className="flex-1 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                <button onClick={() => { setShowConfirmClose(false); onClose(); }} className="flex-1 p-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors">Descartar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};