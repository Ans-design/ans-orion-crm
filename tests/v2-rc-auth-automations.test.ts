/**
 * V2-RC — preuves locales Auth/RBAC sans appel DB ni écriture métier.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  hasPermission,
  isDemoBlockedRoute,
  type Permission,
} from '@/lib/auth/permissions';
import {
  MIDDLEWARE_INCLUDES_API,
  MIDDLEWARE_MATCHER,
} from '@/lib/middleware-matcher';

const root = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('V2-RC — couverture Auth API', () => {
  it('le scan exhaustif classe chaque route protégée ou publique', () => {
    const result = spawnSync(
      process.execPath,
      [join(root, 'scripts', 'audit-api-auth.mjs')],
      { cwd: root, encoding: 'utf8' },
    );

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toMatch(/Audit auth API — \d+ routes/);
    expect(result.stdout).toMatch(/Toutes les routes protégées ou allowlistées/);
  });

  it('le middleware couvre /api', () => {
    expect(MIDDLEWARE_INCLUDES_API).toBe(true);
    expect(MIDDLEWARE_MATCHER.join(' ')).not.toMatch(/\?!api\|/);
  });
});

describe('V2-RC — rôles démo et lecture', () => {
  const sensitiveWrites: Permission[] = [
    'commandes:write',
    'factures:write',
    'paiements:write',
    'production:write',
    'stock:write',
    'achats:write',
    'import:run',
    'config:publish',
    'users:manage',
  ];

  it.each(sensitiveWrites)('démo refuse %s', (permission) => {
    expect(hasPermission('demo', permission)).toBe(false);
  });

  it.each(sensitiveWrites)('lecture refuse %s', (permission) => {
    expect(hasPermission('lecture', permission)).toBe(false);
  });

  it('les mutations finance/stock/import sont bloquées pour la démo', () => {
    expect(isDemoBlockedRoute('/api/paiements', 'POST', 'demo')).toBe(true);
    expect(isDemoBlockedRoute('/api/stock/adjust', 'POST', 'demo')).toBe(true);
    expect(isDemoBlockedRoute('/api/admin-backoffice/tiers/import-excel', 'POST', 'demo')).toBe(true);
  });
});

describe('V2-RC — conversion devis idempotente', () => {
  it('refuse un devis déjà accepté avant création commande, dans la même transaction', () => {
    const source = readSource('lib/services/devis-accept-service.ts');
    const transactionIndex = source.indexOf('prisma.$transaction');
    const alreadyAcceptedIndex = source.indexOf('DevisStatut.Accepte');
    const createIndex = source.indexOf('tx.commande.create');

    expect(transactionIndex).toBeGreaterThan(-1);
    expect(alreadyAcceptedIndex).toBeGreaterThan(transactionIndex);
    expect(createIndex).toBeGreaterThan(alreadyAcceptedIndex);
    expect(source).toMatch(/ALREADY_ACCEPTED/);
  });
});
