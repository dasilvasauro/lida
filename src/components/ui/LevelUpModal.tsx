import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEconomyStore } from '../../store/useEconomyStore';
import { Clover, ArrowRight } from 'lucide-react';

export const LevelUpModal = () => {
  const { levelUpData, clearLevelUp } = useEconomyStore();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (levelUpData) {
      setShowContent(false);
      // Aguarda 600ms para a animação do corte de katana terminar antes de exibir o texto
      const timer = setTimeout(() => setShowContent(true), 600);
      return () => clearTimeout(timer);
    }
  }, [levelUpData]);

  if (!levelUpData) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0, transition: { duration: 0.5 } }} 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden"
      >
        
        {/* EFEITO DE CORTE DE KATANA */}
        {!showContent && (
           <>
             {/* O traço da espada */}
             <motion.div
               initial={{ scaleX: 0, scaleY: 0.1, rotate: -35, backgroundColor: '#ffffff', opacity: 1 }}
               animate={{ scaleX: [0, 5, 5], opacity: [1, 1, 0] }}
               transition={{ duration: 0.6, times: [0, 0.4, 1], ease: "easeOut" }}
               className="absolute w-full h-6 rounded-full z-20"
             />
             {/* O Flash da tela inteira */}
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: [0, 1, 0] }}
               transition={{ duration: 0.4, delay: 0.2 }}
               className="absolute inset-0 bg-white z-10"
             />
           </>
        )}

        {/* CONTEÚDO DO LEVEL UP */}
        {showContent && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative flex flex-col items-center text-center p-6 md:p-12 z-30"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
              className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-8 shadow-[0_0_80px_rgba(59,130,246,0.6)] border-4 border-black outline outline-2 outline-blue-500"
            >
              <span className="text-6xl md:text-7xl font-black text-white">{levelUpData.level}</span>
            </motion.div>

            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic mb-2">Subiu de Nível!</h2>
            <p className="text-zinc-400 font-bold tracking-widest uppercase mb-10 text-sm md:text-base">O treinamento traz resultados.</p>

            {levelUpData.hasReward && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-3xl mb-10 max-w-sm"
              >
                <Clover size={40} className="text-emerald-500" />
                <h3 className="text-emerald-400 font-black text-xl">Recompensa de Marco!</h3>
                <p className="text-sm text-emerald-500/80 font-bold">Você alcançou um múltiplo de 5! Uma carta de <b>Sorte Instantânea</b> foi adicionada ao seu estoque na Loja.</p>
              </motion.div>
            )}

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: levelUpData.hasReward ? 1.2 : 0.8 }}
              onClick={clearLevelUp}
              className="px-8 py-4 rounded-full bg-white text-black font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
            >
              Continuar Jornada <ArrowRight size={20} />
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};