import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isServerUp } from '../services/api';

const ServerStatusContext = createContext(null);

/** After this long without an answer we assume the free-tier server is asleep and show the loader. */
const SLOW_AFTER_MS = 1500;
const RETRY_EVERY_MS = 2500;
const GIVE_UP_AFTER_MS = 180_000;

/**
 * Free hosting stops idle servers; the first request then takes about a minute while the server
 * boots. This provider pings the backend as soon as the app loads (which also starts the wake-up
 * early, while the visitor reads the landing page) and exposes:
 *   status: 'checking' | 'waking' | 'ready' | 'down', startedAt, whenReady(), retry()
 */
export function ServerStatusProvider({ children }) {
  const [status, setStatus] = useState('checking');
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [attempt, setAttempt] = useState(0);
  const waiters = useRef([]);

  useEffect(() => {
    let cancelled = false;
    const begin = Date.now();
    const slowTimer = setTimeout(() => {
      if (!cancelled) setStatus((current) => (current === 'checking' ? 'waking' : current));
    }, SLOW_AFTER_MS);

    (async () => {
      while (!cancelled) {
        if (await isServerUp()) {
          if (cancelled) return;
          setStatus('ready');
          waiters.current.splice(0).forEach((resolve) => resolve());
          return;
        }
        if (Date.now() - begin > GIVE_UP_AFTER_MS) {
          if (!cancelled) setStatus('down');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_EVERY_MS));
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus('waking');
    setStartedAt(Date.now());
    setAttempt((n) => n + 1);
  }, []);

  const whenReady = useCallback(
    () =>
      status === 'ready'
        ? Promise.resolve()
        : new Promise((resolve) => waiters.current.push(resolve)),
    [status],
  );

  const value = useMemo(
    () => ({ status, startedAt, whenReady, retry }),
    [status, startedAt, whenReady, retry],
  );
  return <ServerStatusContext.Provider value={value}>{children}</ServerStatusContext.Provider>;
}

export function useServerStatus() {
  const context = useContext(ServerStatusContext);
  if (!context) throw new Error('useServerStatus must be used inside <ServerStatusProvider>');
  return context;
}
