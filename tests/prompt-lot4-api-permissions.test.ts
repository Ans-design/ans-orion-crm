import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walkRouteFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkRouteFiles(p, out);
    else if (name === 'route.ts') out.push(p);
  }
  return out;
}

describe('Lot 4 — API routes auth', () => {
  it('aucune route app/api n’utilise requireAdmin / requireAdminOrManager', () => {
    const root = join(process.cwd(), 'app', 'api');
    const files = walkRouteFiles(root);
    expect(files.length).toBeGreaterThan(50);
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      if (/\brequireAdmin\s*\(/.test(src) || /\brequireAdminOrManager\s*\(/.test(src)) {
        offenders.push(file.replace(process.cwd(), '').replace(/\\/g, '/'));
      }
    }
    expect(offenders).toEqual([]);
  });
});
