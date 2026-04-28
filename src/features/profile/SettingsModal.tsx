import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Trash2 } from 'lucide-react';
import { useConfigStore } from '../../store/useConfigStore';
import { deleteCloudVault } from '../../lib/cloudSync';

export const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { theme, font, setTheme, setFont, logout, uid } = useConfigStore();
  const [confirmWipe, setConfirmWipe] = useState(false);

  if (!isOpen) return null;

  const handleWipeData = async () => {
    if (uid) {
      await deleteCloudVault(uid); // Apaga os dados no Firebase
    }
    localStorage.clear(); // Apaga o Zustand inteiro do navegador
    window.location.reload(); // Reinicia o app limpando a memória RAM
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
          
          <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-black">Configurações</h3>
            <button onClick={onClose} className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
            
            {/* TEMA */}
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Estética Visual</span>
              <div className="flex gap-3">
                <button onClick={() => setTheme('light')} className={`flex-1 py-3 border rounded-xl font-bold transition-all ${theme === 'light' ? 'bg-zinc-900 text-white border-transparent' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Claro</button>
                <button onClick={() => setTheme('dark-amoled')} className={`flex-1 py-3 border rounded-xl font-bold transition-all ${theme === 'dark-amoled' ? 'bg-zinc-900 text-white border-transparent dark:bg-zinc-100 dark:text-black' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>AMOLED</button>
              </div>
            </div>

            {/* FONTES */}
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Tipografia</span>
              <div className="flex flex-col gap-2">
                <button onClick={() => setFont('sans')} className={`p-3 rounded-xl border text-left font-sans transition-all ${font === 'sans' ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Moderna (Sem Serifa)</button>
                <button onClick={() => setFont('serif')} className={`p-3 rounded-xl border text-left font-serif transition-all ${font === 'serif' ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Clássica (Com Serifa)</button>
                <button onClick={() => setFont('special')} style={{ fontFamily: '"VT323"' }} className={`p-3 rounded-xl border text-left transition-all ${font === 'special' ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Especial (VT323)</button>
              </div>
            </div>

            {/* ZONA DE PERIGO */}
            <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-xs uppercase tracking-widest text-red-500 font-bold">Zona de Perigo</span>
              
              <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl font-bold transition-colors">
                <span className="flex items-center gap-2"><LogOut size={18}/> Sair da Conta</span>
              </button>

              {confirmWipe ? (
                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                  <p className="text-red-500 font-bold mb-4 text-sm">Tem certeza? Essa ação destruirá seus dados permanentemente.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmWipe(false)} className="flex-1 p-3 bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg font-bold text-sm transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-700">Cancelar</button>
                    <button onClick={handleWipeData} className="flex-1 p-3 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-500 transition-colors">Destruir Dados</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmWipe(true)} className="w-full flex items-center justify-between p-4 text-red-600 bg-red-500/10 hover:bg-red-500/20 rounded-xl font-bold transition-colors">
                  <span className="flex items-center gap-2"><Trash2 size={18}/> Apagar Todos os Dados</span>
                </button>
              )}
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};