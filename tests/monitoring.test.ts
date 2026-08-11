import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

vi.mock('@/lib/with-timeout', () => ({
  withTimeout: <T,>(p: Promise<T>) => p,
}));

import { probeReadiness } from '@/lib/monitoring/ready-probe';

describe('probeReadiness', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.DATABASE_URL = 'file:./prisma/test.db';
    process.env.NEXTAUTH_SECRET = 'test-secret-minimum-32-characters-long';
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('retourne un rapport avec checks env, database, sentry', async () => {
    const report = await probeReadiness();
    expect(report.checks.map((c) => c.name)).toEqual(['env', 'database', 'sentry']);
    expect(report.timestamp).toBeTruthy();
    expect(report.runtime).toBeTruthy();
  });
});

describe('/api/health/ready', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.DATABASE_URL = 'file:./prisma/test.db';
    process.env.NEXTAUTH_SECRET = 'test-secret-minimum-32-characters-long';
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('répond 200 quand les checks passent', async () => {
    const { GET } = await import('@/app/api/health/ready/route');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.checks).toHaveLength(3);
  });
});

describe('sentry config', () => {
  it('désactivé sans DSN', async () => {
    const prev = process.env.SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const { isSentryEnabled } = await import('@/lib/monitoring/sentry-config');
    expect(isSentryEnabled()).toBe(false);
    if (prev) process.env.SENTRY_DSN = prev;
  });
});
