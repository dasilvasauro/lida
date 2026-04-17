import { useConfigStore } from './store/useConfigStore';
import { ThemeWrapper } from './components/layout/ThemeWrapper';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { TaskDashboard } from './features/tasks/TaskDashboard';

function App() {
  const isOnboarded = useConfigStore((state) => state.isOnboarded);

  return (
    <ThemeWrapper>
      {!isOnboarded ? (
        <OnboardingFlow />
      ) : (
        <TaskDashboard />
      )}
    </ThemeWrapper>
  );
}

export default App;