/**
 * Vague 2 — garde-fous : écritures admin ne doivent pas s’ouvrir via config:view / read seul.
 * Test statique (lecture fichiers) — aucune DB.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('V2-01 — anti OR-escalation écritures', () => {
  const writeRoutes: { path: string; mustNotMatch: RegExp; mustMatch?: RegExp }[] = [
    {
      path: 'app/api/backoffice/repair-payment-drift/route.ts',
      mustNotMatch: /requirePermission\(['"]config:view['"]\)/,
      mustMatch: /requirePermission\(['"]config:publish['"]\)/,
    },
    {
      path: 'app/api/admin-backoffice/pricing/base-materials/backfill-prices/route.ts',
      mustNotMatch: /config:view/,
      mustMatch: /tarifs:write/,
    },
    {
      path: 'app/api/admin-backoffice/tiers/import-excel/route.ts',
      mustNotMatch: /config:view/,
      mustMatch: /tarifs:write/,
    },
    {
      path: 'app/api/admin-backoffice/regles/import-excel/route.ts',
      mustNotMatch: /config:view/,
      mustMatch: /regles:write/,
    },
    {
      path: 'app/api/admin-backoffice/catalogue-pos/import-excel/route.ts',
      mustNotMatch: /config:view/,
      mustMatch: /tarifs:write/,
    },
    {
      path: 'app/api/admin-backoffice/options/chips/import-excel/route.ts',
      mustNotMatch: /config:view/,
      mustMatch: /tarifs:write/,
    },
    {
      path: 'app/api/admin-backoffice/production-flux/import-excel/route.ts',
      mustNotMatch: /config:view/,
      mustMatch: /tarifs:write/,
    },
    {
      path: 'app/api/admin-backoffice/pricing/articles/import-excel/route.ts',
      mustNotMatch: /config:view/,
      mustMatch: /tarifs:write/,
    },
    {
      path: 'app/api/admin-backoffice/pricing/variables/import-excel/route.ts',
      mustNotMatch: /config:view/,
      mustMatch: /tarifs:write/,
    },
    {
      path: 'app/api/admin-backoffice/annexes/import-excel/route.ts',
      mustNotMatch: /commandes:read/,
      mustMatch: /users:manage/,
    },
  ];

  it.each(writeRoutes)('$path', ({ path, mustNotMatch, mustMatch }) => {
    const src = read(path);
    expect(src).not.toMatch(mustNotMatch);
    if (mustMatch) expect(src).toMatch(mustMatch);
  });

  it('base-materials POST n’accepte plus config:view', () => {
    const src = read('app/api/admin-backoffice/pricing/base-materials/route.ts');
    const postBlock = src.slice(src.indexOf('export async function POST'));
    expect(postBlock).not.toMatch(/config:view/);
    expect(postBlock).toMatch(/tarifs:write/);
  });

  it('setup-db fail-closed en production Hostinger', () => {
    const src = read('app/api/setup-db/route.ts');
    expect(src).toMatch(/ALLOW_SETUP_DB/);
    expect(src).toMatch(/isProductionDeploy|toujours 404|Production \/ preview/);
    expect(src).not.toMatch(/db push --accept-data-loss/);
  });

  it('hostinger-build n’exécute plus db push --accept-data-loss', () => {
    const src = read('scripts/hostinger-build.mjs');
    expect(src).not.toMatch(/db push --accept-data-loss/);
    expect(src.match(/from 'fs'/g)?.length ?? 0).toBe(1);
  });

  it('equipe mutations n’utilisent plus *:read seul', () => {
    for (const path of [
      'app/api/equipe/messages/route.ts',
      'app/api/equipe/messages/[id]/reply/route.ts',
      'app/api/equipe/suggestions/route.ts',
      'app/api/equipe/suggestions/[id]/vote/route.ts',
    ]) {
      const src = read(path);
      // POST doit passer par requireAuth (session), pas commandes:read seul
      if (src.includes('export async function POST')) {
        const postIdx = src.indexOf('export async function POST');
        const postBlock = src.slice(postIdx, postIdx + 400);
        expect(postBlock).toMatch(/requireAuth/);
        expect(postBlock).not.toMatch(/commandes:read/);
      }
    }
  });

  it('calculateFinalPOSPrice lit snapshot.priceSource', () => {
    const src = read('lib/pricing/pricing-resolver.ts');
    expect(src).toMatch(/snapshot\?\.priceSource/);
    expect(src).not.toMatch(/\(result as \{ priceSource\?: string \}\)\.priceSource/);
  });
});
