import { describe, expect, it } from 'vitest';
import {
  applyMaterialEquivalenceSupplement,
  DEFAULT_MATERIAL_EQUIVALENCES,
} from '@/lib/pricing/material-equivalence-rules';
import {
  applyArticlePromotionalDiscount,
  computeA4DivisionPrice,
  computeEventArticlePrice,
  computeEventBadgePrice,
  isGiftCardMaterialAllowed,
  parseEventDimsMm,
  resolveA4Divisor,
} from '@/lib/pricing/event-pricing';
import { isFormatAllowedForMaterial } from '@/lib/pricing/material-format-limits';
import { resolveAccessoryPrice } from '@/lib/pricing/event-accessories';

describe('équivalences Offset 70 / 100', () => {
  it('Offset 70G = Offset 80G − 20', () => {
    const r = applyMaterialEquivalenceSupplement(400, 'Offset', 70, DEFAULT_MATERIAL_EQUIVALENCES);
    expect(r.applied?.materialKey).toBe('offset_70');
    expect(r.price).toBe(380);
  });

  it('Offset 100G = référence 90G + 50 (supplément règle)', () => {
    const r = applyMaterialEquivalenceSupplement(420, 'Offset', 100, DEFAULT_MATERIAL_EQUIVALENCES);
    expect(r.applied?.materialKey).toBe('offset_100');
    expect(r.price).toBe(470);
  });
});

describe('promo Affiche événement / Calendrier plateau', () => {
  it('PCB A4 1500 → 900 (−40 %)', () => {
    expect(applyArticlePromotionalDiscount(1500, 40)).toBe(900);
  });

  it('applique la promo sur evt-affiche Offset/PCM/PCB', () => {
    // Sans grille ISF runtime complète, on teste le helper promo
    const base = 1500;
    expect(applyArticlePromotionalDiscount(base, 40)).toBe(900);
  });
});

describe('Badge événementiel', () => {
  it('PVC A4 13000, 100×70 ≈ A7 → 13000/8 + 10% + 50', () => {
    const badge = computeEventBadgePrice({
      a4UnitPrice: 13000,
      widthMm: 100,
      heightMm: 70,
    });
    const base = Math.round(13000 / 8);
    const expected = base + Math.round(base * 0.1) + 50;
    expect(badge.prixUnitaire).toBe(expected);
    expect(expected).toBe(1838);
  });
});

describe('Billet / Carte de vœux A4/n', () => {
  it('148×52 → diviseur 8', () => {
    expect(resolveA4Divisor(148, 52)).toBe(8);
  });

  it('PCB A4 1500 → billet = 1500/8 + 50', () => {
    const t = computeA4DivisionPrice({
      widthMm: 148,
      heightMm: 52,
      a4UnitPrice: 1500,
      cutAr: 50,
    });
    expect(t.divisor).toBe(8);
    expect(t.prixUnitaire).toBe(238);
  });

  it('QR +50', () => {
    const t = computeA4DivisionPrice({
      widthMm: 148,
      heightMm: 52,
      a4UnitPrice: 1500,
      cutAr: 50,
      extraAr: 50,
    });
    expect(t.prixUnitaire).toBe(288);
  });
});

describe('Bracelet / Lanyard', () => {
  it('bracelet = type + technique', () => {
    const type = resolveAccessoryPrice('bracelet_type', 'Bracelet Tyvek');
    const tech = resolveAccessoryPrice('bracelet_technique', 'Impression standard');
    expect(type + tech).toBeGreaterThan(0);
  });

  it('lanyard ignore technique (prix modèle seul)', () => {
    const price = resolveAccessoryPrice('lanyard', 'Cordon plat sublimé|20 mm');
    expect(price).toBe(3500);
  });
});

describe('Chèque cadeau matières', () => {
  it('refuse Offset', () => {
    expect(isGiftCardMaterialAllowed('Offset', '80g').allowed).toBe(false);
  });

  it('refuse papier ≤ 250G', () => {
    expect(isGiftCardMaterialAllowed('PCB', '250g').allowed).toBe(false);
  });

  it('autorise PCB 300G', () => {
    expect(isGiftCardMaterialAllowed('PCB', '300g').allowed).toBe(true);
  });
});

describe('Limites formats matières', () => {
  it('Glossy bloque A2', () => {
    expect(isFormatAllowedForMaterial('Glossy', 'A2').allowed).toBe(false);
  });

  it('Texturé bloque A3', () => {
    expect(isFormatAllowedForMaterial('Texturé', 'A3').allowed).toBe(false);
  });

  it('PVC opaque bloque A3', () => {
    expect(isFormatAllowedForMaterial('PVC opaque', 'A3').allowed).toBe(false);
  });

  it('Offset autorise A0', () => {
    expect(isFormatAllowedForMaterial('Offset', 'A0').allowed).toBe(true);
  });

  it('Plexiglass bloque > 2400×1200', () => {
    expect(isFormatAllowedForMaterial('Plexiglass', 'Personnalisé', 2500, 1300).allowed).toBe(false);
  });
});

describe('Enveloppe / Fanion / Pochette formules', () => {
  it('enveloppe = vierge + offset A4 + fermeture', () => {
    const r = computeEventArticlePrice('evt-enveloppe', {
      format: 'C4',
      matiere: 'Papier spécial invitation',
      fermeture: 'Fermeture cire',
    });
    // Seed C4 invitation 2000 + print 400 + cire 1000
    expect(r.calculable).toBe(true);
    expect(r.prixUnitaire).toBe(3400);
  });

  it('fanion = impression + tige + MO (via A4 division si ISF absent)', () => {
    // Sans tarif ISF runtime, fanion peut être sur devis — on vérifie accessoires
    expect(resolveAccessoryPrice('fanion_accessory', 'tige')).toBe(100);
    expect(resolveAccessoryPrice('fanion_labor', 'colle_finition')).toBe(300);
  });

  it('pochette multiplicateur 3 + MO', () => {
    expect(resolveAccessoryPrice('event_param', 'pochette_format_multiplier')).toBe(3);
    expect(resolveAccessoryPrice('pochette_type', 'Rabat luxe dos carré')).toBe(2000);
  });
});

describe('parseEventDimsMm', () => {
  it('convertit 200×200 cm en mm (pas mm bruts)', () => {
    expect(parseEventDimsMm({ format: '200×200 cm' })).toEqual({ w: 2000, h: 2000 });
  });
});
