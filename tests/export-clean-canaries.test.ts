import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isForbiddenExportPath,
  FORBIDDEN_CONTENT_RE,
  scanTextForForbiddenContent,
} from '@/lib/security/export-canaries';

describe('SEC-001 export canaries', () => {
  it('détecte noms .env / .db', () => {
    expect(isForbiddenExportPath('.env.local')).toBe(true);
    expect(isForbiddenExportPath('dev.db')).toBe(true);
    expect(isForbiddenExportPath('.env.example')).toBe(false);
  });

  it('détecte canari secret dans contenu', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orion-export-'));
    const file = path.join(dir, 'leaked.txt');
    fs.writeFileSync(file, 'CANARY_SECRET_EXPORT_V10_DO_NOT_SHIP=1\n', 'utf8');
    const text = fs.readFileSync(file, 'utf8');
    expect(scanTextForForbiddenContent(text)).toBe(true);
    expect(FORBIDDEN_CONTENT_RE.length).toBeGreaterThan(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
