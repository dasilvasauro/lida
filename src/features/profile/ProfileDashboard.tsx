import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Coins, Flame, CheckCircle2, TrendingUp, Eye, Medal, Info, Activity, RefreshCw, Settings, Plus } from 'lucide-react';
import { useEconomyStore } from '../../store/useEconomyStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useConfigStore } from '../../store/useConfigStore';
import { useReflectionStore } from '../../store/useReflectionStore';
import { format, subDays, startOfWeek, addDays, isSameDay } from 'date-fns';
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

export const ProfileDashboard = () => {
  const { xp, level, gold } = useEconomyStore();
  const { tasks, moodHistory } = useTaskStore();
  const { habits, logs, modifiers } = useHabitStore();
  const { uid, e2eePin, isLocalMode, defaultDaysOff } = useConfigStore();
  const { reflections } = useReflectionStore();

  const { isVisionOpen, setVisionOpen, isSettingsOpen, setSettingsOpen, isGoogleConnectOpen, setGoogleConnectOpen, isChangelogOpen, setChangelogOpen } = useConfigStore();
  const [gridMode, setGridMode] = useState<'perfect' | 'habits' | 'mood'>('perfect');

  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [reflectionToEdit, setReflectionToEdit] = useState<Reflection | null>(null);
  const [viewerReflection, setViewerReflection] = useState<Reflection | null>(null);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };

  const handleForceSync = async () => {
    if (!uid || !e2eePin || !navigator.onLine) return showToast("Não foi possível sincronizar. Verifique a rede.");
    setIsSyncing(true);
    try { await syncToCloud(); await syncFromCloud(uid, e2eePin); showToast("Sincronização realizada com sucesso!"); } 
    catch (e) { showToast("Erro ao sincronizar dados."); } 
    finally { setIsSyncing(false); }
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
           checkDate = subDays(checkDate, 1); // Dia de folga = Pula o dia sem quebrar
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

  const getMoodColor = (mood: Mood | undefined) => {
    switch(mood) { case 'radiant': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'; case 'happy': return 'bg-teal-400'; case 'normal': return 'bg-yellow-400'; case 'annoyed': return 'bg-orange-500'; case 'disappointed': return 'bg-red-500'; default: return 'bg-zinc-200 dark:bg-zinc-800/50'; }
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
        if (gridMode === 'mood') colorClass = getMoodColor(moodHistory[dStr]); else if (gridMode === 'perfect' && isPerfectDay(dStr)) colorClass = 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]'; else if (gridMode === 'habits') colorClass = getHabitsColor(dStr);
        week.push(<div key={dStr} title={dStr} className={`w-3 h-3 md:w-4 md:h-4 rounded-[3px] md:rounded-sm transition-colors ${colorClass}`} />);
        current = addDays(current, 1);
      }
      weeks.push(<div key={current.toString()} className="flex flex-col gap-1 md:gap-1.5">{week}</div>);
    }
    return weeks;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 pb-32 transition-colors">
      <div className="max-w-4xl mx-auto px-6 md:px-8 pt-12 space-y-8">
        
        <header className="pb-4 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-start">
          <div><h1 className="text-3xl font-black tracking-tight">Perfil</h1><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Acompanhe sua evolução.</p></div>
          <div className="flex items-center gap-2">
            {!isLocalMode && ( <button onClick={handleForceSync} disabled={isSyncing} className="p-2 px-4 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-2 disabled:opacity-50"><RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /><span className="hidden md:inline">Forçar Sinc.</span></button> )}
            <button onClick={() => setSettingsOpen(true)} className="p-2 px-4 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><Settings size={14} /><span className="hidden md:inline">Ajustes</span></button>
          </div>
        </header>

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

        {isLocalMode && (
          <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
             <div><h3 className="text-blue-600 dark:text-blue-400 font-black text-lg tracking-tight">Modo Local Ativo</h3><p className="text-sm text-blue-600/80 dark:text-blue-400/80 font-medium mt-1">Seus dados estão apenas neste navegador. Conecte-se para protegê-los com criptografia de ponta a ponta na nuvem.</p></div>
             <button onClick={() => setGoogleConnectOpen(true)} className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors shrink-0 shadow-lg shadow-blue-500/20">Conectar ao Google</button>
          </div>
        )}

        <button onClick={() => setVisionOpen(true)} className="w-full relative p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/50 flex flex-col md:flex-row items-start md:items-center gap-6 overflow-hidden hover:border-blue-500/50 transition-colors group shadow-sm text-left">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-50/50 dark:to-zinc-950/50 pointer-events-none" />
          <div className="p-4 bg-zinc-200 dark:bg-zinc-800 rounded-2xl group-hover:bg-blue-500/10 transition-colors shrink-0"><Eye size={32} className="text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500 transition-colors" /></div>
          <div className="flex-1"><div className="flex flex-wrap items-center gap-3 mb-1"><h3 className="text-xl font-black text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors tracking-tight">Visão</h3><span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest rounded-full">Acessar</span></div><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Quem você <b>quer</b> ser? O que precisa deixar pra trás?</p></div>
        </button>

        <div className="bg-zinc-50 dark:bg-zinc-900/30 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Medal size={120} /></div>
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-4">
              <div><span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nível Atual</span><div className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Lvl. {level}</div></div>
              <div className="text-right"><span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">XP Restante</span><div className="text-xl font-black text-zinc-400">{xpRequired - xpProgress} XP</div></div>
            </div>
            <div className="w-full h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-2 shadow-inner"><motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" /></div>
            <div className="flex justify-between text-xs font-bold text-zinc-400"><span>{currentLevelXp} XP</span><span>{nextLevelXp} XP</span></div>
          </div>
        </div>

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

      </div>
      
      <VisionModal isOpen={isVisionOpen} onClose={() => setVisionOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      <GoogleConnectModal isOpen={isGoogleConnectOpen} onClose={() => setGoogleConnectOpen(false)} onSuccess={() => { setGoogleConnectOpen(false); showToast("Conta conectada com sucesso!"); }} />
      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setChangelogOpen(false)} />

      <ReflectionCreatorModal isOpen={isCreatorOpen} onClose={() => setIsCreatorOpen(false)} reflectionToEdit={reflectionToEdit} />
      <ReflectionViewerModal reflection={viewerReflection} onClose={() => setViewerReflection(null)} onEdit={() => { setViewerReflection(null); setReflectionToEdit(viewerReflection); setIsCreatorOpen(true); }} />

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] font-bold text-sm tracking-wide border border-zinc-800 dark:border-zinc-200">
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};