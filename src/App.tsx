import { useState, useEffect, useRef } from 'react';
import { useConfigStore } from './store/useConfigStore';
import { useTaskStore } from './store/useTaskStore';
import { ThemeWrapper } from './components/layout/ThemeWrapper';
import { AuthScreen } from './features/auth/AuthScreen';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { TaskDashboard } from './features/tasks/TaskDashboard';
import { HabitDashboard } from './features/habits/HabitDashboard';
import { ShopDashboard } from './features/shop/ShopDashboard';
import { ProfileDashboard } from './features/profile/ProfileDashboard';
import { FocusMode } from './features/tasks/FocusMode';
import { DailySummaryModal } from './features/daily/DailySummaryModal';
import { Navbar, type Tab } from './components/layout/Navbar';
import { AnimatePresence, motion } from 'framer-motion';
import { startCloudListener, stopCloudListener, setupAutoSync } from './lib/cloudSync';
import { WifiOff, LogOut, Check } from 'lucide-react';
import { LevelUpModal } from './components/ui/LevelUpModal';

function App() {
  const config = useConfigStore();
  const tasks = useTaskStore();
  
  const [currentTab, setCurrentTab] = useState<Tab>('tasks');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const isAuth = (config.uid && config.e2eePin) || config.isLocalMode;

  const currentTabRef = useRef(currentTab);
  useEffect(() => { currentTabRef.current = currentTab; }, [currentTab]);

  // INTERCEPTADOR DO BOTÃO VOLTAR (ANDROID) - VERSÃO INDESTRUTÍVEL
  useEffect(() => {
    // 1. Armadilha inicial de histórico
    window.history.pushState({ id: 'lida-trap' }, '', window.location.href);

    const handlePopState = () => {
      const c = useConfigStore.getState();
      const t = useTaskStore.getState();
      let didHandle = false;

      // A) Se o modal de sair estiver aberto, cancela a saída
      if (c.isExitModalOpen) {
        c.setExitModalOpen(false);
        didHandle = true;
      }
      // B) Se houver modais de fluxo abertos, fecha-os
      else if (t.isGlobalModalOpen || t.isFocusModeOpen || c.isVisionOpen || c.isSettingsOpen || c.isGoogleConnectOpen || c.isChangelogOpen) {
        t.setGlobalModalOpen(false);
        t.toggleFocusMode(false);
        c.setVisionOpen(false);
        c.setSettingsOpen(false);
        c.setGoogleConnectOpen(false);
        c.setChangelogOpen(false);
        didHandle = true;
      }
      // C) Se estiver em outra aba que não a principal, volta pra aba Tarefas
      else if (currentTabRef.current !== 'tasks') {
        setCurrentTab('tasks');
        didHandle = true;
      }

      // Se nós interceptamos o evento, rearmamos a armadilha pro próximo clique
      if (didHandle) {
        window.history.pushState({ id: 'lida-trap' }, '', window.location.href);
      } else {
        // D) NORTE FINAL: Não há modais abertos e já está na tela de tarefas.
        if (c.showExitWarning) {
          c.setExitModalOpen(true);
          // Rearma a armadilha para o usuário poder cancelar com o voltar
          window.history.pushState({ id: 'lida-trap' }, '', window.location.href);
        } else {
          // Sai do app nativamente
          window.history.back();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Evento forçado que apenas o botão "Sair" do modal consegue disparar
    const handleForceExit = () => {
      window.removeEventListener('popstate', handlePopState); // Desliga a armadilha
      window.history.back(); // Sai do app
    };
    window.addEventListener('force-app-exit', handleForceExit);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('force-app-exit', handleForceExit);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false); const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
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
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-amber-500 text-white dark:bg-amber-600 font-bold text-xs py-2 px-4 flex justify-center items-center gap-2 z-[999] relative">
            <WifiOff size={14} /> Você está offline. As alterações serão sincronizadas quando reconectar.
          </motion.div>
        )}
      </AnimatePresence>

      {isAuth && config.isOnboarded && <DailySummaryModal />}

      <AnimatePresence mode="wait">
        {!isAuth ? (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}><AuthScreen /></motion.div>
        ) : !config.isOnboarded ? (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 0.6, ease: "easeInOut" }}><OnboardingFlow /></motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }} className="relative min-h-screen pb-24">
            {currentTab === 'tasks' && <TaskDashboard />}
            {currentTab === 'habits' && <HabitDashboard />}
            {currentTab === 'shop' && <ShopDashboard />}
            {currentTab === 'profile' && <ProfileDashboard />}
            {!tasks.isGlobalModalOpen && !tasks.isFocusModeOpen && <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />}
            <FocusMode />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE SAÍDA DO APP */}
      <AnimatePresence>
        {config.isExitModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><LogOut size={32} className="ml-1" /></div>
              <h3 className="text-xl font-black mb-2 dark:text-white">Sair do Lida?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">Deseja fechar o aplicativo?</p>
              
              <label className="flex items-center justify-center gap-3 mb-6 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer appearance-none w-5 h-5 rounded border-2 border-zinc-300 dark:border-zinc-700 checked:bg-blue-500 checked:border-blue-500 transition-colors cursor-pointer" onChange={(e) => config.setShowExitWarning(!e.target.checked)} />
                  <Check size={14} strokeWidth={4} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                </div>
                <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Não perguntar novamente</span>
              </label>

              <div className="flex gap-3">
                <button onClick={() => config.setExitModalOpen(false)} className="flex-1 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                <button onClick={() => { config.setExitModalOpen(false); window.dispatchEvent(new CustomEvent('force-app-exit')); }} className="flex-1 p-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors">Sair</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeWrapper>
  );
}

export default App;