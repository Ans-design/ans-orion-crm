import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { htToTtcMga, ttcToHtMga, roundMga } from '@/lib/pricing/mga-round';
import { DEFAULT_FISCAL } from '@/lib/fiscal-config';
import { createFactureSchema } from '@/lib/validators/crm';

const root = process.cwd();

describe('Canon facture HT/TTC + fiscalité', () => {
  it('golden : TTC 120000 @ 20% → HT 100000 ; HT→TTC inverse', () => {
    const tva = DEFAULT_FISCAL.tvaRate;
    expect(tva).toBe(20);
    expect(ttcToHtMga(120_000, tva)).toBe(100_000);
    expect(htToTtcMga(100_000, tva)).toBe(120_000);
    expect(roundMga(99_999.4)).toBe(99_999);
  });

  it('Zod createFacture : défaut TVA = 20 (pas 0)', () => {
    const parsed = createFactureSchema.parse({ lignes: [{ description: 'Test', total: 1000 }] });
    expect(parsed.tva).toBe(20);
  });

  it('workflow facture : commande.total = TTC + ttcToHtMga', () => {
    const src = readFileSync(join(root, 'lib/services/facture-workflow-service.ts'), 'utf8');
    expect(src).toMatch(/ttcToHtMga/);
    expect(src).toMatch(/getFiscalConfig/);
    expect(src).toMatch(/totalTTC = roundMga\(cmd\.total\)/);
  });

  it('API factures : délègue ensureFactureForCommande sans lignes', () => {
    const src = readFileSync(join(root, 'lib/server/modules/factures/factures.service.ts'), 'utf8');
    expect(src).toMatch(/ensureFactureForCommande/);
    expect(src).toMatch(/getFiscalConfig/);
  });

  it('cart createFactureFromCommande délègue au workflow', () => {
    const src = readFileSync(join(root, 'lib/services/cart-service.ts'), 'utf8');
    expect(src).toMatch(/ensureFactureForCommande/);
    expect(src).toMatch(/htToTtcMga/);
    expect(src).not.toMatch(/totalTTC = totalHT \* 1\.2/);
    expect(src).not.toMatch(/Math\.round\(totalHT \* 1\.2\)/);
  });

  it('devis.service utilise fiscal + htToTtcMga (plus * 1.20)', () => {
    const src = readFileSync(join(root, 'lib/server/modules/devis/devis.service.ts'), 'utf8');
    expect(src).toMatch(/getFiscalConfig/);
    expect(src).toMatch(/htToTtcMga/);
    expect(src).not.toMatch(/\* 1\.20/);
  });
});
