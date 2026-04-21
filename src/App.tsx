import { useState } from 'react';
import { useConfigStore } from './store/useConfigStore';
import { useTaskStore } from './store/useTaskStore';
import { ThemeWrapper } from './components/layout/ThemeWrapper';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { TaskDashboard } from './features/tasks/TaskDashboard';
import { HabitDashboard } from './features/habits/HabitDashboard';
import { FocusMode } from './features/tasks/FocusMode';
import { Navbar, type Tab } from './components/layout/Navbar';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const isOnboarded = useConfigStore((state) => state.isOnboarded);
  const [currentTab, setCurrentTab] = useState<Tab>('tasks');
  const isGlobalModalOpen = useTaskStore((state) => state.isGlobalModalOpen);
  const isFocusModeOpen = useTaskStore((state) => state.isFocusModeOpen);

  return (
    <ThemeWrapper>
    <AnimatePresence mode="wait">
    {!isOnboarded ? (
      <motion.div
      key="onboarding"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      >
      <OnboardingFlow />
      </motion.div>
    ) : (
      <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
      className="relative min-h-screen pb-24"
      >
      {currentTab === 'tasks' && <TaskDashboard />}
      {currentTab === 'habits' && <HabitDashboard />}
      {currentTab === 'shop' && <div className="p-8 text-center mt-20">Tela de Loja em construção...</div>}
      {currentTab === 'profile' && <div className="p-8 text-center mt-20">Tela de Perfil em construção...</div>}

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
