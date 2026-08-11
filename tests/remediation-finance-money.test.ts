import { describe, expect, it } from 'vitest';
import {
  addMga,
  applyRemiseMga,
  formatMga,
  parseMgaInput,
  roundMga,
  splitTvaMga,
  subMga,
} from '@/lib/money/mga';
import { computePaidTotal } from '@/lib/finance/payment-totals';
import { companyNifForDgi, buildDgiExportLines } from '@/lib/finance/comptable-dgi-export';
import { ANS_DESIGN_PRINT } from '@/lib/company/ans-design-print';
import { assertProductionSecurityBoot } from '@/lib/security/assert-production-boot';

describe('FIN-01 money MGA', () => {
  it('arrondit les flottants dangereux', () => {
    expect(roundMga(0.1 + 0.2)).toBe(0);
    // Arrondi par opérande puis somme (évite 100.4+100.4 → 200.8 flottant)
    expect(addMga(100.4, 100.4)).toBe(200);
    expect(addMga(100.5, 100.5)).toBe(202);
    expect(subMga(1000, 0.6)).toBe(999);
  });

  it('gère grands montants et remises', () => {
    expect(addMga(50_000_000, 25_000_000)).toBe(75_000_000);
    expect(applyRemiseMga(1_000_000, 10)).toBe(900_000);
    expect(applyRemiseMga(1_000_000, 100)).toBe(0);
  });

  it('TVA from-ht et from-ttc cohérents', () => {
    const fromHt = splitTvaMga(100_000, 20, 'from-ht');
    expect(fromHt.ht).toBe(100_000);
    expect(fromHt.tva).toBe(20_000);
    expect(fromHt.ttc).toBe(120_000);
    const fromTtc = splitTvaMga(120_000, 20, 'from-ttc');
    expect(fromTtc.ttc).toBe(120_000);
    expect(fromTtc.ht + fromTtc.tva).toBe(120_000);
  });

  it('parse et format', () => {
    expect(parseMgaInput('1 250 000 Ar')).toBe(1_250_000);
    expect(formatMga(1500)).toContain('1');
  });

  it('computePaidTotal soustrait remboursements', () => {
    expect(
      computePaidTotal([
        { montant: 100_000, type: 'Acompte' },
        { montant: 20_000, type: 'Remboursement' },
      ]),
    ).toBe(80_000);
  });
});

describe('DGI-01 NIF société', () => {
  it('expose ANS_DESIGN_PRINT.nif', () => {
    expect(companyNifForDgi()).toBe(ANS_DESIGN_PRINT.nif);
  });

  it('injecte NIF société sur lignes TVA', () => {
    const lines = buildDgiExportLines(
      [
        {
          numero: 'FAC-1',
          createdAt: new Date('2026-01-15'),
          totalHT: 100_000,
          totalTTC: 120_000,
          tva: 20,
          client: { name: 'Client', code: 'C1', nif: 'CLIENT-NIF' },
        },
      ],
      [],
    );
    const tvaLine = lines.find((l) => l.compte.includes('445'));
    expect(tvaLine?.nif).toBe(ANS_DESIGN_PRINT.nif);
  });
});

describe('SEC-01 assertProductionSecurityBoot', () => {
  it('ne throw pas hors production', () => {
    expect(() => assertProductionSecurityBoot()).not.toThrow();
  });
});
