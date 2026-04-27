import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Star, Ticket, Dices, TrendingUp, AlertOctagon, AlertTriangle, Wind, CalendarHeart, Gift, Snowflake, Coffee, Clover, Play, Sparkles } from 'lucide-react';
import { useEconomyStore } from '../../store/useEconomyStore';
import { useTaskStore } from '../../store/useTaskStore'; // <-- Adicionado

export const ShopDashboard = () => {
  const { level, xp, gold, vouchers, inventory, buyItem, useItem, setBoost, addReward } = useEconomyStore();
  const { tasks, applyPowerUp } = useTaskStore(); // <-- Conectando Tarefas
  
  const [toastMessage, setToastMessage] = useState<{ msg: string, type: 'success' | 'error' | 'rare' } | null>(null);
  
  const [isRolling, setIsRolling] = useState(false);
  const [isDrawingCard, setIsDrawingCard] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' | 'rare' = 'success') => {
    setToastMessage({ msg, type }); setTimeout(() => setToastMessage(null), 4000);
  };

  const handleBuy = (id: any, cost: number, currency: 'gold'|'vouchers', name: string) => {
    if (buyItem(id, cost, currency)) {
      showToast(`${name} adquirido com sucesso!`);
      if (id === 'instantLuck') { useItem('instantLuck'); buyItem('luckyCard', 0, 'gold'); }
    } else { showToast(`Saldo de ${currency === 'gold' ? 'Ouro' : 'Vouchers'} insuficiente!`, 'error'); }
  };

  const handleRollDice = () => {
    const activeTasks = tasks.filter(t => !t.isCompleted);
    if (activeTasks.length === 0) {
      showToast('Nenhuma tarefa ativa para impulsionar!', 'error');
      return; // Trava o uso do dado se não houver tarefas
    }

    if (useItem('magicDice')) {
      setIsRolling(true);
      setTimeout(() => {
        setIsRolling(false);
        const roll = Math.floor(Math.random() * 6) + 1;
        
        let targetTask = activeTasks[Math.floor(Math.random() * activeTasks.length)];
        
        // Se rolou alto, tenta forçar cair numa tarefa importante P0/P1
        if (roll >= 5) {
          const highPriority = activeTasks.filter(t => t.priority === 'P0' || t.priority === 'P1');
          if (highPriority.length > 0) targetTask = highPriority[Math.floor(Math.random() * highPriority.length)];
          showToast(`Tirou um ${roll}! Raro! A tarefa "${targetTask.title}" ganhou Boost Mágico!`, 'rare');
        } else {
          showToast(`Tirou um ${roll}. A tarefa "${targetTask.title}" foi impulsionada.`, 'success');
        }

        applyPowerUp(targetTask.id, 'magicDice'); // Aplica na Store
      }, 1500);
    }
  };

  const handleUseLuckyCard = () => {
    if (useItem('luckyCard')) {
      setIsDrawingCard(true);
      setTimeout(() => {
        setIsDrawingCard(false);
        const roll = Math.random();
        if (roll > 0.8) { addReward(0, 100); showToast('Tirou a sorte grande! +100 de Ouro!', 'rare'); }
        else if (roll > 0.4) { addReward(200, 0); showToast('Sabedoria anciã! +200 XP!'); }
        else showToast('A carta não continha prêmios... Mais sorte na próxima!', 'error');
      }, 2000);
    }
  };

  const voucherItems = [
    { id: 'freeze', name: 'Congelamento', desc: 'Congela um hábito. A ofensiva não é perdida.', cost: 3, icon: Snowflake },
    { id: 'dayOff', name: 'Dia de Folga', desc: 'Não precisa completar hábitos hoje.', cost: 7, icon: Coffee },
    { id: 'instantLuck', name: 'Sorte Instantânea', desc: 'Ganha Carta de Sorte na hora.', cost: 5, icon: Clover },
  ];
  const goldItems = [
    { id: 'magicDice', name: 'Dado Mágico', desc: 'Rola D6 e aplica boost aleatório.', cost: 500, icon: Dices },
    { id: 'xpBoost', name: 'Boost de XP', desc: 'Aumenta XP ganho (15-50%) por 24h.', cost: 400, icon: TrendingUp },
    { id: 'goldBoost', name: 'Boost de Ouro', desc: 'Aumenta Ouro ganho (25-45%) por 24h.', cost: 200, icon: Coins },
    { id: 'extraP0', name: 'P0 Extra', desc: 'Permite criar 1 P0 extra no dia.', cost: 300, icon: AlertOctagon },
    { id: 'extraP1', name: 'P1 Extra', desc: 'Permite criar 1 P1 extra no dia.', cost: 200, icon: AlertTriangle },
    { id: 'respite', name: 'Respiro', desc: 'Aumenta prazo da tarefa em 3h.', cost: 100, icon: Wind },
    { id: 'relief', name: 'Alívio', desc: 'Aumenta prazo da tarefa em 1 dia.', cost: 200, icon: CalendarHeart },
    { id: 'bonusTask', name: 'Tarefa Bônus', desc: 'Permite criar 1 Tarefa Bônus extra.', cost: 200, icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors pb-32">
      <div className="max-w-5xl mx-auto px-6 md:px-8 pt-12 space-y-12">
        
        <header className="flex flex-wrap items-end justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-900">
          <div><h1 className="text-3xl font-black tracking-tight">Mercado & Estoque</h1><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Gerencie seus recursos com sabedoria.</p></div>
          <div className="flex gap-6">
            <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nível {level}</span><div className="flex items-center gap-1.5 text-xl font-black">{xp} <Star size={18} className="text-zinc-400" /></div></div>
            <div className="w-px h-10 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vouchers</span><div className="flex items-center gap-1.5 text-xl font-black text-blue-600 dark:text-blue-400">{vouchers} <Ticket size={18} /></div></div>
            <div className="w-px h-10 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ouro</span><div className="flex items-center gap-1.5 text-xl font-black text-yellow-600 dark:text-yellow-500">{gold} <Coins size={18} /></div></div>
          </div>
        </header>

        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Inventário Rápido</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-4">
            
            {/* AGORA EXIBINDO OS VOUCHERS TAMBÉM */}
            <div className="min-w-[140px] p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-cyan-500"><Snowflake size={20} /><span className="font-bold text-sm">Congelamento</span></div>
              <div className="flex justify-between items-end"><span className="font-black text-2xl">{inventory.freeze}</span></div>
            </div>
            
            <div className="min-w-[140px] p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-amber-600"><Coffee size={20} /><span className="font-bold text-sm">Dias de Folga</span></div>
              <div className="flex justify-between items-end"><span className="font-black text-2xl">{inventory.dayOff}</span></div>
            </div>

            <div className="min-w-[140px] p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 flex flex-col justify-between"><div className="flex items-center gap-2 mb-4 text-purple-500"><Dices size={20} /><span className="font-bold text-sm">Dado Mágico</span></div><div className="flex justify-between items-end"><span className="font-black text-2xl">{inventory.magicDice}</span><button onClick={handleRollDice} disabled={inventory.magicDice === 0 || isRolling} className="bg-purple-500 text-white p-2 rounded-xl disabled:opacity-30"><Play size={14} fill="currentColor"/></button></div></div>
            <div className="min-w-[140px] p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 flex flex-col justify-between"><div className="flex items-center gap-2 mb-4 text-orange-500"><TrendingUp size={20} /><span className="font-bold text-sm">Boost XP</span></div><div className="flex justify-between items-end"><span className="font-black text-2xl">{inventory.xpBoost}</span><button onClick={() => { if(useItem('xpBoost')) { setBoost('xp', 24); showToast('24h de Boost XP Ativado!'); } }} disabled={inventory.xpBoost === 0} className="bg-orange-500 text-white p-2 rounded-xl disabled:opacity-30"><Play size={14} fill="currentColor"/></button></div></div>
            <div className="min-w-[140px] p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 flex flex-col justify-between"><div className="flex items-center gap-2 mb-4 text-yellow-500"><Coins size={20} /><span className="font-bold text-sm">Boost Ouro</span></div><div className="flex justify-between items-end"><span className="font-black text-2xl">{inventory.goldBoost}</span><button onClick={() => { if(useItem('goldBoost')) { setBoost('gold', 24); showToast('24h de Boost de Ouro Ativado!'); } }} disabled={inventory.goldBoost === 0} className="bg-yellow-500 text-white p-2 rounded-xl disabled:opacity-30"><Play size={14} fill="currentColor"/></button></div></div>
            <div className="min-w-[140px] p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 flex flex-col justify-between"><div className="flex items-center gap-2 mb-4 text-zinc-500"><Gift size={20} /><span className="font-bold text-sm">Carta de Sorte</span></div><div className="flex justify-between items-end"><span className="font-black text-2xl">{inventory.luckyCard}</span><button onClick={handleUseLuckyCard} disabled={inventory.luckyCard === 0 || isDrawingCard} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black p-2 rounded-xl disabled:opacity-30"><Play size={14} fill="currentColor"/></button></div></div>
            
            <div className="min-w-[200px] p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 flex items-center gap-4 text-xs text-zinc-400 font-bold uppercase tracking-widest">Itens P0, P1, Bônus, Respiro e Alívio são aplicados no menu de Tarefas.</div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-4">Barraca dos Vouchers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {voucherItems.map((item) => (
              <div key={item.id} className="p-6 rounded-3xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/10 flex flex-col"><item.icon size={28} className="text-blue-500 mb-3" /><h3 className="font-black text-lg">{item.name}</h3><p className="text-sm text-zinc-500 mt-1 mb-6 flex-1">{item.desc}</p><button onClick={() => handleBuy(item.id, item.cost, 'vouchers', item.name)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors">{item.cost} <Ticket size={16} /></button></div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-widest mb-4">Lojinha do Ouro</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {goldItems.map((item) => (
              <div key={item.id} className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 transition-all hover:shadow-lg dark:hover:bg-zinc-900/50 flex flex-col"><item.icon size={28} className="text-yellow-600 dark:text-yellow-500 mb-3" /><h3 className="font-black text-lg">{item.name}</h3><p className="text-sm text-zinc-500 mt-1 mb-6 flex-1">{item.desc}</p><button onClick={() => handleBuy(item.id, item.cost, 'gold', item.name)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black font-bold hover:opacity-90 transition-opacity">{item.cost} <Coins size={16} /></button></div>
            ))}
          </div>
        </section>

      </div>

      <AnimatePresence>
        {isDrawingCard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center">
            <motion.div animate={{ rotateY: [0, 180, 360, 720], scale: [0.8, 1.2, 1.5, 1.2] }} transition={{ duration: 2, ease: "easeInOut" }} className="flex flex-col items-center justify-center w-48 h-72 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-2xl border-4 border-purple-300 shadow-[0_0_80px_rgba(168,85,247,0.8)] relative overflow-hidden">
              <Sparkles size={80} className="text-white animate-pulse" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRolling && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <motion.div animate={{ rotate: [0, 360, 720, 1080], scale: [1, 1.5, 1] }} transition={{ duration: 1.5, ease: "easeInOut" }} className="text-purple-500"><Dices size={80} /></motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 left-1/2 -translate-x-1/2 z-[90] px-6 py-3 rounded-full shadow-2xl font-bold text-sm tracking-wide border ${toastMessage.type === 'error' ? 'bg-red-500 text-white border-red-600' : toastMessage.type === 'rare' ? 'bg-purple-600 text-white border-purple-500' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-zinc-800 dark:border-zinc-200'}`}>{toastMessage.msg}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};