/**
 * pricingDataSyncService — fusion logique Stock & Matières ↔ vues ISF / GF / AVD.
 * Ne crée pas de doublons : upsert MaterialContextPrice + liens baseMaterialId.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { upsertMaterialContextPrice } from '@/lib/pricing/material-context-price';
import { cleanAndMergeMaterials } from '@/lib/server/modules/materials/material-merge.service';
import { invalidateAdminCaches } from '@/lib/services/admin-data-sync.service';

export type PricingDriftItem = {
  kind: 'duplicate_material' | 'price_divergence' | 'orphan_isf' | 'orphan_gf' | 'missing_context_price' | 'hardcoded_hint';
  severity: 'info' | 'warn' | 'error';
  message: string;
  materialKey?: string;
  leftPrice?: number | null;
  rightPrice?: number | null;
  leftSource?: string;
  rightSource?: string;
  ids?: string[];
};

export type MigrationReport = {
  materialsLinked: number;
  smallFormatPrices: number;
  grandFormatPrices: number;
  blankPrices: number;
  profilesCreated: number;
  drifts: PricingDriftItem[];
  ok: boolean;
};

function hasCtxDelegate(): boolean {
  const client = prisma as unknown as Record<string, unknown>;
  return typeof client.materialContextPrice === 'object' && client.materialContextPrice != null;
}

function hasProfileDelegate(): boolean {
  const client = prisma as unknown as Record<string, unknown>;
  return typeof client.productPricingProfile === 'object' && client.productPricingProfile != null;
}

async function findMaterialForKey(materialKey: string, label?: string | null) {
  if (!materialKey && !label) return null;
  return prisma.baseMaterial.findFirst({
    where: {
      archived: false,
      OR: [
        ...(materialKey ? [
          { materialKey },
          { materialKey: { startsWith: `${materialKey}:` } },
          { materialKey: { contains: materialKey } },
        ] : []),
        ...(label ? [{ label }, { label: { contains: label } }] : []),
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/** Migre BasePrintingPrice → MaterialContextPrice + baseMaterialId. */
export async function syncMaterialToSmallFormat(): Promise<{ upserted: number; linked: number }> {
  let upserted = 0;
  let linked = 0;
  const rows = await prisma.basePrintingPrice.findMany({
    where: { active: true },
    orderBy: { updatedAt: 'desc' },
  });

  for (const row of rows) {
    const mat = await findMaterialForKey(row.materialKey);
    if (!mat) continue;

    if (!row.baseMaterialId || row.baseMaterialId !== mat.id) {
      try {
        await prisma.basePrintingPrice.update({
          where: { id: row.id },
          data: { baseMaterialId: mat.id },
        });
        linked += 1;
      } catch { /* colonne absente avant generate */ }
    }

    if (hasCtxDelegate() && row.basePrice > 0) {
      const format = row.formatLabel || 'A4';
      await upsertMaterialContextPrice({
        baseMaterialId: mat.id,
        materialKey: mat.materialKey,
        priceContext: 'PRINT_SMALL_FORMAT',
        priceUnit: 'a4',
        baseFormat: format === 'A4' || !format ? 'A4' : format,
        priceHT: row.basePrice,
        costHT: row.materialCost,
        sourceTable: 'BasePrintingPrice',
        sourceRowId: row.id,
        active: row.publicationStatus === 'published' || row.active,
      });
      upserted += 1;
    }

    // Aligner aussi BaseMaterial.basePrintPrice si A4 publié
    if (
      (row.formatLabel === 'A4' || !row.formatLabel)
      && row.publicationStatus === 'published'
      && row.basePrice > 0
      && (mat.basePrintPrice == null || mat.basePrintPrice === 0 || Math.abs((mat.basePrintPrice ?? 0) - row.basePrice) > 0.01)
    ) {
      // Ne pas écraser si matière a un prix plus récent volontairement différent
      // → seulement si basePrintPrice vide
      if (mat.basePrintPrice == null || mat.basePrintPrice === 0) {
        await prisma.baseMaterial.update({
          where: { id: mat.id },
          data: { basePrintPrice: row.basePrice },
        });
      }
    }
  }

  return { upserted, linked };
}

/** Migre GrandFormatPricing → MaterialContextPrice. */
export async function syncMaterialToGrandFormat(): Promise<{ upserted: number; linked: number }> {
  let upserted = 0;
  let linked = 0;
  const rows = await prisma.grandFormatPricing.findMany({ where: { active: true } });

  for (const row of rows) {
    const key = row.materialKey || row.name;
    const mat = await findMaterialForKey(key, row.materialName || row.name);
    if (!mat) continue;

    if (!row.baseMaterialId || row.baseMaterialId !== mat.id) {
      try {
        await prisma.grandFormatPricing.update({
          where: { id: row.id },
          data: { baseMaterialId: mat.id },
        });
        linked += 1;
      } catch { /* ignore */ }
    }

    const m2 = row.pricePerM2 ?? row.basePrice;
    if (hasCtxDelegate() && m2 != null && m2 > 0) {
      await upsertMaterialContextPrice({
        baseMaterialId: mat.id,
        materialKey: mat.materialKey,
        priceContext: 'PRINT_GRAND_FORMAT',
        priceUnit: 'm2',
        baseFormat: null,
        priceHT: m2,
        sourceTable: 'GrandFormatPricing',
        sourceRowId: row.id,
        active: true,
      });
      upserted += 1;
    }
  }

  return { upserted, linked };
}

/** Sync prix achat / blank → RAW_STOCK / BLANK_MATERIAL. */
export async function syncMaterialRawAndBlank(): Promise<{ upserted: number }> {
  let upserted = 0;
  if (!hasCtxDelegate()) return { upserted };

  const materials = await prisma.baseMaterial.findMany({
    where: { archived: false, active: true },
  });
  for (const mat of materials) {
    if (mat.purchasePrice != null && mat.purchasePrice > 0) {
      await upsertMaterialContextPrice({
        baseMaterialId: mat.id,
        materialKey: mat.materialKey,
        priceContext: 'RAW_STOCK',
        priceUnit: 'piece',
        baseFormat: null,
        priceHT: mat.purchasePrice,
        sourceTable: 'BaseMaterial',
        sourceRowId: mat.id,
      });
      upserted += 1;
    }
    if (mat.basePrintPrice != null && mat.basePrintPrice > 0) {
      await upsertMaterialContextPrice({
        baseMaterialId: mat.id,
        materialKey: mat.materialKey,
        priceContext: 'PRINT_SMALL_FORMAT',
        priceUnit: 'a4',
        baseFormat: 'A4',
        priceHT: mat.basePrintPrice,
        costHT: mat.purchasePrice,
        sourceTable: 'BaseMaterial',
        sourceRowId: mat.id,
      });
      upserted += 1;
    }
  }

  try {
    const blanks = await prisma.blankMaterialPrice.findMany({ where: { active: true } });
    for (const b of blanks) {
      const mat = await findMaterialForKey(b.materialKey || '', b.name);
      if (!mat || !(b.purchasePrice > 0)) continue;
      await upsertMaterialContextPrice({
        baseMaterialId: mat.id,
        materialKey: mat.materialKey,
        priceContext: 'BLANK_MATERIAL',
        priceUnit: 'sheet',
        baseFormat: b.formatBase ?? 'A4',
        priceHT: b.purchasePrice,
        sourceTable: 'BlankMaterialPrice',
        sourceRowId: b.id,
      });
      upserted += 1;
    }
  } catch { /* ignore */ }

  return { upserted };
}

export async function syncMaterialToDirectArticles(): Promise<{ profiles: number }> {
  let profiles = 0;
  if (!hasProfileDelegate()) return { profiles };

  try {
    const articles = await prisma.directSaleArticle.findMany({ where: { status: 'published' }, take: 500 });
    for (const a of articles) {
      const mat = a.materialKey ? await findMaterialForKey(a.materialKey) : null;
      const mode = a.unitPrice != null && a.unitPrice > 0
        ? (mat ? 'MATERIAL_BASED' : 'DIRECT_FIXED_PRICE')
        : (mat ? 'MATERIAL_BASED' : 'CUSTOM_QUOTE');

      await prisma.productPricingProfile.upsert({
        where: { articleId: a.id },
        create: {
          articleId: a.id,
          articleLabel: a.name,
          pricingMode: mode,
          baseMaterialId: mat?.id ?? null,
          directPrice: a.unitPrice,
          active: true,
          visiblePOS: a.visiblePOS !== false,
        },
        update: {
          articleLabel: a.name,
          baseMaterialId: mat?.id ?? null,
          directPrice: a.unitPrice,
          active: true,
        },
      });
      profiles += 1;
    }
  } catch { /* ignore */ }

  return { profiles };
}

export async function syncRulesToPOS() {
  invalidateAdminCaches();
  const { ensureImpressionSfRuntimeReady } = await import('@/lib/services/pricing-rules-sync.service');
  await ensureImpressionSfRuntimeReady();
  try {
    const { invalidateEventPricingRuntime, ensureEventPricingRuntimeReady } = await import(
      '@/lib/services/event-pricing-sync.service'
    );
    invalidateEventPricingRuntime();
    await ensureEventPricingRuntimeReady();
  } catch { /* ignore */ }
  return { ok: true };
}

export async function detectPricingDrift(): Promise<PricingDriftItem[]> {
  const drifts: PricingDriftItem[] = [];

  // Doublons BaseMaterial (même label normalisé)
  const materials = await prisma.baseMaterial.findMany({
    where: { archived: false },
    select: {
      id: true,
      materialKey: true,
      label: true,
      grammage: true,
      basePrintPrice: true,
      family: true,
    },
  });

  const byNorm = new Map<string, typeof materials>();
  for (const m of materials) {
    const norm = `${(m.label || '').toLowerCase().replace(/\s+/g, ' ').trim()}|${m.grammage ?? ''}|${m.family}`;
    const list = byNorm.get(norm) ?? [];
    list.push(m);
    byNorm.set(norm, list);
  }
  for (const [, group] of byNorm) {
    if (group.length < 2) continue;
    drifts.push({
      kind: 'duplicate_material',
      severity: 'warn',
      message: `Doublon matière : ${group[0]!.label} (${group.length} lignes)`,
      materialKey: group[0]!.materialKey,
      ids: group.map((g) => g.id),
      leftPrice: group[0]!.basePrintPrice,
      rightPrice: group[1]!.basePrintPrice,
    });
  }

  // Divergence BaseMaterial.basePrintPrice vs BasePrintingPrice A4
  const bpp = await prisma.basePrintingPrice.findMany({
    where: { active: true, publicationStatus: 'published' },
  });
  for (const row of bpp) {
    if (row.formatLabel && row.formatLabel !== 'A4') continue;
    const mat = await findMaterialForKey(row.materialKey);
    if (!mat?.basePrintPrice || !(row.basePrice > 0)) continue;
    if (Math.abs(mat.basePrintPrice - row.basePrice) > 1) {
      drifts.push({
        kind: 'price_divergence',
        severity: 'error',
        message: `Prix divergent ${mat.label} : Stock ${mat.basePrintPrice} Ar ≠ ISF ${row.basePrice} Ar`,
        materialKey: mat.materialKey,
        leftPrice: mat.basePrintPrice,
        rightPrice: row.basePrice,
        leftSource: 'BaseMaterial.basePrintPrice',
        rightSource: 'BasePrintingPrice',
        ids: [mat.id, row.id],
      });
    }
  }

  // Orphelins ISF sans BaseMaterial
  for (const row of bpp) {
    if (!row.materialKey) continue;
    const mat = await findMaterialForKey(row.materialKey);
    if (!mat) {
      drifts.push({
        kind: 'orphan_isf',
        severity: 'warn',
        message: `ISF orphelin : matière « ${row.materialKey} » absente de Stock & Matières`,
        materialKey: row.materialKey,
        rightPrice: row.basePrice,
        rightSource: 'BasePrintingPrice',
        ids: [row.id],
      });
    }
  }

  // GF orphelins
  try {
    const gfRows = await prisma.grandFormatPricing.findMany({ where: { active: true } });
    for (const row of gfRows) {
      const key = row.materialKey || row.name;
      const mat = await findMaterialForKey(key, row.materialName);
      if (!mat) {
        drifts.push({
          kind: 'orphan_gf',
          severity: 'warn',
          message: `Grand Format orphelin : « ${row.name} » sans BaseMaterial`,
          materialKey: key,
          rightPrice: row.pricePerM2 ?? row.basePrice,
          rightSource: 'GrandFormatPricing',
          ids: [row.id],
        });
      }
    }
  } catch { /* ignore */ }

  return drifts;
}

export async function verifyNoDuplicatePriceSources(): Promise<{
  ok: boolean;
  drifts: PricingDriftItem[];
}> {
  const drifts = await detectPricingDrift();
  const blocking = drifts.filter((d) => d.severity === 'error' || d.kind === 'duplicate_material');
  return { ok: blocking.length === 0, drifts };
}

export async function rebuildPOSPriceIndex() {
  await syncMaterialToSmallFormat();
  await syncMaterialToGrandFormat();
  await syncMaterialRawAndBlank();
  await syncMaterialToDirectArticles();
  await syncRulesToPOS();
  return { ok: true };
}

/** Migration complète sûre (idempotente). */
export async function migratePricingSourcesToCanonical(opts?: {
  userId?: string;
  userName?: string;
}): Promise<MigrationReport> {
  const small = await syncMaterialToSmallFormat();
  const gf = await syncMaterialToGrandFormat();
  const raw = await syncMaterialRawAndBlank();
  const ds = await syncMaterialToDirectArticles();
  await syncRulesToPOS();
  const drifts = await detectPricingDrift();

  const report: MigrationReport = {
    materialsLinked: small.linked + gf.linked,
    smallFormatPrices: small.upserted,
    grandFormatPrices: gf.upserted,
    blankPrices: raw.upserted,
    profilesCreated: ds.profiles,
    drifts,
    ok: drifts.filter((d) => d.severity === 'error').length === 0,
  };

  try {
    await logAudit({
      action: 'pricing.fusion_migrate',
      entity: 'MaterialContextPrice',
      entityId: 'canonical',
      userId: opts?.userId,
      userName: opts?.userName,
      details: report as unknown as Record<string, unknown>,
    });
  } catch { /* ignore */ }

  return report;
}

/** Fusion doublons matières + re-sync prix. */
export async function mergeDuplicateMaterialsAndResync(opts?: {
  userId?: string;
  userName?: string;
  dryRun?: boolean;
}) {
  const merge = await cleanAndMergeMaterials(opts);
  if (!opts?.dryRun) {
    await rebuildPOSPriceIndex();
  }
  const drifts = await detectPricingDrift();
  return { merge, drifts };
}

export const pricingDataSyncService = {
  syncMaterialToSmallFormat,
  syncMaterialToGrandFormat,
  syncMaterialToDirectArticles,
  syncRulesToPOS,
  detectPricingDrift,
  rebuildPOSPriceIndex,
  verifyNoDuplicatePriceSources,
  migratePricingSourcesToCanonical,
  mergeDuplicateMaterialsAndResync,
};
