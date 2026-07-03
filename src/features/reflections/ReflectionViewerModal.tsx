import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2 } from 'lucide-react';
import type { Reflection } from '../../types';

const bgMap = {
  blue: 'bg-blue-600', emerald: 'bg-emerald-600', amber: 'bg-amber-600', rose: 'bg-rose-600',
  purple: 'bg-purple-600', cyan: 'bg-cyan-600', indigo: 'bg-indigo-600', zinc: 'bg-zinc-800'
};

export const ReflectionViewerModal = ({ reflection, onClose, onEdit }: { reflection: Reflection | null; onClose: () => void; onEdit: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (reflection) setCurrentIndex(0);
  }, [reflection]);

  if (!reflection) return null;

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const clickX = e.clientX;
    const width = window.innerWidth;
    if (clickX < width * 0.3) {
      if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    } else {
      if (currentIndex < reflection.cards.length - 1) setCurrentIndex(prev => prev + 1);
      else onClose(); // Fecha se clicou no final
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`fixed inset-0 z-[200] ${bgMap[reflection.color as keyof typeof bgMap]} text-white flex flex-col`}>
        
        {/* Barras de Progresso */}
        <div className="flex gap-1 p-4 pt-12 z-20">
          {reflection.cards.map((_: string, i: number) => (
            <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <motion.div className="h-full bg-white" initial={{ width: 0 }} animate={{ width: i <= currentIndex ? '100%' : '0%' }} transition={{ duration: 0.2 }} />
            </div>
          ))}
        </div>

        {/* Controles de Topo */}
        <div className="flex justify-between items-center px-4 z-20">
          <h3 className="font-bold text-white/80 uppercase tracking-widest text-xs">{reflection.title}</h3>
          <div className="flex gap-3">
             <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 hover:bg-white/20 rounded-full transition-colors"><Edit2 size={20} /></button>
             <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
          </div>
        </div>

        {/* Área de Clique e Conteúdo */}
        <div onClick={handleTap} className="flex-1 relative flex items-center justify-center cursor-pointer p-8">
           <AnimatePresence mode="wait">
             <motion.p key={currentIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="text-3xl md:text-4xl lg:text-5xl font-black text-center leading-relaxed text-white drop-shadow-md">
                {reflection.cards[currentIndex]}
             </motion.p>
           </AnimatePresence>
        </div>

      </motion.div>
    </AnimatePresence>
  );
};
