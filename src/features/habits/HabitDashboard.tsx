import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Info, Coffee, Ticket } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { useEconomyStore } from '../../store/useEconomyStore';
import { HabitModal } from './HabitModal';
import { HabitItem } from './HabitItem';
import type { Habit } from '../../types';
import { format, subDays, startOfWeek, addDays } from 'date-fns';

export const HabitDashboard = () => {
  const { habits, logs, modifiers, setLog, deleteHabit, applyGlobalDayOff, applyModifier } = useHabitStore();
  const { inventory, useItem, voucherProgress, addVoucherProgress } = useEconomyStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  const [toastMessage, setToastMessage] = useState<{ msg: string; type: 'success'|'strict'|'motivational' } | null>(null);

  const showToast = (msg: string, type: 'success'|'strict'|'motivational' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLogChange = (habitId: string, dateStr: string, newCount: number, isCompleting: boolean, currentStreak: number) => {
    const habit = habits.find(h => h.id === habitId);
    const wasCompleted = (logs[habitId]?.[dateStr] || 0) >= (habit?.goal || 1);
    
    setLog(habitId, dateStr, newCount);

    if (isCompleting) {
      if (!wasCompleted) {
        addVoucherProgress(); 
      }
      if (currentStreak === 0) showToast("O primeiro passo é o mais difícil. Continue.", "motivational");
      else if (currentStreak === 2) showToast("3 dias seguidos! Você está pegando o ritmo! 🔥", "motivational");
      else if (currentStreak === 6) showToast("Uma semana perfeita! Inparável! 🚀", "motivational");
      else if (currentStreak === 20) showToast("Dizem que leva 21 dias para criar um hábito. Falta 1! 👀", "motivational");
    } else if (newCount === 0 && currentStreak > 3) {
      showToast("Sério? Você vai jogar essa ofensiva no lixo? Recupere isso.", "strict");
    }
  };

  const generateGithubGrid = () => {
    const today = new Date();
    const start = startOfWeek(subDays(today, 84)); 
    const weeks = [];
    let current = start;

    const dailyCounts: Record<string, number> = {};
    habits.forEach(habit => {
      const habitLogs = logs[habit.id] || {};
      const habitMods = modifiers[habit.id] || {};
      const targetGoal = habit.goal || 1;
      
      const dates = new Set([...Object.keys(habitLogs), ...Object.keys(habitMods)]);
      dates.forEach(date => {
        if ((habitLogs[date] || 0) >= targetGoal || habitMods[date]) {
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        }
      });
    });

    while (current <= today) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        if (current > today) break;
        const dateStr = format(current, 'yyyy-MM-dd');
        const count = dailyCounts[dateStr] || 0;
        
        let colorClass = 'bg-zinc-200 dark:bg-zinc-800/50';
        if (count === 1) colorClass = 'bg-emerald-300 dark:bg-emerald-900/60';
        else if (count === 2) colorClass = 'bg-emerald-400 dark:bg-emerald-700/80';
        else if (count >= 3) colorClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';

        week.push(<div key={dateStr} title={`${count} hábitos em ${dateStr}`} className={`w-3 h-3 md:w-4 md:h-4 rounded-[3px] md:rounded-sm transition-colors ${colorClass}`} />);
        current = addDays(current, 1);
      }
      weeks.push(<div key={current.toString()} className="flex flex-col gap-1 md:gap-1.5">{week}</div>);
    }
    return weeks;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="max-w-4xl mx-auto px-6 md:px-8 pt-12 space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between md:items-end gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-900">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Consistência</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">O que você faz todos os dias molda quem você é.</p>
          </div>

          {inventory.dayOff > 0 && (
            <button onClick={() => { 
                if(useItem('dayOff')) { 
                    applyGlobalDayOff(format(new Date(), 'yyyy-MM-dd')); 
                    showToast('Dia de Folga aplicado a todos os hábitos!'); 
                } 
            }} className="flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform text-sm">
              <Coffee size={18} /> Usar Dia de Folga
            </button>
          )}
        </header>

        {/* BARRA DE VOUCHERS: Segmentada em 3 e com indicativo de +1 */}
        <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-3xl flex items-center justify-between">
          <div className="flex-1 mr-6">
            <div className="flex justify-between text-xs font-bold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-widest">
              <span>Progresso para Voucher</span>
              <span>{voucherProgress} / 3 Hábitos</span>
            </div>
            <div className="flex gap-1.5 w-full h-3">
              {[1, 2, 3].map((step) => (
                <div key={step} className={`flex-1 rounded-full transition-colors duration-500 ${voucherProgress >= step ? 'bg-blue-500' : 'bg-blue-500/20'}`} />
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-xl font-black text-blue-600 dark:text-blue-400">
             <Ticket size={24} />
             <span>+1</span>
          </div>
        </div>

        {habits.length > 0 && (
          <div className="p-5 md:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold uppercase tracking-widest text-xs text-zinc-500">Histórico de Hábitos</h3>
              <div className="flex items-center gap-1 text-xs text-zinc-400"><Info size={12}/> Menos - Mais</div>
            </div>
            <div className="flex gap-1 md:gap-1.5 overflow-x-auto scrollbar-hide pb-2 justify-end">
              {generateGithubGrid()}
            </div>
          </div>
        )}

        <main className="space-y-4">
          <AnimatePresence mode="popLayout">
            {habits.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-zinc-500 mt-20 px-8">A disciplina é a ponte entre metas e realizações. Comece adicionando um hábito simples.</motion.div>
            ) : (
              habits.map((habit) => (
                <HabitItem 
                  key={habit.id} habit={habit} 
                  logs={logs[habit.id] || {}} 
                  modifiers={modifiers[habit.id] || {}}
                  onLogChange={handleLogChange} 
                  onApplyModifier={(hId, date, type) => { applyModifier(hId, date, type); showToast('Congelamento Aplicado!'); }}
                  onEdit={() => { setHabitToEdit(habit); setIsModalOpen(true); }} 
                  onDelete={() => deleteHabit(habit.id)} 
                />
              ))
            )}
          </AnimatePresence>
        </main>
      </div>

      <motion.button layoutId="fab-habit" onClick={() => { setHabitToEdit(null); setIsModalOpen(true); }} className="fixed bottom-28 right-6 md:right-12 md:bottom-12 p-4 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 shadow-[0_8px_30px_rgba(16,185,129,0.3)] z-40 flex items-center justify-center">
        <Plus size={28} strokeWidth={3} />
      </motion.button>

      <HabitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} habitToEdit={habitToEdit} onSuccess={(msg) => showToast(msg, 'success')} />

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] font-bold text-sm tracking-wide border ${toastMessage.type === 'strict' ? 'bg-red-500 text-white border-red-600' : toastMessage.type === 'motivational' ? 'bg-orange-500 text-white border-orange-600' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-zinc-800 dark:border-zinc-200'}`}>
            {toastMessage.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};