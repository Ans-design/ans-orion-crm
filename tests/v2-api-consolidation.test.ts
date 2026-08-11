/**
 * V2-07 — aliases API consolidés (re-export), sans suppression.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('V2-07 — consolidation aliases', () => {
  it('stock/items/generate-sku re-exporte generate-sku', () => {
    const src = read('app/api/stock/items/generate-sku/route.ts');
    expect(src).toMatch(/from ['\"]\.\.\/\.\.\/generate-sku\/route['\"]/);
  });

  it('admin-backoffice/anomalies re-exporte backoffice/anomalies', () => {
    const src = read('app/api/admin-backoffice/anomalies/route.ts');
    expect(src).toMatch(/from ['\"]\.\.\/\.\.\/backoffice\/anomalies\/route['\"]/);
  });

  it('materials/audit-pos re-exporte materials-used-pos', () => {
    const src = read('app/api/admin-backoffice/materials/audit-pos/route.ts');
    expect(src).toMatch(/materials-used-pos\/route/);
  });

  it('backoffice/sync exige config:publish', () => {
    const src = read('app/api/backoffice/sync/route.ts');
    expect(src).toMatch(/config:publish/);
    expect(src).not.toMatch(/requireAdmin\(\)/);
  });
});
