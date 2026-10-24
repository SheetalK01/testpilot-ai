import { config } from './config';

/**
 * Error tracking with Sentry, loaded only when VITE_SENTRY_DSN is set so local builds stay lean.
 * Sentry's global handlers then report uncaught errors and unhandled promise rejections.
 */
let sentry = null;

export async function initMonitoring() {
  if (!config.sentryDsn) return;
  sentry = await import('@sentry/react');
  sentry.init({
    dsn: config.sentryDsn,
    release: config.release,
    environment: config.demoMode ? 'production' : 'development',
    sendDefaultPii: false,
    // Errors only: performance tracing would use up the free quota quickly.
    tracesSampleRate: 0,
  });
}

export function reportError(error, context) {
  if (sentry) sentry.captureException(error, { extra: context });
}
