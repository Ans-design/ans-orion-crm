import {
  getSentryDsn,
  getSentryEnvironment,
  getSentryTracesSampleRate,
  isSentryEnabled,
  SENTRY_APP_NAME,
} from './sentry-config';

type SentryModule = typeof import('@sentry/nextjs');

let initialized = false;
let sentry: SentryModule | null = null;

/**
 * Charge @sentry/nextjs seulement si un DSN est configuré.
 * Évite le warning webpack `require-in-the-middle` / OpenTelemetry en local sans Sentry.
 */
export async function initSentryServer(): Promise<boolean> {
  if (initialized || !isSentryEnabled()) return false;
  const dsn = getSentryDsn();
  if (!dsn) return false;

  sentry = await import('@sentry/nextjs');
  sentry.init({
    dsn,
    environment: getSentryEnvironment(),
    tracesSampleRate: getSentryTracesSampleRate(),
    initialScope: {
      tags: { app: SENTRY_APP_NAME },
    },
  });

  initialized = true;
  return true;
}

export function captureServerException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized || !sentry) return;
  sentry.captureException(error, context ? { extra: context } : undefined);
}

export function captureServerMessage(
  message: string,
  level: import('@sentry/nextjs').SeverityLevel = 'info',
  context?: Record<string, unknown>,
): void {
  if (!initialized || !sentry) return;
  sentry.captureMessage(message, { level, extra: context });
}
