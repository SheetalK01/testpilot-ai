import { RefreshCw, Server } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useServerStatus } from '../contexts/ServerStatusContext';
import { LogoMark } from './layout/Logo';
import Button from './ui/Button';

const TYPICAL_WAKE_SECONDS = 60;

function useElapsedSeconds(since) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, Math.round((now - since) / 1000));
}

/** Full-page loader shown while a sleeping free-tier server boots (about a minute). */
export default function WakeUpScreen() {
  const { status, startedAt, retry } = useServerStatus();
  const elapsed = useElapsedSeconds(startedAt);
  const progress = Math.min(95, Math.round((elapsed / TYPICAL_WAKE_SECONDS) * 100));
  const down = status === 'down';

  return (
    <div className="bg-glow grid min-h-dvh place-items-center px-6" data-testid="wake-up-screen">
      <main id="main" className="w-full max-w-md text-center">
        <LogoMark className="mx-auto size-12" />
        <div className="mt-8 flex items-center justify-center gap-3 text-accent-fg">
          <Server className="size-5 motion-safe:animate-pulse" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-fg">
            {down ? 'The server is taking too long' : 'Waking up the server…'}
          </h1>
        </div>
        <p className="mt-3 text-muted">
          {down
            ? 'It did not answer within 3 minutes. Please try again.'
            : 'This live demo runs on free hosting that sleeps when nobody is using it. The first visit takes about a minute; after that it is fast.'}
        </p>
        {!down && (
          <div className="mt-8" role="status" aria-live="polite">
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-label="Server start-up progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-subtle tabular-nums">{elapsed}s elapsed</p>
          </div>
        )}
        {down && (
          <Button className="mt-8" icon={RefreshCw} onClick={retry}>
            Try again
          </Button>
        )}
      </main>
    </div>
  );
}
