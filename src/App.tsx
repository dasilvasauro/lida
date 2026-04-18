import { useConfigStore } from './store/useConfigStore';
import { ThemeWrapper } from './components/layout/ThemeWrapper';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { TaskDashboard } from './features/tasks/TaskDashboard';
import { FocusMode } from './features/tasks/FocusMode';

function App() {
  const isOnboarded = useConfigStore((state) => state.isOnboarded);

  return (
    <ThemeWrapper>
    {!isOnboarded ? (
      <OnboardingFlow />
    ) : (
      <>
      <TaskDashboard />
      <FocusMode />
      </>
    )}
    </ThemeWrapper>
  );
}

export default App;
