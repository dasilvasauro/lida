import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, SplitSquareHorizontal, Plus, Copy, Trash2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useBackHandler } from '../../store/useConfigStore';
import { v4 as uuidv4 } from 'uuid';
import type { ShortcutCategory, ShortcutColor, ShortcutType } from '../../types';

const catStyles: Record<ShortcutColor, { bg: string, border: string, text: string }> = {
  slate: { bg: 'bg-slate-900', border: 'border-slate-800', text: 'text-slate-100' },
  gray: { bg: 'bg-zinc-900', border: 'border-zinc-800', text: 'text-zinc-100' },
  neutral: { bg: 'bg-neutral-900', border: 'border-neutral-800', text: 'text-neutral-100' },
  red: { bg: 'bg-rose-950', border: 'border-rose-900/50', text: 'text-rose-100' },
  orange: { bg: 'bg-amber-950', border: 'border-amber-900/50', text: 'text-amber-100' },
  lime: { bg: 'bg-lime-950', border: 'border-lime-900/50', text: 'text-lime-100' },
  teal: { bg: 'bg-teal-950', border: 'border-teal-900/50', text: 'text-teal-100' },
  sky: { bg: 'bg-sky-950', border: 'border-sky-900/50', text: 'text-sky-100' },
};

const quickKeys = ['Ctrl', 'Alt', 'Shift', 'Cmd', 'Win', 'Tab', 'Enter', 'Esc', 'Space', 'Del', 'Up', 'Down', 'Left', 'Right'];

const CategoryView = ({ categoryId }: { categoryId: string }) => {
    const { shortcutCategories, updateShortcutCategory, deleteShortcutCategory } = useNoteStore();
    const category = shortcutCategories.find(c => c.id === categoryId);

    const [label, setLabel] = useState('');
    const [value, setValue] = useState('');
    const [type, setType] = useState<ShortcutType>('keys');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    if (!category) return null;
    const style = catStyles[category.color];

    const handleAddItem = () => {
        if (!label.trim() || !value.trim()) return;
        const newItem = { id: uuidv4(), label, value, type };
        updateShortcutCategory(category.id, { items: [...category.items, newItem] });
        setLabel(''); setValue('');
    };

    const handleRemoveItem = (id: string) => {
        updateShortcutCategory(category.id, { items: category.items.filter(i => i.id !== id) });
    };

    const copy = (val: string, id: string) => {
        navigator.clipboard.writeText(val);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className={`flex flex-col h-full rounded-[2rem] overflow-hidden border ${style.border} ${style.bg}`}>
           <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-black/20 shrink-0">
              <h3 className={`text-xl font-black tracking-tight ${style.text}`}>{category.title}</h3>
              <button onClick={() => deleteShortcutCategory(category.id)} className="p-2 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"><Trash2 size={18}/></button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 scrollbar-hide">
              {category.items.length === 0 && (
                 <div className="text-center text-white/30 text-sm mt-10 font-bold">Nenhum atalho cadastrado.</div>
              )}
              {category.items.map(item => (
                 <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 rounded-2xl bg-black/20 border border-white/5 group transition-colors hover:bg-black/30">
                    <span className={`text-sm font-bold ${style.text} opacity-90`}>{item.label}</span>
                    <div className="flex items-center gap-3 self-start md:self-auto w-full md:w-auto">
                       {item.type === 'keys' ? (
                          <div className="flex gap-1 flex-wrap flex-1 md:flex-auto justify-end">
                            {item.value.split('+').map((k, idx) => (
                               <kbd key={idx} className="px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-[10px] font-black shadow-inner uppercase tracking-wider text-white">
                                  {k.trim()}
                               </kbd>
                            ))}
                          </div>
                       ) : (
                          <div className="flex items-center gap-2 bg-black/40 pl-3 pr-1 py-1 rounded-xl border border-white/10 shadow-inner flex-1 md:flex-auto overflow-hidden">
                             <code className="text-xs font-mono text-emerald-400 truncate flex-1">{item.value}</code>
                             <button onClick={() => copy(item.value, item.id)} className="p-1.5 hover:bg-white/10 text-white/50 hover:text-white transition-colors rounded-lg shrink-0">
                                {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14}/>}
                             </button>
                          </div>
                       )}
                       <button onClick={() => handleRemoveItem(item.id)} className="p-1.5 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all rounded-lg shrink-0"><X size={14}/></button>
                    </div>
                 </div>
              ))}
           </div>

           <div className="p-4 md:p-6 bg-black/30 border-t border-white/5 shrink-0">
              <div className="flex flex-col gap-3">
                 <div className="flex items-center gap-2">
                    <input type="text" placeholder="Ação (Ex: Salvar)" value={label} onChange={e=>setLabel(e.target.value)} className="flex-1 bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm font-bold outline-none placeholder:text-white/30 text-white focus:border-white/30 transition-colors" />
                    <button onClick={() => setType(t => t === 'keys' ? 'command' : 'keys')} className="text-[10px] font-black uppercase tracking-widest px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-colors text-white">
                       {type === 'keys' ? 'Teclas' : 'Comando'}
                    </button>
                 </div>
                 <div className="flex items-center gap-2">
                    <input type="text" placeholder={type === 'keys' ? "Ex: Ctrl + S" : "Ex: git commit -m"} value={value} onChange={e=>setValue(e.target.value)} className={`flex-1 bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm outline-none placeholder:text-white/30 transition-colors text-white ${type === 'keys' ? 'font-bold' : 'font-mono text-emerald-400'}`} />
                    <button onClick={handleAddItem} disabled={!label.trim() || !value.trim()} className="p-3 bg-white text-black rounded-xl hover:opacity-80 disabled:opacity-50 transition-opacity"><Plus size={18} strokeWidth={3}/></button>
                 </div>
                 {type === 'keys' && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-1 pb-1">
                       {quickKeys.map(k => (
                          <button key={k} onClick={() => setValue(v => v ? `${v} + ${k}` : k)} className="shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-[10px] font-black tracking-wider uppercase transition-colors text-white/80">{k}</button>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
    );
};

export const ShortcutModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { shortcutCategories, addShortcutCategory } = useNoteStore();
  const [isSplit, setIsSplit] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [leftCatId, setLeftCatId] = useState<string | null>(null);
  const [rightCatId, setRightCatId] = useState<string | null>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState<ShortcutColor>('slate');

  useEffect(() => {
     if (shortcutCategories.length > 0) {
        if (currentIndex >= shortcutCategories.length) setCurrentIndex(Math.max(0, shortcutCategories.length - 1));
        if (!leftCatId || !shortcutCategories.find(c => c.id === leftCatId)) setLeftCatId(shortcutCategories[0].id);
        if (!rightCatId || !shortcutCategories.find(c => c.id === rightCatId)) setRightCatId(shortcutCategories[1]?.id || shortcutCategories[0].id);
     }
  }, [shortcutCategories.length, currentIndex, leftCatId, rightCatId]);

  useBackHandler(isOpen && isAddOpen, () => { setIsAddOpen(false); return true; });
  useBackHandler(isOpen && !isAddOpen, () => { onClose(); return true; });

  const handleAddCategory = () => {
      if (!newTitle.trim()) return;
      addShortcutCategory({ id: uuidv4(), title: newTitle, color: newColor, items: [], createdAt: Date.now() });
      setNewTitle(''); setIsAddOpen(false);
      setCurrentIndex(shortcutCategories.length); // Vai pro final da lista recém-criada
  };

  if (!isOpen) return null;

  return (
     <AnimatePresence>
        {isOpen && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black text-white flex flex-col overflow-hidden">
              
              <div className="p-4 md:px-8 md:py-6 flex items-center justify-between border-b border-white/10 bg-zinc-950 z-10 shrink-0">
                 <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.3)]"><Terminal size={24}/></div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight">Atalhos</h2>
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-50">Base de Conhecimento</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    {shortcutCategories.length > 1 && (
                       <button onClick={() => setIsSplit(!isSplit)} className={`p-3 rounded-2xl transition-colors ${isSplit ? 'bg-sky-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`} title="Dividir Tela">
                          <SplitSquareHorizontal size={20} />
                       </button>
                    )}
                    <button onClick={() => setIsAddOpen(true)} className="p-3 rounded-2xl bg-white/10 text-white/70 hover:bg-white/20 transition-colors" title="Nova Categoria">
                       <Plus size={20} />
                    </button>
                    <div className="w-px h-6 bg-white/20 mx-1" />
                    <button onClick={onClose} className="p-3 rounded-2xl bg-white/10 text-white/70 hover:bg-red-500 hover:text-white transition-colors">
                       <X size={20} />
                    </button>
                 </div>
              </div>

              <div className="flex-1 relative bg-zinc-950 p-4 md:p-8 min-h-0">
                 {shortcutCategories.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center">
                        <Terminal size={80} className="text-white/10 mb-8" />
                        <h3 className="text-3xl font-black mb-3">Sua Base está vazia</h3>
                        <p className="text-white/50 mb-10 max-w-sm leading-relaxed text-sm">Crie listas para memorizar atalhos de teclado de seus programas favoritos ou comandos frequentes de terminal. Menos mouse, mais foco.</p>
                        <button onClick={() => setIsAddOpen(true)} className="px-8 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl shadow-[0_0_30px_rgba(2,132,199,0.4)] transition-all">Criar Primeira Lista</button>
                     </div>
                 ) : isSplit ? (
                     <div className="h-full flex flex-col md:flex-row gap-4 md:gap-8">
                        <div className="flex-1 flex flex-col min-h-0 gap-3">
                           <div className="relative">
                               <select value={leftCatId!} onChange={e => setLeftCatId(e.target.value)} className="w-full appearance-none bg-white/5 hover:bg-white/10 border border-white/10 text-white p-4 rounded-2xl outline-none font-bold text-sm cursor-pointer transition-colors">
                                  {shortcutCategories.map(c => <option key={c.id} value={c.id} className="bg-zinc-900 text-white">{c.title}</option>)}
                               </select>
                           </div>
                           <div className="flex-1 min-h-0"><CategoryView categoryId={leftCatId!} /></div>
                        </div>
                        <div className="flex-1 flex flex-col min-h-0 gap-3">
                           <div className="relative">
                               <select value={rightCatId!} onChange={e => setRightCatId(e.target.value)} className="w-full appearance-none bg-white/5 hover:bg-white/10 border border-white/10 text-white p-4 rounded-2xl outline-none font-bold text-sm cursor-pointer transition-colors">
                                  {shortcutCategories.map(c => <option key={c.id} value={c.id} className="bg-zinc-900 text-white">{c.title}</option>)}
                               </select>
                           </div>
                           <div className="flex-1 min-h-0"><CategoryView categoryId={rightCatId!} /></div>
                        </div>
                     </div>
                 ) : (
                     <div className="h-full relative flex items-center justify-center">
                        <AnimatePresence mode="wait">
                           <motion.div
                             key={currentIndex}
                             initial={{ opacity: 0, scale: 0.95 }}
                             animate={{ opacity: 1, scale: 1 }}
                             exit={{ opacity: 0, scale: 0.95 }}
                             transition={{ duration: 0.2 }}
                             drag={shortcutCategories.length > 1 ? "x" : false}
                             dragConstraints={{ left: 0, right: 0 }}
                             dragElastic={0.2}
                             onDragEnd={(e, { offset }) => {
                                if (offset.x < -80) setCurrentIndex(i => i < shortcutCategories.length - 1 ? i + 1 : 0);
                                else if (offset.x > 80) setCurrentIndex(i => i > 0 ? i - 1 : shortcutCategories.length - 1);
                             }}
                             className="absolute inset-0 max-w-4xl mx-auto w-full h-full cursor-grab active:cursor-grabbing"
                           >
                              <div className="w-full h-full pointer-events-auto" onPointerDownCapture={(e) => e.stopPropagation()}>
                                 <CategoryView categoryId={shortcutCategories[currentIndex].id} />
                              </div>
                           </motion.div>
                        </AnimatePresence>
                        
                        {/* Controles do Carrossel */}
                        {shortcutCategories.length > 1 && (
                           <>
                             <div className="absolute -bottom-2 md:bottom-2 left-1/2 -translate-x-1/2 flex gap-2.5 z-20 bg-black/50 px-4 py-2.5 rounded-full backdrop-blur-md border border-white/10">
                                {shortcutCategories.map((c, i) => (
                                   <button key={c.id} onClick={() => setCurrentIndex(i)} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentIndex ? 'bg-white' : 'bg-white/20 hover:bg-white/50'}`} />
                                ))}
                             </div>
                             
                             <button onClick={() => setCurrentIndex(i => i > 0 ? i - 1 : shortcutCategories.length - 1)} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 p-4 bg-black/60 text-white rounded-full hover:bg-black border border-white/10 shadow-2xl backdrop-blur-xl z-20 hover:scale-110 transition-all -ml-6"><ChevronLeft size={28}/></button>
                             <button onClick={() => setCurrentIndex(i => i < shortcutCategories.length - 1 ? i + 1 : 0)} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 p-4 bg-black/60 text-white rounded-full hover:bg-black border border-white/10 shadow-2xl backdrop-blur-xl z-20 hover:scale-110 transition-all -mr-6"><ChevronRight size={28}/></button>
                           </>
                        )}
                     </div>
                 )}
              </div>

              {/* Modal Interno: Nova Categoria */}
              <AnimatePresence>
                 {isAddOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
                       <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-zinc-950 w-full max-w-sm rounded-[2rem] p-8 border border-white/10 text-white relative shadow-2xl">
                          <h3 className="text-xl font-black mb-6">Nova Coleção</h3>
                          <input type="text" value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Ex: Atalhos do VSCode" className="w-full bg-black/50 p-4 rounded-xl border border-white/10 outline-none focus:border-sky-500 mb-6 font-bold" autoFocus />
                          
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-3 block">Ambiente Visual</span>
                          <div className="flex gap-2 mb-8 flex-wrap justify-center">
                             {(Object.keys(catStyles) as ShortcutColor[]).map(c => (
                                <button key={c} onClick={() => setNewColor(c)} className={`w-10 h-10 rounded-full border-2 transition-all ${newColor === c ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-40 hover:opacity-80'} ${catStyles[c].bg}`} />
                             ))}
                          </div>

                          <div className="flex gap-3">
                             <button onClick={() => setIsAddOpen(false)} className="flex-1 p-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors">Cancelar</button>
                             <button onClick={handleAddCategory} disabled={!newTitle.trim()} className="flex-1 p-4 bg-sky-600 rounded-xl font-bold disabled:opacity-50 hover:bg-sky-500 transition-colors">Criar</button>
                          </div>
                       </motion.div>
                    </motion.div>
                 )}
              </AnimatePresence>

           </motion.div>
        )}
     </AnimatePresence>
  );
}