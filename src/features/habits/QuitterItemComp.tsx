import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, RotateCcw, Trash2, Crown, Ban, CheckCircle2 } from 'lucide-react';
import { differenceInCalendarDays, format } from 'date-fns';
import type { QuitterItem } from '../../types';

interface QuitterItemCompProps {
  item: QuitterItem;
  onCheckin: () => void;
  onRelapseRequest: () => void;
  onDeleteRequest: () => void;
}

// FRASES MOTIVACIONAIS EDITÁVEIS AQUI
const quotes = [
  { text: "A dor de largar um vício é menor que a dor de viver com ele.", author: "Anônimo" },
  { text: "Você não perde nada ao deixar o que te destrói.", author: "Filosofia Lida" },
  { text: "A verdadeira liberdade nasce da renúncia ao impulso.", author: "Sêneca" },
  { text: "Cada dia de resistência é um tijolo na fortaleza da sua mente.", author: "Mente Inabalável" },
  { text: "O desconforto temporário é o preço da cura permanente.", author: "Lida" },
  { text: "Um dia de cada vez. O hoje é a única batalha que importa.", author: "Anônimo" },
  { text: "Não negocie com a sua fraqueza.", author: "David Goggins" }
];

export const QuitterItemComp = ({ item, onCheckin, onRelapseRequest, onDeleteRequest }: QuitterItemCompProps) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const hasCheckedInToday = item.checkins.includes(todayStr);
  const daysClean = differenceInCalendarDays(new Date(), new Date(item.lastRelapseAt));
  
  const isGold = daysClean >= 7;

  const palette = isGold
    ? { 
        bg: 'bg-gradient-to-br from-amber-950/40 to-yellow-900/10', 
        border: 'border-amber-500/50', 
        text: 'text-amber-500', 
        glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]', 
        icon: Crown,
        btnBg: 'bg-amber-500 hover:bg-amber-400 text-amber-950',
        quote: 'text-amber-200/60'
      }
    : { 
        bg: 'bg-gradient-to-br from-red-950/40 to-rose-900/10', 
        border: 'border-red-500/50', 
        text: 'text-red-500', 
        glow: 'shadow-[0_0_30px_rgba(239,68,68,0.15)]', 
        icon: Flame,
        btnBg: 'bg-white hover:bg-zinc-200 text-red-950 dark:bg-zinc-100 dark:hover:bg-white dark:text-black',
        quote: 'text-red-200/60'
      };

  const Icon = palette.icon;
  const randomQuote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], [item.id, hasCheckedInToday]);

  const cycleProgress = (item.rewardCycle / 7) * 100;

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`relative p-6 md:p-8 rounded-[2rem] border-2 ${palette.border} ${palette.bg} ${palette.glow} transition-colors duration-1000 overflow-hidden`}>
       
       <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Ban size={150} />
       </div>

       <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
             <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl bg-black/20 ${palette.text}`}><Icon size={24} className={isGold ? 'animate-pulse' : ''} /></div>
                <div>
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-60 text-white block mb-0.5">Renúncia</span>
                   <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">{item.title}</h3>
                </div>
             </div>
             
             <div className="flex gap-2">
                <button onClick={onRelapseRequest} className="p-2.5 rounded-xl bg-black/20 text-white/50 hover:bg-red-500 hover:text-white transition-colors" title="Registrar Recaída"><RotateCcw size={16} /></button>
                <button onClick={onDeleteRequest} className="p-2.5 rounded-xl bg-black/20 text-white/50 hover:bg-red-500 hover:text-white transition-colors" title="Excluir"><Trash2 size={16} /></button>
             </div>
          </div>

          <div className="text-center py-6 md:py-8">
             <div className="inline-block relative">
                 <AnimatePresence mode="popLayout">
                     <motion.span key={daysClean} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`block text-7xl md:text-9xl font-black tracking-tighter tabular-nums drop-shadow-lg ${palette.text}`}>
                         {daysClean}
                     </motion.span>
                 </AnimatePresence>
             </div>
             <span className="block text-sm md:text-base font-black uppercase tracking-[0.2em] text-white/70 mt-2">Dias Limpo</span>
          </div>

          <div className="mb-8">
             <div className="flex justify-between items-end mb-2 text-[10px] font-black uppercase tracking-widest text-white/50">
                 <span>Ciclo de Recompensa</span>
                 <span className={palette.text}>Dia {item.rewardCycle} de 7</span>
             </div>
             <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${cycleProgress}%` }} className={`h-full ${isGold ? 'bg-amber-500' : 'bg-red-500'}`} />
             </div>
          </div>

          <button
             onClick={onCheckin}
             disabled={hasCheckedInToday}
             className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.1em] text-sm md:text-base transition-all duration-300 shadow-xl
               ${hasCheckedInToday ? 'bg-black/40 text-white/30 cursor-not-allowed border border-white/5' : `${palette.btnBg} animate-pulse hover:scale-[1.02] active:scale-95`}`}
          >
             {hasCheckedInToday ? (
                 <span className="flex items-center justify-center gap-2"><CheckCircle2 size={18} /> Protegido Hoje</span>
             ) : 'Firmei meu compromisso hoje'}
          </button>

          <div className="mt-6 text-center">
             <p className={`text-xs md:text-sm font-medium italic leading-relaxed ${palette.quote}`}>"{randomQuote.text}"</p>
          </div>
       </div>
    </motion.div>
  );
};