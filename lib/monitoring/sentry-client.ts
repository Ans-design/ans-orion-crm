'use client';

/**
 * Sentry client — import dynamique uniquement si DSN activé.
 * Évite de tirer OpenTelemetry / require-in-the-middle dans le bundle local.
 */

let initialized = false;
let sentryMod: typeof import('@sentry/nextjs') | null = null;

function clientDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined;
}

function clientEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'false') return false;
  return Boolean(clientDsn());
}

export function initSentryClient(): boolean {
  if (initialized || typeof window === 'undefined' || !clientEnabled()) return false;
  const dsn = clientDsn();
  if (!dsn) return false;

  // Sync path kept for callers that expect immediate init after dynamic load.
  void ensureSentry().then((Sentry) => {
    if (!Sentry || initialized) return;
    Sentry.init({
      dsn,
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
        process.env.NODE_ENV ||
        'development',
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      initialScope: {
        tags: { app: 'ANS ORION' },
      },
    });
    initialized = true;
  });

  return true;
}

async function ensureSentry() {
  if (!clientEnabled()) return null;
  if (!sentryMod) {
    sentryMod = await import('@sentry/nextjs');
  }
  return sentryMod;
}

export function captureClientException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!clientEnabled()) return;
  void ensureSentry().then((Sentry) => {
    if (!Sentry) return;
    if (!initialized) {
      const dsn = clientDsn();
      if (!dsn) return;
      Sentry.init({
        dsn,
        environment:
          process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
          process.env.NODE_ENV ||
          'development',
        tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        initialScope: {
          tags: { app: 'ANS ORION' },
        },
      });
      initialized = true;
    }
    Sentry.captureException(error, context ? { extra: context } : undefined);
  });
}
