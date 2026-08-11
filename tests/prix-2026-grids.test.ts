/**
 * Grilles PRIX 2026 — runtime = stubs (null) ; chiffres historiques = archives/.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  articleHasPrix2026Grid,
  getPrix2026AdminPriceDisplay,
  getPrix2026EntryUnitPrice,
  resolvePrix2026UnitPrice,
  PRIX_2026_RUNTIME_STATUS,
} from '@/lib/data/prix-2026-grids';
import { tryComputePrix2026GridPrice } from '@/lib/pricing/prix-2026-grid-price';
import { computeCarteriePrice } from '@/lib/pricing/carterie-pricing';
import { resetCarterieRuntimeParams } from '@/lib/pricing/carterie-pricing-rules';
import { calculatePrice } from '@/lib/pricing/calculate';
import { computeLivresPrice } from '@/lib/pricing/livres-pricing';
import { BINDING_LABELS } from '@/lib/data/binding-catalog';
import {
  getPrix2026EntryUnitPrice as archiveEntry,
  resolvePrix2026UnitPrice as archiveResolve,
  articleHasPrix2026Grid as archiveHasGrid,
} from '../archives/pricing/prix-2026-grids';

vi.mock('@/lib/prisma', () => {
  const emptyModel = () => ({
    count: vi.fn().mockResolvedValue(1),
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    upsert: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  });
  return {
    prisma: {
      tarif: emptyModel(),
      priceFormula: emptyModel(),
      salePrice2026: emptyModel(),
      articlePricingProfile: {
        ...emptyModel(),
        create: vi.fn().mockResolvedValue({}),
      },
      productOptionGroup: emptyModel(),
      discountTier: emptyModel(),
      urgencyRule: emptyModel(),
      materialPrice: emptyModel(),
      pricingVariable: emptyModel(),
      formulaVersion: emptyModel(),
      businessRule: emptyModel(),
      paperFormatRule: emptyModel(),
      supportFaceRule: emptyModel(),
      materialPriceEquivalence: emptyModel(),
      thickPaperRule: emptyModel(),
      printTechnologyRule: emptyModel(),
      servicePriceEquivalence: emptyModel(),
      systemConfig: emptyModel(),
      finishingPrice: emptyModel(),
      paperTariff: emptyModel(),
    },
  };
});

vi.mock('@/lib/pricing/dynamic-engine', () => ({
  tryComputeDynamicPrice: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/services/publication-pricing-sync.service', () => ({
  ensurePublicationPricingRuntimeReady: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/services/pricing-rules-sync.service', () => ({
  ensureImpressionSfRuntimeReady: vi.fn().mockResolvedValue(undefined),
  ensurePricingRulesSeeded: vi.fn().mockResolvedValue(undefined),
}));

const LIVRES_CONFIG = {
  type: 'Booklet',
  format: 'A5 — 148×210 mm',
  pages: 48,
  couleur_int: 'Quadrichromie (couleur)',
  face_interieur: 'Recto-verso',
  matiere_int: 'PCM',
  grammage_int: '80g',
  matiere_couv: 'PCB',
  grammage_couv: '300g',
  reliure: BINDING_LABELS.SPIRALE_PLASTIQUE,
  qty: 50,
};

describe('prix-2026-grids registry (runtime stub)', () => {
  it('statut runtime archive-stub', () => {
    expect(PRIX_2026_RUNTIME_STATUS).toBe('archive-stub-no-tariffs');
  });

  it('runtime : aucune entrée Excel', () => {
    expect(getPrix2026EntryUnitPrice('cv-std')).toBeNull();
    expect(articleHasPrix2026Grid('cv-std')).toBe(false);
    expect(getPrix2026AdminPriceDisplay('cv-std')).toBeNull();
    expect(getPrix2026EntryUnitPrice('gd-mug')).toBeNull();
    expect(getPrix2026EntryUnitPrice('plv-rollup')).toBeNull();
    expect(resolvePrix2026UnitPrice('gd-mug', {}, 50)).toBeNull();
  });

  it('archive conserve les chiffres historiques', () => {
    expect(archiveHasGrid('cv-std')).toBe(true);
    expect(archiveEntry('cv-std')).toBe(200);
    expect(archiveEntry('gd-mug')).toBe(15000);
    expect(archiveResolve('gd-mug', {}, 50)?.unitPrice).toBe(9000);
    expect(archiveResolve('plv-rollup', {}, 1)?.unitPrice).toBe(150000);
  });

  it('livres ne sont pas couverts par grille Excel POS', () => {
    expect(articleHasPrix2026Grid('bk-livres')).toBe(false);
  });
});

describe('tryComputePrix2026GridPrice (stub)', () => {
  it('Mug / Roll-up → null runtime', async () => {
    expect(await tryComputePrix2026GridPrice('gd-mug', { qty: 50 })).toBeNull();
    expect(await tryComputePrix2026GridPrice('plv-rollup', { qty: 1 })).toBeNull();
  });

  it('carterie déléguée (null ici — computeCarteriePrice)', async () => {
    const r = await tryComputePrix2026GridPrice('cv-std', {
      qty: 50,
      matiere: 'PCB',
      grammage: '300g',
      face: 'Recto',
    });
    expect(r).toBeNull();
  });
});

describe('carterie Excel — pas de double finition découpe', () => {
  beforeEach(() => {
    resetCarterieRuntimeParams();
  });

  it('PCB recto 50 = 200, découpe non ajoutée sur grille Excel', () => {
    const r = computeCarteriePrice(
      {
        format: '85×55 mm',
        matiere: 'PCB',
        grammage: '300g',
        face: 'Recto',
        pelliculage: 'Sans',
        decoupe: 'Oui — droite (50 Ar/pièce)',
      },
      50,
    );
    expect(r.pricingMode).toBe('excel_grid');
    expect(r.prixUnitaire).toBe(200);
    expect(r.prixDecoupeParPiece).toBe(0);
  });
});

describe('calculatePrice — plus de priorité Excel runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gd-mug ne passe plus par grille Excel runtime', async () => {
    const r = await calculatePrice('gd-mug', { qty: 50 });
    expect((r?.snapshot as { priceSource?: string })?.priceSource).not.toBe('prix2026ExcelGrid');
  });

  it('plv-rollup : pas de fallback grille Excel 150 000', async () => {
    const r = await calculatePrice('plv-rollup', { qty: 1 });
    // Moteur PLV ou unavailable — jamais grille Excel runtime
    if (r) {
      expect((r.snapshot as { priceSource?: string })?.priceSource).not.toBe('prix2026ExcelGrid');
    }
  });

  it('non-régression livres — moteur dédié inchangé', async () => {
    const direct = computeLivresPrice('bk-livres', LIVRES_CONFIG, 50);
    const server = await calculatePrice('bk-livres', LIVRES_CONFIG);
    expect(direct.calculable).toBe(true);
    expect(server?.prixUnitaire).toBe(direct.prixUnitaire);
    expect((server?.snapshot as { priceSource?: string }).priceSource).toBe('livresTarif');
    expect((server?.snapshot as { priceSource?: string }).priceSource).not.toBe('prix2026ExcelGrid');
  });
});
