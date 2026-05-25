import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Info, Coffee, Ticket, X, Ban, AlertTriangle } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { useEconomyStore } from '../../store/useEconomyStore';
import { useTaskStore } from '../../store/useTaskStore'; 
import { useBackHandler } from '../../store/useConfigStore';
import { HabitModal } from './HabitModal';
import { HabitItem } from './HabitItem';
import { QuitterModal } from './QuitterModal';
import { QuitterItemComp } from './QuitterItemComp';
import type { Habit } from '../../types';
import { format, subDays, startOfWeek, addDays } from 'date-fns';

export const HabitDashboard = () => {
  const { habits, logs, modifiers, setLog, deleteHabit, applyGlobalDayOff, applyModifier, quitterItems, checkinQuitter, relapseQuitter, deleteQuitterItem } = useHabitStore();
  const { inventory, useItem, voucherProgress, addVoucherProgress, removeVoucherProgress, addReward } = useEconomyStore();
  
  const isModalOpen = useTaskStore((state) => state.isGlobalModalOpen);
  const setIsModalOpen = useTaskStore((state) => state.setGlobalModalOpen);
  
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  const [toastMessage, setToastMessage] = useState<{ msg: string; type: 'success'|'strict'|'motivational' } | null>(null);
  const [infoModal, setInfoModal] = useState<{title: string, desc: string} | null>(null);

  // QUITTER STATES
  const [isQuitterModalOpen, setQuitterModalOpen] = useState(false);
  const [quitterConfirm, setQuitterConfirm] = useState<{ type: 'relapse' | 'delete', id: string } | null>(null);

  useBackHandler(!!quitterConfirm, () => { setQuitterConfirm(null); return true; });
  useBackHandler(isQuitterModalOpen, () => { setQuitterModalOpen(false); return true; });
  useBackHandler(!!infoModal, () => { setInfoModal(null); return true; });

  const showToast = (msg: string, type: 'success'|'strict'|'motivational' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenQuitter = () => {
    if (quitterItems.length >= 1 + inventory.extraQuitter) {
      showToast(`Limite atingido (${1 + inventory.extraQuitter}). Adquira mais Espaços Quitter na Loja.`, 'strict');
    } else {
      setQuitterModalOpen(true);
    }
  };

  const handleQuitterCheckin = (id: string, currentCycle: number) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let gold = 0; let xp = 0;
    
    // Calcula o ciclo para o qual estamos pulando (0 para 1, etc. Se for 7 ele reiniciará e virará 1)
    const nextCycle = currentCycle >= 7 ? 1 : currentCycle + 1;
    
    switch(nextCycle) {
        case 1: gold = 60; xp = 100; break;   // 1º dia
        case 2: gold = 80; xp = 170; break;   // 2º dia
        case 3: gold = 100; xp = 210; break;  // 3º dia
        case 4: gold = 200; xp = 300; break;  // 4º dia
        case 5: gold = 250; xp = 350; break;  // 5º dia
        case 6: gold = 300; xp = 400; break;  // 6º dia
        case 7: gold = 500; xp = 500; break;  // 7º dia
        default: gold = 60; xp = 100; break;
    }
    
    addReward(xp, gold);
    
    if (nextCycle === 7) {
        // Carta Surpresa
        useEconomyStore.setState(s => ({ inventory: { ...s.inventory, luckyCard: s.inventory.luckyCard + 1 } }));
        showToast(`Check-in Triunfal! +${xp} XP, +${gold} Ouro e +1 Carta Surpresa!`, 'motivational');
    } else {
        showToast(`Resistência (Dia ${nextCycle})! +${xp} XP e +${gold} Ouro.`, 'success');
    }
    
    checkinQuitter(id, todayStr);
  };

  const executeQuitterConfirm = () => {
     if (!quitterConfirm) return;
     if (quitterConfirm.type === 'relapse') {
         relapseQuitter(quitterConfirm.id);
         showToast("Recaída registrada. Punido em -50% XP/Ouro. O Dia 1 começa agora.", "strict");
     } else if (quitterConfirm.type === 'delete') {
         deleteQuitterItem(quitterConfirm.id);
         showToast("Registro excluído. Você perdeu todo o seu Ouro e XP acumulados no nível.", "strict");
     }
     setQuitterConfirm(null);
  };

  const handleLogChange = (habitId: string, dateStr: string, newCount: number, isCompleting: boolean, currentStreak: number) => {
    const habit = habits.find(h => h.id === habitId);
    const wasCompleted = (logs[habitId]?.[dateStr] || 0) >= (habit?.goal || 1);
    
    setLog(habitId, dateStr, newCount);

    if (isCompleting) {
      if (!wasCompleted) { addVoucherProgress(); }
      if (currentStreak === 0) showToast("O primeiro passo é o mais difícil. Continue.", "motivational");
      else if (currentStreak === 2) showToast("3 dias seguidos! Você está pegando o ritmo! 🔥", "motivational");
      else if (currentStreak === 6) showToast("Uma semana perfeita! Inparável! 🚀", "motivational");
      else if (currentStreak === 20) showToast("Dizem que leva 21 dias para criar um hábito. Falta 1! 👀", "motivational");
    } else {
      if (wasCompleted) { removeVoucherProgress(); }
      if (newCount === 0 && currentStreak > 3) {
        showToast("Sério? Você vai jogar essa ofensiva no lixo? Recupere isso.", "strict");
      }
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
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors pb-32">
      <div className="max-w-4xl mx-auto px-6 md:px-8 pt-12 space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between md:items-end gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-900">
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-3xl font-black tracking-tight">Consistência</h1>
               <button onClick={handleOpenQuitter} className="mt-1 p-2 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors" title="A Zona de Desapego (Quitter)">
                  <Ban size={20}/>
               </button>
               <button onClick={() => setInfoModal({title: 'Consistência e Desapego', desc: 'A consistência é a chave da maestria. Marque seus hábitos positivos diariamente para não quebrar a ofensiva e acumular benefícios.\n\nNa "Zona de Desapego" (Ícone Vermelho), você pode firmar um compromisso dramático para largar vícios, acumulando grandes recompensas a cada dia limpo.'})} className="mt-1 text-zinc-400 hover:text-blue-500 transition-colors"><Info size={20}/></button>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">O que você faz todos os dias molda quem você é.</p>
          </div>

          {inventory.dayOff > 0 && (
            <button onClick={() => { 
                if(useItem('dayOff')) { 
                    applyGlobalDayOff(format(new Date(), 'yyyy-MM-dd')); 
                    showToast('Folga Extra aplicada a todos os hábitos!'); 
                } 
            }} className="flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform text-sm">
              <Coffee size={18} /> Usar Folga Extra
            </button>
          )}
        </header>

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
            </div>
            <div className="flex gap-1 md:gap-1.5 overflow-x-auto scrollbar-hide pb-2 justify-end">
              {generateGithubGrid()}
            </div>
          </div>
        )}

        {/* SECÇÃO QUITTER */}
        {quitterItems.length > 0 && (
          <div className="space-y-6 pb-6">
            <h3 className="font-black uppercase tracking-widest text-sm text-red-500 flex items-center gap-2 ml-2">
              <Ban size={18} /> A Zona de Desapego
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {quitterItems.map(item => (
                 <QuitterItemComp 
                    key={item.id} 
                    item={item} 
                    onCheckin={() => handleQuitterCheckin(item.id, item.rewardCycle)}
                    onRelapseRequest={() => setQuitterConfirm({ type: 'relapse', id: item.id })}
                    onDeleteRequest={() => setQuitterConfirm({ type: 'delete', id: item.id })}
                 />
               ))}
            </div>
          </div>
        )}

        <main className="space-y-4">
          <AnimatePresence mode="popLayout">
            {habits.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-zinc-500 mt-20 px-8">A disciplina é a ponte entre metas e realizações. Comece adicionando um hábito positivo simples.</motion.div>
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

      <button onClick={() => { setHabitToEdit(null); setIsModalOpen(true); }} className="fixed bottom-28 right-6 md:right-12 md:bottom-12 p-4 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 shadow-[0_8px_30px_rgba(16,185,129,0.3)] z-40 flex items-center justify-center">
        <Plus size={28} strokeWidth={3} />
      </button>

      <HabitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} habitToEdit={habitToEdit} onSuccess={(msg) => showToast(msg, 'success')} />
      <QuitterModal isOpen={isQuitterModalOpen} onClose={() => setQuitterModalOpen(false)} onSuccess={() => showToast('Compromisso firmado com sucesso!', 'motivational')} />

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 left-1/2 -translate-x-1/2 z-[6000] px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.2)] font-bold text-sm tracking-wide border ${toastMessage.type === 'strict' ? 'bg-red-500 text-white border-red-600' : toastMessage.type === 'motivational' ? 'bg-amber-500 text-amber-950 border-amber-400' : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-800 dark:border-zinc-200'}`}>
            {toastMessage.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRMAÇÃO DO QUITTER */}
      <AnimatePresence>
        {quitterConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[5000] bg-black/90 flex items-center justify-center p-6 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-zinc-950 w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-red-500/30 text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-white">{quitterConfirm.type === 'relapse' ? 'Registrar Recaída?' : 'Destruir Registro?'}</h3>
              <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
                {quitterConfirm.type === 'relapse' 
                   ? 'Você perderá 50% de todo o seu XP no nível atual e 50% de todo o seu Ouro. O seu ciclo voltará ao Dia 0.' 
                   : 'PUNIÇÃO MÁXIMA: Excluir este registro apagará 100% do seu Ouro e reiniciará o seu XP para o início do nível atual. Tem certeza absoluta?'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setQuitterConfirm(null)} className="flex-1 p-4 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors">Cancelar</button>
                <button onClick={executeQuitterConfirm} className="flex-1 p-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors">
                   {quitterConfirm.type === 'relapse' ? 'Eu Recaí' : 'Excluir'}
                </button>
              </div>
            </motion.div>
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