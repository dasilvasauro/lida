import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, CheckCircle2, TrendingUp, Coins, AlertTriangle, Sunrise, Check } from 'lucide-react';
import { useConfigStore } from '../../store/useConfigStore';
import { useEconomyStore } from '../../store/useEconomyStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { format, subDays, differenceInDays } from 'date-fns';
import type { Task } from '../../types';

const quotes = [
  { text: "A disciplina é a ponte entre objetivos e realizações.", author: "Jim Rohn" },
  { text: "Não importa o quão devagar você vá, desde que você não pare.", author: "Confúcio" },
  { text: "Nós somos o que fazemos repetidamente. A excelência, portanto, não é um ato, mas um hábito.", author: "Aristóteles" },
  { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
  { text: "Você nunca mudará sua vida até que mude algo que faz diariamente.", author: "John C. Maxwell" },
  { text: "A motivação faz você começar. O hábito faz você continuar.", author: "Jim Ryun" },
  { text: "Pequenas disciplinas repetidas com consistência levam a grandes conquistas ao longo do tempo.", author: "John C. Maxwell" },
  { text: "O segredo do seu sucesso é determinado pela sua agenda diária.", author: "John C. Maxwell" },
  { text: "A inércia é o maior inimigo da clareza. O movimento cria o gênio.", author: "Dan Koe" },
  { text: "Concentre-se em ser 1% melhor a cada dia.", author: "James Clear" }
];

export const DailySummaryModal = () => {
  const { isOnboarded, userName, lastLoginDate, setLastLoginDate } = useConfigStore();
  const { dailyHistory } = useEconomyStore();
  const { tasks, processNewDay, retroactiveCompleteTask } = useTaskStore(); 
  const { habits, logs, modifiers } = useHabitStore();

  const [currentDateStr, setCurrentDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [step, setStep] = useState<'init' | 'grace' | 'summary'>('init');
  const [graceTasks, setGraceTasks] = useState<Task[]>([]);
  const [completedGraceIds, setCompletedGraceIds] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newDateStr = format(new Date(), 'yyyy-MM-dd');
      if (newDateStr !== currentDateStr) setCurrentDateStr(newDateStr);
    }, 60000);
    
    const handleFocus = () => setCurrentDateStr(format(new Date(), 'yyyy-MM-dd'));
    window.addEventListener('focus', handleFocus);

    return () => { clearInterval(interval); window.removeEventListener('focus', handleFocus); };
  }, [currentDateStr]);

  const isVisible = isOnboarded && lastLoginDate !== null && lastLoginDate < currentDateStr;

  useEffect(() => {
    if (!isVisible || step !== 'init') return;
    
    const yesterdayStr = format(subDays(new Date(currentDateStr + 'T12:00:00'), 1), 'yyyy-MM-dd');
    
    const overdue = tasks.filter(t => {
        if (t.isCompleted || t.isFailed || t.isArchived) return false;
        const isDailyChallengeYesterday = t.type === 'daily_challenge' && format(new Date(t.createdAt), 'yyyy-MM-dd') === yesterdayStr;
        const isSprintYesterday = t.type === 'sprint' && t.deadlineDate === yesterdayStr;
        const isNormalYesterday = t.type === 'normal' && t.deadlineDate === yesterdayStr;
        const isRoutineYesterday = t.type === 'routine' && t.deadlineDate === yesterdayStr;
        return isDailyChallengeYesterday || isSprintYesterday || isNormalYesterday || isRoutineYesterday;
    });

    if (overdue.length > 0) {
        setGraceTasks(overdue);
        setStep('grace');
    } else {
        setStep('summary');
    }
  }, [isVisible, step, currentDateStr, tasks]);

  useEffect(() => {
    if (isOnboarded && !lastLoginDate) { setLastLoginDate(currentDateStr); }
  }, [isOnboarded, lastLoginDate, currentDateStr, setLastLoginDate]);

  const quote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], [currentDateStr]);

  if (!isVisible || step === 'init') return null;

  const diffDays = differenceInDays(new Date(currentDateStr + 'T00:00:00'), new Date(lastLoginDate + 'T00:00:00'));
  const yesterdayStr = format(subDays(new Date(currentDateStr + 'T12:00:00'), 1), 'yyyy-MM-dd');

  const yesterdayTasks = tasks.filter(t => t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === yesterdayStr).length;
  const yesterdayHabits = habits.filter(h => { return (logs[h.id]?.[yesterdayStr] || 0) >= (h.goal || 1) || modifiers[h.id]?.[yesterdayStr]; }).length;
  const yesterdayXp = dailyHistory[yesterdayStr]?.xp || 0;
  const yesterdayGold = dailyHistory[yesterdayStr]?.gold || 0;
  
  const yesterdayLostXp = dailyHistory[yesterdayStr]?.lostXp || 0;
  const yesterdayLostGold = dailyHistory[yesterdayStr]?.lostGold || 0;

  const toggleGrace = (id: string) => {
    if (completedGraceIds.includes(id)) setCompletedGraceIds(completedGraceIds.filter(i => i !== id));
    else setCompletedGraceIds([...completedGraceIds, id]);
  };

  const handleFinishGrace = () => {
    completedGraceIds.forEach(id => {
        retroactiveCompleteTask(id, yesterdayStr);
    });
    setStep('summary');
  };

  const handleStartDay = () => {
    processNewDay(currentDateStr);
    setLastLoginDate(currentDateStr);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-y-auto">
        <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12 md:py-20">
          <div className="max-w-2xl w-full mx-auto space-y-10 md:space-y-12">
            
            {step === 'grace' && (
                <div className="space-y-6">
                    <div className="text-center space-y-4">
                       <AlertTriangle size={48} className="mx-auto text-amber-500 mb-6" />
                       <h2 className="text-3xl md:text-4xl font-black tracking-tight">Perdão de Esquecimento</h2>
                       <p className="text-zinc-500 font-medium">Você deixou as tarefas abaixo pendentes ontem. Se você as concluiu mas esqueceu de marcar no app, marque-as agora para salvar sua ofensiva e evitar punições.</p>
                    </div>
                    
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-hide px-2">
                       {graceTasks.map(t => {
                           const isDone = completedGraceIds.includes(t.id);
                           return (
                               <div key={t.id} onClick={() => toggleGrace(t.id)} className={`p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${isDone ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'}`}>
                                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 dark:border-zinc-700'}`}>
                                       {isDone && <Check size={14} strokeWidth={3} />}
                                   </div>
                                   <span className={`font-bold text-sm line-clamp-2 ${isDone ? 'line-through opacity-50 text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{t.title}</span>
                               </div>
                           )
                       })}
                    </div>
                    
                    <div className="flex justify-center pt-6">
                       <button onClick={handleFinishGrace} className="px-10 py-5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black rounded-full font-black text-lg hover:scale-105 transition-all shadow-xl">
                           Avançar para o Resumo
                       </button>
                    </div>
                </div>
            )}

            {step === 'summary' && (
              <>
                <div className="text-center space-y-4">
                  <Sunrise size={48} className="mx-auto text-blue-500 mb-6" />
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight">Um Novo Dia, {userName || 'Agente'}</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">Revisão das métricas antes de prosseguirmos.</p>
                </div>

                {diffDays > 1 && (
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-6 bg-red-500/10 border border-red-500/30 rounded-3xl flex gap-5 items-start text-red-600 dark:text-red-400">
                    <AlertTriangle className="shrink-0 mt-1" size={28} />
                    <div>
                      <h4 className="text-xl font-black tracking-tight">Ofensivas Rompidas</h4>
                      <p className="text-sm opacity-90 mt-2 leading-relaxed font-medium">Você esteve ausente por <b>{diffDays} dias</b>. Como consequência, seus ciclos de constância não protegidos por folgas foram perdidos. Use essa quebra não como punição, mas como oportunidade de um recomeço mais forte.</p>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-4">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 flex justify-center">Seu rendimento no último dia</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                      <CheckCircle2 className="text-blue-500 mb-2" size={24} />
                      <span className="text-2xl font-black">{yesterdayTasks}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">Tarefas</span>
                    </div>
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                      <Flame className="text-orange-500 mb-2" size={24} />
                      <span className="text-2xl font-black">{yesterdayHabits}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">Hábitos</span>
                    </div>
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                      <TrendingUp className="text-purple-500 mb-2" size={24} />
                      <span className="text-2xl font-black">{yesterdayXp}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">XP Ganho</span>
                    </div>
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                      <Coins className="text-yellow-500 mb-2" size={24} />
                      <span className="text-2xl font-black">{yesterdayGold}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">Ouro Ganho</span>
                    </div>
                  </div>

                  {/* AVISO DE PUNIÇÕES */}
                  {(yesterdayLostXp > 0 || yesterdayLostGold > 0) && (
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col items-center justify-center text-center">
                        <AlertTriangle className="text-red-500 mb-2" size={24} />
                        <h4 className="text-red-500 font-black text-lg">Punições Aplicadas</h4>
                        <p className="text-xs text-red-500/80 font-bold mb-3">O tempo não perdoa. Prazos de desafios, sprints ou tarefas estourados cobraram seu preço no seu progresso diário.</p>
                        <div className="flex gap-4">
                          <span className="text-red-500 font-black flex items-center gap-1">-{yesterdayLostXp} XP</span>
                          <span className="text-red-500 font-black flex items-center gap-1">-{yesterdayLostGold} Ouro</span>
                        </div>
                    </motion.div>
                  )}
                </div>

                <div className="text-center px-4 md:px-12">
                  <p className="text-xl md:text-2xl font-serif italic text-zinc-700 dark:text-zinc-300 leading-relaxed">"{quote.text}"</p>
                  <p className="text-sm font-bold text-zinc-400 mt-4">— {quote.author}</p>
                </div>

                <div className="flex justify-center pt-8">
                  <button onClick={handleStartDay} className="px-10 py-5 bg-blue-600 text-white rounded-full font-black text-lg hover:bg-blue-500 hover:scale-105 transition-all shadow-[0_0_40px_rgba(37,99,235,0.4)]">
                    Iniciar o Dia
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
