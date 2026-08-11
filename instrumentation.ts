export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { loadBundledProductionEnv } = await import('./lib/bundled-production-env');
    const { ensureAuthRuntimeEnv } = await import('./lib/auth-runtime-url');
    const { resolveDatabaseUrl } = await import('./lib/database-url');
    loadBundledProductionEnv();
    ensureAuthRuntimeEnv();
    resolveDatabaseUrl();

    const { assertProductionSecurityBoot } = await import('./lib/security/assert-production-boot');
    assertProductionSecurityBoot();

    const { isSentryEnabled } = await import('./lib/monitoring/sentry-config');
    if (isSentryEnabled()) {
      const { initSentryServer } = await import('./lib/monitoring/sentry-server');
      await initSentryServer();
    }

    if (!process.env.DATABASE_URL?.startsWith('postgres')) {
      const { prepareDemoDatabase } = await import('./lib/demo-database');
      prepareDemoDatabase();
    }
  }
}
