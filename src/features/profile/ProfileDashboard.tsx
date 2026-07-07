import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Coins, Flame, CheckCircle2, TrendingUp, TrendingDown, Minus, Eye, Medal, Info, Activity, RefreshCw, Settings, Plus, Palette, Ticket, Clover, Target, Crown, X, Zap, Shield, Clock, UserCog, CloudCog, ScrollText, LogOut, BarChart3, Calendar, AlertTriangle, Sparkles } from 'lucide-react';
import { useEconomyStore } from '../../store/useEconomyStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useConfigStore, useBackHandler } from '../../store/useConfigStore';
import { useReflectionStore } from '../../store/useReflectionStore';
import { useScoreStore, calculateGrade, getGradeMessage } from '../../store/useScoreStore';
import { format, subDays, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Mood, Reflection } from '../../types';
import { VisionModal } from '../vision/VisionModal';
import { syncToCloud, syncFromCloud } from '../../lib/cloudSync';
import { SettingsModal } from './SettingsModal';
import { GoogleConnectModal } from './GoogleConnectModal';
import { ReflectionCreatorModal } from '../reflections/ReflectionCreatorModal'; 
import { ReflectionViewerModal } from '../reflections/ReflectionViewerModal';
import { ChangelogModal } from './ChangelogModal';

const colorMap: Record<string, string> = {
  blue: 'border-blue-500 text-blue-500 bg-blue-500/10', emerald: 'border-emerald-500 text-emerald-500 bg-emerald-500/10',
  amber: 'border-amber-500 text-amber-500 bg-amber-500/10', rose: 'border-rose-500 text-rose-500 bg-rose-500/10',
  purple: 'border-purple-500 text-purple-500 bg-purple-500/10', cyan: 'border-cyan-500 text-cyan-500 bg-cyan-500/10',
  indigo: 'border-indigo-500 text-indigo-500 bg-indigo-500/10', zinc: 'border-zinc-500 text-zinc-500 bg-zinc-500/10'
};

const modusLabels = {
    multitask: { label: 'Multitarefa', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
    minimalist: { label: 'Minimalista', icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    punctual: { label: 'Pontual', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    ambitious: { label: 'Ambicioso', icon: Target, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' }
};

export const ProfileDashboard = () => {
  const { xp, level, gold, inventory, useItem } = useEconomyStore();
  const { tasks, moodHistory } = useTaskStore();
  const { habits, logs, modifiers } = useHabitStore();
  const { uid, e2eePin, isLocalMode, defaultDaysOff, userClass, setUserClass, userName, setExitModalOpen } = useConfigStore();
  const { reflections } = useReflectionStore();
  const { dailyScores, monthlyArchives, getCurrentMonthScore } = useScoreStore();

  const { isVisionOpen, setVisionOpen, isSettingsOpen, setSettingsOpen, isGoogleConnectOpen, setGoogleConnectOpen, isChangelogOpen, setChangelogOpen } = useConfigStore();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  const [gridMode, setGridMode] = useState<'perfect' | 'habits' | 'mood'>('perfect');

  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ msg: string, type?: 'error' } | null>(null);

  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [reflectionToEdit, setReflectionToEdit] = useState<Reflection | null>(null);
  const [viewerReflection, setViewerReflection] = useState<Reflection | null>(null);
  
  const [infoModal, setInfoModal] = useState<{title: string, desc: string} | null>(null);
  const [isModusModalOpen, setModusModalOpen] = useState(false);

  const activeModus = userClass ? modusLabels[userClass] : null;

  const showToast = (msg: string, type?: 'error') => { setToastMessage({msg, type}); setTimeout(() => setToastMessage(null), 3000); };

  const handleForceSync = async () => {
    if (!uid || !e2eePin || !navigator.onLine) return showToast("Não foi possível sincronizar. Verifique a rede.", "error");
    setIsSyncing(true);
    try { 
        await syncToCloud(true); 
        await syncFromCloud(uid, e2eePin); 
        showToast("Sincronização realizada com sucesso!"); 
    } 
    catch (e: any) { 
        showToast("Erro: " + (e.message || "Problema de rede"), "error"); 
    } 
    finally { setIsSyncing(false); }
  };

  const handleChangeModus = (newModus: any) => {
      if (newModus === userClass) {
          showToast("Você já possui essa filosofia ativada!", "error");
          return;
      }
      if (useItem('changeModus')) {
          setUserClass(newModus);
          setModusModalOpen(false);
          showToast("Modus Operandi atualizado com sucesso!");
      } else {
          showToast("Você não possui a Troca de Filosofia. Adquira na Loja.", "error");
      }
  };

  const currentLevelXp = Math.pow(level - 1, 2) * 100; const nextLevelXp = Math.pow(level, 2) * 100;
  const xpProgress = xp - currentLevelXp; const xpRequired = nextLevelXp - currentLevelXp;
  const percentage = Math.min(100, Math.max(0, (xpProgress / xpRequired) * 100));

  const today = new Date(); const yesterday = subDays(today, 1);
  const todayTasksCount = tasks.filter(t => t.isCompleted && t.completedAt && isSameDay(new Date(t.completedAt), today)).length;
  const yesterdayTasksCount = tasks.filter(t => t.isCompleted && t.completedAt && isSameDay(new Date(t.completedAt), yesterday)).length;
  const tasksDiff = todayTasksCount - yesterdayTasksCount;

  const calculateActiveStreak = () => {
    let streak = 0; let checkDate = today;
    while (true) {
       const dStr = format(checkDate, 'yyyy-MM-dd');
       const hasTask = tasks.some(t => t.isCompleted && t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === dStr);
       let hasHabit = false;
       habits.forEach(h => { if ((logs[h.id]?.[dStr] || 0) >= (h.goal || 1) || modifiers[h.id]?.[dStr]) hasHabit = true; });

       const isDayOff = defaultDaysOff.includes(checkDate.getDay());

       if (hasTask || hasHabit) { 
           streak++; 
           checkDate = subDays(checkDate, 1); 
       } else if (isDayOff) {
           checkDate = subDays(checkDate, 1); 
       } else { 
           if (isSameDay(checkDate, today)) checkDate = subDays(checkDate, 1); 
           else break; 
       }
    }
    return streak;
  };
  const activeStreak = calculateActiveStreak();

  const isPerfectDay = (dateStr: string) => {
    const tasksDue = tasks.filter(t => t.deadlineDate === dateStr);
    const tasksCompleted = tasksDue.every(t => t.isCompleted);
    const hasTasks = tasksDue.length > 0;
    const activeHabits = habits.filter(h => format(new Date(h.createdAt), 'yyyy-MM-dd') <= dateStr);
    const habitsCompleted = activeHabits.length > 0 && activeHabits.every(h => { return (logs[h.id]?.[dateStr] || 0) >= (h.goal || 1) || modifiers[h.id]?.[dateStr]; });
    const hasHabits = activeHabits.length > 0;
    if (!hasTasks && !hasHabits) return false; 
    return (hasTasks ? tasksCompleted : true) && (hasHabits ? habitsCompleted : true);
  };

  const getMoodColor = (mood: Mood | undefined, isToday: boolean) => {
    const m = mood || (isToday ? 'normal' : undefined);
    if (!m) return 'bg-zinc-200 dark:bg-zinc-800/50';

    switch(m) { 
       case 'radiant': return 'bg-purple-700 shadow-[0_0_8px_rgba(126,34,206,0.5)]'; 
       case 'happy': return 'bg-purple-600'; 
       case 'normal': return 'bg-purple-500'; 
       case 'annoyed': return 'bg-purple-400'; 
       case 'disappointed': return 'bg-purple-300 dark:bg-purple-900/60'; 
       default: return 'bg-purple-500'; 
    }
  };

  const getHabitsColor = (dateStr: string) => {
    let count = 0; habits.forEach(h => { if ((logs[h.id]?.[dateStr] || 0) >= (h.goal || 1) || modifiers[h.id]?.[dateStr]) count++; });
    if (count === 1) return 'bg-emerald-300 dark:bg-emerald-900/60'; if (count === 2) return 'bg-emerald-400 dark:bg-emerald-700/80'; if (count >= 3) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'; return 'bg-zinc-200 dark:bg-zinc-800/50';
  };

  const generateGlobalGrid = () => {
    const start = startOfWeek(subDays(today, 84)); const weeks = []; let current = start;
    while (current <= today) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        if (current > today) break; const dStr = format(current, 'yyyy-MM-dd');
        let colorClass = 'bg-zinc-200 dark:bg-zinc-800/50';
        
        const isTodayStr = dStr === format(today, 'yyyy-MM-dd');

        if (gridMode === 'mood') colorClass = getMoodColor(moodHistory[dStr], isTodayStr); 
        else if (gridMode === 'perfect' && isPerfectDay(dStr)) colorClass = 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]'; 
        else if (gridMode === 'habits') colorClass = getHabitsColor(dStr);
        
        week.push(<div key={dStr} title={dStr} className={`w-3 h-3 md:w-4 md:h-4 rounded-[3px] md:rounded-sm transition-colors ${colorClass}`} />);
        current = addDays(current, 1);
      }
      weeks.push(<div key={current.toString()} className="flex flex-col gap-1 md:gap-1.5">{week}</div>);
    }
    return weeks;
  };

  const milestones = [
    { level: 10, label: 'Tema Suave', icon: Palette },
    { level: 15, label: '15 Vouchers', icon: Ticket },
    { level: 20, label: 'Tema Manteiga', icon: Palette },
    { level: 25, label: 'Sorte Diária', icon: Clover },
    { level: 30, label: 'P0 Ilimitada', icon: Flame },
    { level: 35, label: 'Tema Marinho', icon: Palette },
    { level: 40, label: 'P1 Ilimitada', icon: Target },
    { level: 50, label: 'Darcula + 40V', icon: Crown },
  ];

  // === LPI CALCS E DIAGNÓSTICO ===
  const currentScore = getCurrentMonthScore();
  const currentGrade = calculateGrade(currentScore);
  const gradeMessage = getGradeMessage(currentGrade);

  let scoreTrend: 'up' | 'down' | 'neutral' = 'neutral';
  let scoreDiff = 0;
  if (dailyScores.length >= 2) {
      const last = dailyScores[dailyScores.length - 1].score;
      const prev = dailyScores[dailyScores.length - 2].score;
      scoreDiff = last - prev;
      if (scoreDiff > 0) scoreTrend = 'up';
      else if (scoreDiff < 0) scoreTrend = 'down';
  }

  const getLineChartPath = (scores: { score: number }[]) => {
      if (scores.length < 2) return "";
      const width = 300; const height = 100;
      const points = scores.map((s, i) => {
          const x = (i / (scores.length - 1)) * width;
          const y = height - (s.score / 100) * height;
          return `${x},${y}`;
      }).join(' L ');
      return `M ${points}`;
  };

  const getGradeColor = (grade: string) => {
      if (grade.startsWith('A')) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      if (grade.startsWith('B')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      if (grade.startsWith('C')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  // DIAGNÓSTICO INTELIGENTE
  const getDiagnostics = () => {
    const diags = Array<{ type: 'warn' | 'positive', text: string }> = [];
    const total = tasks.length;
    if (total === 0) return diags;

    const postponed = tasks.filter(t => (t.postponedCount || 0) > 0).length;
    const failed = tasks.filter(t => t.isFailed).length;
    
    let early = 0;
    tasks.forEach(t => {
        if (t.isCompleted && t.completedAt && t.deadlineDate) {
            const compDate = format(new Date(t.completedAt), 'yyyy-MM-dd');
            if (compDate < t.deadlineDate) early++;
        }
    });

    if (postponed > total * 0.15) diags.push({ type: 'warn', text: 'Você tem o costume de adiar muitas tarefas. Cuidado com a inércia e procrastinação contínua.' });
    if (failed > total * 0.05) diags.push({ type: 'warn', text: 'Você tem deixado tarefas expirarem e falharem. Revise seus prazos de agendamento.' });
    
    if (currentScore >= 60) {
        if (early > total * 0.05) diags.push({ type: 'positive', text: 'Excelente antecipação! Você tem o ótimo costume de concluir as tarefas antes da data limite.' });
        if (activeStreak >= 7) diags.push({ type: 'positive', text: `Assiduidade fantástica. Você mantém uma ofensiva global ativa de ${activeStreak} dias no aplicativo!` });
    }

    return diags.slice(0, 3);
  };
  const diagnostics = getDiagnostics();

  const hasLocalState = !!viewerReflection || isCreatorOpen || !!infoModal || isModusModalOpen;
  useBackHandler(hasLocalState, () => {
      const tStore = useTaskStore.getState();
      const cStore = useConfigStore.getState();
      if (tStore.isGlobalModalOpen || tStore.isRoutineModalOpen || tStore.isFocusModeOpen || cStore.isSettingsOpen || cStore.isVisionOpen || cStore.isGoogleConnectOpen || cStore.isChangelogOpen || cStore.isExitModalOpen) return false;

      if (isModusModalOpen) { setModusModalOpen(false); return true; }
      if (infoModal) { setInfoModal(null); return true; }
      if (viewerReflection) { setViewerReflection(null); return true; }
      if (isCreatorOpen) { setIsCreatorOpen(false); setReflectionToEdit(null); return true; }
      return false;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 pb-32 transition-colors">
      <div className="max-w-4xl mx-auto px-6 md:px-8 pt-12 space-y-8">
        
        <header className="pb-4 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-start">
          <div><h1 className="text-3xl font-black tracking-tight flex items-center gap-3">Perfil</h1><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Acompanhe sua evolução.</p></div>
          <div className="flex items-center gap-2">
            {!isLocalMode && ( <button onClick={handleForceSync} disabled={isSyncing} className="p-2 px-4 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-2 disabled:opacity-50"><RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /><span className="hidden md:inline">Forçar Sinc.</span></button> )}
            <button onClick={() => setSettingsOpen(true)} className="p-2 px-4 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><Settings size={14} /><span className="hidden md:inline">Ajustes Globais</span></button>
          </div>
        </header>

        {/* TABS DE NAVEGAÇÃO */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900/80 p-1 rounded-2xl w-full mx-auto md:mx-0 shadow-inner max-w-sm">
           <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${activeTab === 'overview' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Visão Geral</button>
           <button onClick={() => setActiveTab('analytics')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${activeTab === 'analytics' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>LPI (Score)</button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                
                {/* IDENTIFICAÇÃO E NÍVEL */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-sm">
                   <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center border-4 border-blue-500/20 shrink-0">
                      <span className="text-4xl font-black text-blue-500">{level}</span>
                   </div>
                   <div className="flex-1 w-full text-center md:text-left space-y-4">
                      <div>
                         <h2 className="text-2xl font-black">{userName || 'Agente Desconhecido'}</h2>
                         <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-1">Classe: <span className="text-blue-500">{userClass || 'Não definida'}</span></p>
                      </div>
                      
                      <div className="space-y-2">
                         <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
                            <span>Progresso</span>
                            <span>{xp} / {xpRequired + currentLevelXp} XP</span>
                         </div>
                         <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className="h-full bg-blue-500 rounded-full" />
                         </div>
                      </div>
                   </div>
                </div>

                {/* REFLEXÕES */}
                <div>
                   <div className="flex items-center gap-2 mb-2 ml-1">
                     <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Reflexões</h3>
                     <button onClick={() => setInfoModal({title: 'Reflexões', desc: 'Sessões de cards dinâmicos para anotar insights profundos, regras pessoais ou pensamentos filosóficos.\n\nUse para cristalizar aprendizados e revisitá-los como um "flashcard" interativo de clareza mental.'})} className="text-zinc-400 hover:text-blue-500 transition-colors"><Info size={14}/></button>
                   </div>
                   <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide py-2">
                     <button onClick={() => { setReflectionToEdit(null); setIsCreatorOpen(true); }} className="shrink-0 w-[72px] h-[72px] rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                       <Plus size={28} />
                     </button>
                     {reflections.map(r => (
                       <button key={r.id} onClick={() => setViewerReflection(r)} className={`shrink-0 w-[72px] h-[72px] rounded-full border-[3px] flex flex-col items-center justify-center p-1.5 shadow-sm transition-transform hover:scale-105 ${colorMap[r.color]}`}>
                          <span className="text-[9px] font-black text-center leading-tight line-clamp-2">{r.title}</span>
                       </button>
                     ))}
                   </div>
                </div>

                {/* MODUS OPERANDI */}
                {activeModus && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/30 p-5 md:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${activeModus.bg} ${activeModus.color} shrink-0`}>
                                <activeModus.icon size={28} />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-0.5">Modus Operandi</span>
                                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-tight">{activeModus.label}</h3>
                            </div>
                        </div>
                        {inventory.changeModus > 0 ? (
                            <button onClick={() => setModusModalOpen(true)} className="w-full md:w-auto px-5 py-3 bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold rounded-xl border border-pink-500/20 hover:bg-pink-500/20 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm">
                                <UserCog size={18} /> Mudar (Tem {inventory.changeModus})
                            </button>
                        ) : (
                            <button disabled className="w-full md:w-auto px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-not-allowed flex items-center justify-center gap-2 text-sm">
                                <UserCog size={18} /> Bloqueado na Loja
                            </button>
                        )}
                    </div>
                )}

                {isLocalMode && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                     <div><h3 className="text-blue-600 dark:text-blue-400 font-black text-lg tracking-tight">Modo Local Ativo</h3><p className="text-sm text-blue-600/80 dark:text-blue-400/80 font-medium mt-1">Seus dados estão apenas neste navegador. Conecte-se para protegê-los com criptografia de ponta a ponta na nuvem.</p></div>
                     <button onClick={() => setGoogleConnectOpen(true)} className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors shrink-0 shadow-lg shadow-blue-500/20">Conectar ao Google</button>
                  </div>
                )}

                <button onClick={() => setVisionOpen(true)} className="w-full relative p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/50 flex flex-col md:flex-row items-start md:items-center gap-6 overflow-hidden hover:border-blue-500/50 transition-colors group shadow-sm text-left">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-50/50 dark:to-zinc-950/50 pointer-events-none" />
                  <div className="p-4 bg-zinc-200 dark:bg-zinc-800 rounded-2xl group-hover:bg-blue-500/10 transition-colors shrink-0"><Eye size={32} className="text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500 transition-colors" /></div>
                  <div className="flex-1"><div className="flex flex-wrap items-center gap-3 mb-1"><h3 className="text-xl font-black text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors tracking-tight">Visão de Vida</h3><span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest rounded-full">Acessar</span></div><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Quem você <b>quer</b> ser? O que precisa deixar pra trás?</p></div>
                </button>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-3xl flex flex-col justify-between"><Flame size={24} className="text-orange-500 mb-3" /><span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-1">Ofensiva Global</span><span className="text-3xl font-black text-orange-500">{activeStreak} dias</span></div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-5 rounded-3xl flex flex-col justify-between"><Coins size={24} className="text-yellow-600 dark:text-yellow-500 mb-3" /><span className="text-[10px] font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-400 mb-1">Ouro Acumulado</span><span className="text-3xl font-black text-yellow-600 dark:text-yellow-500">{gold}</span></div>
                  <div className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-3xl flex flex-col justify-between"><Star size={24} className="text-purple-500 mb-3" /><span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1">XP Total</span><span className="text-3xl font-black text-purple-500">{xp}</span></div>
                  <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-3xl flex flex-col justify-between relative overflow-hidden"><CheckCircle2 size={24} className="text-blue-500 mb-3" /><span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">Concluídas Hoje</span><div className="flex items-baseline gap-2"><span className="text-3xl font-black text-blue-500">{todayTasksCount}</span><span className={`text-xs font-bold flex items-center ${tasksDiff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{tasksDiff > 0 ? <TrendingUp size={12}/> : tasksDiff < 0 ? <TrendingUp size={12} className="rotate-180"/> : ''} {Math.abs(tasksDiff)} vs ontem</span></div></div>
                </div>

                <div className="p-5 md:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 overflow-hidden shadow-sm">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <h3 className="font-bold uppercase tracking-widest text-xs text-zinc-500 flex items-center gap-2"><Activity size={16}/> Resumo Analítico</h3>
                    <div className="flex p-1 bg-zinc-200 dark:bg-zinc-800/80 rounded-xl w-full md:w-auto">
                      <button onClick={() => setGridMode('perfect')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${gridMode === 'perfect' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>Dias Perfeitos</button>
                      <button onClick={() => setGridMode('habits')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${gridMode === 'habits' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>Hábitos</button>
                      <button onClick={() => setGridMode('mood')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${gridMode === 'mood' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>Humor</button>
                    </div>
                  </div>
                  <div className="flex gap-1 md:gap-1.5 overflow-x-auto scrollbar-hide pb-2 justify-end">{generateGlobalGrid()}</div>
                  <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-4 justify-end"><Info size={12}/> Visualize métricas de foco, consistência ou nível de humor</div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><Medal size={120} /></div>
                  <div className="relative z-10">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-6">Jornada de Desbloqueios</h3>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 relative w-full">
                        <div className="absolute top-5 left-0 h-1 bg-zinc-200 dark:bg-zinc-800 w-[800px] z-0" />
                        {milestones.map((m) => {
                            const isReached = level >= m.level;
                            return (
                            <div key={m.level} className="relative z-10 flex flex-col items-center shrink-0 w-[72px] gap-3">
                                <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center shadow-sm transition-colors duration-500 ${isReached ? 'border-blue-500 bg-white dark:bg-zinc-900 text-blue-500' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 text-zinc-300 dark:text-zinc-700'}`}>
                                    <m.icon size={16} />
                                </div>
                                <div className="text-center">
                                    <span className={`block text-[9px] font-black uppercase tracking-widest ${isReached ? 'text-blue-500' : 'text-zinc-400 dark:text-zinc-600'}`}>Nível {m.level}</span>
                                    <span className={`block text-[10px] font-bold leading-tight mt-0.5 ${isReached ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600'}`}>{m.label}</span>
                                </div>
                            </div>
                            )
                        })}
                    </div>
                  </div>
                </div>

                {/* MENU DE AÇÕES MENORES */}
                <div>
                   <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 ml-1">Sistema & Dados</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <button onClick={() => setGoogleConnectOpen(true)} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 hover:border-emerald-500 transition-colors group text-left">
                           <div className="p-3 bg-zinc-200 dark:bg-zinc-800 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors"><CloudCog size={20}/></div>
                           <div><h4 className="font-bold">Nuvem E2EE</h4><p className="text-xs text-zinc-500 mt-0.5">Sincronização ponta-a-ponta.</p></div>
                       </button>

                       <button onClick={() => setChangelogOpen(true)} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 hover:border-amber-500 transition-colors group text-left">
                           <div className="p-3 bg-zinc-200 dark:bg-zinc-800 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors"><ScrollText size={20}/></div>
                           <div><h4 className="font-bold">Changelog</h4><p className="text-xs text-zinc-500 mt-0.5">Últimas atualizações do Lida.</p></div>
                       </button>
                   </div>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-center">
                    <button onClick={() => setExitModalOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-500 font-bold text-sm hover:bg-red-500/20 transition-colors">
                       <LogOut size={16}/> Sair / Resetar Dados
                    </button>
                </div>
            </motion.div>
          ) : (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                
                {/* LPI MÊS ATUAL */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                       <div>
                          <div className="flex items-center gap-3">
                              <h2 className="text-2xl font-black flex items-center gap-2"><BarChart3 className="text-blue-500"/> Lida Productivity Index</h2>
                              <button onClick={() => setInfoModal({ title: 'Como funciona o LPI?', desc: 'O LPI é um algoritmo que converte a sua consistência em uma nota rigorosa, equilibrada diariamente.\n\n• Tarefas mais difíceis (P0/P1) garantem mais pontos ao serem concluídas.\n• Adiar ou atrasar tarefas subtrai pontos e sabota sua nota.\n• Hábitos concluídos são cruciais, pois formam a base da consistência (+3 pontos), enquanto o esquecimento deles gera punições (-2 pontos).\n• Ser produtivo nos Dias de Folga gera grandes recompensas.' })} className="p-1 rounded-full text-zinc-400 hover:text-blue-500 transition-colors"><Info size={18} /></button>
                          </div>
                          <p className="text-sm text-zinc-500 mt-1 font-medium">Mês Atual: {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</p>
                       </div>
                       
                       <div className={`flex items-center gap-4 p-4 rounded-2xl border ${getGradeColor(currentGrade)}`}>
                           <div className="text-center">
                              <span className="text-[10px] uppercase tracking-widest font-bold opacity-70 block mb-1">Nota Atual</span>
                              <span className="text-4xl font-black leading-none">{currentGrade}</span>
                           </div>
                           <div className="w-px h-10 bg-current opacity-20" />
                           <div className="text-center">
                              <span className="text-[10px] uppercase tracking-widest font-bold opacity-70 block mb-1">Tendência</span>
                              <div className="flex items-center gap-1 font-black text-lg justify-center">
                                 {scoreTrend === 'up' ? <TrendingUp size={18}/> : scoreTrend === 'down' ? <TrendingDown size={18}/> : <Minus size={18}/>}
                                 {scoreDiff > 0 ? '+' : ''}{scoreDiff !== 0 ? scoreDiff : '='}
                              </div>
                           </div>
                       </div>
                    </div>

                    <div className="bg-white dark:bg-black p-4 rounded-2xl shadow-inner border border-zinc-100 dark:border-zinc-800">
                        <p className="text-sm italic font-medium text-zinc-600 dark:text-zinc-400 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">"{gradeMessage}"</p>
                        
                        {/* DIAGNÓSTICOS INTELIGENTES */}
                        {diagnostics.length > 0 ? (
                            <div className="space-y-2">
                                {diagnostics.map((diag, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs font-bold leading-relaxed">
                                        {diag.type === 'warn' ? <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" /> : <Sparkles size={14} className="text-emerald-500 shrink-0 mt-0.5" />}
                                        <span className={diag.type === 'warn' ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}>{diag.text}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sem Diagnósticos para Exibir</span>
                        )}
                    </div>

                    {/* Gráfico Linear Dinâmico */}
                    {dailyScores.length > 1 ? (
                        <div className="h-40 w-full relative mt-6">
                            <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                <path d={getLineChartPath(dailyScores)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500" />
                                {dailyScores.map((s, i) => {
                                    const x = (i / (dailyScores.length - 1 || 1)) * 300;
                                    const y = 100 - (s.score / 100) * 100;
                                    return <circle key={i} cx={x} cy={y} r="4" className="fill-white dark:fill-black stroke-blue-500 stroke-[2px]" />
                                })}
                            </svg>
                        </div>
                    ) : (
                        <div className="h-40 w-full flex items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-sm font-bold mt-6">
                            Poucos dados para gerar o gráfico este mês.
                        </div>
                    )}
                </div>

                {/* HISTÓRICO ARQUIVADO */}
                <div>
                   <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 ml-1 flex items-center gap-2"><Calendar size={14}/> Arquivo de LPI</h3>
                   {monthlyArchives.length === 0 ? (
                       <div className="text-center p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-sm font-bold">
                           Você ainda não concluiu um mês inteiro no Lida.
                       </div>
                   ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {monthlyArchives.slice().reverse().map(archive => (
                               <div key={archive.month} className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
                                   <div>
                                       <h4 className="font-bold capitalize">{format(new Date(archive.month + '-02T12:00:00'), "MMMM 'de' yyyy", { locale: ptBR })}</h4>
                                       <p className="text-xs text-zinc-500 mt-1">Score Final: <b>{archive.finalScore}/100</b></p>
                                   </div>
                                   <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2 ${getGradeColor(archive.grade)}`}>
                                       {archive.grade}
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
                </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
      
      <VisionModal isOpen={isVisionOpen} onClose={() => setVisionOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      <GoogleConnectModal isOpen={isGoogleConnectOpen} onClose={() => setGoogleConnectOpen(false)} onSuccess={() => { setGoogleConnectOpen(false); showToast("Conta conectada com sucesso!"); }} />
      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setChangelogOpen(false)} />

      <ReflectionCreatorModal isOpen={isCreatorOpen} onClose={() => setIsCreatorOpen(false)} reflectionToEdit={reflectionToEdit} />
      <ReflectionViewerModal reflection={viewerReflection} onClose={() => setViewerReflection(null)} onEdit={() => { setViewerReflection(null); setReflectionToEdit(viewerReflection); setIsCreatorOpen(true); }} />

      {/* MODAL DE TROCA DE MODUS */}
      <AnimatePresence>
        {isModusModalOpen && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative">
                    <button onClick={() => setModusModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition-colors"><X size={20}/></button>
                    <div className="text-center mb-8">
                        <UserCog size={48} className="mx-auto text-pink-500 mb-4" />
                        <h2 className="text-2xl font-black">Nova Filosofia</h2>
                        <p className="text-zinc-500 mt-2 text-sm">Escolha seu novo Modus Operandi. Esta ação consumirá 1 Troca de Modus.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => handleChangeModus('multitask')} className="flex flex-col items-start text-left p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all group">
                           <div className="p-3 rounded-xl bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 mb-3 group-hover:scale-110 group-hover:text-pink-500 transition-transform shadow-sm"><Zap size={24} /></div>
                           <h3 className="text-lg font-black tracking-tight mb-1">Multitarefa</h3>
                           <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">Ganha bônus por quantidade de tarefas finalizadas.</p>
                        </button>
                        <button onClick={() => handleChangeModus('minimalist')} className="flex flex-col items-start text-left p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all group">
                           <div className="p-3 rounded-xl bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 mb-3 group-hover:scale-110 group-hover:text-pink-500 transition-transform shadow-sm"><Shield size={24} /></div>
                           <h3 className="text-lg font-black tracking-tight mb-1">Minimalista</h3>
                           <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">Ganha bônus focado apenas em tarefas essenciais (P0 e P1).</p>
                        </button>
                        <button onClick={() => handleChangeModus('punctual')} className="flex flex-col items-start text-left p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all group">
                           <div className="p-3 rounded-xl bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 mb-3 group-hover:scale-110 group-hover:text-pink-500 transition-transform shadow-sm"><Clock size={24} /></div>
                           <h3 className="text-lg font-black tracking-tight mb-1">Pontual</h3>
                           <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">Bônus gigantesco por respeitar horários e prazos definidos.</p>
                        </button>
                        <button onClick={() => handleChangeModus('ambitious')} className="flex flex-col items-start text-left p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all group">
                           <div className="p-3 rounded-xl bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 mb-3 group-hover:scale-110 group-hover:text-pink-500 transition-transform shadow-sm"><Target size={24} /></div>
                           <h3 className="text-lg font-black tracking-tight mb-1">Ambicioso</h3>
                           <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">Multiplicador aumenta drasticamente ao finalizar Sprints.</p>
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 left-1/2 -translate-x-1/2 z-[3000] px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] font-bold text-sm tracking-wide border ${toastMessage.type === 'error' ? 'bg-red-500 text-white border-red-600' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-zinc-800 dark:border-zinc-200'}`}>
            {toastMessage.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* INFO MODAL */}
      <AnimatePresence>
        {infoModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center relative">
              <button onClick={(e) => { e.stopPropagation(); setInfoModal(null); }} className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition-colors"><X size={20} /></button>
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><Info size={32} /></div>
              <h3 className="text-xl font-black mb-4 dark:text-white">{infoModal.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed whitespace-pre-line text-left">
                 {infoModal.desc}
              </p>
              <button onClick={() => setInfoModal(null)} className="w-full mt-8 p-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors">Entendi</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
