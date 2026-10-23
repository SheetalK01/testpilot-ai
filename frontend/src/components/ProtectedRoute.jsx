import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './ui/Spinner';

export function FullPageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center text-accent">
      <Spinner className="size-6" label="Loading" />
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
