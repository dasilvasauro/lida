import { motion } from 'framer-motion';
import { Flame, Edit2, Trash2 } from 'lucide-react';
import type { Habit } from '../../types';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HabitItemProps {
    habit: Habit;
    logs: Record<string, number>; // Agora recebe o dicionário de contagens
    onLogChange: (habitId: string, date: string, newCount: number, isCompleting: boolean, currentStreak: number) => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const HabitItem = ({ habit, logs, onLogChange, onEdit, onDelete }: HabitItemProps) => {
    const today = new Date();
    const goal = habit.goal || 1;

    // Gera os últimos 7 dias para a minigrade
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(today, 6 - i);
        return { dateObj: d, dateStr: format(d, 'yyyy-MM-dd') };
    });

    // Calcula o Streak (Só considera concluído se count >= goal)
    const calculateStreak = () => {
        let streak = 0;
        let checkDate = new Date();

        const todayStr = format(checkDate, 'yyyy-MM-dd');
        const yesterdayStr = format(subDays(checkDate, 1), 'yyyy-MM-dd');

        // Verifica se quebrou o streak (não fez nem hoje nem ontem)
        if ((logs[todayStr] || 0) < goal && (logs[yesterdayStr] || 0) < goal) return 0;

        // Se não fez hoje, começa a contar de ontem
        if ((logs[todayStr] || 0) < goal) checkDate = subDays(checkDate, 1);

        while ((logs[format(checkDate, 'yyyy-MM-dd')] || 0) >= goal) {
            streak++;
            checkDate = subDays(checkDate, 1);
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
        {goal > 1 && (
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Meta: {goal}/dia</span>
        )}
        </div>
        </div>

        {/* Minigrade de 7 Dias */}
        <div className="flex justify-between gap-1 mb-4">
        {last7Days.map(({ dateObj, dateStr }) => {
            const count = logs[dateStr] || 0;
            const isCompleted = count >= goal;
            const inProgress = count > 0 && count < goal;
            const isToday = dateStr === format(today, 'yyyy-MM-dd');

            // Função de Clique inteligente
            const handleCellClick = () => {
                let newCount = count + 1;
                if (count >= goal) newCount = 0; // Reseta ao chegar no limite e clicar de novo
                const isCompleting = newCount === goal;
                onLogChange(habit.id, dateStr, newCount, isCompleting, streak);
            };

            return (
                <button
                key={dateStr}
                onClick={handleCellClick}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl border transition-all ${
                    isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : inProgress
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : isToday
                    ? 'bg-zinc-100 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100'
                    : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-950 dark:border-zinc-900 text-zinc-400 dark:text-zinc-600'
                }`}
                >
                {inProgress ? (
                    <>
                    <span className="text-[10px] uppercase font-bold mb-1 opacity-60">Pend.</span>
                    <span className="text-xs font-black">{count}/{goal}</span>
                    </>
                ) : (
                    <>
                    <span className={`text-[10px] uppercase font-bold mb-1 ${isCompleted ? 'text-emerald-100' : ''}`}>{format(dateObj, 'EE', { locale: ptBR }).slice(0,3)}</span>
                    <span className="text-xs font-black">{format(dateObj, 'd')}</span>
                    </>
                )}
                </button>
            );
        })}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><Edit2 size={14} /></button>
        <button onClick={onDelete} className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
        </div>
        </motion.div>
    );
};
