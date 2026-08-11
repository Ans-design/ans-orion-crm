import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Non-régression audit sécurité — mutations matières / gate RH fail-closed. */
describe('audit-security regressions', () => {
  it('materials import requires write permissions (not config:view alone)', () => {
    const src = readFileSync(
      join(process.cwd(), 'lib/server/modules/materials/materials-import.route.ts'),
      'utf8',
    );
    expect(src).toMatch(/tarifs:write/);
    expect(src).not.toMatch(/anyPermissions:\s*\[\s*'config:view',\s*'tarifs:write'\s*\]/);
  });

  it('late-arrival GET does not soft-open with blocked:false fallback', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/rh/late-arrival/route.ts'), 'utf8');
    expect(src).not.toMatch(/blocked:\s*false\s+as\s+const/);
    expect(src).not.toMatch(/fallbackResponse:\s*\{\s*ok:\s*true,\s*data:\s*DEGRADED_GATE/);
  });

  it('setup-db does not return demo passwords in JSON', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/setup-db/route.ts'), 'utf8');
    expect(src).not.toMatch(/Demo2026!/);
    expect(src).not.toMatch(/johndoe123/);
  });

  it('setup-db rejects query-string secret (header only)', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/setup-db/route.ts'), 'utf8');
    expect(src).toMatch(/x-setup-secret/);
    expect(src).not.toMatch(/searchParams\.get\(\s*['"]secret['"]\s*\)/);
  });

  it('health/system requires authenticated session', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/health/system/route.ts'), 'utf8');
    expect(src).toMatch(/requireSession/);
    expect(src).not.toMatch(/missing_or_weak/);
  });
});

