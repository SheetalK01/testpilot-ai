import { Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute, { FullPageSpinner } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ProjectPage from './pages/ProjectPage';
import RegisterPage from './pages/RegisterPage';
import StoryPage from './pages/StoryPage';

/** "/" is the marketing page for visitors and the dashboard for signed-in users. */
function Home() {
  const { user, status } = useAuth();
  if (status === 'loading') return <FullPageSpinner />;
  if (!user) return <LandingPage />;
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  );
}

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
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
  );
}
