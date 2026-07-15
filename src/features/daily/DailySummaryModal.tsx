import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Flame, CheckCircle2, TrendingUp, Coins, AlertTriangle, Sunrise, Check, LineChart, TrendingDown, Minus, Award, Info, X, ShieldAlert, BarChart3 } from 'lucide-react';
import { useConfigStore } from '../../store/useConfigStore';
import { useEconomyStore } from '../../store/useEconomyStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useScoreStore, calculateGrade, getGradeMessage } from '../../store/useScoreStore';
import { format, subDays, differenceInDays } from 'date-fns';
import type { Task, DailyScore } from '../../types';

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
  const { dailyScores } = useScoreStore();

  const [currentDateStr, setCurrentDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [step, setStep] = useState<'init' | 'grace' | 'month_summary' | 'summary'>('init');
  const [graceTasks, setGraceTasks] = useState<Task[]>([]);
  const [completedGraceIds, setCompletedGraceIds] = useState<string[]>([]);
  const [savedMonthScores, setSavedMonthScores] = useState<DailyScore[]>([]);
  const [showInfo, setShowInfo] = useState(false);

  const isMonthTransition = useMemo(() => {
    if (!lastLoginDate) return false;
    return lastLoginDate.substring(0, 7) !== currentDateStr.substring(0, 7);
  }, [lastLoginDate, currentDateStr]);

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
    
    // Salva os dados do mês ANTES que o processamento do dia arquive a base![cite: 1]
    if (isMonthTransition && lastLoginDate) {
        const lastMonthStr = lastLoginDate.substring(0, 7);
        setSavedMonthScores(dailyScores.filter(d => d.date.startsWith(lastMonthStr)).sort((a, b) => a.date.localeCompare(b.date)));
    }

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
        // Se não tem pendências, já processa o novo dia para gerar os scores de ontem.
        processNewDay(currentDateStr, lastLoginDate);
        setStep(isMonthTransition ? 'month_summary' : 'summary');
    }
  }, [isVisible, step, currentDateStr, tasks, isMonthTransition, lastLoginDate, dailyScores, processNewDay]);

  useEffect(() => {
    if (isOnboarded && !lastLoginDate) { setLastLoginDate(currentDateStr); }
  }, [isOnboarded, lastLoginDate, currentDateStr, setLastLoginDate]);

  const toggleGrace = (id: string) => {
    if (completedGraceIds.includes(id)) setCompletedGraceIds(completedGraceIds.filter(i => i !== id));
    else setCompletedGraceIds([...completedGraceIds, id]);
  };

  const handleFinishGrace = () => {
    completedGraceIds.forEach(id => {
        retroactiveCompleteTask(id, format(subDays(new Date(currentDateStr + 'T12:00:00'), 1), 'yyyy-MM-dd'));
    });
    // Processa os scores de ontem somente após computar o perdão
    processNewDay(currentDateStr, lastLoginDate);
    setStep(isMonthTransition ? 'month_summary' : 'summary');
  };

  const handleStartDay = () => {
    setLastLoginDate(currentDateStr);
  };

  const quote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], [currentDateStr]);
  const diffDays = differenceInDays(new Date(currentDateStr + 'T00:00:00'), new Date(lastLoginDate + 'T00:00:00'));
  const yesterdayStr = format(subDays(new Date(currentDateStr + 'T12:00:00'), 1), 'yyyy-MM-dd');

  // Recupera as informações estáticas[cite: 1]
  const yesterdayTasks = tasks.filter(t => t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === yesterdayStr).length;
  const yesterdayHabits = habits.filter(h => { return (logs[h.id]?.[yesterdayStr] || 0) >= (h.goal || 1) || modifiers[h.id]?.[yesterdayStr]; }).length;
  const yesterdayXp = dailyHistory[yesterdayStr]?.xp || 0;
  const yesterdayGold = dailyHistory[yesterdayStr]?.gold || 0;
  const yesterdayLostXp = dailyHistory[yesterdayStr]?.lostXp || 0;
  const yesterdayLostGold = dailyHistory[yesterdayStr]?.lostGold || 0;

  // === LÓGICA DO LPI E ANIMAÇÃO ===
  const currentScoreObj = dailyScores.find(d => d.date === yesterdayStr) || dailyScores[dailyScores.length - 1];
  const prevScoreObj = dailyScores.slice().reverse().find(d => d.date < yesterdayStr);
  
  const currentScore = currentScoreObj ? currentScoreObj.score : 100;
  const prevScore = prevScoreObj ? prevScoreObj.score : 100;
  const scoreDiff = currentScore - prevScore;

  let scoreTrend: 'up' | 'down' | 'neutral' = 'neutral';
  if (scoreDiff > 0) scoreTrend = 'up';
  else if (scoreDiff < 0) scoreTrend = 'down';

  const currentGrade = calculateGrade(currentScore);
  const gradeMessage = getGradeMessage(currentGrade);

  const getGradeColor = (grade: string) => {
      if (grade.startsWith('A')) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      if (grade.startsWith('B')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      if (grade.startsWith('C')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  const scoreCounter = useMotionValue(prevScore);
  const displayedScore = useTransform(scoreCounter, Math.round);

  useEffect(() => {
      if (step === 'summary') {
          scoreCounter.set(prevScore);
          const timeout = setTimeout(() => {
              animate(scoreCounter, currentScore, { duration: 2, type: 'spring', stiffness: 50 });
          }, 800);
          return () => clearTimeout(timeout);
      }
  }, [step, currentScore, prevScore, scoreCounter]);

  const getLineChartPath = (scores: DailyScore[]) => {
      if (scores.length < 2) return "";
      const width = 300; const height = 100;
      const points = scores.map((s, i) => {
          const x = (i / (scores.length - 1)) * width;
          const y = height - (s.score / 100) * height; 
          return `${x},${y}`;
      }).join(' L ');
      return `M ${points}`;
  };

  if (!isVisible || step === 'init') return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-y-auto">
        <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12 md:py-20">
          <div className="max-w-2xl w-full mx-auto space-y-10 md:space-y-12">
            
            {step === 'grace' && (
                <motion.div key="grace" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
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
                           {isMonthTransition ? 'Avançar para Relatório Mensal' : 'Avançar para o Resumo'}
                       </button>
                    </div>
                </motion.div>
            )}

            {step === 'month_summary' && (
                <motion.div key="month" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <div className="text-center space-y-4">
                       <LineChart size={48} className="mx-auto text-indigo-500 mb-6" />
                       <h2 className="text-3xl md:text-4xl font-black tracking-tight">Fechamento do Mês</h2>
                       <p className="text-zinc-500 font-medium">Um novo mês se inicia. Aqui está o seu relatório final de performance do mês passado antes de ser arquivado.</p>
                    </div>

                    {savedMonthScores.length > 0 ? (
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nota Final (LPI)</span>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-5xl font-black text-indigo-500">
                                            {calculateGrade(Math.round(savedMonthScores.reduce((acc, curr) => acc + curr.score, 0) / savedMonthScores.length))}
                                        </span>
                                        <span className="text-lg font-bold text-zinc-400">/ 100</span>
                                    </div>
                                </div>
                                <Award size={48} className="text-zinc-200 dark:text-zinc-800" />
                            </div>

                            <div className="h-32 w-full relative">
                                <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                    <path 
                                      d={getLineChartPath(savedMonthScores)} 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="3" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round" 
                                      className="text-indigo-500" 
                                    />
                                    {savedMonthScores.map((s, i) => {
                                        const x = (i / (savedMonthScores.length - 1 || 1)) * 300;
                                        const y = 100 - (s.score / 100) * 100;
                                        return <circle key={i} cx={x} cy={y} r="4" className="fill-white dark:fill-black stroke-indigo-500 stroke-[2px]" />
                                    })}
                                </svg>
                            </div>

                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed p-4 bg-indigo-500/10 rounded-2xl">
                                {getGradeMessage(calculateGrade(Math.round(savedMonthScores.reduce((acc, curr) => acc + curr.score, 0) / savedMonthScores.length)))}
                            </p>
                        </div>
                    ) : (
                        <div className="text-center p-8 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl text-zinc-500 font-bold">
                            Sem dados suficientes no mês anterior para gerar um gráfico LPI.
                        </div>
                    )}

                    <div className="flex justify-center pt-6">
                       <button onClick={() => setStep('summary')} className="px-10 py-5 bg-indigo-600 text-white rounded-full font-black text-lg hover:scale-105 transition-all shadow-xl shadow-indigo-600/20">
                           Ir para Hoje
                       </button>
                    </div>
                </motion.div>
            )}

            {step === 'summary' && (
              <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="text-center space-y-4">
                  <Sunrise size={48} className="mx-auto text-blue-500 mb-6" />
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight">Um Novo Dia, {userName || 'Agente'}</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">Revisão das métricas antes de prosseguirmos.</p>
                </div>

                {diffDays > 1 && (
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-6 bg-red-500/10 border border-red-500/30 rounded-3xl flex gap-5 items-start text-red-600 dark:text-red-400 mb-8 mt-8">
                    <AlertTriangle className="shrink-0 mt-1" size={28} />
                    <div>
                      <h4 className="text-xl font-black tracking-tight">Ofensivas Rompidas</h4>
                      <p className="text-sm opacity-90 mt-2 leading-relaxed font-medium">Você esteve ausente por <b>{diffDays} dias</b>. Como consequência, as pendências não protegidas por folgas geraram punições. Use essa quebra não como derrota, mas como oportunidade de um recomeço mais forte.</p>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-4 mt-8">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 flex justify-center">Lida Productivity Index (LPI)</h3>
                  
                  {/* CARD DO LPI (SCORE) COM ANIMAÇÃO */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 mb-6 relative shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-sm flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                              <BarChart3 size={18} className="text-blue-500" />
                              Desempenho (Ontem)
                          </h3>
                          <button onClick={() => setShowInfo(true)} className="p-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-blue-500 transition-colors">
                              <Info size={14} />
                          </button>
                      </div>

                      <div className="flex items-center justify-between">
                          <div className="flex items-end gap-3">
                              <motion.span className="text-6xl font-black tabular-nums tracking-tighter text-zinc-900 dark:text-white">
                                  {displayedScore}
                              </motion.span>
                              <div className={`mb-2 px-3 py-1 rounded-lg border-2 font-black text-sm ${getGradeColor(currentGrade)}`}>
                                  {currentGrade}
                              </div>
                          </div>

                          <div className="text-right">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Tendência</span>
                              <div className={`flex items-center justify-end gap-1 font-black text-lg ${scoreTrend === 'up' ? 'text-emerald-500' : scoreTrend === 'down' ? 'text-red-500' : 'text-zinc-500'}`}>
                                  {scoreTrend === 'up' ? <TrendingUp size={20}/> : scoreTrend === 'down' ? <TrendingDown size={20}/> : <Minus size={20}/>}
                                  {scoreDiff > 0 ? '+' : ''}{scoreDiff !== 0 ? scoreDiff : 'Estável'}
                              </div>
                          </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                          <p className="text-xs font-medium italic text-zinc-500 dark:text-zinc-400">"{gradeMessage}"</p>
                      </div>
                  </div>

                  <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 flex justify-center mt-8 mb-2">Recursos do último login</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center shadow-sm">
                      <CheckCircle2 className="text-blue-500 mb-2" size={20} />
                      <span className="text-xl font-black">{yesterdayTasks}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">Tarefas</span>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center shadow-sm">
                      <Flame className="text-orange-500 mb-2" size={20} />
                      <span className="text-xl font-black">{yesterdayHabits}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">Hábitos</span>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center shadow-sm">
                      <TrendingUp className="text-purple-500 mb-2" size={20} />
                      <span className="text-xl font-black">{yesterdayXp}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">XP Ganho</span>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center shadow-sm">
                      <Coins className="text-yellow-500 mb-2" size={20} />
                      <span className="text-xl font-black">{yesterdayGold}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">Ouro Ganho</span>
                    </div>
                  </div>

                  {/* AVISO DE PUNIÇÕES ECONÔMICAS */}
                  {(yesterdayLostXp > 0 || yesterdayLostGold > 0) && (
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                        <ShieldAlert className="text-red-500 mb-2" size={24} />
                        <h4 className="text-red-500 font-black text-lg">Punições Econômicas Aplicadas</h4>
                        <p className="text-xs text-red-500/80 font-bold mb-3">O tempo não perdoa. Prazos de desafios ou tarefas estourados cobraram seu preço financeiro no seu progresso diário.</p>
                        <div className="flex gap-4">
                          <span className="text-red-500 font-black flex items-center gap-1">-{yesterdayLostXp} XP</span>
                          <span className="text-red-500 font-black flex items-center gap-1">-{yesterdayLostGold} Ouro</span>
                        </div>
                    </motion.div>
                  )}
                </div>

                <div className="text-center px-4 md:px-12 mt-12">
                  <p className="text-xl md:text-2xl font-serif italic text-zinc-700 dark:text-zinc-300 leading-relaxed">"{quote.text}"</p>
                  <p className="text-sm font-bold text-zinc-400 mt-4">— {quote.author}</p>
                </div>

                <div className="flex justify-center pt-10">
                  <button onClick={handleStartDay} className="px-10 py-5 bg-blue-600 text-white rounded-full font-black text-lg hover:bg-blue-500 hover:scale-105 transition-all shadow-[0_0_40px_rgba(37,99,235,0.4)]">
                    Iniciar o Dia
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </motion.div>

      {/* MODAL DE EXPLICAÇÃO DO LPI */}
      <AnimatePresence>
          {showInfo && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[6000] bg-black/90 flex items-center justify-center p-6 backdrop-blur-md">
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-zinc-950 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-zinc-800 text-white relative">
                      <button onClick={() => setShowInfo(false)} className="absolute top-6 right-6 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                          <X size={18} />
                      </button>
                      <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Info size={24} className="text-blue-500"/> Entendendo o LPI</h3>
                      
                      <div className="space-y-6">
                          <div>
                              <h4 className="text-sm font-bold text-blue-400 mb-1 uppercase tracking-widest">O que é?</h4>
                              <p className="text-xs text-zinc-400 leading-relaxed font-medium">O Lida Productivity Index (LPI) avalia a sua consistência real, penalizando tarefas ignoradas e recompensando o cumprimento de deveres difíceis (P0/P1).</p>
                          </div>
                          
                          <div className="pt-4 border-t border-zinc-800">
                              <h4 className="text-sm font-bold text-zinc-100 mb-3 uppercase tracking-widest">Tendência</h4>
                              
                              <div className="space-y-4">
                                  <div className="flex items-start gap-3">
                                      <TrendingUp size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                                      <div>
                                          <span className="text-sm font-bold text-emerald-500 block mb-0.5">Seta Verde (Subindo)</span>
                                          <p className="text-xs text-zinc-500 font-medium">Você produziu mais, e com mais qualidade, do que no dia anterior.</p>
                                      </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                      <TrendingDown size={18} className="text-red-500 shrink-0 mt-0.5" />
                                      <div>
                                          <span className="text-sm font-bold text-red-500 block mb-0.5">Seta Vermelha (Descendo)</span>
                                          <p className="text-xs text-zinc-500 font-medium">Você procrastinou, perdeu ofensivas de hábitos ou deixou tarefas expirarem ontem.</p>
                                      </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                      <Minus size={18} className="text-zinc-400 shrink-0 mt-0.5" />
                                      <div>
                                          <span className="text-sm font-bold text-zinc-400 block mb-0.5">Símbolo Cinza (Estável)</span>
                                          <p className="text-xs text-zinc-500 font-medium">Seu nível de produtividade se manteve exatamente igual. Cuidado com o platô.</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <button onClick={() => setShowInfo(false)} className="w-full mt-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors">
                          Entendido
                      </button>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </AnimatePresence>
  );
};
