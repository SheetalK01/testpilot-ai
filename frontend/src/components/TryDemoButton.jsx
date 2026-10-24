import { PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useServerStatus } from '../contexts/ServerStatusContext';
import { useToast } from '../contexts/ToastContext';
import Button from './ui/Button';

/** Creates a private, pre-filled demo account and opens its dashboard. No sign-up needed. */
export default function TryDemoButton({ variant = 'secondary', size = 'lg', className }) {
  const { startDemo } = useAuth();
  const { status, whenReady } = useServerStatus();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      await whenReady();
      await startDemo();
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  const waking = busy && status !== 'ready';
  return (
    <Button
      variant={variant}
      size={size}
      icon={PlayCircle}
      loading={busy}
      onClick={start}
      className={className}
      data-testid="try-demo"
    >
      {waking ? 'Waking up the server…' : 'Try the demo'}
    </Button>
  );
}
