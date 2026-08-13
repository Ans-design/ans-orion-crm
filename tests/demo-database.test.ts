import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { demoTmpDbPath } from '@/lib/demo-database';

describe('demo SQLite Vercel', () => {
  it('isole /tmp par déploiement (évite schéma périmé)', () => {
    const a = demoTmpDbPath('dpl_aaa');
    const b = demoTmpDbPath('dpl_bbb');
    expect(a).not.toBe(b);
    expect(a).toContain(os.tmpdir());
    expect(path.basename(a)).toBe('ans-orion-demo.dpl_aaa.db');
    expect(demoTmpDbPath('evil/../x')).toBe(path.join(os.tmpdir(), 'ans-orion-demo.evil..x.db'));
  });
});
