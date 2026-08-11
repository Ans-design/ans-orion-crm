/**
 * Fusion des cartes POS « X personnalisé » → article métier unique.
 * Zéro suppression : archive + visiblePOS=false + transfert prixBase.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import {
  isRedundantPersonalizedArticle,
  resolvePersonalizedCanonical,
  REDUNDANT_PERSONALIZED_IDS,
  PERSONALIZED_DS_TO_CANONICAL,
} from '@/lib/pos/personalized-article-redundant';

const SYNC_SOURCE = 'personalized-article-merge';

export type MergePersonalizedReport = {
  archived: number;
  prixUpdated: number;
  directSaleUpdated: number;
  optionsEnsured: number;
  ids: string[];
  targets: string[];
};

async function archiveProfile(articleId: string, label: string, target: string) {
  const clean = label.replace(/^\[archivé→[^\]]+\]\s*/i, '');
  await prisma.articlePricingProfile.updateMany({
    where: { articleId },
    data: {
      status: 'archived',
      active: false,
      articleLabel: `[archivé→${target}] ${clean}`,
      source: SYNC_SOURCE,
      updatedAt: new Date(),
    },
  });
}

async function ensurePersonnalisationOption(
  articleId: string,
  techniqueLabel?: string,
): Promise<boolean> {
  if (!techniqueLabel) return false;
  const fieldKey = 'technique_personnalisation';
  let group = await prisma.productOptionGroup.findUnique({
    where: { articleId_fieldKey: { articleId, fieldKey } },
  });
  if (!group) {
    group = await prisma.productOptionGroup.create({
      data: {
        articleId,
        fieldKey,
        label: 'Personnalisation',
        sectionTitle: 'Personnalisation',
        fieldType: 'chips',
        impactsPrice: true,
        visiblePos: true,
        active: true,
      },
    });
  }
  const existing = await prisma.productOptionValue.findFirst({
    where: { groupId: group.id, label: techniqueLabel },
  });
  if (!existing) {
    await prisma.productOptionValue.create({
      data: {
        groupId: group.id,
        valueKey: `perso-${techniqueLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
        label: techniqueLabel,
        sortOrder: 10,
        priceModifier: 0,
        modifierType: 'fixed',
        active: true,
        metadata: { source: SYNC_SOURCE },
      },
    });
    return true;
  }
  return false;
}

async function ensureGrammageOption(articleId: string, grammage: string): Promise<boolean> {
  const fieldKey = 'grammage';
  let group = await prisma.productOptionGroup.findUnique({
    where: { articleId_fieldKey: { articleId, fieldKey } },
  });
  if (!group) {
    group = await prisma.productOptionGroup.create({
      data: {
        articleId,
        fieldKey,
        label: 'Grammage',
        sectionTitle: 'Matière',
        fieldType: 'chips',
        impactsPrice: true,
        visiblePos: true,
        active: true,
      },
    });
  }
  const existing = await prisma.productOptionValue.findFirst({
    where: { groupId: group.id, OR: [{ label: grammage }, { valueKey: grammage }] },
  });
  if (!existing) {
    await prisma.productOptionValue.create({
      data: {
        groupId: group.id,
        valueKey: grammage.toLowerCase().replace(/\s+/g, ''),
        label: grammage,
        sortOrder: 20,
        priceModifier: 0,
        modifierType: 'fixed',
        active: true,
        metadata: { source: SYNC_SOURCE },
      },
    });
    return true;
  }
  return false;
}

export async function mergePersonalizedDuplicateArticles(opts?: {
  userId?: string;
  userName?: string;
}): Promise<MergePersonalizedReport> {
  const report: MergePersonalizedReport = {
    archived: 0,
    prixUpdated: 0,
    directSaleUpdated: 0,
    optionsEnsured: 0,
    ids: [],
    targets: [],
  };

  const profiles = await prisma.articlePricingProfile.findMany({
    select: {
      articleId: true,
      articleLabel: true,
      status: true,
      active: true,
      prixBase: true,
    },
  });

  const minPrix: Record<string, number> = {};
  const optionJobs: Array<{ canonicalId: string; techniqueLabel?: string; grammage?: string }> = [];

  for (const p of profiles) {
    const id = p.articleId;
    const name = p.articleLabel ?? id;
    if (!isRedundantPersonalizedArticle(name, id)) continue;
    const target = resolvePersonalizedCanonical(name, id);
    if (!target || target.canonicalId === id) continue;

    if (p.prixBase != null && p.prixBase > 0) {
      const prev = minPrix[target.canonicalId];
      if (prev == null || p.prixBase < prev) minPrix[target.canonicalId] = Math.round(p.prixBase);
    }

    optionJobs.push({
      canonicalId: target.canonicalId,
      techniqueLabel: target.techniqueLabel,
      grammage: target.prefill?.grammage,
    });

    if (p.status === 'archived' && !p.active) continue;
    await archiveProfile(id, name, target.canonicalId);
    report.archived++;
    report.ids.push(id);
    if (!report.targets.includes(target.canonicalId)) report.targets.push(target.canonicalId);
  }

  // DirectSale AVD* personnalisés
  const ds = await prisma.directSaleArticle.findMany({
    where: {
      OR: [
        { reference: { in: REDUNDANT_PERSONALIZED_IDS } },
        { name: { contains: 'personnalis' } },
      ],
    },
    select: { id: true, reference: true, name: true, unitPrice: true, visiblePOS: true, status: true },
  });

  for (const a of ds) {
    const ref = (a.reference ?? '').trim();
    const target =
      PERSONALIZED_DS_TO_CANONICAL[ref]
      ?? resolvePersonalizedCanonical(a.name, ref);
    if (!target) continue;
    if (a.unitPrice > 0) {
      const prev = minPrix[target.canonicalId];
      if (prev == null || a.unitPrice < prev) minPrix[target.canonicalId] = Math.round(a.unitPrice);
    }
    if (a.visiblePOS) {
      await prisma.directSaleArticle.update({
        where: { id: a.id },
        data: { visiblePOS: false, updatedAt: new Date() },
      });
      report.directSaleUpdated++;
    }
    // Archiver profil POS portant la référence AVD
    if (ref) {
      const prof = await prisma.articlePricingProfile.findUnique({ where: { articleId: ref } });
      if (prof && (prof.active || prof.status === 'published')) {
        await archiveProfile(ref, a.name, target.canonicalId);
        report.archived++;
        report.ids.push(ref);
      }
    }
    optionJobs.push({
      canonicalId: target.canonicalId,
      techniqueLabel: target.techniqueLabel,
      grammage: target.prefill?.grammage,
    });
    if (!report.targets.includes(target.canonicalId)) report.targets.push(target.canonicalId);
  }

  for (const [articleId, prixFromDup] of Object.entries(minPrix)) {
    const canon = profiles.find((p) => p.articleId === articleId);
    const cat = findCatalogueItem(articleId);
    const existing =
      canon?.prixBase != null && canon.prixBase > 0
        ? Math.round(canon.prixBase)
        : cat?.prixDepart != null && cat.prixDepart > 0
          ? Math.round(cat.prixDepart)
          : null;
    // « À partir de » = min ; le prix perso DirectSale reste en Admin
    const finalPrix = existing != null ? Math.min(existing, prixFromDup) : prixFromDup;
    await prisma.articlePricingProfile.updateMany({
      where: { articleId },
      data: {
        prixBase: finalPrix,
        status: 'published',
        active: true,
        ...(cat?.name ? { articleLabel: cat.name } : {}),
        source: SYNC_SOURCE,
        updatedAt: new Date(),
      },
    });
    report.prixUpdated++;
  }

  const seenOpt = new Set<string>();
  for (const job of optionJobs) {
    const key = `${job.canonicalId}|${job.techniqueLabel}|${job.grammage}`;
    if (seenOpt.has(key)) continue;
    seenOpt.add(key);
    try {
      if (job.techniqueLabel && (await ensurePersonnalisationOption(job.canonicalId, job.techniqueLabel))) {
        report.optionsEnsured++;
      }
      if (job.grammage && (await ensureGrammageOption(job.canonicalId, job.grammage))) {
        report.optionsEnsured++;
      }
    } catch {
      /* option tables may vary */
    }
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'MERGE',
    entity: 'PersonalizedArticles',
    entityLabel: 'Fusion articles personnalisés',
    details: report,
  });
  await notifyAdminModuleMutation('catalogue-pos', opts);
  return report;
}

/** API helper : fusion explicite primary + duplicates */
export async function mergeDuplicateArticles(
  primaryArticleId: string,
  duplicateArticleIds: string[],
  opts?: { userId?: string; userName?: string },
): Promise<MergePersonalizedReport> {
  const report: MergePersonalizedReport = {
    archived: 0,
    prixUpdated: 0,
    directSaleUpdated: 0,
    optionsEnsured: 0,
    ids: [],
    targets: [primaryArticleId],
  };

  const primary = await prisma.articlePricingProfile.findUnique({
    where: { articleId: primaryArticleId },
  });
  if (!primary) return report;

  let minPrix = primary.prixBase != null && primary.prixBase > 0 ? Math.round(primary.prixBase) : null;

  for (const dupId of duplicateArticleIds) {
    if (!dupId || dupId === primaryArticleId) continue;
    const dup = await prisma.articlePricingProfile.findUnique({ where: { articleId: dupId } });
    if (!dup) continue;
    if (dup.prixBase != null && dup.prixBase > 0) {
      minPrix = minPrix == null ? Math.round(dup.prixBase) : Math.min(minPrix, Math.round(dup.prixBase));
    }
    await archiveProfile(dupId, dup.articleLabel, primaryArticleId);
    report.archived++;
    report.ids.push(dupId);

    await prisma.directSaleArticle.updateMany({
      where: { OR: [{ reference: dupId }, { slug: dupId }] },
      data: { visiblePOS: false, updatedAt: new Date() },
    });
    report.directSaleUpdated++;
  }

  if (minPrix != null) {
    await prisma.articlePricingProfile.update({
      where: { articleId: primaryArticleId },
      data: {
        prixBase: minPrix,
        status: 'published',
        active: true,
        updatedAt: new Date(),
      },
    });
    report.prixUpdated++;
  }

  await ensurePersonnalisationOption(primaryArticleId, 'Impression / Broderie / Sublimation');
  report.optionsEnsured++;

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'MERGE',
    entity: 'ArticlePricingProfile',
    entityId: primaryArticleId,
    entityLabel: primary.articleLabel,
    details: { duplicates: duplicateArticleIds, ...report },
  });
  await notifyAdminModuleMutation('catalogue-pos', opts);
  return report;
}
