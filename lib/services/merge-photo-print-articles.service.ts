/**
 * Fusion articles redondants « Tirage photo A4/A5/… » → article unique ph-tirage.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';
import {
  PH_TIRAGE_CANONICAL_ID,
  REDUNDANT_TIRAGE_PHOTO_IDS,
  inferFormatFromRedundantTirageLabel,
  isRedundantTiragePhotoArticle,
} from '@/lib/pos/tirage-photo-redundant';

export {
  REDUNDANT_TIRAGE_PHOTO_IDS,
  isRedundantTiragePhotoArticle,
  inferFormatFromRedundantTirageLabel,
} from '@/lib/pos/tirage-photo-redundant';

export type MergePhotoPrintReport = {
  directSaleArchived: number;
  profilesArchived: number;
  formatsNoted: string[];
  ids: string[];
};

export async function mergePhotoPrintArticles(opts?: {
  userId?: string;
  userName?: string;
}): Promise<MergePhotoPrintReport> {
  const report: MergePhotoPrintReport = {
    directSaleArchived: 0,
    profilesArchived: 0,
    formatsNoted: [],
    ids: [],
  };

  const dsArticles = await prisma.directSaleArticle.findMany({
    where: {
      OR: [
        { name: { startsWith: 'Tirage photo ' } },
        { slug: { startsWith: 'tirage-photo-' } },
        { reference: { in: [...REDUNDANT_TIRAGE_PHOTO_IDS] } },
      ],
    },
  });

  for (const a of dsArticles) {
    if (!isRedundantTiragePhotoArticle(a.name, a.reference ?? a.slug)) continue;
    if (a.status === 'archived' && !a.visiblePOS) continue;

    const fmt = inferFormatFromRedundantTirageLabel(a.name);
    if (fmt && !report.formatsNoted.includes(fmt)) report.formatsNoted.push(fmt);

    await prisma.directSaleArticle.update({
      where: { id: a.id },
      data: {
        status: 'archived',
        visiblePOS: false,
        description: [
          a.description,
          `[fusionné → ${PH_TIRAGE_CANONICAL_ID}] Format ${fmt ?? 'voir configurateur Tirage photo'}`,
        ]
          .filter(Boolean)
          .join(' | '),
      },
    });
    report.directSaleArchived++;
    report.ids.push(a.reference ?? a.slug);
  }

  const profiles = await prisma.articlePricingProfile.findMany({
    where: {
      OR: [
        { articleLabel: { startsWith: 'Tirage photo ' } },
        { articleId: { in: [...REDUNDANT_TIRAGE_PHOTO_IDS] } },
        { articleId: { startsWith: 'tirage-photo-' } },
        { articleId: { startsWith: 'ph-tirage-' } },
        { articleId: { startsWith: 'ds-tirage-photo-' } },
      ],
    },
  });

  for (const p of profiles) {
    if (!isRedundantTiragePhotoArticle(p.articleLabel, p.articleId)) continue;
    if (p.status === 'archived' && !p.active) continue;

    const fmt = inferFormatFromRedundantTirageLabel(p.articleLabel);
    if (fmt && !report.formatsNoted.includes(fmt)) report.formatsNoted.push(fmt);

    await prisma.articlePricingProfile.update({
      where: { articleId: p.articleId },
      data: {
        status: 'archived',
        active: false,
        articleLabel: p.articleLabel.startsWith('[archivé]')
          ? p.articleLabel
          : `[archivé→ph-tirage] ${p.articleLabel}`,
      },
    });
    report.profilesArchived++;
    if (!report.ids.includes(p.articleId)) report.ids.push(p.articleId);
  }

  const canonical = await prisma.articlePricingProfile.findUnique({
    where: { articleId: PH_TIRAGE_CANONICAL_ID },
  });
  if (canonical) {
    await prisma.articlePricingProfile.update({
      where: { articleId: PH_TIRAGE_CANONICAL_ID },
      data: {
        articleLabel: 'Tirage photo',
        status: 'published',
        active: true,
        family: canonical.family || 'photo',
      },
    });
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'MERGE',
    entity: 'TiragePhoto',
    entityId: PH_TIRAGE_CANONICAL_ID,
    entityLabel: 'Fusion Tirage photo formats → article unique',
    details: report as unknown as Record<string, unknown>,
  });

  await notifyAdminModuleMutation('direct-sale-articles', {
    userId: opts?.userId,
    userName: opts?.userName,
  });

  return report;
}
