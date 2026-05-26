import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, SplitSquareHorizontal, Plus, Copy, Trash2, Check, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useBackHandler } from '../../store/useConfigStore';
import { v4 as uuidv4 } from 'uuid';
import type { ShortcutColor, ShortcutType } from '../../types';

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

interface CategoryViewProps {
  categoryId: string;
  isSplit?: boolean;
  onSelectCategory?: (id: string) => void;
}

const CategoryView = ({ categoryId, isSplit, onSelectCategory }: CategoryViewProps) => {
    const { shortcutCategories, updateShortcutCategory, deleteShortcutCategory } = useNoteStore();
    const category = shortcutCategories.find(c => c.id === categoryId);

    const [isAdding, setIsAdding] = useState(false); // Estado do lápis para abrir formulário
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
        <div className={`flex flex-col h-full rounded-[2rem] overflow-hidden border-2 ${style.border} ${style.bg}`}>
           {/* CABEÇALHO COM INTEGRACAO DE DROPDOWN EM SPLIT */}
           <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/30 shrink-0">
              {isSplit && onSelectCategory ? (
                 <div className="relative max-w-[70%]">
                    <select 
                      value={category.id} 
                      onChange={e => onSelectCategory(e.target.value)} 
                      className={`bg-transparent border-none outline-none font-black text-lg md:text-xl ${style.text} cursor-pointer pr-4 uppercase tracking-tight`}
                    >
                       {shortcutCategories.map(c => (
                         <option key={c.id} value={c.id} className="bg-zinc-950 text-white font-bold">{c.title}</option>
                       ))}
                    </select>
                 </div>
              ) : (
                 <h3 className={`text-xl font-black tracking-tight uppercase ${style.text}`}>{category.title}</h3>
              )}
              
              <div className="flex items-center gap-1 shrink-0">
                 {/* Botão de Lápis (Editar) */}
                 <button 
                   onClick={() => setIsAdding(!isAdding)} 
                   className={`p-2 rounded-xl transition-colors ${isAdding ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                   title={isAdding ? "Ocultar Construtor" : "Adicionar Atalhos/Comandos"}
                 >
                    <Edit2 size={18} />
                 </button>
                 <button onClick={() => deleteShortcutCategory(category.id)} className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"><Trash2 size={18}/></button>
              </div>
           </div>

           {/* LISTA COMPACTA E OTIMIZADA */}
           <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2.5 scrollbar-hide">
              {category.items.length === 0 && (
                 <div className="text-center text-white/20 text-sm mt-12 font-bold italic">Nenhum comando guardado neste painel.</div>
              )}
              {category.items.map(item => (
                 <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/20 border border-white/5 group transition-colors hover:bg-black/30">
                    <span className="text-sm font-black text-zinc-300 tracking-wide opacity-95">{item.label}</span>
                    <div className="flex items-center gap-3 self-end md:self-auto w-full md:w-auto justify-end">
                       {item.type === 'keys' ? (
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            {item.value.split('+').map((k, idx) => (
                               <kbd key={idx} className="px-2.5 py-1 bg-zinc-950 border border-white/15 rounded-xl text-xs md:text-sm font-black shadow-md uppercase tracking-wider text-white min-w-[2rem] text-center inline-block font-mono">
                                  {k.trim()}
                               </kbd>
                            ))}
                          </div>
                       ) : (
                          <div className="flex items-center gap-2 bg-black/40 pl-3 pr-1 py-1 rounded-xl border border-white/10 shadow-inner overflow-hidden max-w-full md:max-w-xs">
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

           {/* FORMULÁRIO DE CADASTRO EXPANSÍVEL (LÁPIS) */}
           <AnimatePresence>
              {isAdding && (
                 <motion.div 
                   initial={{ height: 0, opacity: 0 }} 
                   animate={{ height: 'auto', opacity: 1 }} 
                   exit={{ height: 0, opacity: 0 }}
                   className="p-4 md:p-6 bg-black/40 border-t border-white/5 shrink-0 overflow-hidden"
                 >
                    <div className="flex flex-col gap-3">
                       <div className="flex items-center gap-2">
                          <input type="text" placeholder="Ação (Ex: Duplicar Linha)" value={label} onChange={e=>setLabel(e.target.value)} className="flex-1 bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm font-bold outline-none placeholder:text-white/20 text-white focus:border-white/30 transition-colors" />
                          <button onClick={() => setType(t => t === 'keys' ? 'command' : 'keys')} className="text-[10px] font-black uppercase tracking-widest px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-colors text-white whitespace-nowrap">
                             {type === 'keys' ? 'Teclas' : 'Comando'}
                          </button>
                       </div>
                       <div className="flex items-center gap-2">
                          <input type="text" placeholder={type === 'keys' ? "Ex: Ctrl + Shift + D" : "Ex: docker-compose up"} value={value} onChange={e=>setValue(e.target.value)} className={`flex-1 bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm outline-none placeholder:text-white/20 transition-colors text-white ${type === 'keys' ? 'font-bold' : 'font-mono text-emerald-400'}`} />
                          <button onClick={handleAddItem} disabled={!label.trim() || !value.trim()} className="p-3 bg-white text-black rounded-xl hover:opacity-80 disabled:opacity-50 transition-opacity shrink-0"><Plus size={18} strokeWidth={3}/></button>
                       </div>
                       {type === 'keys' && (
                          <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-1 pb-1">
                             {quickKeys.map(k => (
                                <button key={k} onClick={() => setValue(v => v ? `${v} + ${k}` : k)} className="shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-[10px] font-black tracking-wider uppercase transition-colors text-white/80">{k}</button>
                             ))}
                          </div>
                       )}
                    </div>
                 </motion.div>
              )}
           </AnimatePresence>
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
      setCurrentIndex(shortcutCategories.length);
  };

  if (!isOpen) return null;

  return (
     <AnimatePresence>
        {isOpen && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black text-white flex flex-col overflow-hidden select-none">
              
              {/* HEADER DA SEÇÃO */}
              <div className="p-4 md:px-6 md:py-4 flex items-center justify-between border-b border-white/10 bg-zinc-950 z-10 shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.3)]"><Terminal size={20}/></div>
                    <div>
                        <h2 className="text-lg md:text-xl font-black tracking-tight uppercase">Atalhos rápidos</h2>
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 block -mt-0.5">Teclado & Comandos</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-1.5">
                    {shortcutCategories.length > 1 && (
                       <button onClick={() => setIsSplit(!isSplit)} className={`p-2.5 rounded-xl transition-colors ${isSplit ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.4)]' : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'}`} title={isSplit ? "Visão Única" : "Dividir Tela (Lado a Lado)"}>
                          <SplitSquareHorizontal size={18} />
                       </button>
                    )}
                    <button onClick={() => setIsAddOpen(true)} className="p-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 border border-white/5 transition-colors" title="Criar Nova Lista">
                       <Plus size={18} />
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <button onClick={onClose} className="p-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-red-500 hover:text-white border border-white/5 transition-colors">
                       <X size={18} />
                    </button>
                 </div>
              </div>

              {/* ÁREA PRINCIPAL MAXIMIZADA (Margens reduzidas de p-8 para p-3) */}
              <div className="flex-1 relative bg-zinc-950 p-3 md:p-4 min-h-0">
                 {shortcutCategories.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <Terminal size={64} className="text-white/10 mb-6" />
                        <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Sua Base está vazia</h3>
                        <p className="text-white/40 mb-8 max-w-xs leading-relaxed text-xs font-medium">Crie listas para memorizar combinações de teclas ou scripts frequentes. Abandone o mouse e acelere o fluxo.</p>
                        <button onClick={() => setIsAddOpen(true)} className="px-6 py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-xl shadow-[0_0_20px_rgba(2,132,199,0.3)] transition-all text-sm uppercase tracking-wider">Criar Lista Inicial</button>
                     </div>
                 ) : isSplit ? (
                     /* VISÃO DIVIDIDA COM DROPDOWNS INTERNOS */
                     <div className="h-full flex flex-col md:flex-row gap-3 md:gap-4">
                        <div className="flex-1 min-h-0">
                           <CategoryView categoryId={leftCatId!} isSplit={true} onSelectCategory={setLeftCatId} />
                        </div>
                        <div className="flex-1 min-h-0">
                           <CategoryView categoryId={rightCatId!} isSplit={true} onSelectCategory={setRightCatId} />
                        </div>
                     </div>
                 ) : (
                     /* CARROSSEL TRADICIONAL TELA CHEIA */
                     <div className="h-full relative flex items-center justify-center">
                        <AnimatePresence mode="wait">
                           <motion.div
                             key={currentIndex}
                             initial={{ opacity: 0, scale: 0.98 }}
                             animate={{ opacity: 1, scale: 1 }}
                             exit={{ opacity: 0, scale: 0.98 }}
                             transition={{ duration: 0.15 }}
                             drag={shortcutCategories.length > 1 ? "x" : false}
                             dragConstraints={{ left: 0, right: 0 }}
                             dragElastic={0.15}
                             onDragEnd={(_, { offset }) => {
                                if (offset.x < -80) setCurrentIndex(i => i < shortcutCategories.length - 1 ? i + 1 : 0);
                                else if (offset.x > 80) setCurrentIndex(i => i > 0 ? i - 1 : shortcutCategories.length - 1);
                             }}
                             className="absolute inset-0 max-w-5xl mx-auto w-full h-full cursor-grab active:cursor-grabbing"
                           >
                              <div className="w-full h-full pointer-events-auto" onPointerDownCapture={(e) => e.stopPropagation()}>
                                 <CategoryView categoryId={shortcutCategories[currentIndex].id} isSplit={false} />
                              </div>
                           </motion.div>
                        </AnimatePresence>
                        
                        {/* Controles Inferiores */}
                        {shortcutCategories.length > 1 && (
                           <>
                             <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-2 z-20 bg-black/40 px-3 py-2 rounded-full backdrop-blur-md border border-white/5 shadow-lg">
                                {shortcutCategories.map((c, i) => (
                                   <button key={c.id} onClick={() => setCurrentIndex(i)} className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-white' : 'bg-white/20 hover:bg-white/40'}`} />
                                ))}
                             </div>
                             
                             <button onClick={() => setCurrentIndex(i => i > 0 ? i - 1 : shortcutCategories.length - 1)} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-black/60 text-white rounded-full border border-white/10 shadow-xl backdrop-blur-md z-20 hover:scale-105 transition-all -ml-5"><ChevronLeft size={24}/></button>
                             <button onClick={() => setCurrentIndex(i => i < shortcutCategories.length - 1 ? i + 1 : 0)} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-black/60 text-white rounded-full border border-white/10 shadow-xl backdrop-blur-md z-20 hover:scale-105 transition-all -mr-5"><ChevronRight size={24}/></button>
                           </>
                        )}
                     </div>
                 )}
              </div>

              {/* CRIAR NOVA COLEÇÃO (MODAL INTERNO) */}
              <AnimatePresence>
                 {isAddOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
                       <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-zinc-950 w-full max-w-sm rounded-[2rem] p-6 border border-white/10 text-white relative shadow-2xl">
                          <h3 className="text-lg font-black mb-5 uppercase tracking-tight">Nova Coleção</h3>
                          <input type="text" value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Ex: TERMINAL LINUX, GMAIL..." className="w-full bg-black/50 p-4 rounded-xl border border-white/10 outline-none focus:border-sky-500 mb-5 font-black uppercase text-sm tracking-wide text-center" autoFocus />
                          
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3 block text-center">Ambiente Visual</span>
                          <div className="flex gap-2.5 mb-8 flex-wrap justify-center">
                             {(Object.keys(catStyles) as ShortcutColor[]).map(c => (
                                <button key={c} onClick={() => setNewColor(c)} className={`w-9 h-9 rounded-full border-2 transition-all ${newColor === c ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-30 hover:opacity-60'} ${catStyles[c].bg}`} />
                             ))}
                          </div>

                          <div className="flex gap-2.5">
                             <button onClick={() => setIsAddOpen(false)} className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-colors">Cancelar</button>
                             <button onClick={handleAddCategory} disabled={!newTitle.trim()} className="flex-1 py-3.5 bg-sky-600 rounded-xl font-black text-xs uppercase tracking-wider disabled:opacity-50 hover:bg-sky-500 transition-colors shadow-lg shadow-sky-600/10">Criar</button>
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