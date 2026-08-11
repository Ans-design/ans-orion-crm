/**
 * Backfill Administration Grand Format depuis le catalogue POS.
 * Idempotent : ne crée que les lignes manquantes, ne écrase jamais un prix Admin.
 * Restaure les lignes archivées plutôt que de recréer (évite conflit excelId @unique).
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { CATALOGUE } from '@/lib/data/catalogue';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { GF_ARTICLE_META, isGrandFormatArticleId } from '@/lib/grand-format/article-meta';
import { gfLaizeFallbackCm } from '@/lib/grand-format/laize-fallbacks';
import { REDUNDANT_GF_MATERIAL_IDS } from '@/lib/pos/grand-format-redundant';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';

const SYNC_SOURCE = 'admin-from-pos-backfill-gf';

/** Articles POS canoniques à exposer en Admin (pas les alias redondants). */
export function listCanonicalGrandFormatPosIds(): string[] {
  const fromCatalogue = CATALOGUE
    .filter((a) => a.configType === 'grand_format' || a.category === 'grand_format')
    .map((a) => a.id);

  const fromMeta = Object.keys(GF_ARTICLE_META);
  const all = [...new Set([...fromCatalogue, ...fromMeta])];

  return all.filter((id) => {
    if (REDUNDANT_GF_MATERIAL_IDS[id]) return false;
    if (/^gf-(bache440|mesh|bache320|pvc3|pvc6|plexi3|plexi5|acrylic)$/i.test(id)) return false;
    return isGrandFormatArticleId(id);
  });
}

export type GrandFormatBackfillReport = {
  scanned: number;
  created: number;
  preserved: number;
  restored: number;
  widthsCreated: number;
  pricesMissing: number;
  errors: number;
  anomalies: string[];
  createdIds: string[];
  preservedIds: string[];
  restoredIds: string[];
};

function primaryLaizeM(articleId: string): number | null {
  const cms = gfLaizeFallbackCm(articleId);
  if (!cms.length) return null;
  return Math.round((cms[0]! / 100) * 1000) / 1000;
}

async function ensureWidths(
  pricingId: string,
  articleId: string,
  materialName: string,
  laizesCm: number[],
): Promise<number> {
  if (!laizesCm.length) return 0;
  let created = 0;
  for (let i = 0; i < laizesCm.length; i++) {
    const cm = laizesCm[i]!;
    const excelId = `${articleId}-L${cm}`;
    const existing = await prisma.grandFormatMaterialWidth.findFirst({
      where: {
        OR: [
          { excelId },
          { grandFormatPricingId: pricingId, laizeCm: cm },
        ],
      },
    });
    if (existing) {
      if (!existing.active || existing.grandFormatPricingId !== pricingId) {
        await prisma.grandFormatMaterialWidth.update({
          where: { id: existing.id },
          data: {
            grandFormatPricingId: pricingId,
            materialKey: materialName,
            materialName,
            laizeCm: cm,
            laizeM: Math.round((cm / 100) * 1000) / 1000,
            sortOrder: i,
            active: true,
            visiblePOS: true,
            excelId: existing.excelId ?? excelId,
          },
        });
      }
      continue;
    }
    try {
      await prisma.grandFormatMaterialWidth.create({
        data: {
          grandFormatPricingId: pricingId,
          materialKey: materialName,
          materialName,
          laizeCm: cm,
          laizeM: Math.round((cm / 100) * 1000) / 1000,
          sortOrder: i,
          active: true,
          visiblePOS: true,
          excelId,
        },
      });
      created += 1;
    } catch (e) {
      // Concurrence / unique — ignorer si déjà créé
      console.warn('[gf-backfill] width', excelId, e);
    }
  }
  return created;
}

export async function backfillGrandFormatAdminFromPos(opts?: {
  userId?: string;
  userName?: string;
  dryRun?: boolean;
}): Promise<GrandFormatBackfillReport> {
  const ids = listCanonicalGrandFormatPosIds();
  const report: GrandFormatBackfillReport = {
    scanned: ids.length,
    created: 0,
    preserved: 0,
    restored: 0,
    widthsCreated: 0,
    pricesMissing: 0,
    errors: 0,
    anomalies: [],
    createdIds: [],
    preservedIds: [],
    restoredIds: [],
  };

  for (const articleId of ids) {
    try {
      const meta = GF_ARTICLE_META[articleId];
      const cat = findCatalogueItem(articleId);
      const name = cat?.name ?? meta?.materialKeys[0] ?? articleId;
      const materialName = meta?.materialKeys[0] ?? name;
      const prixFallback = meta?.prixM2Fallback ?? cat?.prixDepart ?? null;
      const laizesCm = gfLaizeFallbackCm(articleId);
      const laizeM = primaryLaizeM(articleId);
      const laizesJson = laizesCm.length
        ? JSON.stringify(laizesCm.map((cm) => Math.round((cm / 100) * 1000) / 1000))
        : null;

      // Inclure archivées : excelId @unique bloque sinon toute recréation
      const existing = await prisma.grandFormatPricing.findFirst({
        where: {
          OR: [{ reference: articleId }, { excelId: articleId }],
        },
        orderBy: { updatedAt: 'desc' },
      });

      const hasPriceFallback = prixFallback != null && prixFallback > 0;

      if (existing) {
        const wasArchived = existing.status === 'archived' || existing.active === false;
        const priceOk =
          (existing.pricePerM2 != null && existing.pricePerM2 > 0) ||
          (existing.basePrice != null && existing.basePrice > 0);

        if (!priceOk) {
          report.pricesMissing += 1;
          report.anomalies.push(`${articleId}: prix m² à compléter`);
        }

        if (opts?.dryRun) {
          if (wasArchived) {
            report.restored += 1;
            report.restoredIds.push(existing.id);
          } else {
            report.preserved += 1;
            report.preservedIds.push(existing.id);
          }
          continue;
        }

        const patch: Record<string, unknown> = {};
        if (!existing.reference) patch.reference = articleId;
        if (!existing.excelId) patch.excelId = articleId;
        if (!existing.materialName && materialName) patch.materialName = materialName;
        if (!existing.materialKey && materialName) patch.materialKey = materialName;
        if (existing.laize == null && laizeM != null) patch.laize = laizeM;
        if (!existing.laizesJson && laizesJson) patch.laizesJson = laizesJson;
        if (!existing.name) patch.name = name;

        if (wasArchived) {
          patch.active = true;
          patch.status = priceOk ? 'published' : 'a_completer';
          patch.visiblePOS = priceOk;
          if (!priceOk && !existing.details) {
            patch.details = `Prix à compléter — restaure POS ${SYNC_SOURCE}`;
          }
          report.restored += 1;
          report.restoredIds.push(existing.id);
        } else {
          report.preserved += 1;
          report.preservedIds.push(existing.id);
        }

        if (Object.keys(patch).length) {
          await prisma.grandFormatPricing.update({
            where: { id: existing.id },
            data: patch as Parameters<typeof prisma.grandFormatPricing.update>[0]['data'],
          });
        }

        report.widthsCreated += await ensureWidths(
          existing.id,
          articleId,
          materialName,
          laizesCm,
        );
        continue;
      }

      if (!hasPriceFallback) {
        report.pricesMissing += 1;
        report.anomalies.push(`${articleId}: prix m² à compléter`);
      }

      if (opts?.dryRun) {
        report.created += 1;
        report.createdIds.push(articleId);
        continue;
      }

      const row = await prisma.grandFormatPricing.create({
        data: {
          excelId: articleId,
          reference: articleId,
          name,
          materialKey: materialName,
          materialName,
          unit: 'm²',
          pricePerM2: hasPriceFallback ? prixFallback : null,
          basePrice: hasPriceFallback ? prixFallback : null,
          laize: laizeM,
          laizesJson,
          marginRule: 'seuil_30cm',
          active: true,
          visiblePOS: hasPriceFallback,
          status: hasPriceFallback ? 'published' : 'a_completer',
          details: hasPriceFallback
            ? `Backfill POS ${SYNC_SOURCE}`
            : `Prix à compléter — backfill POS ${SYNC_SOURCE}`,
          sortOrder: report.created + report.restored,
        },
      });

      report.widthsCreated += await ensureWidths(row.id, articleId, materialName, laizesCm);
      report.created += 1;
      report.createdIds.push(articleId);
    } catch (e) {
      report.errors += 1;
      report.anomalies.push(
        `${articleId}: ${e instanceof Error ? e.message : 'erreur backfill'}`,
      );
      console.warn('[gf-backfill]', articleId, e);
    }
  }

  if (
    !opts?.dryRun &&
    (report.created > 0 || report.restored > 0 || report.widthsCreated > 0)
  ) {
    await logAudit({
      userId: opts?.userId,
      userName: opts?.userName,
      action: 'BACKFILL',
      entity: 'GrandFormatPricing',
      entityLabel: 'Compléter depuis POS',
      details: report as unknown as Record<string, unknown>,
    });
    await notifyAdminModuleMutation('grand-format-backfill', {
      userId: opts?.userId,
      userName: opts?.userName,
      details: {
        created: report.created,
        restored: report.restored,
        preserved: report.preserved,
        pricesMissing: report.pricesMissing,
        errors: report.errors,
      },
    });
  }

  return report;
}

export const grandFormatAdminBackfillService = {
  backfill: backfillGrandFormatAdminFromPos,
  listCanonicalIds: listCanonicalGrandFormatPosIds,
};
