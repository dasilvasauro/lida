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
import { syncToCloud } from './lib/cloudSync';

function App() {
  const { uid, e2eePin, isOnboarded } = useConfigStore();
  const [currentTab, setCurrentTab] = useState<Tab>('tasks');
  const isGlobalModalOpen = useTaskStore((state) => state.isGlobalModalOpen);
  const isFocusModeOpen = useTaskStore((state) => state.isFocusModeOpen);

  // SERVIÇO DE SINCRONIZAÇÃO AUTOMÁTICA DE FUNDO
  useEffect(() => {
    if (uid && e2eePin && isOnboarded) {
      const interval = setInterval(() => {
        syncToCloud().catch(console.error); // Envia para o Firestore a cada 1 minuto
      }, 60000); 
      return () => clearInterval(interval);
    }
  }, [uid, e2eePin, isOnboarded]);

  return (
    <ThemeWrapper>
      
      {/* SÓ MOSTRA O RITUAL SE ESTIVER TOTALMENTE LOGADO */}
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