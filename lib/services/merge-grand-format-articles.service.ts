/**
 * Fusion / archivage des cartes Grand Format redondantes (formats, paliers, doublons PLV/matières).
 * Zéro suppression métier — archive + pointe vers l’article canonique.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';
import { CAT_LABELS } from '@/lib/data/catalogue';
import {
  GF_BACHE_CANONICAL_ID,
  GF_PLEXI_CANONICAL_ID,
  isPvcPetitFormatArticle,
  isPlvFinishedProduct,
  isRedundantGrandFormatPosCard,
  isRedundantPlvDirectSaleSku,
  resolveGfCanonicalTarget,
  REDUNDANT_GF_PLV_IDS,
  PVC_PETIT_FORMAT_IDS,
  PLV_ROLLUP_CANONICAL_ID,
  PLV_XBANNER_CANONICAL_ID,
} from '@/lib/pos/grand-format-redundant';
import {
  canonicalFamilyLabel,
  suggestCorrectCategory,
} from '@/lib/pos/article-category-taxonomy';

export type MergeGrandFormatReport = {
  profilesArchived: number;
  profilesReassigned: number;
  directSaleUpdated: number;
  gfPricingHidden: number;
  ids: string[];
  targets: string[];
};

async function archiveProfile(articleId: string, label: string, target: string) {
  await prisma.articlePricingProfile.update({
    where: { articleId },
    data: {
      status: 'archived',
      active: false,
      articleLabel: label.startsWith('[archivé')
        ? label
        : `[archivé→${target}] ${label.replace(/^\[archivé[^\]]*\]\s*/, '')}`,
      updatedAt: new Date(),
    },
  });
}

export async function mergeGrandFormatArticles(opts?: {
  userId?: string;
  userName?: string;
}): Promise<MergeGrandFormatReport> {
  const report: MergeGrandFormatReport = {
    profilesArchived: 0,
    profilesReassigned: 0,
    directSaleUpdated: 0,
    gfPricingHidden: 0,
    ids: [],
    targets: [],
  };

  const noteTarget = (t: string) => {
    if (!report.targets.includes(t)) report.targets.push(t);
  };

  const profiles = await prisma.articlePricingProfile.findMany({
    select: {
      articleId: true,
      articleLabel: true,
      family: true,
      status: true,
      active: true,
      prixBase: true,
      prixM2: true,
    },
  });

  for (const p of profiles) {
    const id = p.articleId;
    const name = p.articleLabel;

    // 1) Variantes bâche / doublons matières → archiver
    if (isRedundantGrandFormatPosCard(name, id) && id !== GF_BACHE_CANONICAL_ID && id !== GF_PLEXI_CANONICAL_ID) {
      if (p.status === 'archived' && !p.active) continue;
      const target = resolveGfCanonicalTarget(name, id) ?? GF_BACHE_CANONICAL_ID;
      await archiveProfile(id, name, target);
      report.profilesArchived++;
      report.ids.push(id);
      noteTarget(target);
      continue;
    }

    // 2) Autres PLV (Oriflamme, Stop…) → famille PLV — pas les SKUs AVD dimensionnés
    if (
      isPlvFinishedProduct(name, id)
      && !isRedundantPlvDirectSaleSku(name, id)
      && !/^GF0(13|14)$/i.test(id)
      && !/^plv-/i.test(id)
    ) {
      const family = canonicalFamilyLabel('plv');
      if (p.family !== family || p.status !== 'published') {
        await prisma.articlePricingProfile.update({
          where: { articleId: id },
          data: {
            family,
            calculationType: 'piece',
            status: p.active === false ? p.status : 'published',
            active: true,
            updatedAt: new Date(),
          },
        });
        report.profilesReassigned++;
        report.ids.push(id);
        noteTarget(REDUNDANT_GF_PLV_IDS[id] ?? 'plv');
      }
      continue;
    }

    // 3) PVC petit format → archive carte, matière dans Impression sans finition
    if (isPvcPetitFormatArticle(name, id) || (PVC_PETIT_FORMAT_IDS as readonly string[]).includes(id)) {
      await prisma.articlePricingProfile.update({
        where: { articleId: id },
        data: {
          status: 'archived',
          active: false,
          articleLabel: `[archivé→imp-impression] ${name}`,
          family: canonicalFamilyLabel('impression'),
          updatedAt: new Date(),
        },
      });
      report.profilesReassigned++;
      report.ids.push(id);
      noteTarget('imp-impression');
      continue;
    }

    // 4) Photo grand format → Papier Photo GF (pas carte Photo séparée)
    if (/^photo\s+grand\s+format$/i.test(name) || id === 'GF011') {
      await prisma.articlePricingProfile.update({
        where: { articleId: id },
        data: {
          status: 'archived',
          active: false,
          articleLabel: `[archivé→gf-photo] ${name}`,
          family: canonicalFamilyLabel('grand_format'),
          updatedAt: new Date(),
        },
      });
      report.profilesReassigned++;
      report.ids.push(id);
      noteTarget('gf-photo');
    }
  }

  // Canoniques GF + PLV configurateurs
  for (const [articleId, label, familyId] of [
    [GF_BACHE_CANONICAL_ID, 'Bâche', 'grand_format'],
    [GF_PLEXI_CANONICAL_ID, 'Acrylic / Plexiglas', 'grand_format'],
    [PLV_ROLLUP_CANONICAL_ID, 'Roll-up', 'plv'],
    [PLV_XBANNER_CANONICAL_ID, 'X-Banner', 'plv'],
  ] as const) {
    const row = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
    if (!row) continue;
    await prisma.articlePricingProfile.update({
      where: { articleId },
      data: {
        articleLabel: label,
        family: CAT_LABELS[familyId] ?? familyId,
        status: 'published',
        active: true,
        updatedAt: new Date(),
      },
    });
  }

  // DirectSale PLV
  try {
    const ds = await prisma.directSaleArticle.findMany({
      where: {
        OR: [
          { reference: { in: ['AVD008', 'AVD009', 'AVD010', 'AVD011', 'AVD004'] } },
          { name: { contains: 'Roll up' } },
          { name: { contains: 'X-Banner' } },
          { name: { contains: 'Oriflamme' } },
          { name: { contains: 'Stop trottoir' } },
        ],
      },
    });
    for (const a of ds) {
      const family = canonicalFamilyLabel(
        suggestCorrectCategory({
          articleId: a.reference ?? a.slug,
          name: a.name,
          family: a.category,
        }),
      );
      if (a.category !== family) {
        await prisma.directSaleArticle.update({
          where: { id: a.id },
          data: { category: family, updatedAt: new Date() },
        });
        report.directSaleUpdated++;
      }
      // SKUs dimensionnés Roll-up / X-Banner : pas de carte POS séparée
      const ref = (a.reference ?? '').trim();
      if (
        isRedundantPlvDirectSaleSku(a.name, ref)
        && (a.visiblePOS || a.status === 'published')
      ) {
        await prisma.directSaleArticle.update({
          where: { id: a.id },
          data: {
            visiblePOS: false,
            category: family,
            updatedAt: new Date(),
          },
        });
        report.directSaleUpdated++;
        // Archiver profil POS orphelin
        await prisma.articlePricingProfile.updateMany({
          where: { articleId: ref },
          data: {
            status: 'archived',
            active: false,
            articleLabel: `[archivé→${resolveGfCanonicalTarget(a.name, ref) ?? 'plv'}] ${a.name}`,
            updatedAt: new Date(),
          },
        });
      }
    }
  } catch {
    /* ignore */
  }

  // Masquer lignes GrandFormatPricing redondantes (formats/paliers/PLV) du sync POS
  try {
    const gfRows = await prisma.grandFormatPricing.findMany({
      select: { id: true, name: true, reference: true, visiblePOS: true, active: true, status: true },
    });
    for (const row of gfRows) {
      const ref = row.reference?.trim() || '';
      const shouldHide =
        isRedundantGrandFormatPosCard(row.name, ref)
        || isPlvFinishedProduct(row.name, ref)
        || isPvcPetitFormatArticle(row.name, ref)
        || /^photo\s+grand\s+format$/i.test(row.name)
        || ref === 'GF011';
      if (!shouldHide) continue;
      if (!row.visiblePOS && row.active === false && row.status === 'archived') continue;
      await prisma.grandFormatPricing.update({
        where: { id: row.id },
        data: {
          visiblePOS: false,
          active: false,
          status: 'archived',
          updatedAt: new Date(),
        },
      });
      report.gfPricingHidden++;
    }
  } catch {
    /* schema / table */
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'MERGE',
    entity: 'GrandFormatArticles',
    entityLabel: 'Fusion Grand Format POS',
    details: report,
  });

  await notifyAdminModuleMutation('grand-format-pricing', opts);
  return report;
}

export {
  isRedundantGrandFormatPosCard,
  isRedundantBacheVariant,
  isPlvFinishedProduct,
  isPvcPetitFormatArticle,
} from '@/lib/pos/grand-format-redundant';
