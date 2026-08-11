/**
 * Applique Catalogue Articles 2026 → variantes prix (ART) + parents POS (~95).
 * Ne crée plus de cartes catalogue par variante.
 */

import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { listBaseMaterials } from '@/lib/server/modules/pricing/base-material.repository';
import {
  catalogueArticle2026ToPrixArticlesRow,
  getCatalogueArticles2026Workbook,
  isFinishedProductMisplacedAsMaterial,
  parseCatalogueArticles2026Buffer,
  type CatalogueArticles2026Workbook,
} from '@/lib/backoffice/catalogue-articles-2026-excel-format';
import { importPrixArticlesFromExcel } from '@/lib/server/modules/direct-sale/prix-articles-import.service';
import { invalidateAdminCaches } from '@/lib/services/admin-data-sync.service';
import {
  aggregateMinPriceByCanonical,
  resolveArticle2026CanonicalPosId,
} from '@/lib/pos/article-2026-canonical-map';
import { POS_CATALOGUE, findCatalogueItem } from '@/lib/data/catalogue-meta';
import { slugifyDirectSaleName } from '@/lib/direct-sale/categories';
import { CAT_LABELS } from '@/lib/data/catalogue';

export type CatalogueArticles2026ApplyReport = {
  articles: {
    read: number;
    created: number;
    updated: number;
    unchanged: number;
    errors: number;
    synced: number;
    issues: { line: number; reason: string }[];
  };
  materialsArchived: {
    count: number;
    labels: string[];
  };
  canonicalPosUpdated: {
    count: number;
    ids: string[];
  };
  parentsUpserted: {
    count: number;
    ids: string[];
  };
  appliedAt: string;
};

export type CatalogueArticles2026AuditReport = {
  source: 'reference' | 'upload';
  fileName?: string;
  scannedAt: string;
  summary: {
    totalArticles: number;
    byFamily: Record<string, number>;
    materialsMisplaced: number;
    materialsMisplacedLabels: string[];
    mappedParents: number;
    unmappedToFinAutres: number;
  };
};

export async function auditCatalogueArticles2026(opts?: {
  workbook?: CatalogueArticles2026Workbook;
  fileName?: string;
  source?: 'reference' | 'upload';
}): Promise<CatalogueArticles2026AuditReport> {
  const wb = opts?.workbook ?? getCatalogueArticles2026Workbook();
  const { rows: materials } = await listBaseMaterials({ archivedOnly: false });
  const misplaced = materials.filter((m) => isFinishedProductMisplacedAsMaterial(m.label));
  let finAutres = 0;
  const parents = new Set<string>();
  for (const a of wb.articles) {
    const p = resolveArticle2026CanonicalPosId(a);
    parents.add(p);
    if (p === 'fin-autres') finAutres += 1;
  }

  return {
    source: opts?.source ?? 'reference',
    fileName: opts?.fileName,
    scannedAt: new Date().toISOString(),
    summary: {
      totalArticles: wb.articles.length,
      byFamily: wb.byFamily,
      materialsMisplaced: misplaced.length,
      materialsMisplacedLabels: misplaced.map((m) => `${m.excelRowId ?? m.id}: ${m.label}`).slice(0, 40),
      mappedParents: parents.size,
      unmappedToFinAutres: finAutres,
    },
  };
}

async function upsertCanonicalPosBasePrice(
  canonicalId: string,
  unitPrice: number,
  familyHint: string,
  opts?: { userId?: string; userName?: string },
): Promise<boolean> {
  try {
    const cat = findCatalogueItem(canonicalId);
    const label = cat?.name ?? canonicalId;
    const family = cat?.category || familyHint || 'divers';

    const profile = await prisma.articlePricingProfile.findUnique({
      where: { articleId: canonicalId },
    });

    if (profile) {
      await prisma.articlePricingProfile.update({
        where: { articleId: canonicalId },
        data: {
          prixBase: unitPrice,
          articleLabel: label,
          family,
          status: 'published',
          active: true,
          source: 'catalogue-articles-2026',
          updatedAt: new Date(),
        },
      });
      return true;
    }

    await prisma.articlePricingProfile.create({
      data: {
        articleId: canonicalId,
        articleLabel: label,
        family,
        status: 'published',
        active: true,
        prixBase: unitPrice,
        source: 'catalogue-articles-2026',
      },
    });
    return true;
  } catch {
    await logAudit({
      userId: opts?.userId,
      userName: opts?.userName,
      action: 'WARN',
      entity: 'CatalogueArticles2026',
      entityId: canonicalId,
      details: { unitPrice, note: 'canonical POS upsert skipped' },
    });
    return false;
  }
}

/** Upsert DirectSale parent (1 ligne / id POS) — carte Prix articles. */
async function upsertParentDirectSale(
  canonicalId: string,
  unitPrice: number,
): Promise<boolean> {
  const cat = findCatalogueItem(canonicalId);
  if (!cat) return false;
  const name = cat.name;
  const category = CAT_LABELS[cat.category] ?? cat.category;
  const existing =
    (await prisma.directSaleArticle.findFirst({ where: { reference: canonicalId } }))
    ?? (await prisma.directSaleArticle.findFirst({ where: { excelId: canonicalId } }))
    ?? (await prisma.directSaleArticle.findUnique({ where: { id: canonicalId } }).catch(() => null));

  const payload = {
    name,
    category,
    reference: canonicalId,
    excelId: canonicalId,
    unitPrice,
    visiblePOS: true,
    status: 'published' as const,
    isCustomizable: true,
    requiresQuoteIfCustom: false,
    updatedAt: new Date(),
  };

  if (existing) {
    await prisma.directSaleArticle.update({
      where: { id: existing.id },
      data: payload,
    });
    return true;
  }

  await prisma.directSaleArticle.create({
    data: {
      ...payload,
      slug: slugifyDirectSaleName(`pos-${canonicalId}-${name}`),
    },
  });
  return true;
}

export async function applyCatalogueArticles2026(opts?: {
  workbook?: CatalogueArticles2026Workbook;
  userId?: string;
  userName?: string;
  fileName?: string;
  archiveMisplacedMaterials?: boolean;
  syncCanonicalPos?: boolean;
}): Promise<CatalogueArticles2026ApplyReport> {
  const wb = opts?.workbook ?? getCatalogueArticles2026Workbook(true);
  const archiveMisplaced = opts?.archiveMisplacedMaterials !== false;
  const syncCanonical = opts?.syncCanonicalPos !== false;

  // 1) Variantes ART → DirectSale archivées / invisible POS (lookup prix)
  const prixRows = wb.articles.map(catalogueArticle2026ToPrixArticlesRow);
  const articlesReport = await importPrixArticlesFromExcel(prixRows, {
    userId: opts?.userId,
    userName: opts?.userName,
    fileName: opts?.fileName ?? 'catalogue-articles-prix-imprimes-exacts-2026.xlsx',
  });

  // 2) Agrégat min prix → parents
  const minByCanonical = aggregateMinPriceByCanonical(wb.articles);
  const canonicalIds: string[] = [];
  const parentIds: string[] = [];

  if (syncCanonical) {
    for (const [id, price] of minByCanonical) {
      const cat = findCatalogueItem(id);
      const family = cat?.category ?? 'divers';
      const ok = await upsertCanonicalPosBasePrice(id, price, family, opts);
      if (ok) canonicalIds.push(id);
      const parentOk = await upsertParentDirectSale(id, price);
      if (parentOk) parentIds.push(id);
    }

    // Garantir les 95 parents en profil + DirectSale (carte Prix articles)
    for (const item of POS_CATALOGUE) {
      const price = minByCanonical.get(item.id);
      if (price != null) {
        /* déjà upsert via boucle minByCanonical */
      } else {
        const parentOk = await upsertParentDirectSale(item.id, item.prixDepart ?? 0);
        if (parentOk) parentIds.push(item.id);
      }
      const profile = await prisma.articlePricingProfile.findUnique({
        where: { articleId: item.id },
      });
      if (!profile) {
        await prisma.articlePricingProfile.create({
          data: {
            articleId: item.id,
            articleLabel: item.name,
            family: item.category,
            status: 'published',
            active: true,
            prixBase: price ?? item.prixDepart ?? null,
            source: 'pos-catalogue-parent',
          },
        });
        canonicalIds.push(item.id);
      } else if (profile.status === 'archived' || !profile.active) {
        await prisma.articlePricingProfile.update({
          where: { articleId: item.id },
          data: {
            status: 'published',
            active: true,
            articleLabel: item.name,
            ...(price != null ? { prixBase: price } : {}),
            source: 'pos-catalogue-parent',
            updatedAt: new Date(),
          },
        });
      }
    }
  }

  const archivedLabels: string[] = [];
  if (archiveMisplaced) {
    const { archiveMisplacedFinishedProductsFromMaterials } = await import(
      '@/lib/server/modules/materials/archive-misplaced-finished.service'
    );
    const archived = await archiveMisplacedFinishedProductsFromMaterials(opts);
    archivedLabels.push(...archived.labels);
  }

  // 3) Fusion / masquage variantes restantes
  try {
    const { mergeArtVariantsToParents } = await import(
      '@/lib/server/modules/pricing/merge-art-variants-to-parents.service'
    );
    await mergeArtVariantsToParents(opts);
  } catch {
    /* merge best-effort */
  }

  await invalidateAdminCaches();

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT',
    entity: 'CatalogueArticles2026',
    details: {
      articles: articlesReport,
      materialsArchived: archivedLabels.length,
      canonicalPos: canonicalIds,
      parents: parentIds,
    },
  });

  return {
    articles: {
      read: articlesReport.read,
      created: articlesReport.created,
      updated: articlesReport.updated,
      unchanged: articlesReport.unchanged,
      errors: articlesReport.errors,
      synced: articlesReport.synced,
      issues: articlesReport.issues,
    },
    materialsArchived: {
      count: archivedLabels.length,
      labels: archivedLabels.slice(0, 50),
    },
    canonicalPosUpdated: {
      count: canonicalIds.length,
      ids: canonicalIds,
    },
    parentsUpserted: {
      count: parentIds.length,
      ids: parentIds,
    },
    appliedAt: new Date().toISOString(),
  };
}

export async function applyCatalogueArticles2026FromUpload(
  buf: Buffer | ArrayBuffer,
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<CatalogueArticles2026ApplyReport> {
  const workbook = parseCatalogueArticles2026Buffer(buf);
  return applyCatalogueArticles2026({
    workbook,
    ...opts,
  });
}
