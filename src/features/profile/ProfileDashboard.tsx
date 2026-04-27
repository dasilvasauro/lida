import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Coins, Flame, CheckCircle2, TrendingUp, Eye, Medal, Info, Activity } from 'lucide-react';
import { useEconomyStore } from '../../store/useEconomyStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { format, subDays, startOfWeek, addDays, isSameDay } from 'date-fns';
import type { Mood } from '../../types';
import { VisionModal } from '../vision/VisionModal';

export const ProfileDashboard = () => {
  const { xp, level, gold } = useEconomyStore();
  const { tasks, moodHistory } = useTaskStore();
  const { habits, logs, modifiers } = useHabitStore();

  const [gridMode, setGridMode] = useState<'perfect' | 'habits' | 'mood'>('perfect');
  const [isVisionOpen, setIsVisionOpen] = useState(false);

  // --- CÁLCULOS DE XP ---
  const currentLevelXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const xpProgress = xp - currentLevelXp;
  const xpRequired = nextLevelXp - currentLevelXp;
  const percentage = Math.min(100, Math.max(0, (xpProgress / xpRequired) * 100));

  // --- CÁLCULOS DE ESTATÍSTICAS ---
  const today = new Date();
  const yesterday = subDays(today, 1);
  
  const todayTasksCount = tasks.filter(t => t.isCompleted && t.completedAt && isSameDay(new Date(t.completedAt), today)).length;
  const yesterdayTasksCount = tasks.filter(t => t.isCompleted && t.completedAt && isSameDay(new Date(t.completedAt), yesterday)).length;
  const tasksDiff = todayTasksCount - yesterdayTasksCount;

  const calculateActiveStreak = () => {
    let streak = 0;
    let checkDate = today;
    
    while (true) {
       const dStr = format(checkDate, 'yyyy-MM-dd');
       const hasTask = tasks.some(t => t.isCompleted && t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === dStr);
       let hasHabit = false;
       habits.forEach(h => { if ((logs[h.id]?.[dStr] || 0) >= (h.goal || 1) || modifiers[h.id]?.[dStr]) hasHabit = true; });

       if (hasTask || hasHabit) {
           streak++;
           checkDate = subDays(checkDate, 1);
       } else {
           if (isSameDay(checkDate, today)) checkDate = subDays(checkDate, 1);
           else break;
       }
    }
    return streak;
  };

  const activeStreak = calculateActiveStreak();

  // --- LÓGICA DO GRID GITHUB ---
  const isPerfectDay = (dateStr: string) => {
    const tasksDue = tasks.filter(t => t.deadlineDate === dateStr);
    const tasksCompleted = tasksDue.every(t => t.isCompleted);
    const hasTasks = tasksDue.length > 0;

    const activeHabits = habits.filter(h => format(new Date(h.createdAt), 'yyyy-MM-dd') <= dateStr);
    const habitsCompleted = activeHabits.length > 0 && activeHabits.every(h => {
      return (logs[h.id]?.[dateStr] || 0) >= (h.goal || 1) || modifiers[h.id]?.[dateStr];
    });
    const hasHabits = activeHabits.length > 0;

    if (!hasTasks && !hasHabits) return false; 
    return (hasTasks ? tasksCompleted : true) && (hasHabits ? habitsCompleted : true);
  };

  const getMoodColor = (mood: Mood | undefined) => {
    switch(mood) {
      case 'radiant': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
      case 'happy': return 'bg-teal-400';
      case 'normal': return 'bg-yellow-400';
      case 'annoyed': return 'bg-orange-500';
      case 'disappointed': return 'bg-red-500';
      default: return 'bg-zinc-200 dark:bg-zinc-800/50';
    }
  };

  const getHabitsColor = (dateStr: string) => {
    let count = 0;
    habits.forEach(h => { if ((logs[h.id]?.[dateStr] || 0) >= (h.goal || 1) || modifiers[h.id]?.[dateStr]) count++; });
    if (count === 1) return 'bg-emerald-300 dark:bg-emerald-900/60';
    if (count === 2) return 'bg-emerald-400 dark:bg-emerald-700/80';
    if (count >= 3) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
    return 'bg-zinc-200 dark:bg-zinc-800/50';
  };

  const generateGlobalGrid = () => {
    const start = startOfWeek(subDays(today, 84));
    const weeks = [];
    let current = start;

    while (current <= today) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        if (current > today) break;
        const dStr = format(current, 'yyyy-MM-dd');
        
        let colorClass = 'bg-zinc-200 dark:bg-zinc-800/50';
        if (gridMode === 'mood') colorClass = getMoodColor(moodHistory[dStr]);
        else if (gridMode === 'perfect' && isPerfectDay(dStr)) colorClass = 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]';
        else if (gridMode === 'habits') colorClass = getHabitsColor(dStr);

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
        
        <header className="pb-6 border-b border-zinc-100 dark:border-zinc-900">
          <h1 className="text-3xl font-black tracking-tight">Perfil de Agente</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Seu progresso e evolução ao longo do tempo.</p>
        </header>

        {/* VISÃO (INTERATIVO) - REPOSICIONADO PARA O TOPO E MENOR */}
        <button onClick={() => setIsVisionOpen(true)} className="w-full relative p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/50 flex flex-col md:flex-row items-start md:items-center gap-6 overflow-hidden hover:border-blue-500/50 transition-colors group shadow-sm text-left">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-50/50 dark:to-zinc-950/50 pointer-events-none" />
          <div className="p-4 bg-zinc-200 dark:bg-zinc-800 rounded-2xl group-hover:bg-blue-500/10 transition-colors shrink-0">
            <Eye size={32} className="text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h3 className="text-xl font-black text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors tracking-tight">Módulo Visão</h3>
              <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest rounded-full">Acessar</span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Seu plano mestre de longo prazo. Metas, características e o propósito da sua jornada.
            </p>
          </div>
        </button>

        {/* BARRA DE EXPERIÊNCIA E NÍVEL */}
        <div className="bg-zinc-50 dark:bg-zinc-900/30 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Medal size={120} /></div>
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-4">
              <div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nível Atual</span>
                <div className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Lvl. {level}</div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">XP Restante</span>
                <div className="text-xl font-black text-zinc-400">{xpRequired - xpProgress} XP</div>
              </div>
            </div>
            <div className="w-full h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-2 shadow-inner">
              <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" />
            </div>
            <div className="flex justify-between text-xs font-bold text-zinc-400">
              <span>{currentLevelXp} XP</span>
              <span>{nextLevelXp} XP</span>
            </div>
          </div>
        </div>

        {/* CARDS DE ESTATÍSTICAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-3xl flex flex-col justify-between">
            <Flame size={24} className="text-orange-500 mb-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-1">Ofensiva Global</span>
            <span className="text-3xl font-black text-orange-500">{activeStreak} dias</span>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 p-5 rounded-3xl flex flex-col justify-between">
            <Coins size={24} className="text-yellow-600 dark:text-yellow-500 mb-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-400 mb-1">Ouro Acumulado</span>
            <span className="text-3xl font-black text-yellow-600 dark:text-yellow-500">{gold}</span>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-3xl flex flex-col justify-between">
            <Star size={24} className="text-purple-500 mb-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1">XP Total</span>
            <span className="text-3xl font-black text-purple-500">{xp}</span>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-3xl flex flex-col justify-between relative overflow-hidden">
            <CheckCircle2 size={24} className="text-blue-500 mb-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">Feitas Hoje</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-500">{todayTasksCount}</span>
              <span className={`text-xs font-bold flex items-center ${tasksDiff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {tasksDiff > 0 ? <TrendingUp size={12}/> : tasksDiff < 0 ? <TrendingUp size={12} className="rotate-180"/> : ''} 
                {Math.abs(tasksDiff)} vs ontem
              </span>
            </div>
          </div>
        </div>

        {/* GRID GITHUB GLOBAL */}
        <div className="p-5 md:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 overflow-hidden shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <h3 className="font-bold uppercase tracking-widest text-xs text-zinc-500 flex items-center gap-2"><Activity size={16}/> Histórico Analítico</h3>
            
            <div className="flex p-1 bg-zinc-200 dark:bg-zinc-800/80 rounded-xl w-full md:w-auto">
              <button onClick={() => setGridMode('perfect')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${gridMode === 'perfect' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>Dias Perfeitos</button>
              <button onClick={() => setGridMode('habits')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${gridMode === 'habits' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>Hábitos</button>
              <button onClick={() => setGridMode('mood')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${gridMode === 'mood' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>Humor</button>
            </div>
          </div>
          
          <div className="flex gap-1 md:gap-1.5 overflow-x-auto scrollbar-hide pb-2 justify-end">
            {generateGlobalGrid()}
          </div>
          
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-4 justify-end">
            <Info size={12}/> Modos mostram métricas de foco, consistência ou estado de espírito
          </div>
        </div>

      </div>
      
      <VisionModal isOpen={isVisionOpen} onClose={() => setIsVisionOpen(false)} />
    </div>
  );
};