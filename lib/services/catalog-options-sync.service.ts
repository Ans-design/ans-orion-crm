/**
 * Sync Goodies Admin (modèles / techniques / addons / dépendances) → ProductOption* POS.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';

const SYNC_SOURCE = 'goodies-admin-sync';

export const GOODIES_ARTICLE_IDS = [
  'gd-tapis',
  'gd-stylo',
  'gd-portecles',
  'gd-pins',
  'gd-parapluie',
  'gd-mug',
  'gd-housse',
  'gd-gourde',
  'gd-usb',
  'gd-briquet',
  'gd-tasse',
] as const;

export type GoodiesSyncReport = {
  articles: string[];
  modelsSynced: number;
  techniquesSynced: number;
  addonsSynced: number;
  depsSynced: number;
  profilesEnsured: number;
};

function asJson(value: Record<string, unknown> | object | null | undefined): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function valueKey(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'opt';
}

async function ensureGroup(
  articleId: string,
  fieldKey: string,
  label: string,
  sectionTitle: string,
  metadata?: Record<string, unknown>,
) {
  const existing = await prisma.productOptionGroup.findUnique({
    where: { articleId_fieldKey: { articleId, fieldKey } },
  });
  if (existing) {
    return prisma.productOptionGroup.update({
      where: { id: existing.id },
      data: {
        label,
        sectionTitle,
        fieldType: 'chips',
        impactsPrice: true,
        visiblePos: true,
        active: true,
        source: SYNC_SOURCE,
        metadata: metadata
          ? asJson({ ...((existing.metadata as object) ?? {}), ...metadata })
          : asJson((existing.metadata as object) ?? undefined),
        updatedAt: new Date(),
      },
    });
  }
  return prisma.productOptionGroup.create({
    data: {
      articleId,
      fieldKey,
      label,
      sectionTitle,
      fieldType: 'chips',
      impactsPrice: true,
      visiblePos: true,
      active: true,
      source: SYNC_SOURCE,
      metadata: asJson(metadata),
    },
  });
}

async function upsertValue(
  groupId: string,
  label: string,
  priceModifier: number,
  sortOrder: number,
  metadata?: Record<string, unknown>,
) {
  const vk = valueKey(label);
  const existing = await prisma.productOptionValue.findFirst({
    where: { groupId, OR: [{ valueKey: vk }, { label }] },
  });
  if (existing) {
    await prisma.productOptionValue.update({
      where: { id: existing.id },
      data: {
        label,
        valueKey: vk,
        priceModifier,
        modifierType: 'fixed',
        active: true,
        sortOrder,
        metadata: asJson(metadata),
        updatedAt: new Date(),
      },
    });
    return;
  }
  await prisma.productOptionValue.create({
    data: {
      groupId,
      valueKey: vk,
      label,
      priceModifier,
      modifierType: 'fixed',
      active: true,
      sortOrder,
      metadata: asJson(metadata),
    },
  });
}

function modelChipLabel(row: {
  typeModele: string;
  formatDimension: string | null;
  contenance: string | null;
  capacite: string | null;
  fieldKey: string;
}): string {
  if (row.fieldKey === 'format' && row.formatDimension) return row.formatDimension;
  if (row.fieldKey === 'contenance' && row.contenance) return row.contenance;
  if (row.fieldKey === 'capacite' && row.capacite) return row.capacite;
  if (row.fieldKey === 'diametre' && row.formatDimension) return row.formatDimension;
  if (row.fieldKey === 'taille' && row.formatDimension) return row.formatDimension;
  return row.typeModele;
}

export async function syncGoodiesModelsToPOS(articleId?: string): Promise<number> {
  const where = {
    deletedAt: null,
    active: true,
    status: { not: 'archived' },
    ...(articleId ? { articleId } : { articleId: { in: [...GOODIES_ARTICLE_IDS] } }),
  };
  const rows = await prisma.goodiesArticleModel.findMany({ where, orderBy: { sortOrder: 'asc' } });
  let n = 0;
  const byArticle = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byArticle.get(r.articleId) ?? [];
    list.push(r);
    byArticle.set(r.articleId, list);
  }

  for (const [aid, list] of byArticle) {
    const byField = new Map<string, typeof list>();
    for (const r of list) {
      const fk = r.fieldKey || 'type';
      const arr = byField.get(fk) ?? [];
      arr.push(r);
      byField.set(fk, arr);
    }
    for (const [fieldKey, fieldRows] of byField) {
      const group = await ensureGroup(aid, fieldKey, fieldKey === 'format' ? 'Format' : fieldKey === 'type' ? 'Type / modèle' : fieldKey, 'Modèle Admin');
      // Désactiver anciennes valeurs sync non présentes
      const keepLabels = new Set(fieldRows.filter((r) => r.visiblePOS).map((r) => modelChipLabel(r)));
      const existingVals = await prisma.productOptionValue.findMany({ where: { groupId: group.id } });
      for (const v of existingVals) {
        if ((v.metadata as { source?: string } | null)?.source === SYNC_SOURCE && !keepLabels.has(v.label)) {
          await prisma.productOptionValue.update({ where: { id: v.id }, data: { active: false } });
        }
      }
      let order = 0;
      for (const r of fieldRows) {
        if (!r.visiblePOS) continue;
        const label = modelChipLabel(r);
        await upsertValue(group.id, label, r.prixVierge, order++, {
          source: SYNC_SOURCE,
          modelId: r.id,
          typeModele: r.typeModele,
          matiere: r.matiere,
          contenance: r.contenance,
          capacite: r.capacite,
          formatDimension: r.formatDimension,
        });
        n++;
      }
    }
  }
  return n;
}

export async function syncPrintingTechniquesToPOS(articleId?: string): Promise<number> {
  const where = {
    deletedAt: null,
    active: true,
    status: { not: 'archived' },
    ...(articleId ? { articleId } : { articleId: { in: [...GOODIES_ARTICLE_IDS] } }),
  };
  const rows = await prisma.goodiesPrintingTechnique.findMany({ where, orderBy: { sortOrder: 'asc' } });
  let n = 0;
  const byArticle = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byArticle.get(r.articleId) ?? [];
    list.push(r);
    byArticle.set(r.articleId, list);
  }
  for (const [aid, list] of byArticle) {
    const group = await ensureGroup(aid, 'technique', 'Technique', 'Technique impression');
    const keep = new Set(list.filter((r) => r.visiblePOS).map((r) => r.technique));
    const existingVals = await prisma.productOptionValue.findMany({ where: { groupId: group.id } });
    for (const v of existingVals) {
      if ((v.metadata as { source?: string } | null)?.source === SYNC_SOURCE && !keep.has(v.label)) {
        await prisma.productOptionValue.update({ where: { id: v.id }, data: { active: false } });
      }
    }
    let order = 0;
    for (const r of list) {
      if (!r.visiblePOS) continue;
      await upsertValue(group.id, r.technique, r.prixTechnique, order++, {
        source: SYNC_SOURCE,
        techniqueId: r.id,
        matiereCompatible: r.matiereCompatible,
        typeCompatible: r.typeCompatible,
      });
      n++;
    }
  }
  return n;
}

export async function syncAddonsToPOS(articleId?: string): Promise<number> {
  const where = {
    deletedAt: null,
    active: true,
    status: { not: 'archived' },
    visiblePOS: true,
    ...(articleId ? { articleId } : { articleId: { in: [...GOODIES_ARTICLE_IDS] } }),
  };
  const rows = await prisma.goodiesAddon.findMany({ where, orderBy: { sortOrder: 'asc' } });
  let n = 0;
  const byArticle = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byArticle.get(r.articleId) ?? [];
    list.push(r);
    byArticle.set(r.articleId, list);
  }
  for (const [aid, list] of byArticle) {
    const byField = new Map<string, typeof list>();
    for (const r of list) {
      const fk = r.fieldKey || 'supplements';
      if (fk.startsWith('pvc_')) continue; // params internes, pas de chips POS
      const arr = byField.get(fk) ?? [];
      arr.push(r);
      byField.set(fk, arr);
    }
    for (const [fieldKey, fieldRows] of byField) {
      const group = await ensureGroup(
        aid,
        fieldKey,
        fieldKey === 'attache' ? 'Attache' : fieldKey === 'decoupe' ? 'Découpe' : 'Suppléments',
        'Suppléments Admin',
      );
      let order = 0;
      for (const r of fieldRows) {
        await upsertValue(group.id, r.name, r.price, order++, {
          source: SYNC_SOURCE,
          addonId: r.id,
          required: r.required,
          type: r.type,
        });
        n++;
      }
    }
  }
  return n;
}

export async function syncOptionDependencies(articleId?: string): Promise<number> {
  const where = {
    deletedAt: null,
    active: true,
    ...(articleId ? { articleId } : { articleId: { in: [...GOODIES_ARTICLE_IDS] } }),
  };
  const rows = await prisma.goodiesOptionDependency.findMany({ where });
  let n = 0;
  const byArticle = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byArticle.get(r.articleId) ?? [];
    list.push(r);
    byArticle.set(r.articleId, list);
  }
  for (const [aid, list] of byArticle) {
    // Stocker sur un groupe « type » (ou premier groupe) les dépendances
    const group = await prisma.productOptionGroup.findUnique({
      where: { articleId_fieldKey: { articleId: aid, fieldKey: 'type' } },
    });
    const deps = list.map((d) => ({
      sourceField: d.sourceField,
      sourceValue: d.sourceValue,
      targetField: d.targetField,
      allowedValues: d.allowedValues.split('|').map((s) => s.trim()).filter(Boolean),
      action: d.action,
    }));
    if (group) {
      await prisma.productOptionGroup.update({
        where: { id: group.id },
        data: {
          metadata: asJson({
            ...((group.metadata as object) ?? {}),
            dependencies: deps,
            source: SYNC_SOURCE,
          }),
          updatedAt: new Date(),
        },
      });
    } else {
      await ensureGroup(aid, 'type', 'Type', 'Type / modèle', { dependencies: deps, source: SYNC_SOURCE });
    }
    n += list.length;
  }
  return n;
}

async function ensureGoodiesProfile(articleId: string): Promise<boolean> {
  const cat = findCatalogueItem(articleId);
  const existing = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  let created = false;
  if (!existing) {
    await prisma.articlePricingProfile.create({
      data: {
        articleId,
        articleLabel: cat?.name ?? articleId,
        family: 'Goodies',
        calculationType: 'piece',
        saleUnit: cat?.unit ?? 'pièce',
        status: 'published',
        active: true,
        prixBase: 0,
        source: SYNC_SOURCE,
      },
    });
    created = true;
  } else {
    await prisma.articlePricingProfile.update({
      where: { articleId },
      data: {
        articleLabel: cat?.name ?? existing.articleLabel,
        family: 'Goodies',
        status: 'published',
        active: true,
        prixBase: 0,
        source: SYNC_SOURCE,
        updatedAt: new Date(),
      },
    });
  }

  const formula = await prisma.formulaVersion.findFirst({
    where: { articleId, status: 'published' },
    orderBy: { version: 'desc' },
  });
  if (!formula) {
    await prisma.formulaVersion.create({
      data: {
        articleId,
        version: 1,
        status: 'published',
        expression: 'goodies_blank_plus_technique_plus_addons',
        label: 'Goodies Admin',
        variables: {},
        publishedAt: new Date(),
        source: SYNC_SOURCE,
      },
    });
  }
  return created;
}

export async function rebuildPOSConfigurator(articleId: string): Promise<GoodiesSyncReport> {
  const profilesEnsured = (await ensureGoodiesProfile(articleId)) ? 1 : 0;
  const modelsSynced = await syncGoodiesModelsToPOS(articleId);
  const techniquesSynced = await syncPrintingTechniquesToPOS(articleId);
  const addonsSynced = await syncAddonsToPOS(articleId);
  const depsSynced = await syncOptionDependencies(articleId);
  // Dual-write GoodiesOptionDependency → OptionDependency générique (POS overrides)
  const { syncChipsDependenciesToGeneric } = await import('@/lib/services/option-dependency.service');
  await syncChipsDependenciesToGeneric(articleId);
  return {
    articles: [articleId],
    modelsSynced,
    techniquesSynced,
    addonsSynced,
    depsSynced,
    profilesEnsured,
  };
}

export async function rebuildPOSCatalogIndex(opts?: {
  userId?: string;
  userName?: string;
}): Promise<GoodiesSyncReport> {
  const report: GoodiesSyncReport = {
    articles: [...GOODIES_ARTICLE_IDS],
    modelsSynced: 0,
    techniquesSynced: 0,
    addonsSynced: 0,
    depsSynced: 0,
    profilesEnsured: 0,
  };
  for (const id of GOODIES_ARTICLE_IDS) {
    if (await ensureGoodiesProfile(id)) report.profilesEnsured++;
  }
  report.modelsSynced = await syncGoodiesModelsToPOS();
  report.techniquesSynced = await syncPrintingTechniquesToPOS();
  report.addonsSynced = await syncAddonsToPOS();
  report.depsSynced = await syncOptionDependencies();
  const { syncChipsDependenciesToGeneric } = await import('@/lib/services/option-dependency.service');
  await syncChipsDependenciesToGeneric();

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'SYNC',
    entity: 'GoodiesPosOptions',
    details: report,
  });
  await notifyAdminModuleMutation('goodies', opts);
  return report;
}

/** Alias brief métier */
export async function syncArticleOptionsToPOS(articleId?: string, opts?: {
  userId?: string;
  userName?: string;
}): Promise<GoodiesSyncReport> {
  if (articleId) {
    const r = await rebuildPOSConfigurator(articleId);
    await notifyAdminModuleMutation('goodies', opts);
    return r;
  }
  return rebuildPOSCatalogIndex(opts);
}
