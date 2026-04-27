import { useState, useEffect } from 'react';
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
import { WifiOff } from 'lucide-react';

function App() {
  const { uid, e2eePin, isOnboarded } = useConfigStore();
  const [currentTab, setCurrentTab] = useState<Tab>('tasks');
  const isGlobalModalOpen = useTaskStore((state) => state.isGlobalModalOpen);
  const isFocusModeOpen = useTaskStore((state) => state.isFocusModeOpen);
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // SERVIÇO DE SINCRONIZAÇÃO (REAL-TIME + BACKUP)
  useEffect(() => {
    if (uid && e2eePin && isOnboarded) {
      startCloudListener(uid, e2eePin); // Inicia o túnel de tempo real (baixa dados)
      const stopAutoSync = setupAutoSync(); // Inicia o espião de cliques (sobe dados instantaneamente)

      return () => {
        stopCloudListener();
        stopAutoSync();
      };
    }
  }, [uid, e2eePin, isOnboarded]);

  return (
    <ThemeWrapper>
      
      <AnimatePresence>
        {isOffline && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-amber-500 text-white dark:bg-amber-600 font-bold text-xs py-2 px-4 flex justify-center items-center gap-2 z-[999] relative">
            <WifiOff size={14} /> Você está offline. As alterações serão sincronizadas quando reconectar.
          </motion.div>
        )}
      </AnimatePresence>

      {uid && e2eePin && isOnboarded && <DailySummaryModal />}

      <AnimatePresence mode="wait">
        {(!uid || !e2eePin) ? (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <AuthScreen />
          </motion.div>
        ) : !isOnboarded ? (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 0.6, ease: "easeInOut" }}>
            <OnboardingFlow />
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }} className="relative min-h-screen pb-24">
            
            {currentTab === 'tasks' && <TaskDashboard />}
            {currentTab === 'habits' && <HabitDashboard />}
            {currentTab === 'shop' && <ShopDashboard />}
            {currentTab === 'profile' && <ProfileDashboard />}

            {!isGlobalModalOpen && !isFocusModeOpen && (
              <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
            )}

            <FocusMode />
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeWrapper>
  );
}

export default App;