import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('admin-backoffice API aliases', () => {
  const root = process.cwd();
  const aliases: Array<{ file: string; legacy: string }> = [
    { file: 'app/api/admin-backoffice/sync-diagnostics/route.ts', legacy: 'backoffice/sync-diagnostics' },
    { file: 'app/api/admin-backoffice/repair-payment-drift/route.ts', legacy: 'backoffice/repair-payment-drift' },
    { file: 'app/api/admin-backoffice/catalog/route.ts', legacy: 'backoffice/catalog' },
    { file: 'app/api/admin-backoffice/workflows/route.ts', legacy: 'backoffice/workflows' },
    { file: 'app/api/admin-backoffice/workflows/transitions/route.ts', legacy: 'backoffice/workflows/transitions' },
    { file: 'app/api/admin-backoffice/article-templates/route.ts', legacy: 'backoffice/article-templates' },
    { file: 'app/api/admin-backoffice/article-templates/[id]/route.ts', legacy: 'backoffice/article-templates/[id]' },
    { file: 'app/api/admin-backoffice/articles/sync-catalogue/route.ts', legacy: 'backoffice/articles/sync-catalogue' },
    { file: 'app/api/admin/sync/run/route.ts', legacy: 'backoffice/sync' },
  ];

  it.each(aliases)('délègue $legacy', ({ file, legacy }) => {
    const full = path.join(root, file);
    expect(fs.existsSync(full)).toBe(true);
    const src = fs.readFileSync(full, 'utf8');
    expect(src).toContain(legacy.replace('[id]', '[id]'));
  });
});
