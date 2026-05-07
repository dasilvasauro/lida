import { useState, useEffect, useRef } from 'react';
import { useConfigStore, triggerBack } from './store/useConfigStore';
import { useTaskStore } from './store/useTaskStore';
import { ThemeWrapper } from './components/layout/ThemeWrapper';
import { AuthScreen } from './features/auth/AuthScreen';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { TaskDashboard } from './features/tasks/TaskDashboard';
import { HabitDashboard } from './features/habits/HabitDashboard';
import { NotesDashboard } from './features/notes/NotesDashboard';
import { ShopDashboard } from './features/shop/ShopDashboard';
import { ProfileDashboard } from './features/profile/ProfileDashboard';
import { FocusMode } from './features/tasks/FocusMode';
import { DailySummaryModal } from './features/daily/DailySummaryModal';
import { Navbar, type Tab } from './components/layout/Navbar';
import { AnimatePresence, motion } from 'framer-motion';
import { startCloudListener, stopCloudListener, setupAutoSync, syncToCloud } from './lib/cloudSync';
import { WifiOff, LogOut, Check, CloudLightning } from 'lucide-react';
import { LevelUpModal } from './components/ui/LevelUpModal';

function App() {
  const config = useConfigStore();
  const tasks = useTaskStore();
  
  const [currentTab, setCurrentTab] = useState<Tab>('tasks');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const isAuth = (config.uid && config.e2eePin) || config.isLocalMode;

  const currentTabRef = useRef(currentTab);
  useEffect(() => { currentTabRef.current = currentTab; }, [currentTab]);

  const handleTabSwitch = (tab: Tab) => {
    setCurrentTab(tab);
    config.setVisionOpen(false); config.setSettingsOpen(false);
    config.setGoogleConnectOpen(false); config.setChangelogOpen(false);
  };

  // === SISTEMA DE NAVEGAÇÃO PWA UNIFICADO ===
  useEffect(() => {
    const TRAP_HASH = '#app';

    // Comando mestre para encerrar o PWA
    const handleForceExit = () => {
      // Recua 10 estados para garantir que limpa qualquer trava de hash e sai do container PWA
      window.history.go(-10);
      setTimeout(() => {
        window.close();
        // Fallback caso o window.close seja bloqueado
        window.location.href = "about:blank"; 
      }, 100); 
    };

    const lockHistory = () => { 
      if (window.location.hash !== TRAP_HASH) {
        window.history.pushState({ trap: true }, '', window.location.pathname + TRAP_HASH); 
      }
    };
    
    lockHistory();
    const forceLock = () => lockHistory();
    document.addEventListener('click', forceLock, { passive: true });
    document.addEventListener('touchstart', forceLock, { passive: true });

    const executeBackAction = (): boolean => {
      if (triggerBack()) return true;

      const c = useConfigStore.getState();
      const t = useTaskStore.getState();

      if (t.isGlobalModalOpen || t.isRoutineModalOpen) { window.dispatchEvent(new CustomEvent('request-modal-close')); return true; }
      if (t.isFocusModeOpen) { t.toggleFocusMode(false); return true; }
      if (c.isVisionOpen) { c.setVisionOpen(false); return true; }
      if (c.isSettingsOpen) { c.setSettingsOpen(false); return true; }
      if (c.isGoogleConnectOpen) { c.setGoogleConnectOpen(false); return true; }
      if (c.isChangelogOpen) { c.setChangelogOpen(false); return true; }

      if (currentTabRef.current !== 'tasks') {
        setCurrentTab('tasks');
        return true;
      }

      if (c.isExitModalOpen) { 
        c.setExitModalOpen(false); 
        return false; // Indica que deve sair agora
      }

      if (c.showExitWarning) {
        c.setExitModalOpen(true);
        return true; 
      }
      
      return false; 
    };

    const handlePopState = () => {
      const handled = executeBackAction();
      if (handled) {
        lockHistory();
      } else {
        handleForceExit();
      }
    };

    const handleInternalBack = () => {
        const handled = executeBackAction();
        // CORREÇÃO: Se o gesto for feito em Tarefas e retornar false, fecha o app
        if (!handled) handleForceExit();
    };

    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') executeBackAction(); };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('lida-internal-back', handleInternalBack);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('force-app-exit', handleForceExit);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('lida-internal-back', handleInternalBack);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('force-app-exit', handleForceExit);
      window.removeEventListener('click', forceLock);
      window.removeEventListener('touchstart', forceLock);
    };
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      const { uid, e2eePin, isLocalMode } = useConfigStore.getState();
      if (!isLocalMode && uid && e2eePin) {
        setSyncMessage("Conexão restaurada. Sincronizando dados...");
        await syncToCloud(); 
        setSyncMessage("Nuvem atualizada com sucesso!");
        setTimeout(() => setSyncMessage(null), 4000);
      }
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    if (!config.isLocalMode && config.uid && config.e2eePin && config.isOnboarded) {
      startCloudListener(config.uid, config.e2eePin); 
      const stopAutoSync = setupAutoSync(); 
      return () => { stopCloudListener(); stopAutoSync(); };
    }
  }, [config.uid, config.e2eePin, config.isOnboarded, config.isLocalMode]);

  return (
    <ThemeWrapper>
      <LevelUpModal />
      <AnimatePresence>
        {isOffline && !config.isLocalMode && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-amber-500 text-white font-bold text-xs py-2 px-4 flex justify-center items-center gap-2 z-[999] relative">
            <WifiOff size={14} /> Você está offline.
          </motion.div>
        )}
        {syncMessage && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-emerald-500 text-white font-bold text-xs py-2 px-4 flex justify-center items-center gap-2 z-[999] relative">
            <CloudLightning size={14} /> {syncMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {isAuth && config.isOnboarded && <DailySummaryModal />}

      <AnimatePresence mode="wait">
        {!isAuth ? (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}><AuthScreen /></motion.div>
        ) : !config.isOnboarded ? (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}><OnboardingFlow /></motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="relative min-h-screen pb-24">
            <AnimatePresence mode="wait">
              <motion.div key={currentTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {currentTab === 'tasks' && <TaskDashboard />}
                {currentTab === 'habits' && <HabitDashboard />}
                {currentTab === 'notes' && <NotesDashboard />}
                {currentTab === 'shop' && <ShopDashboard />}
                {currentTab === 'profile' && <ProfileDashboard />}
              </motion.div>
            </AnimatePresence>

            {!tasks.isGlobalModalOpen && !tasks.isRoutineModalOpen && !tasks.isFocusModeOpen && (
              <Navbar currentTab={currentTab} setCurrentTab={handleTabSwitch} />
            )}
            <FocusMode />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {config.isExitModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><LogOut size={32} className="ml-1" /></div>
              <h3 className="text-xl font-black mb-2 dark:text-white">Sair do Lida?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm font-medium">Deseja fechar o aplicativo?</p>
              
              <label className="flex items-center justify-center gap-3 mb-6 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={!config.showExitWarning}
                  className="w-5 h-5 rounded border-2 border-zinc-300 dark:border-zinc-700 accent-blue-500 transition-colors cursor-pointer" 
                  onChange={(e) => config.setShowExitWarning(!e.target.checked)} 
                />
                <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Não perguntar novamente</span>
              </label>

              <div className="flex gap-3">
                <button onClick={() => config.setExitModalOpen(false)} className="flex-1 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold transition-colors">Cancelar</button>
                <button onClick={() => window.dispatchEvent(new CustomEvent('force-app-exit'))} className="flex-1 p-3 rounded-xl bg-blue-600 text-white font-bold transition-colors">Sair</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeWrapper>
  );
}

export default App;