import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('SYN-02 diagnostics honnêtes', () => {
  it('sync.service n’affirme plus PostgreSQL à tort', () => {
    const src = readFileSync(join(process.cwd(), 'lib/services/sync.service.ts'), 'utf8');
    expect(src).not.toMatch(/detail: 'PostgreSQL connecté'/);
    expect(src).toMatch(/driftVerified/);
    expect(src).toMatch(/non confirmé|non vérifié/);
  });

  it('status unknown documenté quand drift absent', () => {
    const src = readFileSync(join(process.cwd(), 'lib/services/sync.service.ts'), 'utf8');
    expect(src).toMatch(/drift-analysis/);
    expect(src).toMatch(/status: 'unknown'/);
  });
});
