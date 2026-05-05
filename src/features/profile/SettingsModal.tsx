import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Trash2, History, AlertTriangle, Download, Upload } from 'lucide-react';
import { useConfigStore } from '../../store/useConfigStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useEconomyStore } from '../../store/useEconomyStore';
import { useVisionStore } from '../../store/useVisionStore';
import { deleteCloudVault, syncToCloud } from '../../lib/cloudSync';

export const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { theme, font, setTheme, setFont, uid, e2eePin, setChangelogOpen, isLocalMode, defaultDaysOff, setDefaultDaysOff } = useConfigStore();
  
  const [confirmAction, setConfirmAction] = useState<'logout' | 'wipe' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleWipeData = async () => {
    if (uid) await deleteCloudVault(uid); 
    localStorage.clear(); 
    window.location.reload(); 
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleExport = () => {
    const data = {
      tasks: localStorage.getItem('lida-tasks'),
      habits: localStorage.getItem('lida-habits-v5'),
      economy: localStorage.getItem('lida-economy-v3'),
      vision: localStorage.getItem('lida-vision'),
      config: localStorage.getItem('lida-config'),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lida-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (data.tasks) useTaskStore.setState(JSON.parse(data.tasks).state);
        if (data.habits) useHabitStore.setState(JSON.parse(data.habits).state);
        if (data.economy) useEconomyStore.setState(JSON.parse(data.economy).state);
        if (data.vision) useVisionStore.setState(JSON.parse(data.vision).state);
        
        if (data.config) {
          const importedConfig = JSON.parse(data.config).state;
          useConfigStore.setState({ ...importedConfig, uid, e2eePin, isLocalMode });
        }

        if (uid && e2eePin && navigator.onLine) {
          await syncToCloud();
        }

        window.location.reload();
      } catch (err) {
        alert("O arquivo de backup é inválido ou está corrompido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          
          <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-black">Configurações</h3>
            <button onClick={onClose} className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-8 overflow-y-auto scrollbar-hide flex-1">
            
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Estética Visual</span>
              <div className="flex gap-3">
                <button onClick={() => setTheme('light')} className={`flex-1 py-3 border rounded-xl font-bold transition-all ${theme === 'light' ? 'bg-zinc-900 text-white border-transparent' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Claro</button>
                <button onClick={() => setTheme('dark-amoled')} className={`flex-1 py-3 border rounded-xl font-bold transition-all ${theme === 'dark-amoled' ? 'bg-zinc-900 text-white border-transparent dark:bg-zinc-100 dark:text-black' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>AMOLED</button>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Tipografia</span>
              <div className="flex flex-col gap-2">
                <button onClick={() => setFont('sans')} className={`p-3 rounded-xl border text-left font-sans transition-all ${font === 'sans' ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Moderna (Sem Serifa)</button>
                <button onClick={() => setFont('serif')} className={`p-3 rounded-xl border text-left font-serif transition-all ${font === 'serif' ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Clássica (Com Serifa)</button>
                <button onClick={() => setFont('special')} style={{ fontFamily: '"VT323"' }} className={`p-3 rounded-xl border text-left transition-all ${font === 'special' ? 'border-zinc-900 dark:border-zinc-100 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Especial (VT323)</button>
              </div>
            </div>

            {/* SEÇÃO DE DIAS DE FOLGA */}
            <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Dias de Folga Regulares</span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
                  Selecione os dias da semana onde suas ofensivas não serão rompidas, mesmo se você não concluir seus hábitos.
                </p>
              </div>
              <div className="flex justify-between gap-2">
                 {['D','S','T','Q','Q','S','S'].map((dayStr, i) => {
                    const isSelected = defaultDaysOff.includes(i);
                    return (
                      <button 
                         key={i} 
                         onClick={() => {
                            if (isSelected) setDefaultDaysOff(defaultDaysOff.filter(d => d !== i));
                            else setDefaultDaysOff([...defaultDaysOff, i]);
                         }} 
                         className={`w-10 h-10 rounded-full font-bold transition-all text-sm flex items-center justify-center ${isSelected ? 'bg-amber-500 text-white shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                      >
                         {dayStr}
                      </button>
                    )
                 })}
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-xs uppercase tracking-widest text-emerald-500 font-bold">Backup e Restauração</span>
              <div className="flex gap-3">
                <button onClick={handleExport} className="flex-1 flex flex-col items-center justify-center p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-emerald-600 dark:text-emerald-500 group">
                  <Download size={24} className="mb-2 group-hover:-translate-y-1 transition-transform" />
                  <span className="font-bold text-sm">Exportar</span>
                </button>
                
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex flex-col items-center justify-center p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-blue-500/10 hover:border-blue-500/30 transition-all text-blue-600 dark:text-blue-500 group">
                  <Upload size={24} className="mb-2 group-hover:-translate-y-1 transition-transform" />
                  <span className="font-bold text-sm">Importar</span>
                </button>
                <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-xs uppercase tracking-widest text-blue-500 font-bold">Sistema</span>
              <button onClick={() => setChangelogOpen(true)} className="w-full flex items-center justify-between p-4 text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl font-bold transition-colors">
                <span className="flex items-center gap-2"><History size={18}/> Ver Changelog de Atualizações</span>
              </button>
            </div>

            <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-xs uppercase tracking-widest text-red-500 font-bold">Zona de Perigo</span>
              <button onClick={() => setConfirmAction('logout')} className="w-full flex items-center justify-between p-4 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl font-bold transition-colors">
                <span className="flex items-center gap-2"><LogOut size={18}/> Sair da Conta</span>
              </button>
              <button onClick={() => setConfirmAction('wipe')} className="w-full flex items-center justify-between p-4 text-red-600 bg-red-500/10 hover:bg-red-500/20 rounded-xl font-bold transition-colors">
                <span className="flex items-center gap-2"><Trash2 size={18}/> Apagar Todos os Dados</span>
              </button>
            </div>

          </div>
        </motion.div>

        {/* MODAL SOBREPOSTO DE CONFIRMAÇÃO (LOGOUT / WIPE) */}
        <AnimatePresence>
          {confirmAction && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
                
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmAction === 'wipe' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                  {confirmAction === 'wipe' ? <AlertTriangle size={32} /> : <LogOut size={32} className="ml-1" />}
                </div>
                
                <h3 className="text-xl font-black mb-2 dark:text-white">
                  {confirmAction === 'wipe' ? 'Destruir Cofre?' : 'Sair da Conta?'}
                </h3>
                
                <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">
                  {confirmAction === 'wipe' 
                    ? 'Esta ação é irreversível. Todos os seus dados locais e na nuvem serão permanentemente apagados.' 
                    : isLocalMode
                      ? 'Atenção! Você está no Modo Local. Como seus dados não estão na nuvem, sair da conta irá APAGAR TUDO permanentemente.'
                      : 'Sua sessão local será encerrada. Você precisará da sua Chave Mestra para descriptografar a nuvem ao acessar novamente.'}
                </p>

                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="flex-1 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                  <button onClick={confirmAction === 'wipe' ? handleWipeData : handleLogout} className={`flex-1 p-3 rounded-xl text-white font-bold transition-colors ${confirmAction === 'wipe' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                    {confirmAction === 'wipe' ? 'Destruir' : 'Sair'}
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </AnimatePresence>
  );
};