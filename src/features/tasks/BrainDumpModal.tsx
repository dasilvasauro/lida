import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BrainCircuit, Play, CheckCircle2, NotebookPen, Trash2, Calendar, Users, Lightbulb, Zap, ChevronRight, HelpCircle } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { useNoteStore } from '../../store/useNoteStore';
import { useBackHandler } from '../../store/useConfigStore';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { BrainDumpItem, BrainDumpQuadrant } from '../../types';

interface BrainDumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConvertToTask: (title: string, id: string) => void;
}

const quadrants: { id: BrainDumpQuadrant; label: string; desc: string; icon: any; color: string; bg: string }[] = [
  { id: 'now', label: 'Fazer Agora', desc: '< 5 min', icon: Zap, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'schedule', label: 'Agendar', desc: 'Com data', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'delegate', label: 'Delegar / Deletar', desc: 'Passar adiante', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'incubator', label: 'Incubadora', desc: 'Ideias futuras', icon: Lightbulb, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

export const BrainDumpModal = ({ isOpen, onClose, onConvertToTask }: BrainDumpModalProps) => {
  const { brainDump, setBrainDump, updateBrainDumpItem, removeBrainDumpItem, markBrainDumpItemConverted, clearBrainDump } = useTaskStore();
  
  const [mode, setMode] = useState<'intro' | 'dumping' | 'organizing'>('intro');
  const [localItems, setLocalItems] = useState<BrainDumpItem[]>([]);
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  
  const [selectedItem, setSelectedItem] = useState<BrainDumpItem | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode('intro');
      setShowConfirmClear(false);
    } else {
      setMode('intro');
      setSelectedItem(null);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (mode === 'dumping' && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (mode === 'dumping' && timeLeft === 0) {
      handleFinishDump();
    }
    return () => clearInterval(interval);
  }, [mode, timeLeft]);

  useBackHandler(isOpen && !!selectedItem, () => { setSelectedItem(null); return true; });
  useBackHandler(showConfirmClear, () => { setShowConfirmClear(false); return true; });
  useBackHandler(isOpen && !selectedItem && !showConfirmClear, () => { onClose(); return true; });

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };

  const startNewDump = () => {
    setLocalItems([]);
    setInput('');
    setTimeLeft(5 * 60);
    setMode('dumping');
  };

  const handleFinishDump = () => {
    const newItems = [...brainDump.items, ...localItems];
    setBrainDump(newItems);
    setMode('organizing');
  };

  const handleCreateNote = () => {
    if (!selectedItem) return;
    useNoteStore.getState().addNote({
      id: uuidv4(),
      notebookId: 'default',
      title: selectedItem.text,
      content: "Esse item veio do brain dump, detalhe mais.",
      format: 'richtext',
      font: 'sans',
      hasLines: false,
      isLocked: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    markBrainDumpItemConverted(selectedItem.id, 'note');
    setSelectedItem(null);
    showToast('Nota criada com sucesso!');
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const renderIntro = () => {
    const hasExisting = brainDump.items.length > 0;
    const dateFormatted = brainDump.lastDumpAt ? format(new Date(brainDump.lastDumpAt), "dd/MM 'às' HH:mm") : '';

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white dark:bg-zinc-900 w-full max-w-md mx-auto rounded-3xl p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center relative mt-12 md:mt-24">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition-colors"><X size={20} /></button>
        
        <BrainCircuit size={64} className="mx-auto text-purple-500 mb-6" />
        <h2 className="text-3xl font-black mb-4 tracking-tight">Brain Dump</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed text-sm">
          Despeje todas as suas preocupações e pensamentos em um espaço seguro. Você terá 5 minutos de foco absoluto para transferir tudo para fora da sua mente.
        </p>

        {hasExisting && (
          <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl text-purple-600 dark:text-purple-400 mb-8 text-sm font-bold text-left flex gap-3">
            <HelpCircle size={24} className="shrink-0" />
            <span>Você tem um despejo não organizado de <b>{dateFormatted}</b>. Iniciar um novo apagará os itens atuais!</span>
          </div>
        )}

        <div className="space-y-3">
          <button onClick={startNewDump} className="w-full flex items-center justify-center gap-3 bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20">
            <Play size={18} fill="currentColor" /> {hasExisting ? 'Forçar Novo Despejo' : 'Iniciar Despejo'}
          </button>
          {hasExisting && (
            <button onClick={() => setMode('organizing')} className="w-full flex items-center justify-center gap-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 py-4 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              Continuar Organizando <ChevronRight size={18} />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  const renderDumping = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black text-zinc-100 flex flex-col">
      <header className="flex justify-between items-center p-6 border-b border-zinc-900">
        <div className="flex items-center gap-3">
            <BrainCircuit size={24} className="text-purple-500" />
            <span className="text-2xl font-black font-mono text-purple-500 tracking-widest">{formatTime(timeLeft)}</span>
        </div>
        <button onClick={handleFinishDump} className="px-6 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
          Concluir
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 md:px-24 space-y-6 scrollbar-hide">
        {localItems.map((item) => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={item.id} className="text-xl md:text-3xl font-medium text-zinc-400 italic">
            • {item.text}
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-6 md:px-24 bg-gradient-to-t from-black via-black to-transparent">
        <input
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && input.trim()) {
              setLocalItems(prev => [...prev, { id: uuidv4(), text: input.trim(), quadrant: 'unorganized' }]);
              setInput('');
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
          }}
          placeholder="O que está na sua mente? (Aperte Enter)"
          className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-purple-500 p-4 text-xl md:text-2xl outline-none transition-colors text-white placeholder:text-zinc-700"
        />
      </div>
    </motion.div>
  );

  const renderOrganizing = () => {
    const unorganized = brainDump.items.filter(i => i.quadrant === 'unorganized');
    const hasAny = brainDump.items.length > 0;

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white dark:bg-black w-full min-h-screen pt-12 pb-32">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          
          <header className="flex justify-between items-center mb-10 pb-6 border-b border-zinc-100 dark:border-zinc-900">
            <div>
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-3"><BrainCircuit className="text-purple-500"/> Matriz de Foco</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Organize seus pensamentos ou transforme-os em ação.</p>
            </div>
            <div className="flex gap-2 items-center">
               {hasAny && (
                   <button onClick={() => setShowConfirmClear(true)} className="p-2 md:p-3 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-colors" title="Limpar Todo o Brain Dump">
                      <Trash2 size={24} />
                   </button>
               )}
               <button onClick={onClose} className="p-2 md:p-3 bg-zinc-100 dark:bg-zinc-900 rounded-full hover:bg-zinc-200 transition-colors"><X size={24} /></button>
            </div>
          </header>

          {!hasAny ? (
             <div className="text-center text-zinc-500 py-20 font-bold">Nenhum item pendente. Sua mente está limpa.</div>
          ) : (
             <div className="space-y-12">
               {unorganized.length > 0 && (
                 <div>
                   <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                     Despejados ({unorganized.length})
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {unorganized.map(item => {
                       const isConverted = !!item.convertedTo;
                       return (
                         <button key={item.id} onClick={() => setSelectedItem(item)} className={`text-left p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors ${isConverted ? 'opacity-50 grayscale' : 'hover:border-purple-500'}`}>
                           <div className="flex justify-between items-start gap-2">
                              <span className={`font-medium text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 ${isConverted ? 'line-through' : ''}`}>{item.text}</span>
                              {item.convertedTo === 'task' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />}
                              {item.convertedTo === 'note' && <NotebookPen size={16} className="text-blue-500 shrink-0 mt-0.5" />}
                           </div>
                         </button>
                       )
                     })}
                   </div>
                 </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {quadrants.map(q => {
                   const qItems = brainDump.items.filter(i => i.quadrant === q.id);
                   if (qItems.length === 0) return null;
                   return (
                     <div key={q.id}>
                       <h3 className={`font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2 ${q.color}`}>
                         <q.icon size={16} /> {q.label} ({qItems.length})
                       </h3>
                       <div className="space-y-3">
                         {qItems.map(item => {
                           const isConverted = !!item.convertedTo;
                           return (
                             <button key={item.id} onClick={() => setSelectedItem(item)} className={`w-full text-left p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors ${isConverted ? 'opacity-50 grayscale' : 'hover:border-current'}`}>
                               <div className="flex justify-between items-start gap-2">
                                  <span className={`font-medium text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 ${isConverted ? 'line-through' : ''}`}>{item.text}</span>
                                  {item.convertedTo === 'task' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />}
                                  {item.convertedTo === 'note' && <NotebookPen size={16} className="text-blue-500 shrink-0 mt-0.5" />}
                               </div>
                             </button>
                           )
                         })}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen && mode === 'intro' && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-start md:items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
             {renderIntro()}
          </div>
        )}
        {isOpen && mode === 'dumping' && renderDumping()}
        {isOpen && mode === 'organizing' && (
          <div className="fixed inset-0 z-[200] bg-white dark:bg-black overflow-y-auto">
             {renderOrganizing()}
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Limpeza Total */}
      <AnimatePresence>
        {showConfirmClear && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[400] flex justify-center items-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-zinc-950 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-red-500/20 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
                 <Trash2 size={32} />
              </div>
              <h4 className="text-xl font-black mb-2">Limpar Tudo?</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Esta ação apagará permanentemente todos os itens da sua Matriz de Foco.</p>
              <div className="flex gap-3">
                 <button onClick={() => setShowConfirmClear(false)} className="flex-1 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold transition-colors">Cancelar</button>
                 <button onClick={() => { clearBrainDump(); setShowConfirmClear(false); showToast("Brain Dump limpo com sucesso!"); }} className="flex-1 p-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors">Apagar Tudo</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && mode === 'organizing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[300] flex justify-center items-end md:items-center p-4 backdrop-blur-sm">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 pb-8 md:pb-8 relative max-h-[90vh] overflow-y-auto scrollbar-hide">
              
              <button onClick={() => setSelectedItem(null)} className="absolute top-6 right-6 p-2 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 transition-colors"><X size={20}/></button>

              <h4 className="text-xl font-black mb-8 truncate pr-10">{selectedItem.text}</h4>
              
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 block">Mover para Quadrante</span>
              <div className="grid grid-cols-2 gap-3 mb-8">
                 {quadrants.map(q => (
                    <button key={q.id} onClick={() => { updateBrainDumpItem(selectedItem.id, q.id); setSelectedItem(null); }} className={`p-4 rounded-xl flex flex-col items-start gap-2 border transition-colors ${selectedItem.quadrant === q.id ? `bg-zinc-100 dark:bg-zinc-900 ${q.color} border-current` : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-purple-500 text-zinc-900 dark:text-zinc-100'}`}>
                       <q.icon size={20} className={selectedItem.quadrant === q.id ? 'opacity-100' : q.color} />
                       <div className="text-left">
                          <span className="font-bold block text-sm">{q.label}</span>
                          <span className="text-[10px] opacity-70 uppercase tracking-widest">{q.desc}</span>
                       </div>
                    </button>
                 ))}
              </div>

              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 block">Ações Imediatas</span>
              <div className="space-y-3">
                  <button onClick={() => { 
                      onConvertToTask(selectedItem.text, selectedItem.id); 
                      setSelectedItem(null); 
                  }} className="w-full p-4 flex items-center gap-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 font-bold transition-colors">
                     <CheckCircle2 size={18} className="text-emerald-500" /> Converter em Tarefa
                  </button>
                  <button onClick={handleCreateNote} className="w-full p-4 flex items-center gap-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 font-bold transition-colors">
                     <NotebookPen size={18} className="text-blue-500" /> Converter em Nota
                  </button>
                  <button onClick={() => { removeBrainDumpItem(selectedItem.id); setSelectedItem(null); }} className="w-full p-4 flex items-center gap-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold transition-colors">
                     <Trash2 size={18} /> Descartar Item
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-6 py-3 rounded-full font-bold shadow-2xl text-sm border border-zinc-800 dark:border-zinc-200">
             {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
