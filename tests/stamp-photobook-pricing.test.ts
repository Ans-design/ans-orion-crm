import { beforeAll, describe, expect, it } from 'vitest';
import {
  resolveStampFormat,
  DEFAULT_STAMP_FORMATS,
} from '@/lib/pricing/stamp-format-rules';
import { computeStampPrice, setStampFormatsRuntime } from '@/lib/pricing/stamp-pricing';
import {
  computePhotobookPrice,
  resolvePhotobookFormat,
  setPhotobookRuntimeParams,
  DEFAULT_PHOTOBOOK_PARAMS,
} from '@/lib/pricing/photobook-pricing';
import { setImpressionSfRuntimeRules } from '@/lib/pricing/impression-sf-pricing';
import { DEFAULT_PAPER_FORMAT_RULES } from '@/lib/pricing/paper-format-rules';

describe('Tampon — prix fixe + format supérieur', () => {
  beforeAll(() => {
    setStampFormatsRuntime(DEFAULT_STAMP_FORMATS);
  });

  it('Test Tampon 1 — 20×20 mm = 10 000 Ar', () => {
    const res = computeStampPrice({ format: 'Carré 20×20 mm', type: 'Tampon standard' });
    expect(res.calculable).toBe(true);
    expect(res.prixUnitaire).toBe(10000);
  });

  it('Test Tampon 2 — perso 18×17 → 20×20', () => {
    const resolved = resolveStampFormat(18, 17, DEFAULT_STAMP_FORMATS);
    expect(resolved.surDevis).toBe(false);
    expect(resolved.formatUsed).toMatch(/20/);
    expect(resolved.unitPrice).toBe(10000);

    const res = computeStampPrice({
      format: 'Format personnalisé',
      format_largeur: 18,
      format_hauteur: 17,
    });
    expect(res.prixUnitaire).toBe(10000);
    expect(res.message).toMatch(/format supérieur/i);
  });

  it('Test Tampon 3 — perso 21×21 → 30×30', () => {
    const resolved = resolveStampFormat(21, 21, DEFAULT_STAMP_FORMATS);
    expect(resolved.surDevis).toBe(false);
    expect(resolved.unitPrice).toBe(15000);
    expect(resolved.formatUsed).toMatch(/30/);
  });
});

describe('Photobook — page A4 + couverture', () => {
  beforeAll(() => {
    setImpressionSfRuntimeRules({ formatRules: DEFAULT_PAPER_FORMAT_RULES });
    setPhotobookRuntimeParams(DEFAULT_PHOTOBOOK_PARAMS);
  });

  it('Test Photobook 1 — A4, 10 pages, souple = 40 000', () => {
    const res = computePhotobookPrice({
      format: 'A4 — 210×297 mm',
      pages: '10',
      couverture: 'Couverture souple',
    });
    expect(res.calculable).toBe(true);
    expect(res.breakdown!.prixPage).toBe(4000);
    expect(res.breakdown!.coverSupplement).toBe(0);
    expect(res.prixUnitaire).toBe(40000);
  });

  it('Test Photobook 2 — A5, 10 pages, souple = 20 000', () => {
    const res = computePhotobookPrice({
      format: 'A5 — 148×210 mm',
      pages: '10',
      couverture: 'Couverture souple',
    });
    expect(res.prixUnitaire).toBe(20000);
  });

  it('Test Photobook 3 — A5, 10 pages, rigide = 40 000', () => {
    const res = computePhotobookPrice({
      format: 'A5',
      pages: '10',
      couverture: 'Couverture rigide',
    });
    expect(res.breakdown!.coverSupplement).toBe(20000);
    expect(res.prixUnitaire).toBe(40000);
  });

  it('Test Photobook 4 — 150×150 → A5', () => {
    const fmt = resolvePhotobookFormat(150, 150);
    expect(fmt.formatCode).toBe('A5');
    const res = computePhotobookPrice({
      format: 'Format personnalisé',
      format_largeur: 150,
      format_hauteur: 150,
      pages: '20',
      couverture: 'Couverture cuir',
    });
    expect(res.breakdown!.formatUsed).toBe('A5');
    expect(res.prixUnitaire).toBe(2000 * 20 + 20000);
  });
});
