import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/login-account-lookup', () => ({
  lookupAccountGate: vi.fn(),
}));

vi.mock('@/lib/login-guard', () => ({
  checkLoginAllowed: vi.fn(() => ({ ok: true, remaining: 5, limit: 10 })),
}));

describe('login-check route', () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env };
    vi.stubEnv('APP_ENV', 'local');
    vi.stubEnv('LOCAL_AUTH_ENABLED', 'true');
    vi.stubEnv('LOCAL_ADMIN_LOGIN', 'ADM01');
    vi.stubEnv('LOCAL_ADMIN_PASSWORD', 'LocalAdmin8');
    delete process.env.USE_PRODUCTION_DB;
    delete process.env.HOSTINGER;
  });

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllEnvs();
  });

  it('bypass local avec credentials env (sans Prisma)', async () => {
    const { POST } = await import('@/app/api/auth/login-check/route');
    const req = new Request('http://localhost:3002/api/auth/login-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'ADM01', password: 'LocalAdmin8' }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.allowed).toBe(true);
    expect(body.local).toBe(true);
    expect(body.user?.role).toBe('admin');
  });

  it('refuse ADM01 hardcodé sans LOCAL_ADMIN_PASSWORD', async () => {
    delete process.env.LOCAL_ADMIN_PASSWORD;
    vi.stubEnv('LOCAL_ADMIN_PASSWORD', '');
    const { POST } = await import('@/app/api/auth/login-check/route');
    const req = new Request('http://localhost:3002/api/auth/login-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'ADM01', password: 'ADM01' }),
    });
    const res = await POST(req as never);
    expect(res.status).not.toBe(200);
  });

  it('fail-closed when account gate throws', async () => {
    const { lookupAccountGate } = await import('@/lib/login-account-lookup');
    vi.mocked(lookupAccountGate).mockRejectedValue(new Error('DB down'));

    const { POST } = await import('@/app/api/auth/login-check/route');
    const req = new Request('http://localhost/api/auth/login-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'demo@ansdesign.mg' }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.allowed).toBe(false);
  });
});
