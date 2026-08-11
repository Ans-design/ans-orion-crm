/**
 * SEC — tests négatifs production / rate-limit / seeds / headers.
 * Ne contient aucun secret réel.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  CSP_ENFORCE_POLICY,
  CSP_REPORT_ONLY_POLICY,
  SECURITY_HEADERS,
} from '@/lib/security-headers';
import {
  enforceRateLimit,
  resetRateLimit,
} from '@/lib/rate-limit';
import {
  RATE_LIMIT_POLICIES,
  requiresDistributedRateLimitStore,
  isRateLimitCriticalKey,
} from '@/lib/rate-limit-policy';
import { assertProductionSecurityBoot } from '@/lib/security/assert-production-boot';

const envBackup = { ...process.env };

describe('SEC production négatifs', () => {
  beforeEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllEnvs();
  });

  it('seed-demo n’embarque plus de littéral Demo2026! / johndoe123', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/seed-demo.ts'), 'utf8');
    expect(src).not.toMatch(/Demo2026!/);
    expect(src).not.toMatch(/johndoe123/);
    expect(src).toMatch(/SEED_DEMO_PASSWORD/);
    expect(src).toMatch(/assertLocalOnly|interdit hors/);
  });

  it('create-admin / reset-admin sans défaut faible', () => {
    for (const rel of ['scripts/create-admin.ts', 'scripts/reset-admin-password.ts']) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      expect(src).not.toMatch(/johndoe123/);
      expect(src).not.toMatch(/\|\|\s*['"]johndoe/);
      expect(src).toMatch(/ADMIN_PASSWORD/);
      expect(src).toMatch(/mustChangePassword/);
    }
  });

  it('setup-production-db ne logge plus de couples email/MDP connus', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/setup-production-db.mjs'), 'utf8');
    expect(src).not.toMatch(/johndoe123/);
    expect(src).not.toMatch(/Demo2026!/);
  });

  it('boot prod refuse DEMO / quick-login / signup', () => {
    delete process.env.APP_ENV;
    delete process.env.LOCAL_DEV;
    delete process.env.ALLOW_INSECURE_LOCAL;
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('NEXTAUTH_URL', 'https://example.com');
    vi.stubEnv('CRON_SECRET', 'x'.repeat(24));
    vi.stubEnv('ALLOW_QUICK_LOGIN', 'true');
    expect(() => assertProductionSecurityBoot()).toThrow(/SEC-01|production|QUICK_LOGIN/);
  });

  it('middleware rate-limite avant allowlist publique', () => {
    const src = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8');
    const fnStart = src.indexOf('async function handleApiAuth');
    expect(fnStart).toBeGreaterThan(-1);
    const body = src.slice(fnStart);
    const rlIdx = body.indexOf('Rate-limit AVANT allowlist');
    const publicIdx = body.indexOf('isPublicApiPath(pathname)');
    expect(rlIdx).toBeGreaterThan(-1);
    expect(publicIdx).toBeGreaterThan(rlIdx);
    expect(src).toMatch(/payment:\$\{/);
    expect(src).toMatch(/pricing-publish/);
    expect(src).toMatch(/upload:\$\{/);
    expect(src).toMatch(/MUST_CHANGE_PASSWORD/);
  });

  it('CSP prod : pas de unsafe-eval ; object-src none ; frame-ancestors', () => {
    expect(CSP_ENFORCE_POLICY).not.toMatch(/unsafe-eval/);
    expect(CSP_ENFORCE_POLICY).toMatch(/object-src 'none'/);
    expect(CSP_ENFORCE_POLICY).toMatch(/frame-ancestors 'self'/);
    expect(CSP_ENFORCE_POLICY).toMatch(/base-uri 'self'/);
    expect(CSP_ENFORCE_POLICY).toMatch(/form-action 'self'/);
    expect(CSP_REPORT_ONLY_POLICY).toMatch(/object-src 'none'/);
  });

  it('headers durcissement présents (X-Content-Type, Referrer, Permissions)', () => {
    // SECURITY_HEADERS dépend de l’env au chargement du module — vérifier les exports de politiques
    expect(CSP_ENFORCE_POLICY.length).toBeGreaterThan(40);
    const src = readFileSync(join(process.cwd(), 'lib/security-headers.ts'), 'utf8');
    expect(src).toMatch(/X-Content-Type-Options/);
    expect(src).toMatch(/Referrer-Policy/);
    expect(src).toMatch(/Permissions-Policy/);
    expect(src).toMatch(/Strict-Transport-Security/);
  });

  it('rate-limit critique fail-closed sans store distribué en prod-like', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.ALLOW_MEMORY_RATE_LIMIT;
    process.env.RATE_LIMIT_REQUIRE_DISTRIBUTED = 'true';
    expect(requiresDistributedRateLimitStore()).toBe(true);
    expect(isRateLimitCriticalKey('payment:user1')).toBe(true);
    const r = await enforceRateLimit('payment:user-fail-closed', 40, 60_000);
    expect(r.ok).toBe(false);
    expect(r.backend).toBe('fail-closed');
  });

  it('rate-limit mémoire OK en local explicite', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RATE_LIMIT_REQUIRE_DISTRIBUTED;
    delete process.env.VERCEL;
    delete process.env.HOSTINGER;
    process.env.APP_ENV = 'local';
    process.env.ALLOW_MEMORY_RATE_LIMIT = 'true';
    resetRateLimit('auth:test-local-mem');
    const r = await enforceRateLimit('auth:test-local-mem', 5, 60_000);
    expect(r.ok).toBe(true);
    expect(r.backend).toBe('memory');
  });

  it('politiques rate-limit couvrent login upload payment publish cron bat', () => {
    const ids = Object.keys(RATE_LIMIT_POLICIES);
    for (const id of [
      'auth_callback',
      'upload',
      'payment_create',
      'pricing_publish',
      'cron',
      'bat_link',
      'reset_password',
      'signup',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('User.mustChangePassword présent dans le schéma', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    expect(schema).toMatch(/mustChangePassword\s+Boolean/);
  });

  it('docs suivis : pas de Demo2026! / johndoe123 dans README deploy', () => {
    for (const rel of [
      'README_DEPLOY_HOSTINGER.md',
      'deploy/hostinger/REDEPLOY.md',
      'deploy/hostinger/DEPLOYMENT_URLS.txt',
    ]) {
      if (!existsSync(join(process.cwd(), rel))) continue;
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      expect(src).not.toMatch(/Demo2026!/);
      expect(src).not.toMatch(/johndoe123/);
    }
  });
});
