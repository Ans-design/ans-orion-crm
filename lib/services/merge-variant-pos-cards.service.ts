/**
 * Fusion cartes POS redondantes → articles métier uniques.
 * Impression SF (PVC), Photo GF, Finitions (spirale/collage/plastif/pelliculage…).
 * Zéro suppression : archive + options/chips + prix Admin.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import {
  mergeVariantCardsIntoMainArticle,
  resolveFinitionVariantCanonical,
  FIN_COLLAGE_ID,
  FIN_RELIURE_ID,
  FIN_PLASTIFICATION_ID,
  FIN_PELLICULAGE_ID,
  FIN_DECOUPE_ID,
  FIN_RAINAGE_ID,
  IMP_IMPRESSION_ID,
  GF_PHOTO_ID,
  type VariantMergeTarget,
} from '@/lib/pos/finition-variant-redundant';

const SYNC_SOURCE = 'variant-pos-card-merge';

export type MergeVariantPosReport = {
  archived: number;
  optionsEnsured: number;
  finishingVisibleOff: number;
  gfVisibleOff: number;
  canonEnsured: number;
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

async function ensureCanonicalProfile(
  canonicalId: string,
  fallbackLabel: string,
  family: string,
  prixBase?: number | null,
): Promise<boolean> {
  const cat = findCatalogueItem(canonicalId);
  const existing = await prisma.articlePricingProfile.findUnique({ where: { articleId: canonicalId } });
  const label = cat?.name ?? fallbackLabel;
  if (!existing) {
    await prisma.articlePricingProfile.create({
      data: {
        articleId: canonicalId,
        articleLabel: label,
        family,
        calculationType: 'piece',
        saleUnit: cat?.unit ?? 'pièce',
        status: 'published',
        active: true,
        prixBase: prixBase ?? cat?.prixDepart ?? null,
        source: SYNC_SOURCE,
      },
    });
    return true;
  }
  await prisma.articlePricingProfile.update({
    where: { articleId: canonicalId },
    data: {
      articleLabel: label,
      family,
      status: 'published',
      active: true,
      ...(prixBase != null && existing.prixBase == null ? { prixBase } : {}),
      updatedAt: new Date(),
    },
  });
  return false;
}

async function ensureOptionChip(
  articleId: string,
  fieldKey: string,
  label: string,
  priceAr?: number | null,
  sectionTitle = 'Options',
): Promise<boolean> {
  let group = await prisma.productOptionGroup.findUnique({
    where: { articleId_fieldKey: { articleId, fieldKey } },
  });
  if (!group) {
    group = await prisma.productOptionGroup.create({
      data: {
        articleId,
        fieldKey,
        label: fieldKey === 'diametre' ? 'Diamètre / référence' : fieldKey === 'dim' ? 'Format' : fieldKey === 'matiere' ? 'Matière' : 'Type',
        sectionTitle,
        fieldType: 'chips',
        impactsPrice: true,
        visiblePos: true,
        active: true,
      },
    });
  }
  const existing = await prisma.productOptionValue.findFirst({
    where: {
      groupId: group.id,
      OR: [{ label }, { valueKey: label.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 48) }],
    },
  });
  const valueKey = label.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 48) || 'opt';
  if (!existing) {
    await prisma.productOptionValue.create({
      data: {
        groupId: group.id,
        valueKey,
        label,
        sortOrder: 10,
        priceModifier: priceAr ?? 0,
        modifierType: 'fixed',
        active: true,
        metadata: { source: SYNC_SOURCE },
      },
    });
    return true;
  }
  if (priceAr != null && priceAr > 0 && existing.priceModifier !== priceAr) {
    await prisma.productOptionValue.update({
      where: { id: existing.id },
      data: { priceModifier: priceAr, modifierType: 'fixed', active: true },
    });
    return true;
  }
  return false;
}

const FAMILY_BY_CANONICAL: Record<string, string> = {
  [IMP_IMPRESSION_ID]: 'Impression',
  [GF_PHOTO_ID]: 'Grand Format',
  [FIN_RELIURE_ID]: 'Finitions',
  [FIN_COLLAGE_ID]: 'Finitions',
  [FIN_PLASTIFICATION_ID]: 'Finitions',
  [FIN_PELLICULAGE_ID]: 'Finitions',
  [FIN_DECOUPE_ID]: 'Finitions',
  [FIN_RAINAGE_ID]: 'Finitions',
};

const LABEL_BY_CANONICAL: Record<string, string> = {
  [IMP_IMPRESSION_ID]: 'Impression sans finition',
  [GF_PHOTO_ID]: 'Papier Photo GF 140G',
  [FIN_RELIURE_ID]: 'Reliure spirale',
  [FIN_COLLAGE_ID]: 'Collage',
  [FIN_PLASTIFICATION_ID]: 'Plastification',
  [FIN_PELLICULAGE_ID]: 'Pelliculage',
  [FIN_DECOUPE_ID]: 'Découpe',
  [FIN_RAINAGE_ID]: 'Rainage / Pliage / Perforation',
};

async function applyTarget(
  articleId: string,
  label: string,
  target: VariantMergeTarget,
  report: MergeVariantPosReport,
) {
  await archiveProfile(articleId, label, target.canonicalId);
  report.archived++;
  report.ids.push(articleId);
  if (!report.targets.includes(target.canonicalId)) report.targets.push(target.canonicalId);

  const created = await ensureCanonicalProfile(
    target.canonicalId,
    LABEL_BY_CANONICAL[target.canonicalId] ?? target.canonicalId,
    FAMILY_BY_CANONICAL[target.canonicalId] ?? 'Finitions',
    target.priceAr,
  );
  if (created) report.canonEnsured++;

  if (target.optionFieldKey && target.optionLabel) {
    const ok = await ensureOptionChip(
      target.canonicalId,
      target.optionFieldKey,
      target.optionLabel,
      target.priceAr,
      target.optionFieldKey === 'matiere' ? 'Matière' : 'Variantes Admin',
    );
    if (ok) report.optionsEnsured++;
  }
}

/**
 * Fusionne les cartes variantes POS dans les articles principaux.
 * Idempotent — sûr au boot getPosCatalogue / repair.
 */
export async function mergeVariantPosCards(opts?: {
  userId?: string;
  userName?: string;
}): Promise<MergeVariantPosReport> {
  const report: MergeVariantPosReport = {
    archived: 0,
    optionsEnsured: 0,
    finishingVisibleOff: 0,
    gfVisibleOff: 0,
    canonEnsured: 0,
    ids: [],
    targets: [],
  };

  // 1) Profils pricing publiés / actifs
  const profiles = await prisma.articlePricingProfile.findMany({
    where: {
      OR: [{ status: 'published' }, { active: true }],
    },
    select: { articleId: true, articleLabel: true, family: true, prixBase: true, status: true, active: true },
  });

  const mapped = mergeVariantCardsIntoMainArticle(
    profiles.map((p) => ({
      articleId: p.articleId,
      name: p.articleLabel,
      category: p.family,
      priceAr: p.prixBase,
    })),
  );

  for (const { articleId, target } of mapped) {
    const p = profiles.find((x) => x.articleId === articleId);
    if (!p) continue;
    if (p.status === 'archived' && !p.active) continue;
    await applyTarget(articleId, p.articleLabel, target, report);
  }

  // 2) FinishingPrice → chips sur canoniques + ne plus sync en carte
  try {
    const fins = await prisma.finishingPrice.findMany({
      select: {
        id: true,
        name: true,
        reference: true,
        category: true,
        unitPrice: true,
        visiblePOS: true,
        active: true,
        status: true,
      },
    });
    for (const row of fins) {
      const articleId = row.reference?.trim() || `fin-${row.name.toLowerCase().replace(/\s+/g, '-')}`;
      const target = resolveFinitionVariantCanonical(row.name, articleId, row.category);
      if (!target) continue;

      // Archiver profil orphelin (référence = articleId)
      await archiveProfile(articleId, row.name, target.canonicalId);
      if (!report.ids.includes(articleId)) {
        report.archived++;
        report.ids.push(articleId);
      }

      await ensureCanonicalProfile(
        target.canonicalId,
        LABEL_BY_CANONICAL[target.canonicalId] ?? target.canonicalId,
        FAMILY_BY_CANONICAL[target.canonicalId] ?? 'Finitions',
        row.unitPrice,
      );

      const optLabel =
        target.optionLabel
        || row.reference?.trim()
        || row.name;
      const fieldKey = target.optionFieldKey || 'type';
      const ok = await ensureOptionChip(
        target.canonicalId,
        fieldKey,
        optLabel,
        row.unitPrice,
      );
      if (ok) report.optionsEnsured++;

      // Variantes restent dans Admin Excel ; pas de carte POS séparée
      // visiblePOS=true = disponible en option configurateur (on garde true)
      // On s’assure juste que le profil n’est pas republish
    }
  } catch {
    /* ignore si table absente */
  }

  // 3) GrandFormatPricing PVC / Photo GF
  try {
    const gfRows = await prisma.grandFormatPricing.findMany({
      select: { id: true, name: true, reference: true, visiblePOS: true, basePrice: true, pricePerM2: true },
    });
    for (const row of gfRows) {
      const ref = row.reference?.trim() || '';
      const target = resolveFinitionVariantCanonical(row.name, ref, 'grand_format');
      if (!target) continue;
      if (row.visiblePOS) {
        await prisma.grandFormatPricing.update({
          where: { id: row.id },
          data: { visiblePOS: false, updatedAt: new Date() },
        });
        report.gfVisibleOff++;
      }
      if (ref) {
        await applyTarget(
          ref,
          row.name,
          { ...target, priceAr: row.basePrice ?? row.pricePerM2 ?? target.priceAr },
          report,
        );
      }
    }
  } catch {
    /* ignore */
  }

  // 4) Labels canoniques métier
  for (const [id, label] of Object.entries(LABEL_BY_CANONICAL)) {
    const family = FAMILY_BY_CANONICAL[id] ?? 'Finitions';
    await ensureCanonicalProfile(id, label, family);
  }
  // fin-reliure : libellé « Reliure spirale » demandé
  await prisma.articlePricingProfile.updateMany({
    where: { articleId: FIN_RELIURE_ID },
    data: { articleLabel: 'Reliure spirale', family: 'Finitions', status: 'published', active: true, updatedAt: new Date() },
  });

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'MERGE',
    entity: 'PosVariantCards',
    details: report,
  });
  await notifyAdminModuleMutation('catalogue-pos', opts);

  return report;
}

/** Alias demandé dans le brief métier */
export { mergeVariantCardsIntoMainArticle };
