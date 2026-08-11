/**
 * Archive les variantes ART-xxx / lignes [prix→…] hors cartes POS (~95 parents).
 * Zéro suppression de routes — soft archive + visiblePOS=false.
 */

import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import {
  artVariantArchiveLabel,
  isPosParentArticleId,
  resolveArticle2026CanonicalPosId,
} from '@/lib/pos/article-2026-canonical-map';
import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';

const SYNC_SOURCE = 'merge-art-variants-to-parents';

export type MergeArtVariantsReport = {
  directSaleArchived: number;
  profilesArchived: number;
  parentsEnsured: number;
  ids: string[];
};

function resolveCanonicalFromDirectSale(opts: {
  excelId?: string | null;
  reference?: string | null;
  name?: string | null;
}): string | null {
  const excelId = String(opts.excelId ?? '').trim();
  const reference = String(opts.reference ?? '').trim();
  const name = String(opts.name ?? '').trim();

  if (isPosParentArticleId(reference)) return reference;
  if (isPosParentArticleId(excelId)) return excelId;

  const m = name.match(/^\[prix→([^\]]+)\]/i) || name.match(/^\[archivé→([^\]]+)\]/i);
  if (m?.[1] && isPosParentArticleId(m[1].trim())) return m[1].trim();

  if (/^ART-/i.test(excelId) || /carte de visite|flyer|bloc[\s-]?note|roll[\s-]?up|t[\s-]?shirt|plaque/i.test(name)) {
    return resolveArticle2026CanonicalPosId({
      ref: excelId || 'ART-UNK',
      family: '',
      article: name.replace(/^\[prix→[^\]]+\]\s*/i, '').replace(/^\[archivé→[^\]]+\]\s*/i, ''),
      variant: '',
    });
  }
  return null;
}

export async function mergeArtVariantsToParents(opts?: {
  userId?: string;
  userName?: string;
}): Promise<MergeArtVariantsReport> {
  const report: MergeArtVariantsReport = {
    directSaleArchived: 0,
    profilesArchived: 0,
    parentsEnsured: 0,
    ids: [],
  };

  const parentIdSet = new Set(POS_CATALOGUE.map((a) => a.id));

  // 1) DirectSale : masquer ART / variantes
  const dsRows = await prisma.directSaleArticle.findMany({
    select: {
      id: true,
      excelId: true,
      reference: true,
      name: true,
      status: true,
      visiblePOS: true,
      unitPrice: true,
    },
  });

  for (const row of dsRows) {
    const excelId = String(row.excelId ?? '');
    const isArt = /^ART-/i.test(excelId);
    const isPrixLabel = /^\[prix→/i.test(row.name) || /^\[archiv/i.test(row.name);
    const isParentExcel = Boolean(excelId && parentIdSet.has(excelId));
    const isParentRefOnly =
      Boolean(row.reference && parentIdSet.has(row.reference))
      && !isArt
      && !isPrixLabel;

    // Parents POS (excelId/réf = id catalogue, pas ART) : forcer visibles
    if (isParentExcel || isParentRefOnly) {
      if (row.status !== 'published' || !row.visiblePOS) {
        await prisma.directSaleArticle.update({
          where: { id: row.id },
          data: { status: 'published', visiblePOS: true },
        });
        report.parentsEnsured += 1;
      }
      continue;
    }

    if (isArt || isPrixLabel) {
      const can = resolveCanonicalFromDirectSale(row) ?? 'fin-autres';
      if (row.status === 'archived' && !row.visiblePOS && row.reference === can) continue;

      await prisma.directSaleArticle.update({
        where: { id: row.id },
        data: {
          status: 'archived',
          visiblePOS: false,
          reference: can,
          name: artVariantArchiveLabel(can, row.name),
        },
      });
      report.directSaleArchived += 1;
      report.ids.push(excelId || row.id);
      continue;
    }

    // Lignes explosées sans ART : masquer si canonique trouvé
    const can = resolveCanonicalFromDirectSale(row);
    if (!can || can === row.reference) continue;
    await prisma.directSaleArticle.update({
      where: { id: row.id },
      data: {
        status: 'archived',
        visiblePOS: false,
        reference: can,
        name: artVariantArchiveLabel(can, row.name),
      },
    });
    report.directSaleArchived += 1;
    report.ids.push(row.id);
  }

  // 2) Profils pricing : archiver ids non-parents (ART, AVD variants, etc.)
  const profiles = await prisma.articlePricingProfile.findMany({
    select: { articleId: true, articleLabel: true, status: true, active: true, prixBase: true },
  });

  for (const p of profiles) {
    if (parentIdSet.has(p.articleId)) {
      if (p.status === 'archived' || !p.active) {
        await prisma.articlePricingProfile.update({
          where: { articleId: p.articleId },
          data: { status: 'published', active: true, source: SYNC_SOURCE, updatedAt: new Date() },
        });
        report.parentsEnsured += 1;
      }
      continue;
    }

    // Ne pas archiver si déjà archivé
    if (p.status === 'archived' && !p.active) continue;

    const can =
      resolveCanonicalFromDirectSale({
        excelId: p.articleId,
        name: p.articleLabel,
      }) ?? 'fin-autres';

    await prisma.articlePricingProfile.update({
      where: { articleId: p.articleId },
      data: {
        status: 'archived',
        active: false,
        articleLabel: `[archivé→${can}] ${(p.articleLabel ?? p.articleId).replace(/^\[archivé→[^\]]+\]\s*/i, '')}`,
        source: SYNC_SOURCE,
        updatedAt: new Date(),
      },
    });
    report.profilesArchived += 1;
    report.ids.push(p.articleId);
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'MERGE',
    entity: 'ArtVariantsToParents',
    details: report,
  });

  return report;
}
