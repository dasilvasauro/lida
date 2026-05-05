import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEconomyStore } from '../../store/useEconomyStore';
import { Clover, ArrowRight, Palette, Ticket, Sparkles, Flame, Target, Crown } from 'lucide-react';

export const LevelUpModal = () => {
  const { levelUpData, clearLevelUp } = useEconomyStore();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (levelUpData) {
      setShowContent(false);
      const timer = setTimeout(() => setShowContent(true), 600);
      return () => clearTimeout(timer);
    }
  }, [levelUpData]);

  if (!levelUpData) return null;

  // DICIONÁRIO DE RECOMPENSAS DE MARCO
  const getMilestoneReward = (level: number) => {
    switch (level) {
      case 10: return { title: 'Novo Tema Liberado!', desc: 'Você desbloqueou a paleta "Escuro Suave". Equipe-a nos Ajustes.', icon: Palette, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' };
      case 15: return { title: 'Injeção de Recursos!', desc: 'Você recebeu +15 Vouchers para gerenciar sua rotina.', icon: Ticket, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
      case 20: return { title: 'Novo Tema Liberado!', desc: 'Você desbloqueou a paleta "Manteiga". Equipe-a nos Ajustes.', icon: Palette, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
      case 25: return { title: 'Bênção da Sorte!', desc: 'Habilidade Passiva: A partir de agora, você ganha 1 Carta da Sorte a cada nível alcançado!', icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
      case 30: return { title: 'Foco Absoluto!', desc: 'O limite diário de tarefas essenciais foi quebrado. Tarefas P0 agora são ilimitadas!', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
      case 35: return { title: 'Novo Tema Liberado!', desc: 'Você desbloqueou a paleta "Azul Marinho". Equipe-a nos Ajustes.', icon: Palette, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
      case 40: return { title: 'Mestre da Rotina!', desc: 'O limite diário de tarefas importantes foi quebrado. Tarefas P1 agora são ilimitadas!', icon: Target, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
      case 50: return { title: 'O ÁPICE ALCANÇADO!', desc: 'Você zerou a jornada! Ganhou o tema lendário "Darcula" e +40 Vouchers!', icon: Crown, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
      default: return null;
    }
  };

  const specialReward = getMilestoneReward(levelUpData.level);
  
  // Condição para o bônus passivo do nível 25 (Exibe apenas se não for múltiplo de 5 nem o próprio nível 25, para não poluir a tela)
  const isPassiveLuckLevel = levelUpData.level > 25 && !levelUpData.hasReward;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }} 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-y-auto scrollbar-hide py-12"
      >
        {!showContent && (
           <>
             <motion.div initial={{ scaleX: 0, scaleY: 0.1, rotate: -35, backgroundColor: '#ffffff', opacity: 1 }} animate={{ scaleX: [0, 5, 5], opacity: [1, 1, 0] }} transition={{ duration: 0.6, times: [0, 0.4, 1], ease: "easeOut" }} className="absolute w-full h-6 rounded-full z-20" />
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.4, delay: 0.2 }} className="absolute inset-0 bg-white z-10" />
           </>
        )}

        {showContent && (
          <motion.div initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative flex flex-col items-center text-center p-6 md:p-12 z-30 w-full max-w-lg m-auto">
            
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }} className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-8 shadow-[0_0_80px_rgba(59,130,246,0.6)] border-4 border-black outline outline-2 outline-blue-500 shrink-0">
              <span className="text-6xl md:text-7xl font-black text-white">{levelUpData.level}</span>
            </motion.div>

            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic mb-2">Subiu de Nível!</h2>
            <p className="text-zinc-400 font-bold tracking-widest uppercase mb-10 text-sm md:text-base">O treinamento traz resultados.</p>

            <div className="w-full space-y-4 mb-10 flex flex-col items-center">
              
              {/* RECOMPENSA FIXA (A CADA 5 NÍVEIS) */}
              {levelUpData.hasReward && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full flex flex-col items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-3xl">
                  <Clover size={32} className="text-emerald-500" />
                  <h3 className="text-emerald-400 font-black text-lg uppercase tracking-widest">Recompensa de Ciclo</h3>
                  <p className="text-sm text-emerald-500/80 font-bold">Você alcançou um múltiplo de 5! +1 Carta de <b>Sorte Instantânea</b> adicionada ao inventário.</p>
                </motion.div>
              )}

              {/* RECOMPENSA PASSIVA (> NÍVEL 25) */}
              {isPassiveLuckLevel && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full flex flex-col items-center gap-2 bg-zinc-900 border border-zinc-800 p-5 rounded-3xl">
                  <Clover size={24} className="text-emerald-500" />
                  <h3 className="text-zinc-100 font-black text-sm uppercase tracking-widest">Bônus Passivo (Nível 25+)</h3>
                  <p className="text-xs text-zinc-400 font-bold">+1 Carta de Sorte Instantânea adicionada.</p>
                </motion.div>
              )}

              {/* RECOMPENSA DE MARCO (TEMAS, VOUCHERS, P0/P1) */}
              {specialReward && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className={`w-full flex flex-col items-center gap-3 ${specialReward.bg} border ${specialReward.border} p-6 rounded-3xl shadow-xl`}>
                  <specialReward.icon size={40} className={specialReward.color} />
                  <h3 className={`${specialReward.color} font-black text-xl tracking-tight uppercase`}>{specialReward.title}</h3>
                  <p className={`text-sm ${specialReward.color} opacity-90 font-bold leading-relaxed`}>{specialReward.desc}</p>
                </motion.div>
              )}

            </div>

            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} onClick={clearLevelUp} className="px-8 py-4 rounded-full bg-white text-black font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2 shrink-0">
              Continuar Jornada <ArrowRight size={20} />
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};