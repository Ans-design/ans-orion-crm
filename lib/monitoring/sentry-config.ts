/** Configuration Sentry partagée — activée uniquement si DSN défini. */

export function getSentryDsn(): string | undefined {
  return (
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    undefined
  );
}

export function isSentryEnabled(): boolean {
  if (process.env.SENTRY_ENABLED === 'false') return false;
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'false') return false;
  return Boolean(getSentryDsn());
}

export function getSentryEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development'
  );
}

export function getSentryTracesSampleRate(): number {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1';
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.1;
}

export const SENTRY_APP_NAME = 'ANS ORION';
