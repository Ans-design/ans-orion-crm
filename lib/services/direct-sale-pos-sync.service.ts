/**
 * Synchronisation Articles vente directe → ArticlePricingProfile (POS).
 * Backoffice configure → DB stocke → POS consomme.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';
import { dualWriteOptionModifier } from '@/lib/money/option-modifier';
import {
  canonicalFamilyLabel,
  suggestCorrectCategory,
} from '@/lib/pos/article-category-taxonomy';
import type { DirectSaleArticle, DirectSalePriceTier, DirectSaleAddon } from '@prisma/client';

const SYNC_SOURCE = 'direct-sale-sync';

export function resolvePosArticleId(article: Pick<DirectSaleArticle, 'reference' | 'slug'>): string {
  const ref = article.reference?.trim();
  if (ref && findCatalogueItem(ref)) return ref;
  if (ref && ref.length > 0 && ref.length < 64) return ref;
  return `ds-${article.slug}`;
}

function mapProfileStatus(status: string): string {
  if (status === 'published') return 'published';
  if (status === 'archived') return 'archived';
  return 'draft';
}

async function syncTiersToProfile(articleId: string, tiers: DirectSalePriceTier[], basePrice: number) {
  await prisma.discountTier.deleteMany({
    where: { articleId, source: SYNC_SOURCE },
  });

  const activeTiers = tiers.filter((t) => t.active).sort((a, b) => a.minQty - b.minQty);
  for (const tier of activeTiers) {
    let unitPrice: number | null = tier.finalUnitPrice;
    let discountPercent = 0;

    if (tier.discountType === 'percent') {
      discountPercent = tier.discountValue;
      unitPrice = null;
    } else if (tier.discountType === 'unit_price') {
      unitPrice = tier.finalUnitPrice ?? tier.discountValue;
    } else if (tier.discountType === 'fixed') {
      unitPrice = Math.max(0, basePrice - tier.discountValue);
    }

    await prisma.discountTier.create({
      data: {
        articleId,
        minQty: tier.minQty,
        maxQty: tier.maxQty,
        unitPrice,
        discountPercent,
        active: true,
        source: SYNC_SOURCE,
      },
    });
  }
}

async function syncAddonsToProfile(articleId: string, addons: DirectSaleAddon[]) {
  const groupKey = 'direct_sale_addons';
  const visibleAddons = addons.filter((a) => a.active && a.visiblePOS);

  let group = await prisma.productOptionGroup.findUnique({
    where: { articleId_fieldKey: { articleId, fieldKey: groupKey } },
  });

  if (!group && visibleAddons.length === 0) return;

  if (!group) {
    group = await prisma.productOptionGroup.create({
      data: {
        articleId,
        fieldKey: groupKey,
        label: 'Suppléments',
        sectionTitle: 'Personnalisation',
        fieldType: 'multiselect',
        impactsPrice: true,
        visiblePos: true,
        active: true,
      },
    });
  } else {
    await prisma.productOptionGroup.update({
      where: { id: group.id },
      data: { active: visibleAddons.length > 0, impactsPrice: true },
    });
  }

  await prisma.productOptionValue.deleteMany({
    where: { groupId: group.id, valueKey: { startsWith: 'ds-addon-' } },
  });

  for (const addon of visibleAddons) {
    const valueKey = `ds-addon-${addon.id.slice(-8)}`;
    const dual = dualWriteOptionModifier('fixed', addon.price);
    await prisma.productOptionValue.create({
      data: {
        groupId: group.id,
        valueKey,
        label: addon.name,
        sortOrder: addon.sortOrder,
        priceModifier: dual.priceModifier,
        priceAddonAr: dual.priceAddonAr,
        priceMultiplier: dual.priceMultiplier,
        modifierType: 'fixed',
        active: true,
        metadata: { directSaleAddonId: addon.id, unit: addon.unit },
      },
    });
  }
}

/** Synchronise un article vente directe vers le profil tarifaire POS. */
export async function syncDirectSaleArticleToPos(
  directSaleId: string,
  opts?: {
    userId?: string;
    userName?: string;
    /** Après import Excel : ne pas écraser le prix article par la grille 2026. */
    preferArticlePrice?: boolean;
  },
): Promise<{ articleId: string; profileId: string } | null> {
  const article = await prisma.directSaleArticle.findUnique({
    where: { id: directSaleId },
    include: {
      priceTiers: { orderBy: { sortOrder: 'asc' } },
      addons: { where: { active: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!article) return null;

  // Variantes format Tirage photo → ne jamais republier comme carte POS
  const { isRedundantTiragePhotoArticle } = await import(
    '@/lib/services/merge-photo-print-articles.service'
  );
  if (isRedundantTiragePhotoArticle(article.name, article.reference ?? article.slug)) {
    await prisma.directSaleArticle.update({
      where: { id: article.id },
      data: { status: 'archived', visiblePOS: false },
    });
    const posArticleId = resolvePosArticleId(article);
    await prisma.articlePricingProfile.updateMany({
      where: { articleId: posArticleId },
      data: { status: 'archived', active: false },
    });
    return null;
  }

  const posArticleId = resolvePosArticleId(article);
  const profileStatus = mapProfileStatus(article.status);

  // Normalise catégorie DirectSale → taxonomie POS (évite grand_format_std / cartes…)
  const { normalizeDirectSaleCategory } = await import('@/lib/direct-sale/categories');
  const normalized = normalizeDirectSaleCategory({
    category: article.category,
    name: article.name,
    reference: article.reference ?? article.slug,
  });
  if (article.category !== normalized.categoryLabel) {
    await prisma.directSaleArticle.update({
      where: { id: article.id },
      data: { category: normalized.categoryLabel },
    });
  }
  const family = normalized.categoryLabel;

  // Variantes GF redondantes synchronisées via DirectSale → archiver carte POS
  const { isRedundantGrandFormatPosCard, resolveGfCanonicalTarget } = await import(
    '@/lib/pos/grand-format-redundant'
  );
  const {
    isRedundantDirectSalePosSku,
    resolveDirectSalePosCanonical,
  } = await import('@/lib/pos/direct-sale-pos-redundant');
  const {
    isRedundantPersonalizedArticle,
    resolvePersonalizedCanonical,
  } = await import('@/lib/pos/personalized-article-redundant');

  if (
    isRedundantGrandFormatPosCard(article.name, posArticleId)
    || isRedundantDirectSalePosSku(article.name, posArticleId)
    || isRedundantPersonalizedArticle(article.name, posArticleId)
  ) {
    const persoTarget = resolvePersonalizedCanonical(article.name, posArticleId);
    const target =
      resolveGfCanonicalTarget(article.name, posArticleId)
      ?? resolveDirectSalePosCanonical(article.name, posArticleId)
      ?? persoTarget?.canonicalId
      ?? null;
    await prisma.articlePricingProfile.updateMany({
      where: { articleId: posArticleId },
      data: {
        status: 'archived',
        active: false,
        family,
        articleLabel: `[archivé→${target ?? 'canonique'}] ${article.name}`,
        updatedAt: new Date(),
      },
    });
    // Ne plus exposer comme carte POS séparée (Admin DirectSale conserve la fiche)
    await prisma.directSaleArticle.updateMany({
      where: { id: article.id },
      data: { visiblePOS: false, category: family, updatedAt: new Date() },
    });
    // Prix AVD → configurateur PLV canonique (pas de carte POS séparée)
    if (target && /^plv-(rollup|xbanner)$/i.test(target)) {
      try {
        const { syncPlvDirectSalePricesToCanonical, invalidatePlvDirectSalePriceCache } = await import(
          '@/lib/services/plv-direct-sale-price-sync.service'
        );
        invalidatePlvDirectSalePriceCache();
        await syncPlvDirectSalePricesToCanonical(opts);
      } catch {
        /* ignore */
      }
    }
    // Carterie / Flyers : pousser prix min sur canonique
    if (target && /^(cv-|fly-)/i.test(target)) {
      try {
        const { mergeRedundantDirectSalePosCards } = await import(
          '@/lib/services/merge-direct-sale-pos.service'
        );
        await mergeRedundantDirectSalePosCards(opts);
      } catch {
        /* ignore */
      }
    }
    // Textile / goodies personnalisés → article catalogue
    if (persoTarget || (target && /^(tx-|gd-|pkg-)/i.test(target))) {
      try {
        const { mergePersonalizedDuplicateArticles } = await import(
          '@/lib/services/merge-personalized-articles.service'
        );
        await mergePersonalizedDuplicateArticles(opts);
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  const { getPrix2026EntryUnitPrice } = await import('@/lib/data/prix-2026-grids');
  const { isPrix2026LegacyEnabled } = await import('@/lib/pricing/prix-2026-legacy');
  const excelEntry =
    opts?.preferArticlePrice || !isPrix2026LegacyEnabled()
      ? null
      : getPrix2026EntryUnitPrice(posArticleId);
  const resolvedPrixBase =
    excelEntry != null && excelEntry > 0
      ? excelEntry
      : article.unitPrice > 0
        ? article.unitPrice
        : null;

  // Aligne le seed DirectSale sur grille 2026 uniquement en mode legacy (jamais STRICT/prod).
  let effectiveUnitPrice = article.unitPrice;
  if (
    !opts?.preferArticlePrice
    && isPrix2026LegacyEnabled()
    && excelEntry != null
    && excelEntry > 0
    && article.unitPrice !== excelEntry
  ) {
    await prisma.directSaleArticle.update({
      where: { id: article.id },
      data: { unitPrice: excelEntry },
    });
    effectiveUnitPrice = excelEntry;
  }

  const profileData = {
    articleLabel: article.name,
    family,
    calculationType: 'piece' as const,
    saleUnit: article.unit,
    status: profileStatus,
    prixBase: resolvedPrixBase,
    qtyMin: article.minQuantity,
    active: article.visiblePOS,
    source: SYNC_SOURCE,
    updatedAt: new Date(),
  };

  const existing = await prisma.articlePricingProfile.findUnique({ where: { articleId: posArticleId } });
  const profile = existing
    ? await prisma.articlePricingProfile.update({
        where: { articleId: posArticleId },
        data: profileData,
      })
    : await prisma.articlePricingProfile.create({
        data: { articleId: posArticleId, ...profileData },
      });

  await syncTiersToProfile(posArticleId, article.priceTiers, effectiveUnitPrice);
  await syncAddonsToProfile(posArticleId, article.addons);

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'SYNC',
    entity: 'DirectSaleArticle',
    entityId: article.id,
    entityLabel: article.name,
    details: {
      posArticleId,
      unitPrice: article.unitPrice,
      tiers: article.priceTiers.length,
      addons: article.addons.length,
    },
  });

  return { articleId: posArticleId, profileId: profile.id };
}

/** Synchronise tous les articles publiés visibles POS. */
export async function syncAllPublishedDirectSaleToPos(
  opts?: { userId?: string; userName?: string; preferArticlePrice?: boolean },
): Promise<{ synced: number; articleIds: string[] }> {
  const articles = await prisma.directSaleArticle.findMany({
    where: { status: 'published', visiblePOS: true },
    select: { id: true },
    orderBy: { sortOrder: 'asc' },
  });

  const articleIds: string[] = [];
  const syncOpts = {
    userId: opts?.userId,
    userName: opts?.userName,
    // Sync Admin → POS : conserver les prix saisis en Admin (pas écrasement grille Excel)
    preferArticlePrice: opts?.preferArticlePrice !== false,
  };
  for (const a of articles) {
    const r = await syncDirectSaleArticleToPos(a.id, syncOpts);
    if (r) articleIds.push(r.articleId);
  }

  await syncPlvPricesAfterDirectSaleBulk(opts);

  await notifyAdminModuleMutation('direct-sale-articles', {
    userId: opts?.userId,
    userName: opts?.userName,
    details: { synced: articleIds.length },
  });

  return { synced: articleIds.length, articleIds };
}

/** Après sync bulk : pousser les prix AVD Roll-up/X-Banner vers les canoniques PLV. */
export async function syncPlvPricesAfterDirectSaleBulk(opts?: { userId?: string; userName?: string }) {
  try {
    const { syncPlvDirectSalePricesToCanonical, invalidatePlvDirectSalePriceCache } = await import(
      '@/lib/services/plv-direct-sale-price-sync.service'
    );
    invalidatePlvDirectSalePriceCache();
    return await syncPlvDirectSalePricesToCanonical(opts);
  } catch {
    return { synced: 0, overrides: 0 };
  }
}

/** Synchronise une finition vers profil POS (articles fin-* canoniques uniquement). */
export async function syncFinishingPriceToPos(
  finishingId: string,
  opts?: { userId?: string; userName?: string },
): Promise<string | null> {
  const row = await prisma.finishingPrice.findUnique({ where: { id: finishingId } });
  if (!row?.reference?.trim() && !row?.name) return null;

  const {
    resolveFinitionVariantCanonical,
    isRedundantFinitionVariantCard,
  } = await import('@/lib/pos/finition-variant-redundant');

  const rawArticleId = row.reference?.trim() || `fin-${row.name.toLowerCase().replace(/\s+/g, '-')}`;
  const variantTarget = resolveFinitionVariantCanonical(row.name, rawArticleId, row.category);

  // Variante (format / diamètre / réf.) → alimente le canonique, pas une carte POS
  if (variantTarget || isRedundantFinitionVariantCard(row.name, rawArticleId, row.category)) {
    const canonicalId = variantTarget?.canonicalId ?? rawArticleId;
    await prisma.articlePricingProfile.updateMany({
      where: { articleId: rawArticleId },
      data: {
        status: 'archived',
        active: false,
        articleLabel: `[archivé→${canonicalId}] ${row.name}`,
        source: 'finishing-price-sync',
        updatedAt: new Date(),
      },
    });

    const family = canonicalFamilyLabel(
      suggestCorrectCategory({
        articleId: canonicalId,
        name: row.name,
        family: 'finitions',
        category: 'finitions',
      }),
    );

    await prisma.articlePricingProfile.upsert({
      where: { articleId: canonicalId },
      create: {
        articleId: canonicalId,
        articleLabel:
          canonicalId === 'fin-reliure'
            ? 'Reliure spirale'
            : canonicalId === 'fin-collage'
              ? 'Collage'
              : canonicalId === 'fin-pelliculage'
                ? 'Pelliculage'
                : canonicalId === 'fin-plastification'
                  ? 'Plastification'
                  : canonicalId === 'fin-decoupe'
                    ? 'Découpe'
                    : canonicalId === 'fin-rainage'
                      ? 'Rainage / Pliage / Perforation'
                      : row.name.replace(/\s*—\s*.+$/, '').trim() || row.name,
        family,
        calculationType: row.formulaType === 'per_m2' ? 'm2' : 'piece',
        saleUnit: row.unit,
        status: 'published',
        prixBase: row.unitPrice,
        qtyMin: row.minQuantity,
        active: true,
        source: 'finishing-price-sync',
      },
      update: {
        family,
        status: 'published',
        active: true,
        source: 'finishing-price-sync',
        updatedAt: new Date(),
      },
    });

    // Chip prix variante sur le canonique
    const fieldKey = variantTarget?.optionFieldKey || 'type';
    const optLabel = variantTarget?.optionLabel || row.reference?.trim() || row.name;
    let group = await prisma.productOptionGroup.findUnique({
      where: { articleId_fieldKey: { articleId: canonicalId, fieldKey } },
    });
    if (!group) {
      group = await prisma.productOptionGroup.create({
        data: {
          articleId: canonicalId,
          fieldKey,
          label: fieldKey === 'diametre' ? 'Diamètre / référence' : fieldKey === 'dim' ? 'Format' : 'Type',
          sectionTitle: 'Variantes Admin',
          fieldType: 'chips',
          impactsPrice: true,
          visiblePos: true,
          active: true,
        },
      });
    }
    const valueKey = optLabel.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 48) || 'opt';
    const existingOpt = await prisma.productOptionValue.findFirst({
      where: { groupId: group.id, OR: [{ label: optLabel }, { valueKey }] },
    });
    if (!existingOpt) {
      const dual = dualWriteOptionModifier('fixed', row.unitPrice);
      await prisma.productOptionValue.create({
        data: {
          groupId: group.id,
          valueKey,
          label: optLabel,
          sortOrder: 10,
          priceModifier: dual.priceModifier,
          priceAddonAr: dual.priceAddonAr,
          priceMultiplier: dual.priceMultiplier,
          modifierType: 'fixed',
          active: true,
          metadata: { source: 'finishing-price-sync', finishingId: row.id },
        },
      });
    } else if (row.unitPrice > 0) {
      const dual = dualWriteOptionModifier('fixed', row.unitPrice);
      await prisma.productOptionValue.update({
        where: { id: existingOpt.id },
        data: {
          priceModifier: dual.priceModifier,
          priceAddonAr: dual.priceAddonAr,
          priceMultiplier: dual.priceMultiplier,
          modifierType: 'fixed',
          active: true,
        },
      });
    }

    await notifyAdminModuleMutation('finishing-prices', opts);
    return canonicalId;
  }

  // Article principal (pas une variante format/diamètre)
  const articleId = rawArticleId.startsWith('fin-')
    ? rawArticleId
    : `fin-${row.name.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`;
  const status = row.status === 'published' ? 'published' : row.active ? 'draft' : 'archived';

  const family = canonicalFamilyLabel(
    suggestCorrectCategory({
      articleId,
      name: row.name,
      family: row.category || 'finitions',
      category: row.category || 'finitions',
    }),
  );

  await prisma.articlePricingProfile.upsert({
    where: { articleId },
    create: {
      articleId,
      articleLabel: row.name,
      family,
      calculationType: row.formulaType === 'per_m2' ? 'm2' : 'piece',
      saleUnit: row.unit,
      status,
      prixBase: row.unitPrice,
      qtyMin: row.minQuantity,
      active: row.visiblePOS,
      source: 'finishing-price-sync',
    },
    update: {
      articleLabel: row.name,
      family,
      prixBase: row.unitPrice,
      status,
      active: row.visiblePOS,
      source: 'finishing-price-sync',
      updatedAt: new Date(),
    },
  });

  await notifyAdminModuleMutation('finishing-prices', opts);
  return articleId;
}

/** Synchronise un tarif grand format vers profil POS. */
export async function syncGrandFormatPricingToPos(
  gfId: string,
  opts?: { userId?: string; userName?: string },
): Promise<string | null> {
  const row = await prisma.grandFormatPricing.findUnique({ where: { id: gfId } });
  if (!row) return null;

  const {
    isRedundantGrandFormatPosCard,
    isPlvFinishedProduct,
    isPvcPetitFormatArticle,
    resolveGfCanonicalTarget,
    REDUNDANT_GF_MATERIAL_IDS,
  } = await import('@/lib/pos/grand-format-redundant');
  const {
    canonicalFamilyLabel,
    suggestCorrectCategory,
  } = await import('@/lib/pos/article-category-taxonomy');

  const articleId = row.reference?.trim() || `gf-${row.name.toLowerCase().replace(/\s+/g, '-')}`;

  // Formats / paliers / doublons → masquer carte POS, mais NE PAS archiver
  // une ligne Admin canonique (gf-*) : sinon table Admin vide + conflit excelId au backfill.
  if (isRedundantGrandFormatPosCard(row.name, articleId)) {
    const target = resolveGfCanonicalTarget(row.name, articleId);
    await prisma.articlePricingProfile.updateMany({
      where: { articleId },
      data: { status: 'archived', active: false, updatedAt: new Date() },
    });
    const isCanonicalGf =
      /^gf-/i.test(articleId) &&
      !(articleId in REDUNDANT_GF_MATERIAL_IDS) &&
      articleId !== 'gf-acrylic';
    if (!isCanonicalGf) {
      await prisma.grandFormatPricing.update({
        where: { id: gfId },
        data: { visiblePOS: false, active: false, status: 'archived', updatedAt: new Date() },
      });
    } else {
      await prisma.grandFormatPricing.update({
        where: { id: gfId },
        data: { visiblePOS: false, updatedAt: new Date() },
      });
    }
    await notifyAdminModuleMutation('grand-format-pricing', opts);
    return target;
  }

  const suggested = suggestCorrectCategory({
    articleId,
    name: row.name,
    family: 'grand_format',
  });

  // PLV / PVC petit format : sync hors Grand Format — ne pas archiver les canoniques gf-*
  if (isPlvFinishedProduct(row.name, articleId) || suggested === 'plv') {
    await prisma.articlePricingProfile.updateMany({
      where: { articleId },
      data: { status: 'archived', active: false, updatedAt: new Date() },
    });
    const isCanonicalGf =
      /^gf-/i.test(articleId) && !(articleId in REDUNDANT_GF_MATERIAL_IDS);
    if (!isCanonicalGf) {
      await prisma.grandFormatPricing.update({
        where: { id: gfId },
        data: { visiblePOS: false, active: false, status: 'archived', updatedAt: new Date() },
      });
    } else {
      await prisma.grandFormatPricing.update({
        where: { id: gfId },
        data: { visiblePOS: false, updatedAt: new Date() },
      });
    }
    await notifyAdminModuleMutation('grand-format-pricing', opts);
    return resolveGfCanonicalTarget(row.name, articleId);
  }

  if (isPvcPetitFormatArticle(row.name, articleId) || suggested === 'impression') {
    const status = row.status === 'published' ? 'published' : 'draft';
    const family = canonicalFamilyLabel('impression');
    await prisma.articlePricingProfile.upsert({
      where: { articleId },
      create: {
        articleId,
        articleLabel: row.name,
        family,
        calculationType: 'piece',
        saleUnit: row.unit || 'pièce',
        status,
        prixBase: row.basePrice,
        active: row.visiblePOS,
        source: 'grand-format-pricing-sync',
      },
      update: {
        articleLabel: row.name,
        family,
        prixBase: row.basePrice,
        status,
        active: row.visiblePOS,
        source: 'grand-format-pricing-sync',
        updatedAt: new Date(),
      },
    });
    await notifyAdminModuleMutation('grand-format-pricing', opts);
    return articleId;
  }

  const status =
    row.status === 'published'
      ? 'published'
      : row.status === 'archived' || row.active === false
        ? 'archived'
        : 'draft';
  const prixM2 = row.pricePerM2 ?? row.basePrice ?? null;
  const family = canonicalFamilyLabel(
    suggested === 'photo' ? 'photo' : 'grand_format',
  );

  await prisma.articlePricingProfile.upsert({
    where: { articleId },
    create: {
      articleId,
      articleLabel: row.name,
      family,
      calculationType: 'm2',
      saleUnit: row.unit,
      status,
      prixM2,
      prixBase: row.basePrice,
      active: row.visiblePOS && family === canonicalFamilyLabel('grand_format'),
      source: 'grand-format-pricing-sync',
    },
    update: {
      articleLabel: row.name,
      family,
      prixM2,
      prixBase: row.basePrice,
      status,
      active: row.visiblePOS && suggested !== 'plv',
      source: 'grand-format-pricing-sync',
      updatedAt: new Date(),
    },
  });

  await notifyAdminModuleMutation('grand-format-pricing', opts);
  return articleId;
}

/** Synchronise une prestation design vers profil POS. */
export async function syncGraphicDesignServiceToPos(
  serviceId: string,
  opts?: { userId?: string; userName?: string },
): Promise<string | null> {
  const row = await prisma.graphicDesignService.findUnique({ where: { id: serviceId } });
  if (!row) return null;

  const articleId = row.reference?.trim() || `design-${row.name.toLowerCase().replace(/\s+/g, '-')}`;
  const status =
    row.status === 'published'
      ? 'published'
      : row.status === 'archived' || row.active === false
        ? 'archived'
        : 'draft';

  await prisma.articlePricingProfile.upsert({
    where: { articleId },
    create: {
      articleId,
      articleLabel: row.name,
      family: row.category,
      calculationType: 'piece',
      saleUnit: row.unit,
      status,
      prixBase: row.unitPrice,
      active: row.visiblePOS,
      source: 'graphic-design-sync',
    },
    update: {
      articleLabel: row.name,
      prixBase: row.unitPrice,
      status,
      active: row.visiblePOS,
      source: 'graphic-design-sync',
      updatedAt: new Date(),
    },
  });

  await notifyAdminModuleMutation('graphic-design-services', opts);
  return articleId;
}
