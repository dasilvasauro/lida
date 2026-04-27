import { motion } from 'framer-motion';
import { Flame, Edit2, Trash2, Snowflake, Coffee } from 'lucide-react';
import type { Habit } from '../../types';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEconomyStore } from '../../store/useEconomyStore';

interface HabitItemProps {
  habit: Habit;
  logs: Record<string, number>;
  modifiers: Record<string, 'freeze' | 'dayOff'>;
  onLogChange: (habitId: string, date: string, newCount: number, isCompleting: boolean, currentStreak: number) => void;
  onApplyModifier: (habitId: string, date: string, type: 'freeze'|'dayOff') => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const HabitItem = ({ habit, logs, modifiers, onLogChange, onApplyModifier, onEdit, onDelete }: HabitItemProps) => {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const goal = habit.goal || 1;
  const inventory = useEconomyStore((state) => state.inventory);
  const useItem = useEconomyStore((state) => state.useItem);
  
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    return { dateObj: d, dateStr: format(d, 'yyyy-MM-dd') };
  });

  const calculateStreak = () => {
    let streak = 0; let checkDate = new Date();
    const tStr = format(checkDate, 'yyyy-MM-dd'); const yStr = format(subDays(checkDate, 1), 'yyyy-MM-dd');
    const isCompleted = (date: string) => (logs[date] || 0) >= goal || modifiers[date] !== undefined;

    if (!isCompleted(tStr) && !isCompleted(yStr)) return 0;
    if (!isCompleted(tStr)) checkDate = subDays(checkDate, 1);

    while (isCompleted(format(checkDate, 'yyyy-MM-dd'))) {
      streak++; checkDate = subDays(checkDate, 1);
    }
    return streak;
  };

  const streak = calculateStreak();
  const isHot = streak >= 3;

  return (
    <motion.div layout className="flex flex-col p-5 mb-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{habit.title}</h4>
          {habit.description && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{habit.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-sm transition-colors ${isHot ? 'bg-orange-500/10 text-orange-500' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
            <Flame size={16} className={isHot ? 'animate-pulse' : ''} /> {streak}
          </div>
          {goal > 1 && <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Meta: {goal}/dia</span>}
        </div>
      </div>

      <div className="flex justify-between gap-1 mb-4">
        {last7Days.map(({ dateObj, dateStr }) => {
          const count = logs[dateStr] || 0;
          const modifier = modifiers[dateStr];
          const isCompleted = count >= goal;
          const inProgress = count > 0 && count < goal;
          const isToday = dateStr === todayStr;

          const handleCellClick = () => {
            if (modifier) return;
            let newCount = count + 1;
            if (count >= goal) newCount = 0;
            onLogChange(habit.id, dateStr, newCount, newCount === goal, streak);
          };

          let btnClass = isToday ? 'bg-zinc-100 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100' : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-950 dark:border-zinc-900 text-zinc-400 dark:text-zinc-600';
          
          if (modifier === 'freeze') btnClass = 'bg-cyan-500 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]';
          else if (modifier === 'dayOff') btnClass = 'bg-amber-500 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]';
          else if (isCompleted) btnClass = 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]';
          else if (inProgress) btnClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';

          return (
            <button key={dateStr} onClick={handleCellClick} className={`relative flex-1 flex flex-col items-center justify-center py-2 rounded-xl border transition-all overflow-hidden ${btnClass}`}>
              {modifier === 'freeze' ? <Snowflake size={20} className="my-1 animate-pulse" /> : 
               modifier === 'dayOff' ? <Coffee size={20} className="my-1 animate-pulse" /> : 
               inProgress ? (<><span className="text-[10px] uppercase font-bold mb-1 opacity-60">Pend.</span><span className="text-xs font-black">{count}/{goal}</span></>) : 
               (<><span className={`text-[10px] uppercase font-bold mb-1 ${isCompleted ? 'text-emerald-100' : ''}`}>{format(dateObj, 'EE', { locale: ptBR }).slice(0,3)}</span><span className="text-xs font-black">{format(dateObj, 'd')}</span></>)}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
        {inventory.freeze > 0 && !modifiers[todayStr] && (logs[todayStr] || 0) < goal && (
           <button onClick={() => { if(useItem('freeze')) onApplyModifier(habit.id, todayStr, 'freeze'); }} className="p-2 rounded-lg text-cyan-500 hover:bg-cyan-500/10 transition-colors flex items-center gap-1 text-xs font-bold"><Snowflake size={14} /> Usar Congelamento</button>
        )}
        <button onClick={onEdit} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><Edit2 size={14} /></button>
        <button onClick={onDelete} className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
      </div>
    </motion.div>
  );
};