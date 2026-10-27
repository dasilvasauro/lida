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
import { startCloudListener, stopCloudListener, setupAutoSync, syncToCloud, ensureVaultReady } from './lib/cloudSync';
import { useSyncStatus } from './lib/syncStatus';
import { usePomodoroStore } from './store/usePomodoroStore';
import { useEconomyStore } from './store/useEconomyStore';
import { WifiOff, LogOut, CloudLightning, CloudOff, Timer, X, Loader2, AlertTriangle } from 'lucide-react';
import { LevelUpModal } from './components/ui/LevelUpModal';
import { PomodoroModal } from './features/pomodoro/PomodoroModal';

// === TELA DE CARREGAMENTO (SPLASH) ===
const SplashLoading = () => (
    <motion.div exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.4 }} className="fixed inset-0 z-[9999] bg-white dark:bg-black flex flex-col items-center justify-center text-zinc-900 dark:text-white">
        <Loader2 size={48} className="animate-spin text-blue-500 mb-6" />
        <h2 className="text-xl font-black uppercase tracking-widest mb-2">Descriptografando Cofre</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Sincronizando com a nuvem</p>
    </motion.div>
);

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

// Componente isolado: só ele re-renderiza a cada segundo do Pomodoro.
const PomodoroMiniBar = () => {
  const isOpen = usePomodoroStore((s) => s.isOpen);
  const isMinimized = usePomodoroStore((s) => s.isMinimized);
  const isActive = usePomodoroStore((s) => s.isActive);
  const mode = usePomodoroStore((s) => s.mode);
  const timeLeft = usePomodoroStore((s) => s.timeLeft);
  const setMinimized = usePomodoroStore((s) => s.setMinimized);
  const close = usePomodoroStore((s) => s.close);

  if (!isOpen || !isMinimized) return null;
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
      className="bg-red-600 text-white font-bold text-xs py-2.5 px-6 flex justify-between items-center z-[999] relative cursor-pointer shadow-md"
      onClick={() => setMinimized(false)}>
      <div className="flex items-center gap-2">
        <Timer size={14} className={isActive ? "animate-pulse" : ""} />
        <span className="uppercase tracking-widest text-[10px]">Pomodoro {mode === 'focus' ? 'Foco' : 'Pausa'}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono text-sm tracking-widest">{formatTime(timeLeft)}</span>
        <button onClick={(e) => { e.stopPropagation(); close(); }} className="p-1 hover:bg-red-700 rounded-full transition-colors"><X size={14}/></button>
      </div>
    </motion.div>
  );
};

function App() {
  const config = useConfigStore();
  // Seletores: o App só re-renderiza quando estes campos mudam.
  const isGlobalModalOpen = useTaskStore((s) => s.isGlobalModalOpen);
  const isRoutineModalOpen = useTaskStore((s) => s.isRoutineModalOpen);
  const isFocusModeOpen = useTaskStore((s) => s.isFocusModeOpen);
  const initialSyncDone = useSyncStatus((s) => s.initialSyncDone);
  const [syncAlert, setSyncAlert] = useState<{ type: 'error' | 'warning'; message: string } | null>(null);
  
  const [currentTab, setCurrentTab] = useState<Tab>('tasks');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  const [isAppReady, setIsAppReady] = useState(false);

  // e2eePin: só durante a migração automática de quem vem da versão antiga.
  const isAuth = (config.uid && (config.hasVaultKey || config.e2eePin)) || config.isLocalMode;

  const currentTabRef = useRef(currentTab);
  useEffect(() => { currentTabRef.current = currentTab; }, [currentTab]);

  // === VALIDADOR DE CARREGAMENTO DA NUVEM (SPLASH SCREEN LOGIC) ===
  useEffect(() => {
      if (!isAuth || config.isLocalMode || config.isManualOffline) {
          setIsAppReady(true);
          return;
      }
      
      if (initialSyncDone) {
          setIsAppReady(true);
          return;
      }
      
      // Força a liberação após 6 segundos. A virada do dia (DailySummaryModal)
      // continua esperando o primeiro sync para não processar dados antigos.
      const timeout = setTimeout(() => setIsAppReady(true), 6000);
      return () => clearTimeout(timeout);
  }, [isAuth, config.isLocalMode, config.isManualOffline, initialSyncDone]);

  // === AVISOS DO MOTOR DE SINCRONIZAÇÃO ===
  useEffect(() => {
      let hideTimer: ReturnType<typeof setTimeout> | null = null;
      const handleStatus = (e: Event) => {
          const detail = (e as CustomEvent<{ type: 'error' | 'warning'; message: string }>).detail;
          setSyncAlert(detail);
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = setTimeout(() => setSyncAlert(null), detail.type === 'error' ? 10000 : 6000);
      };
      window.addEventListener('lida-sync-status', handleStatus);
      return () => { window.removeEventListener('lida-sync-status', handleStatus); if (hideTimer) clearTimeout(hideTimer); };
  }, []);

  const handleTabSwitch = (tab: Tab) => {
    setCurrentTab(tab);
    config.setVisionOpen(false); config.setSettingsOpen(false);
    config.setGoogleConnectOpen(false); config.setChangelogOpen(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const TRAP_HASH = '#app';
    let isTrapped = false;

    const lockHistory = () => {
      if (!isTrapped && window.location.hash !== TRAP_HASH) {
        window.history.pushState({ trap: true }, '', window.location.pathname + TRAP_HASH);
        isTrapped = true;
      }
    };

    lockHistory();
    const forceLockOnInteract = () => lockHistory();
    document.addEventListener('click', forceLockOnInteract, { passive: true });
    document.addEventListener('touchstart', forceLockOnInteract, { passive: true });

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
        c.setVisionOpen(false); c.setSettingsOpen(false); c.setGoogleConnectOpen(false); c.setChangelogOpen(false);
        return true;
      }

      if (c.isExitModalOpen) { c.setExitModalOpen(false); return false; }
      if (c.showExitWarning) { c.setExitModalOpen(true); return true; }
      return false; 
    };

    const handlePopState = () => {
      isTrapped = false;
      const handled = executeBackAction();
      if (handled) { lockHistory(); } 
      else { window.removeEventListener('popstate', handlePopState); window.history.back(); }
    };

    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { const handled = executeBackAction(); if (!handled) window.history.back(); } };
    const handleForceExit = () => { window.history.back(); setTimeout(() => window.close(), 100); };
    const handleInternalBack = () => { executeBackAction(); };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('force-app-exit', handleForceExit);
    window.addEventListener('lida-internal-back', handleInternalBack as EventListener);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('force-app-exit', handleForceExit);
      window.removeEventListener('lida-internal-back', handleInternalBack as EventListener);
      document.removeEventListener('click', forceLockOnInteract);
      document.removeEventListener('touchstart', forceLockOnInteract);
    };
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      const { uid, hasVaultKey, isLocalMode, isManualOffline } = useConfigStore.getState();
      if (!isLocalMode && !isManualOffline && uid && hasVaultKey) {
        setSyncMessage("Conexão restaurada. Sincronizando dados...");
        try {
          await syncToCloud();
          setSyncMessage("Nuvem atualizada com sucesso");
        } catch {
          setSyncMessage(null);
          return;
        }
        setTimeout(() => setSyncMessage(null), 4000);
      }
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [config.uid, config.hasVaultKey, config.isLocalMode, config.isManualOffline]);

  useEffect(() => {
    if (config.isLocalMode || config.isManualOffline || !config.uid || !config.isOnboarded) {
      stopCloudListener();
      return;
    }
    // Carrega a chave do cofre (ou migra da versão antiga) antes de ligar a sincronização.
    let cancelled = false;
    let stopAutoSync: (() => void) | null = null;
    const start = async () => {
      if (stopAutoSync) return;
      const readiness = await ensureVaultReady();
      if (cancelled || readiness !== 'ready') return;
      startCloudListener();
      stopAutoSync = setupAutoSync();
    };
    start();
    const retryOnline = () => { start(); };
    window.addEventListener('online', retryOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', retryOnline);
      stopCloudListener();
      if (stopAutoSync) stopAutoSync();
    };
  }, [config.uid, config.hasVaultKey, config.isOnboarded, config.isLocalMode, config.isManualOffline]);

  // === MOTOR GLOBAL DO POMODORO E SINTETIZADOR NATIVO ===
  useEffect(() => {
      let audioCtx: AudioContext | null = null;
      const getAudioCtx = () => {
         if (!audioCtx) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
         }
         if (audioCtx.state === 'suspended') audioCtx.resume();
         return audioCtx;
      };

      const playTick = () => {
         try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(120, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.015, ctx.currentTime); 
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05);
         } catch(e) {}
      };

      const playBell = () => {
          try {
              const ctx = getAudioCtx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.type = 'sine';
              osc.frequency.setValueAtTime(800, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 1.5);
              gain.gain.setValueAtTime(0.8, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
              osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5);
          } catch(e) {}
      };

      const playChime = () => {
           try {
              const ctx = getAudioCtx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(1200, ctx.currentTime);
              gain.gain.setValueAtTime(0.5, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
              osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1);
          } catch(e) {}
      };

      const runTick = () => {
          const pomodoro = usePomodoroStore.getState();
          if (!pomodoro.isActive) return;
          if (pomodoro.soundEnabled && document.visibilityState === 'visible') playTick();
          const { rang, vouchers } = pomodoro.tick();
          const soundEnabled = usePomodoroStore.getState().soundEnabled;
          if (rang && soundEnabled) playBell();
          if (vouchers > 0) {
              useEconomyStore.getState().addVouchers(vouchers);
              if (soundEnabled) playChime();
          }
      };

      const interval = setInterval(runTick, 1000);
      // Ao voltar para o app, recupera imediatamente o tempo que passou em segundo plano.
      const handleVisibility = () => { if (document.visibilityState === 'visible') runTick(); };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
          clearInterval(interval);
          document.removeEventListener('visibilitychange', handleVisibility);
      };
  }, []);

  return (
    <ThemeWrapper>
      <LevelUpModal />
      <PomodoroModal />
      
      <AnimatePresence mode="wait">
         {!isAppReady && <SplashLoading key="splash" />}
      </AnimatePresence>

      {isAppReady && (
          <AnimatePresence>
            {/* BARRA GLOBAL DO POMODORO MINIMIZADO */}
            <PomodoroMiniBar key="pomodoro-bar" />

            {config.isManualOffline && !config.isLocalMode && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-blue-500 text-white font-bold text-xs py-2 px-4 flex justify-center items-center gap-2 z-[999] relative">
                <CloudOff size={14} /> Offline Manual. Salvando apenas no dispositivo.
              </motion.div>
            )}

            {isOffline && !config.isLocalMode && !config.isManualOffline && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-amber-500 text-white font-bold text-xs py-2 px-4 flex justify-center items-center gap-2 z-[999] relative">
                <WifiOff size={14} /> Você está offline.
              </motion.div>
            )}
            
            {syncAlert && (
              <motion.div key="sync-alert" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`${syncAlert.type === 'error' ? 'bg-red-600' : 'bg-amber-500'} text-white font-bold text-xs py-2 px-4 flex justify-center items-center gap-2 z-[999] relative text-center`} onClick={() => setSyncAlert(null)}>
                <AlertTriangle size={14} className="shrink-0" /> {syncAlert.message}
              </motion.div>
            )}

            {syncMessage && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-emerald-500 text-white font-bold text-xs py-2 px-4 flex justify-center items-center gap-2 z-[999] relative">
                <CloudLightning size={14} /> {syncMessage}
              </motion.div>
            )}
          </AnimatePresence>
      )}

      {isAppReady && isAuth && config.isOnboarded && <DailySummaryModal />}

      {isAppReady && (
          <AnimatePresence mode="wait">
            {!isAuth ? (
              <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}><AuthScreen /></motion.div>
            ) : !config.isOnboarded ? (
              <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 0.6 }}><OnboardingFlow /></motion.div>
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

                {!isGlobalModalOpen && !isRoutineModalOpen && !isFocusModeOpen && (
                  <Navbar currentTab={currentTab} setCurrentTab={handleTabSwitch} />
                )}
                <FocusMode />
              </motion.div>
            )}
          </AnimatePresence>
      )}

      {isAppReady && (
          <AnimatePresence>
            {config.isExitModalOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><LogOut size={32} className="ml-1" /></div>
                  <h3 className="text-xl font-black mb-2 dark:text-white">Sair do Lida?</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm font-medium">Deseja fechar o aplicativo?</p>
                  
                  <label className="flex items-center justify-center gap-3 mb-6 cursor-pointer group">
                    <input type="checkbox" checked={!config.showExitWarning} className="w-5 h-5 rounded border-2 border-zinc-300 dark:border-zinc-700 accent-blue-500 transition-colors cursor-pointer" onChange={(e) => config.setShowExitWarning(!e.target.checked)} />
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
      )}
    </ThemeWrapper>
  );
}

export default App;
