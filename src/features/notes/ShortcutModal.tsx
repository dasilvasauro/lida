import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { X, Terminal, Plus, Copy, Trash2, Check, ChevronLeft, ChevronRight, Edit2, GripVertical, EyeOff, Eye } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useBackHandler } from '../../store/useConfigStore';
import { v4 as uuidv4 } from 'uuid';
import type { ShortcutColor, ShortcutType, ShortcutItem } from '../../types';

const catStyles: Record<ShortcutColor, { bg: string, border: string, text: string }> = {
  blue: { bg: 'bg-blue-950', border: 'border-blue-900/50', text: 'text-blue-100' },
  emerald: { bg: 'bg-emerald-950', border: 'border-emerald-900/50', text: 'text-emerald-100' },
  amber: { bg: 'bg-amber-950', border: 'border-amber-900/50', text: 'text-amber-100' },
  rose: { bg: 'bg-rose-950', border: 'border-rose-900/50', text: 'text-rose-100' },
  purple: { bg: 'bg-purple-950', border: 'border-purple-900/50', text: 'text-purple-100' },
  cyan: { bg: 'bg-cyan-950', border: 'border-cyan-900/50', text: 'text-cyan-100' },
  indigo: { bg: 'bg-indigo-950', border: 'border-indigo-900/50', text: 'text-indigo-100' },
  zinc: { bg: 'bg-zinc-900', border: 'border-zinc-800', text: 'text-zinc-100' },
};

const quickKeys = ['Ctrl', 'Alt', 'Shift', 'Cmd', 'Win', 'Tab', 'Enter', 'Esc', 'Space', 'Del', 'Up', 'Down', 'Left', 'Right'];

// === COMPONENTE MARQUEE (SCROLL CONTÍNUO INTELIGENTE E PING-PONG) ===
const MarqueeText = ({ text, className }: { text: string, className?: string }) => {
   const [overflowAmount, setOverflowAmount] = useState(0);
   const containerRef = useRef<HTMLDivElement>(null);
   const textRef = useRef<HTMLSpanElement>(null);

   useEffect(() => {
      const checkOverflow = () => {
         if (containerRef.current && textRef.current) {
            const cWidth = containerRef.current.clientWidth;
            const tWidth = textRef.current.scrollWidth;
            setOverflowAmount(Math.max(0, tWidth - cWidth));
         }
      };

      checkOverflow();
      
      // Assiste ativamente as mudanças de largura (ex: ao clicar no Olho de ocultar labels)
      const observer = new ResizeObserver(() => checkOverflow());
      if (containerRef.current) observer.observe(containerRef.current);
      
      return () => observer.disconnect();
   }, [text]);

   const isOverflowing = overflowAmount > 0;

   return (
      <div ref={containerRef} className={`flex-1 overflow-hidden relative flex items-center min-w-0 h-full ${isOverflowing ? 'marquee-mask' : ''}`}>
         {/* Elemento invisível que serve apenas para o ResizeObserver medir a largura real */}
         <span ref={textRef} className={`absolute invisible whitespace-nowrap ${className}`}>{text}</span>

         <motion.div
           animate={isOverflowing ? { x: [0, -overflowAmount] } : { x: 0 }}
           transition={isOverflowing ? { 
               repeat: Infinity, 
               repeatType: "reverse", // Vai até o fim e volta (Ping-Pong)
               duration: Math.max(overflowAmount * 0.04, 2.5), // Mais devagar
               ease: 'linear',
               repeatDelay: 1.5 // Pausa de 1.5s nas extremidades
           } : {}}
           className="flex whitespace-nowrap min-w-max h-full items-center"
         >
            <div className={`${className}`}>{text}</div>
         </motion.div>
      </div>
   );
};

// === LINHA DO ATALHO (REORDENÁVEL E COMPACTA) ===
const ShortcutItemRow = ({ item, hideLabels, onRemove }: { item: ShortcutItem, hideLabels: boolean,  onRemove: (id: string) => void }) => {
    const dragControls = useDragControls();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copy = (val: string, id: string) => {
        navigator.clipboard.writeText(val);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <Reorder.Item
            value={item}
            dragListener={false}
            dragControls={dragControls}
            className="flex flex-row items-center justify-between gap-2 px-3 py-1.5 border-b border-white/5 bg-black/20 group hover:bg-black/30 transition-colors w-full shrink-0 relative"
        >
            <div className="cursor-grab touch-none p-1 shrink-0" onPointerDown={(e: any) => dragControls.start(e)}>
                <GripVertical size={16} className="text-white/20 opacity-30 group-hover:opacity-100" />
            </div>

            {(!hideLabels || item.type !== 'command') && (
                <span className="text-xs font-black text-zinc-300 tracking-wide shrink-0 max-w-[30%] truncate" title={item.label}>
                    {item.label}
                </span>
            )}

            <div className="flex-1 flex justify-end min-w-0 overflow-hidden h-full py-0.5">
                {item.type === 'keys' ? (
                    <div className="flex gap-1.5 flex-wrap justify-end">
                        {item.value.split('+').map((k: string, idx: number) => (
                            <kbd key={idx} className="px-1.5 py-0.5 md:px-2 md:py-1 bg-zinc-950 border-b-2 border-zinc-700 rounded text-[9px] md:text-[10px] font-black shadow-md uppercase tracking-wider text-white min-w-[1.5rem] text-center inline-block font-mono">
                                {k.trim()}
                            </kbd>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-black/40 pl-3 pr-1 py-1 rounded-xl border border-white/10 shadow-inner overflow-hidden w-full max-w-full">
                        <MarqueeText text={item.value} className="font-mono text-emerald-400 text-[11px] md:text-xs" />
                        <button onClick={() => copy(item.value, item.id)} className="shrink-0 p-1.5 hover:bg-white/10 text-white/50 hover:text-white transition-colors rounded-lg">
                            {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14}/>}
                        </button>
                    </div>
                )}
            </div>

            <button onClick={() => onRemove(item.id)} className="p-1.5 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all rounded-lg shrink-0">
                <X size={14}/>
            </button>
        </Reorder.Item>
    );
};

// === VISUALIZADOR DA CATEGORIA (COLUNA) ===
interface CategoryViewProps {
  categoryId: string;
  isSplit?: boolean;
  onSelectCategory?: (id: string) => void;
}

const CategoryView = ({ categoryId, isSplit, onSelectCategory }: CategoryViewProps) => {
    const { shortcutCategories, updateShortcutCategory, deleteShortcutCategory } = useNoteStore();
    const category = shortcutCategories.find((c: any) => c.id === categoryId);

    const [isAdding, setIsAdding] = useState(false);
    const [hideLabels, setHideLabels] = useState(false);
    const [label, setLabel] = useState('');
    const [value, setValue] = useState('');
    const [type, setType] = useState<ShortcutType>('keys');

    if (!category) return null;
    const style = catStyles[category.color as ShortcutColor] || catStyles.zinc;

    const handleAddItem = () => {
        if (!label.trim() || !value.trim()) return;
        const newItem = { id: uuidv4(), label, value, type };
        updateShortcutCategory(category.id, { items: [...category.items, newItem] });
        setLabel(''); setValue('');
    };

    return (
        <div className={`flex flex-col h-full w-full overflow-hidden ${style.bg}`}>
           {/* HEADER */}
           <div className="px-4 py-2 border-b border-white/10 flex justify-between items-center bg-black/30 shrink-0">
              {isSplit && onSelectCategory ? (
                 <div className="relative max-w-[60%] flex-1">
                    <select value={category.id} onChange={(e: any) => onSelectCategory(e.target.value)} className={`w-full bg-transparent border-none outline-none font-black text-sm md:text-base ${style.text} cursor-pointer pr-4 uppercase tracking-tight truncate`}>
                       {shortcutCategories.map((c: any) => <option key={c.id} value={c.id} className="bg-zinc-950 text-white font-bold">{c.title}</option>)}
                    </select>
                 </div>
              ) : (
                 <h3 className={`text-base md:text-lg font-black tracking-tight uppercase ${style.text} truncate pr-2`}>{category.title}</h3>
              )}
              
              <div className="flex items-center gap-0.5 shrink-0">
                 <button onClick={() => setHideLabels(!hideLabels)} className={`p-1.5 rounded-lg transition-colors ${hideLabels ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`} title="Ocultar Nomes dos Comandos">
                    {hideLabels ? <EyeOff size={16}/> : <Eye size={16}/>}
                 </button>
                 <button onClick={() => setIsAdding(!isAdding)} className={`p-1.5 rounded-lg transition-colors ${isAdding ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`} title="Adicionar">
                    <Edit2 size={16} />
                 </button>
                 <button onClick={() => deleteShortcutCategory(category.id)} className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir Categoria">
                    <Trash2 size={16}/>
                 </button>
              </div>
           </div>

           {/* LISTA DE ATALHOS */}
           <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col relative min-h-0">
              {category.items.length === 0 ? (
                 <div className="m-auto text-center text-white/20 text-xs font-bold italic p-4">Nenhum atalho.</div>
              ) : (
                 <Reorder.Group axis="y" values={category.items} onReorder={(newItems: any[]) => updateShortcutCategory(category.id, { items: newItems })} className="flex flex-col w-full h-full pb-4">
                     {category.items.map((item: ShortcutItem) => (
                         <ShortcutItemRow key={item.id} item={item} hideLabels={hideLabels}  onRemove={(id: string) => updateShortcutCategory(category.id, { items: category.items.filter((i: ShortcutItem) => i.id !== id) })} />
                     ))}
                 </Reorder.Group>
              )}
           </div>

           {/* FORMULÁRIO RÁPIDO */}
           <AnimatePresence>
              {isAdding && (
                 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-3 md:p-4 bg-black/40 border-t border-white/5 shrink-0 overflow-hidden">
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center gap-2">
                          <input type="text" placeholder="Ação (Ex: Duplicar Linha)" value={label} onChange={(e: any) => setLabel(e.target.value)} className="flex-1 bg-black/40 border border-white/10 px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold outline-none placeholder:text-white/20 text-white focus:border-white/30 transition-colors" />
                          <button onClick={() => setType((t: ShortcutType) => t === 'keys' ? 'command' : 'keys')} className="text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 py-2 md:py-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-colors text-white whitespace-nowrap">
                             {type === 'keys' ? 'Teclas' : 'Comando'}
                          </button>
                       </div>
                       <div className="flex items-center gap-2">
                          <input type="text" placeholder={type === 'keys' ? "Ex: Ctrl + Shift + D" : "Ex: docker-compose up"} value={value} onChange={(e: any) => setValue(e.target.value)} className={`flex-1 bg-black/40 border border-white/10 px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm outline-none placeholder:text-white/20 transition-colors text-white ${type === 'keys' ? 'font-bold' : 'font-mono text-emerald-400'}`} />
                          <button onClick={handleAddItem} disabled={!label.trim() || !value.trim()} className="p-2 md:p-2.5 bg-white text-black rounded-xl hover:opacity-80 disabled:opacity-50 transition-opacity shrink-0"><Plus size={16} strokeWidth={3}/></button>
                       </div>
                       {type === 'keys' && (
                          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pt-1 pb-1">
                             {quickKeys.map((k: string) => (
                                <button key={k} onClick={() => setValue((v: string) => v ? `${v} + ${k}` : k)} className="shrink-0 px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-md text-[9px] font-black tracking-wider uppercase transition-colors text-white/80">{k}</button>
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

// === MODAL PRINCIPAL ===
export const ShortcutModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { shortcutCategories, addShortcutCategory } = useNoteStore();
  const [splitCount, setSplitCount] = useState<1|2|3>(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [leftCatId, setLeftCatId] = useState<string | null>(null);
  const [midCatId, setMidCatId] = useState<string | null>(null);
  const [rightCatId, setRightCatId] = useState<string | null>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState<ShortcutColor>('zinc');

  useEffect(() => {
     if (shortcutCategories.length > 0) {
        if (currentIndex >= shortcutCategories.length) setCurrentIndex(Math.max(0, shortcutCategories.length - 1));
        if (!leftCatId || !shortcutCategories.find((c: any) => c.id === leftCatId)) setLeftCatId(shortcutCategories[0].id);
        if (!midCatId || !shortcutCategories.find((c: any) => c.id === midCatId)) setMidCatId(shortcutCategories[1]?.id || shortcutCategories[0].id);
        if (!rightCatId || !shortcutCategories.find((c: any) => c.id === rightCatId)) setRightCatId(shortcutCategories[2]?.id || shortcutCategories[1]?.id || shortcutCategories[0].id);
     }
  }, [shortcutCategories.length, currentIndex, leftCatId, midCatId, rightCatId]);

  useBackHandler(isOpen && isAddOpen, () => { setIsAddOpen(false); return true; });
  useBackHandler(isOpen && !isAddOpen, () => { onClose(); return true; });

  const handleAddCategory = () => {
      if (!newTitle.trim()) return;
      addShortcutCategory({ id: uuidv4(), title: newTitle, color: newColor, items: [], createdAt: Date.now() });
      setNewTitle(''); setIsAddOpen(false);
      setCurrentIndex(shortcutCategories.length);
  };

  if (!isOpen) return null;

  const activeCols = splitCount === 1 ? [shortcutCategories[currentIndex]?.id] :
                     splitCount === 2 ? [leftCatId, rightCatId] :
                     [leftCatId, midCatId, rightCatId];

  return (
     <AnimatePresence>
        {isOpen && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black text-white flex flex-col overflow-hidden select-none">
              
              {/* HEADER GLOBAL */}
              <div className="p-3 md:px-5 md:py-3 flex items-center justify-between border-b border-white/10 bg-zinc-950 z-10 shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.3)]"><Terminal size={18}/></div>
                    <div>
                        <h2 className="text-base md:text-lg font-black tracking-tight uppercase leading-tight">Atalhos</h2>
                        <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest opacity-40 block">Teclado & Comandos</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-1.5">
                    {shortcutCategories.length > 1 && (
                       <button onClick={() => setSplitCount((s: 1|2|3) => s === 1 ? 2 : s === 2 ? 3 : 1)} className="p-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 border border-white/5 transition-colors font-black text-xs md:text-sm w-9 flex justify-center" title="Dividir Tela">
                          {splitCount}x
                       </button>
                    )}
                    <button onClick={() => setIsAddOpen(true)} className="p-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 border border-white/5 transition-colors" title="Criar Nova Lista">
                       <Plus size={18} />
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-white/70 hover:bg-red-500 hover:text-white border border-white/5 transition-colors">
                       <X size={18} />
                    </button>
                 </div>
              </div>

              {/* ÁREA PRINCIPAL (TELA CHEIA) */}
              <div className="flex-1 relative bg-zinc-950 min-h-0 flex flex-col">
                 {shortcutCategories.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <Terminal size={64} className="text-white/10 mb-6" />
                        <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Sua Base está vazia</h3>
                        <p className="text-white/40 mb-8 max-w-xs leading-relaxed text-xs font-medium">Crie listas para memorizar combinações de teclas ou scripts frequentes. Abandone o mouse e acelere o fluxo.</p>
                        <button onClick={() => setIsAddOpen(true)} className="px-6 py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-xl shadow-[0_0_20px_rgba(2,132,199,0.3)] transition-all text-sm uppercase tracking-wider">Criar Lista Inicial</button>
                     </div>
                 ) : splitCount > 1 ? (
                     /* === VISÃO DIVIDIDA (2x ou 3x) === */
                     <div className="w-full h-full flex divide-x divide-white/10 overflow-hidden">
                        {activeCols.map((catId: string | null | undefined, index: number) => {
                            if (!catId) return null;
                            return (
                                <div key={`col-${index}`} className={`flex-1 min-w-0 h-full ${index === 2 ? 'hidden lg:block' : ''} ${index === 1 ? 'hidden md:block' : ''}`}>
                                    <CategoryView categoryId={catId} isSplit={true} onSelectCategory={(id: string) => {
                                        if (index === 0) setLeftCatId(id);
                                        if (index === 1) setRightCatId(id);
                                        if (index === 2) setMidCatId(id);
                                    }} />
                                </div>
                            )
                        })}
                     </div>
                 ) : (
                     /* === CARROSSEL (1x) === */
                     <div className="h-full relative flex items-center justify-center w-full">
                        <AnimatePresence mode="wait">
                           <motion.div
                             key={currentIndex}
                             initial={{ opacity: 0, scale: 0.98 }}
                             animate={{ opacity: 1, scale: 1 }}
                             exit={{ opacity: 0, scale: 0.98 }}
                             transition={{ duration: 0.15 }}
                             // Gesto de Swipe personalizado (Evita conflitos com o Drag do Reorder)
                             onPanEnd={(_: any, info: any) => {
                                const isHorizontal = Math.abs(info.offset.x) > Math.abs(info.offset.y);
                                if (isHorizontal) {
                                    if (info.offset.x < -80 || info.velocity.x < -300) {
                                        setCurrentIndex((i: number) => i < shortcutCategories.length - 1 ? i + 1 : 0);
                                    } else if (info.offset.x > 80 || info.velocity.x > 300) {
                                        setCurrentIndex((i: number) => i > 0 ? i - 1 : shortcutCategories.length - 1);
                                    }
                                }
                             }}
                             className="absolute inset-0 w-full h-full"
                           >
                              <div className="w-full h-full pointer-events-auto flex">
                                 <CategoryView categoryId={shortcutCategories[currentIndex].id} isSplit={false} />
                              </div>
                           </motion.div>
                        </AnimatePresence>
                        
                        {/* Controles do Carrossel */}
                        {shortcutCategories.length > 1 && (
                           <>
                             <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20 bg-black/40 px-3 py-2 rounded-full backdrop-blur-md border border-white/5 shadow-lg">
                                {shortcutCategories.map((c: any, i: number) => (
                                   <button key={c.id} onClick={() => setCurrentIndex(i)} className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-white' : 'bg-white/20 hover:bg-white/40'}`} />
                                ))}
                             </div>
                             
                             <button onClick={() => setCurrentIndex((i: number) => i > 0 ? i - 1 : shortcutCategories.length - 1)} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 text-white rounded-full border border-white/10 shadow-xl backdrop-blur-md z-20 hover:scale-105 transition-all"><ChevronLeft size={24}/></button>
                             <button onClick={() => setCurrentIndex((i: number) => i < shortcutCategories.length - 1 ? i + 1 : 0)} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 text-white rounded-full border border-white/10 shadow-xl backdrop-blur-md z-20 hover:scale-105 transition-all"><ChevronRight size={24}/></button>
                           </>
                        )}
                     </div>
                 )}
              </div>

              {/* CRIAR NOVA COLEÇÃO (MODAL INTERNO) */}
              <AnimatePresence>
                 {isAddOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">
                       <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-zinc-950 w-full max-w-sm rounded-[2rem] p-6 border border-white/10 text-white relative shadow-2xl">
                          <h3 className="text-lg font-black mb-5 uppercase tracking-tight">Nova Coleção</h3>
                          <input type="text" value={newTitle} onChange={(e: any) => setNewTitle(e.target.value)} placeholder="Ex: TERMINAL LINUX, GMAIL..." className="w-full bg-black/50 p-4 rounded-xl border border-white/10 outline-none focus:border-sky-500 mb-5 font-black uppercase text-sm tracking-wide text-center" autoFocus />
                          
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3 block text-center">Ambiente Visual</span>
                          <div className="flex gap-2.5 mb-8 flex-wrap justify-center">
                             {(Object.keys(catStyles) as ShortcutColor[]).map((c: ShortcutColor) => (
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
