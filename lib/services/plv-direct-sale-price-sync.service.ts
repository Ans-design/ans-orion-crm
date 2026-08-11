/**
 * Sync prix DirectSale (Roll-up / X-Banner) → profils canoniques PLV + runtime pricing.
 */
import { prisma } from '@/lib/prisma';
import {
  PLV_LEGACY_PREFILL,
  PLV_LEGACY_TO_CANONICAL,
  resolvePlvCanonicalId,
} from '@/lib/pos/plv-catalog';
import { REDUNDANT_PLV_DIRECT_SALE_IDS } from '@/lib/pos/grand-format-redundant';
import {
  getPlvDirectSaleRuntimeParams,
  setPlvDirectSaleRuntimeParams,
  type PlvDirectSaleFlatOverride,
  type PlvDirectSaleRuntimeParams,
} from '@/lib/pricing/plv-direct-sale-runtime';

const SYNC_SOURCE = 'plv-direct-sale-price-sync';

let ready = false;

export function invalidatePlvDirectSalePriceCache() {
  ready = false;
}

function resolveTypeFormat(ref: string, name: string): { type: string; format?: string } {
  const prefill = PLV_LEGACY_PREFILL[ref];
  if (prefill?.type) {
    return { type: prefill.type, format: prefill.format };
  }
  const n = name.toLowerCase();
  if (/deluxe|premium/i.test(n)) {
    return { type: 'Roll-up deluxe / premium', format: '85×200 cm' };
  }
  if (/roll[\s-]?up/i.test(n)) {
    return { type: 'Roll-up standard', format: '80×200 cm' };
  }
  if (/x[\s-]?banner/i.test(n)) {
    return { type: 'X-Banner standard', format: '80×200 cm' };
  }
  return { type: name };
}

/** Charge les SKUs AVD* publiés et pousse prixBase + runtime flat. */
export async function syncPlvDirectSalePricesToCanonical(opts?: {
  userId?: string;
  userName?: string;
}): Promise<{ synced: number; overrides: number }> {
  const refs = [
    ...(REDUNDANT_PLV_DIRECT_SALE_IDS as readonly string[]),
    ...Object.keys(PLV_LEGACY_TO_CANONICAL).filter((k) => /^AVD/i.test(k) || /^GF01[34]$/i.test(k)),
  ];
  const uniqueRefs = [...new Set(refs)];

  const articles = await prisma.directSaleArticle.findMany({
    where: {
      OR: [
        { reference: { in: uniqueRefs } },
        { name: { contains: 'Roll up' } },
        { name: { contains: 'Roll-up' } },
        { name: { contains: 'X-Banner' } },
        { name: { contains: 'X Banner' } },
      ],
      status: { in: ['published', 'draft'] },
    },
    select: {
      id: true,
      reference: true,
      name: true,
      unitPrice: true,
      status: true,
    },
  });

  const overrides: PlvDirectSaleFlatOverride[] = [];
  const prixBaseByArticle: Record<string, number> = {};

  for (const a of articles) {
    const ref = (a.reference ?? '').trim();
    if (!ref) continue;
    const canonical = resolvePlvCanonicalId(ref);
    if (!/^plv-(rollup|xbanner)$/i.test(canonical)) continue;
    if (!(a.unitPrice > 0)) continue;

    const { type, format } = resolveTypeFormat(ref, a.name);
    overrides.push({
      sourceRef: ref,
      articleId: canonical,
      type,
      format,
      unitPrice: Math.round(a.unitPrice),
    });

    const prev = prixBaseByArticle[canonical];
    if (prev == null || a.unitPrice < prev) {
      prixBaseByArticle[canonical] = Math.round(a.unitPrice);
    }
  }

  for (const [articleId, prixBase] of Object.entries(prixBaseByArticle)) {
    await prisma.articlePricingProfile.updateMany({
      where: { articleId },
      data: {
        prixBase,
        source: SYNC_SOURCE,
        updatedAt: new Date(),
      },
    });
  }

  const params: PlvDirectSaleRuntimeParams = { overrides, prixBaseByArticle };
  setPlvDirectSaleRuntimeParams(params);

  // Tarifs m² / structure depuis DB publiée (jamais hardcode en STRICT)
  try {
    const { setPlvRuntimeTariffOverrides } = await import('@/lib/data/plv-tariffs');
    const gfRows = await prisma.grandFormatPricing.findMany({
      where: { active: true, status: { in: ['published', 'actif', 'draft'] } },
      select: { pricePerM2: true, basePrice: true, name: true, materialName: true },
      take: 80,
    });
    const m2Rates = gfRows
      .map((r) => r.pricePerM2)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0);
    const printRateM2Ar = m2Rates.length
      ? Math.round(m2Rates.reduce((a, b) => a + b, 0) / m2Rates.length)
      : undefined;

    const ctx = await prisma.materialContextPrice.findMany({
      where: {
        active: true,
        priceContext: { in: ['PRINT_GRAND_FORMAT', 'PVC_RIGID', 'DIRECT_COMPONENT'] },
        priceUnit: { in: ['m2', 'ml'] },
      },
      select: { materialKey: true, priceHT: true, priceUnit: true },
      take: 120,
    });
    const materialRateM2Ar: Record<string, number> = {};
    for (const c of ctx) {
      if (c.priceUnit === 'm2' && c.priceHT > 0) {
        const label = c.materialKey.replace(/_/g, ' ');
        materialRateM2Ar[label] = c.priceHT;
        materialRateM2Ar[c.materialKey] = c.priceHT;
      }
    }

    const dsStructure: Record<string, number> = { ...prixBaseByArticle };
    setPlvRuntimeTariffOverrides({
      ...(printRateM2Ar ? { printRateM2Ar } : {}),
      ...(Object.keys(materialRateM2Ar).length ? { materialRateM2Ar } : {}),
      ...(Object.keys(dsStructure).length ? { articleStructureBaseAr: dsStructure } : {}),
    });
  } catch {
    /* tables absentes / hors sync */
  }

  ready = true;

  void opts;
  return { synced: Object.keys(prixBaseByArticle).length, overrides: overrides.length };
}

export async function ensurePlvDirectSalePricesSynced() {
  if (ready) return getPlvDirectSaleRuntimeParams();
  await syncPlvDirectSalePricesToCanonical();
  return getPlvDirectSaleRuntimeParams();
}
