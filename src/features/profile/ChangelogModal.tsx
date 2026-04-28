import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone } from 'lucide-react';

export const ChangelogModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
          
          <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800 bg-blue-50 dark:bg-blue-950/20">
            <h3 className="text-xl font-black text-blue-600 dark:text-blue-400">O que há de novo?</h3>
            <button onClick={onClose} className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400 transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
            
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><Smartphone size={20} /></div>
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Navegação Nativa</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">O botão físico de "Voltar" do Android agora entende o app. Ele fecha modais, volta pra Home e só sai se você permitir.</p>
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};