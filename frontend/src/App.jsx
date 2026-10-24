import { Route, Routes } from 'react-router-dom';
import DemoBanner from './components/DemoBanner';
import AppShell from './components/layout/AppShell';
import ProtectedRoute, { FullPageSpinner } from './components/ProtectedRoute';
import WakeUpScreen from './components/WakeUpScreen';
import { useAuth } from './contexts/AuthContext';
import { useServerStatus } from './contexts/ServerStatusContext';
import { tokenStore } from './services/api';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ProjectPage from './pages/ProjectPage';
import RegisterPage from './pages/RegisterPage';
import StoryPage from './pages/StoryPage';

/** Pages that need the API wait behind a friendly loader while a sleeping server wakes up. */
function NeedsServer({ children }) {
  const { status } = useServerStatus();
  if (status === 'waking' || status === 'down') return <WakeUpScreen />;
  return children;
}

/** "/" is the marketing page for visitors and the dashboard for signed-in users. */
function Home() {
  const { user, status } = useAuth();
  // The landing page is static, so visitors see it at once even if the server is still asleep.
  if (!tokenStore.get() && !user) return <LandingPage />;
  return (
    <NeedsServer>
      {status === 'loading' ? (
        <FullPageSpinner />
      ) : !user ? (
        <LandingPage />
      ) : (
        <AppShell>
          <DashboardPage />
        </AppShell>
      )}
    </NeedsServer>
  );
}

function Protected({ children }) {
  return (
    <NeedsServer>
      <ProtectedRoute>
        <AppShell>{children}</AppShell>
      </ProtectedRoute>
    </NeedsServer>
  );
}

export default function App() {
  return (
    <>
      <DemoBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <NeedsServer>
              <LoginPage />
            </NeedsServer>
          }
        />
        <Route
          path="/register"
          element={
            <NeedsServer>
              <RegisterPage />
            </NeedsServer>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <Protected>
              <ProjectPage />
            </Protected>
          }
        />
        <Route
          path="/stories/:storyId"
          element={
            <Protected>
              <StoryPage />
            </Protected>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
