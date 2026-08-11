import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BINDING_LABELS } from '@/lib/data/binding-catalog';
import { getProductConfig } from '@/lib/data/config-types';
import { computeCalendarPrice } from '@/lib/pricing/calendar-pricing';
import { computeCustomSurfacePrice } from '@/lib/pricing/custom-surface-pricing';
import { computeLivresPrice } from '@/lib/pricing/livres-pricing';
import { articleUsesUnifiedServerPricing } from '@/lib/pos/server-pricing-policy';

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
      articlePricingProfile: emptyModel(),
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

vi.mock('@/lib/services/pricing-rules-sync.service', () => ({
  ensureImpressionSfRuntimeReady: vi.fn().mockResolvedValue(undefined),
  ensurePricingRulesSeeded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/flyer-pricing-sync.service', () => ({
  ensureFlyerPricingRuntimeReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/carterie-pricing-sync.service', () => ({
  ensureCarteriePricingRuntimeReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/publication-pricing-sync.service', () => ({
  ensurePublicationPricingRuntimeReady: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/services/finition-runtime-sync.service', () => ({
  ensureFinitionRuntimePricesReady: vi.fn().mockResolvedValue({}),
  forceSyncFinitionRuntimePrices: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/pricing/dynamic-engine', () => ({
  tryComputeDynamicPrice: vi.fn().mockResolvedValue(null),
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

describe('calendar-pricing', () => {
  it('calcule le PU depuis surface brute × prix m²', () => {
    const cfg = getProductConfig('cal-plateau');
    const result = computeCalendarPrice('cal-plateau', {
      format: 'A4 — 210×297 mm',
      feuillets: '12',
      matiere: 'PCB',
      grammage: '350g',
      face: 'Recto seul',
      qty: 100,
    }, cfg);

    expect(result.calculable).toBe(true);
    expect(result.prixUnitaire).toBe(Math.round((cfg?.prixM2 ?? 0) * (result.grossSurfaceM2 ?? 0)));
  });

  it('retourne sur devis si alerte matière', () => {
    const result = computeCalendarPrice('cal-marquepage', {
      format: '50 × 150 mm',
      matiere: 'Offset',
      grammage: '300g',
      qty: 50,
    });
    expect(result.surDevis).toBe(true);
    expect(result.calculable).toBe(false);
  });
});

describe('custom-surface-pricing', () => {
  it('calcule format personnalisé via prix m²', () => {
    const result = computeCustomSurfacePrice('evt-affiche', {
      format: 'Format personnalisé',
      longueur: 300,
      largeur: 200,
      qty: 100,
    }, { prixM2: 20_000, sections: [] }, 100);

    expect(result.calculable).toBe(true);
    expect(result.priceSource).toBe('customSurfaceM2');
    expect(result.prixUnitaire).toBe(Math.round(20_000 * (result.recap?.grossSurfaceM2 ?? 0)));
  });
});

describe('server-pricing-policy', () => {
  it('inclut livres, calendrier, bloc-note et grand format', () => {
    expect(articleUsesUnifiedServerPricing('bk-livres', 'livres')).toBe(true);
    expect(articleUsesUnifiedServerPricing('cal-plateau', 'calendrier')).toBe(true);
    expect(articleUsesUnifiedServerPricing('bn-a4', 'bloc_note')).toBe(true);
    expect(articleUsesUnifiedServerPricing('gf-vinyle', 'grand_format')).toBe(true);
    expect(articleUsesUnifiedServerPricing('fly-a4', 'flyer')).toBe(true);
    expect(articleUsesUnifiedServerPricing('fly-std', 'flyers')).toBe(true);
    expect(articleUsesUnifiedServerPricing('cv-std', 'carterie')).toBe(true);
  });
});

describe('calculatePrice — moteurs unifiés', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aligne livres sur computeLivresPrice', async () => {
    const { calculatePrice } = await import('@/lib/pricing/calculate');
    const direct = computeLivresPrice('bk-livres', LIVRES_CONFIG, 50);
    const server = await calculatePrice('bk-livres', LIVRES_CONFIG);

    expect(direct.calculable).toBe(true);
    expect(server?.prixUnitaire).toBe(direct.prixUnitaire);
    expect((server?.snapshot as { priceSource?: string }).priceSource).toBe('livresTarif');
  });

  it('route calendrier chevalet via moteur calendarTarif (pas event plateau)', async () => {
    const { calculatePrice } = await import('@/lib/pricing/calculate');
    const config = {
      format: 'A5 — 148×210 mm',
      feuillets: '12',
      matiere: 'PCM',
      grammage: '80g',
      face: 'Recto',
      qty: 10,
      // Overrides publication pour éviter dépendance grille ISF mockée
      prix_support_chevalet: 2000,
    };
    const direct = computeCalendarPrice('cal-chevalet', config, undefined, 10);
    const server = await calculatePrice('cal-chevalet', config);
    const source = (server?.snapshot as { priceSource?: string } | undefined)?.priceSource;
    // cal-plateau = eventPromoIsf ; chevalet/mural = calendarTarif
    expect(source).not.toBe('eventPromoIsf');
    expect(['calendarTarif', 'calendarIncomplete', 'calendarSurDevis']).toContain(source);
    // Régression : prixM2 × surface ne doit plus écraser le moteur calendrier
    if (direct.calculable && source === 'calendarTarif') {
      expect(server?.prixUnitaire).toBe(direct.prixUnitaire);
      expect(server?.prixUnitaire).toBeGreaterThan(2000);
    }
  });

  it('calendrier mural : PU moteur calendarTarif non écrasé par prixM2', async () => {
    const { calculatePrice } = await import('@/lib/pricing/calculate');
    const config = {
      format: 'A4 — 210×297 mm',
      feuillets: '12',
      matiere: 'PCM',
      grammage: '80g',
      face: 'Recto',
      qty: 10,
    };
    const direct = computeCalendarPrice('cal-mural', config, undefined, 10);
    const server = await calculatePrice('cal-mural', config);
    const source = (server?.snapshot as { priceSource?: string } | undefined)?.priceSource;
    expect(source).not.toBe('legacySurfaceM2');
    if (direct.calculable) {
      expect(source).toBe('calendarTarif');
      expect(server?.prixUnitaire).toBe(direct.prixUnitaire);
    }
  });

  it('carterie : pas de +12 % générique sur carterieIsfImposition', async () => {
    const { calculatePrice } = await import('@/lib/pricing/calculate');
    const {
      resetCarterieRuntimeParams,
      setCarterieRuntimeParams,
    } = await import('@/lib/pricing/carterie-pricing-rules');

    resetCarterieRuntimeParams();
    setCarterieRuntimeParams({
      pelliculageA4: 1200,
      gaufrageA4: 3000,
      prixDecoupeParPiece: 50,
      utilisePalier: false,
      sourcePrixBase: 'ISF uniquement',
    });

    const baseConfig = {
      format: '85×55 mm',
      matiere: 'PCB',
      grammage: '300g',
      face: 'Recto',
      pelliculage: 'Oui — Mat',
      gaufrage: 'Oui',
      decoupe: 'Oui — droite (50 Ar/pièce)',
      qty: 100,
    };
    const withGenericFins = await calculatePrice('cv-std', {
      ...baseConfig,
      finitions: ['Pelliculage mat', 'Gaufrage'],
    });
    const withoutGenericFins = await calculatePrice('cv-std', baseConfig);
    const source = (withGenericFins?.snapshot as { priceSource?: string } | undefined)?.priceSource;
    expect(source).toBe('carterieIsfImposition');
    expect(withGenericFins?.prixUnitaire).toBeGreaterThan(0);
    // Régression : labels finitions génériques ne doivent plus majorer le PU carterie
    expect(withGenericFins?.prixUnitaire).toBe(withoutGenericFins?.prixUnitaire);
  });

  it('livres : pas de +12 % générique sur livresTarif (finitions déjà dans publication)', async () => {
    const { calculatePrice } = await import('@/lib/pricing/calculate');
    const { computeLivresPrice } = await import('@/lib/pricing/livres-pricing');
    const config = {
      ...LIVRES_CONFIG,
      finitions: ['Pelliculage mat', 'Vernis'],
    };
    const direct = computeLivresPrice('bk-livres', LIVRES_CONFIG);
    const withGeneric = await calculatePrice('bk-livres', config);
    const withoutGeneric = await calculatePrice('bk-livres', LIVRES_CONFIG);
    const source = (withGeneric?.snapshot as { priceSource?: string } | undefined)?.priceSource;
    if (direct.calculable) {
      expect(source).toBe('livresTarif');
      expect(withGeneric?.prixUnitaire).toBe(withoutGeneric?.prixUnitaire);
      expect(withGeneric?.prixUnitaire).toBe(direct.prixUnitaire);
    }
  });

  it('flyer : pas de +12 % générique sur flyerIsfPliage', async () => {
    const { calculatePrice } = await import('@/lib/pricing/calculate');
    const base = {
      matiere: 'PCM',
      grammage: '80g',
      format: 'A4 — 210×297 mm',
      type: 'Quadri',
      face: 'Recto-verso',
      volets: '1 volet',
      qty: 100,
    };
    const withFin = { ...base, finitions: ['Vernis'] };
    const a = await calculatePrice('fly-std', base);
    const b = await calculatePrice('fly-std', withFin);
    const source = (a?.snapshot as { priceSource?: string } | undefined)?.priceSource;
    if (source === 'flyerIsfPliage' && a && b && a.prixUnitaire > 0) {
      expect(b.prixUnitaire).toBe(a.prixUnitaire);
    }
  });

  it('ISF : face_interieur Recto-verso aligné sur face', async () => {
    const { computeImpressionSfPrice } = await import('@/lib/pricing/impression-sf-pricing');
    const cfg = {
      matiere: 'PCM',
      grammage: '80g',
      format: 'A4 — 210×297 mm',
      type: 'Quadri',
      qty: 100,
    };
    const viaInterieur = computeImpressionSfPrice({ ...cfg, face_interieur: 'Recto-verso' }, 100);
    const viaFace = computeImpressionSfPrice({ ...cfg, face: 'Recto-verso' }, 100);
    const recto = computeImpressionSfPrice({ ...cfg, face: 'Recto' }, 100);
    if (viaFace.calculable && recto.calculable) {
      expect(viaFace.prixUnitaire).toBeGreaterThan(recto.prixUnitaire);
      expect(viaInterieur.prixUnitaire).toBe(viaFace.prixUnitaire);
    }
  });

  it('event bâche : delegate_grand_format ne tombe pas sur dbTarif', async () => {
    const { calculatePrice } = await import('@/lib/pricing/calculate');
    const server = await calculatePrice('evt-affiche', {
      format: 'A0 — 841×1189 mm',
      matiere: 'Bâche 440g',
      face: 'Recto',
      qty: 1,
    });
    const source = (server?.snapshot as { priceSource?: string } | undefined)?.priceSource;
    expect(source).not.toBe('dbTarif');
    expect(source).not.toBe('prixDepart');
    expect(['eventIncomplete', 'eventSurDevis', 'gfSurDevis', 'customSurfaceM2', 'legacySurfaceM2']).toContain(source);
  });

  it('calendrier chevalet : face_interieur non écrasée par face', () => {
    const result = computeCalendarPrice('cal-chevalet', {
      format: 'A5 — 148×210 mm',
      feuillets: '12',
      matiere: 'PCM',
      grammage: '80g',
      face: 'Recto',
      face_interieur: 'Recto-verso',
      qty: 10,
      prix_support_chevalet: 2000,
    }, undefined, 10);
    if (result.publication) {
      expect(result.publication.faceMode).toBe('recto_verso');
    }
  });
});
