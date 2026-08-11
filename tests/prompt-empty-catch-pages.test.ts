import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walkPages(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkPages(p, out);
    else if (name === 'page.tsx') out.push(p);
  }
  return out;
}

describe('Lot UX — catches pages app', () => {
  it('aucune page app/(app) avec .catch(() => {}) vide', () => {
    const root = join(process.cwd(), 'app', '(app)');
    const files = walkPages(root);
    expect(files.length).toBeGreaterThan(20);
    const offenders: string[] = [];
    const emptyCatch = /\.catch\(\(\)\s*=>\s*\{\s*\}\)/;
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      if (emptyCatch.test(src)) {
        offenders.push(file.replace(process.cwd(), '').replace(/\\/g, '/'));
      }
    }
    expect(offenders).toEqual([]);
  });
});
