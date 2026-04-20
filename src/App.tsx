import { useConfigStore } from './store/useConfigStore';
import { ThemeWrapper } from './components/layout/ThemeWrapper';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { TaskDashboard } from './features/tasks/TaskDashboard';
import { FocusMode } from './features/tasks/FocusMode';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const isOnboarded = useConfigStore((state) => state.isOnboarded);

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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      >
      <TaskDashboard />
      <FocusMode />
      </motion.div>
    )}
    </AnimatePresence>
    </ThemeWrapper>
  );
}

export default App;
