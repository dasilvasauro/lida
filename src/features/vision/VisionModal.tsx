import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ExternalLink, AlertTriangle, Eye, Activity, Anchor, Compass } from 'lucide-react';
import { useVisionStore } from '../../store/useVisionStore';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GoalState } from '../../types';

export const VisionModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { vision, setVision, updateGoalState, checkAndGenerateCheckpoints } = useVisionStore();
  
  // Wizard States
  const [step, setStep] = useState(0);
  const [devTraits, setDevTraits] = useState(['', '', '', '']);
  const [abTraits, setAbTraits] = useState(['', '', '', '']);
  const [goals, setGoals] = useState(['', '', '', '', '']);

  useEffect(() => {
    if (isOpen && vision) checkAndGenerateCheckpoints();
    if (!isOpen) setStep(0); // Reseta o wizard ao fechar
  }, [isOpen, vision]);

  if (!isOpen) return null;

  // VALIDAÇÕES: Traços (Exatamente 4), Objetivos (Pelo menos 1)
  const isStep1Valid = devTraits.every(t => t.trim().length > 0);
  const isStep2Valid = abTraits.every(t => t.trim().length > 0);
  const isStep3Valid = goals.some(g => g.trim().length > 0);

  const handleCreateVision = () => {
    if (!isStep3Valid) return;
    const validGoals = goals.filter(g => g.trim().length > 0);

    setVision({
      traitsToDevelop: devTraits.map(t => t.trim()),
      traitsToAbandon: abTraits.map(t => t.trim()),
      goals: validGoals.map(g => ({ id: uuidv4(), title: g.trim(), state: 1 })),
      checkpoints: [], 
      createdAt: Date.now(),
    });
    checkAndGenerateCheckpoints();
  };

  const renderSetup = () => (
    <AnimatePresence mode="wait">
      {step === 0 && (
        <motion.div key="intro" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-2xl w-full mx-auto p-8 flex flex-col items-center justify-center text-center h-full">
           <Eye size={64} className="mb-6 text-zinc-300 dark:text-zinc-700" />
           <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">O Fim da Inércia</h2>
           <p className="text-lg text-zinc-500 mb-12 leading-relaxed">
             Inspirado em <i>"How to Fix Your Life in 1 day"</i> de Dan Koe. <br/><br/>
             A clareza mental é o ativo mais valioso do século. Defina rigorosamente quem você não quer mais ser, quem você precisa se tornar e quais são os Grandes Objetivos que dão sentido às suas tarefas diárias.
           </p>
           <button onClick={() => setStep(1)} className="px-8 py-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black rounded-full font-bold text-lg flex items-center gap-2 hover:scale-105 transition-transform shadow-2xl">
             Construir Visão <ArrowRight size={20}/>
           </button>
        </motion.div>
      )}
      
      {step === 1 && (
        <motion.div key="step1" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="max-w-md w-full mx-auto p-8 flex flex-col justify-center h-full space-y-6">
          <h3 className="text-3xl font-black tracking-tight">Internalizar</h3>
          <p className="text-zinc-500 text-sm mb-4">Liste até 4 características, valores ou habilidades que você precisa absorver na sua personalidade.</p>
          {devTraits.map((t, i) => (
             <input key={i} value={t} onChange={e => { const n = [...devTraits]; n[i] = e.target.value; setDevTraits(n); }} placeholder={`Característica ${i+1}`} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-zinc-500 transition-colors font-bold" />
          ))}
          <div className="flex justify-between pt-8">
            <button onClick={() => setStep(0)} className="text-zinc-500 font-bold px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors">Voltar</button>
            <button onClick={() => setStep(2)} disabled={!isStep1Valid} className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed">Avançar</button>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div key="step2" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="max-w-md w-full mx-auto p-8 flex flex-col justify-center h-full space-y-6">
          <h3 className="text-3xl font-black tracking-tight">Abandonar</h3>
          <p className="text-zinc-500 text-sm mb-4">A clareza também vem da destruição. Liste até 4 traços prejudiciais ou vícios de personalidade que você rejeita.</p>
          {abTraits.map((t, i) => (
             <input key={i} value={t} onChange={e => { const n = [...abTraits]; n[i] = e.target.value; setAbTraits(n); }} placeholder={`Traço ${i+1}`} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-zinc-500 transition-colors font-bold" />
          ))}
          <div className="flex justify-between pt-8">
            <button onClick={() => setStep(1)} className="text-zinc-500 font-bold px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors">Voltar</button>
            <button onClick={() => setStep(3)} disabled={!isStep2Valid} className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed">Avançar</button>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div key="step3" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="max-w-md w-full mx-auto p-8 flex flex-col justify-center h-full space-y-6">
          <h3 className="text-3xl font-black tracking-tight">A Grande Obra</h3>
          <p className="text-zinc-500 text-sm mb-4">Adicione até 5 Grandes Objetivos de médio ou longo prazo (Ex: "Falar Inglês", "Empresa com lucro X").</p>
          {goals.map((g, i) => (
             <input key={i} value={g} onChange={e => { const n = [...goals]; n[i] = e.target.value; setGoals(n); }} placeholder={`Objetivo ${i+1}`} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-blue-500 transition-colors font-bold" />
          ))}
          <div className="flex justify-between pt-8">
            <button onClick={() => setStep(2)} className="text-zinc-500 font-bold px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors">Voltar</button>
            <button onClick={handleCreateVision} disabled={!isStep3Valid} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors">Firmar Visão</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderDashboard = () => {
    if (!vision) return null;
    const today = format(new Date(), 'yyyy-MM-dd');
    const nextCheckpoint = vision.checkpoints.find(cp => cp >= today) || vision.checkpoints[vision.checkpoints.length - 1];

    const allInactive = vision.goals.every(g => g.state === 1);
    const dayOfWeek = new Date().getDay();
    const showWarning = allInactive && [1, 3, 5].includes(dayOfWeek);

    const statesText = ['Inativo', 'Planejado', 'Organizado', 'Ativo', 'Consistente'];
    const statesDesc = [
      'Nenhuma ação tangível tomada.',
      'Abstração cuidadosa, métodos e recursos pensados.',
      'Transformado em cronograma e tarefas tangíveis.',
      'Em andamento prático diário/semanal.',
      'Já deu frutos consistentes, integrado à sua realidade.'
    ];

    return (
       <div className="max-w-4xl w-full mx-auto p-6 md:p-12 h-full overflow-y-auto scrollbar-hide pt-24 md:pt-20">
         <header className="flex flex-col md:flex-row justify-between md:items-end mb-12 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">Módulo Visão</h2>
              <p className="text-zinc-500 mt-2 font-medium">Acompanhe seu alinhamento com a realidade que você exige.</p>
            </div>
            {nextCheckpoint && (
              <div className="md:text-right bg-blue-500/10 border border-blue-500/20 px-5 py-3 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-widest block mb-1">Próximo Checkpoint</span>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                  {format(new Date(nextCheckpoint + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                </div>
              </div>
            )}
         </header>

         {showWarning && (
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="mb-10 p-5 bg-orange-500/10 border border-orange-500/30 rounded-3xl flex gap-5 items-start text-orange-600 dark:text-orange-400">
              <AlertTriangle className="shrink-0 mt-1" size={28} />
              <div>
                <h4 className="text-lg font-black tracking-tight">Inércia Detectada</h4>
                <p className="text-sm opacity-80 mt-1 leading-relaxed font-medium">Todos os seus Grandes Objetivos estão estagnados no papel. A visão não possui força sem o movimento tangível. Assuma a responsabilidade e organize o primeiro passo hoje.</p>
              </div>
            </motion.div>
         )}

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2"><Anchor size={16}/> Internalizar</h3>
              <ul className="space-y-3">
                {vision.traitsToDevelop.map((t, i) => (
                  <li key={i} className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-sm font-bold shadow-sm">{t}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-red-500 flex items-center gap-2"><Activity size={16}/> Abandonar</h3>
              <ul className="space-y-3">
                {vision.traitsToAbandon.map((t, i) => (
                  <li key={i} className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-sm font-bold line-through opacity-60">{t}</li>
                ))}
              </ul>
            </div>
         </div>

         <div className="space-y-6 pb-20">
            <h3 className="text-sm font-bold uppercase tracking-widest text-blue-500 flex items-center gap-2 mb-6"><Compass size={16}/> Estados de Atuação</h3>
            {vision.goals.map((g) => (
              <div key={g.id} className="p-6 md:p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:border-blue-500/30">
                 <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                    <h4 className="text-xl md:text-2xl font-black">{g.title}</h4>
                    <span className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full w-fit">Nível {g.state}: {statesText[g.state - 1]}</span>
                 </div>
                 
                 <div className="relative mb-6">
                    <input 
                    type="range" min="1" max="5" step="1" 
                    value={g.state}
                    onChange={(e) => updateGoalState(g.id, Number(e.target.value) as GoalState)}
                    className="w-full accent-blue-500"
                    />
                 </div>
                 
                 <div className="flex justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-4">
                   <span>Inativo</span>
                   <span>Consistente</span>
                 </div>
                 
                 <p className="text-sm text-zinc-500 font-medium italic border-l-2 border-blue-500 pl-3">"{statesDesc[g.state - 1]}"</p>
              </div>
            ))}
         </div>
       </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-hidden flex flex-col">
           
           {/* BOTÕES FIXOS TOPO DIREITA */}
           <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[110] flex items-center gap-3">
              <a href="https://thedankoe.com/letters/how-to-fix-your-life-in-1-day/" target="_blank" rel="noopener noreferrer" title="Ler Artigo de Referência" className="p-3 md:p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full hover:scale-110 transition-transform shadow-lg border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                <ExternalLink size={24}/>
              </a>
              <button onClick={onClose} className="p-3 md:p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full hover:scale-110 transition-transform shadow-lg">
                <X size={24}/>
              </button>
           </div>

           {vision ? renderDashboard() : renderSetup()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}