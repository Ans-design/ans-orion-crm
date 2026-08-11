/**
 * Runner validation vente directe (appelé après bootstrap SQLite).
 */
import { PrismaClient } from '@prisma/client';
import { syncAllDirectSalePricingToPos } from '../lib/server/modules/direct-sale/pricing-tables.service';
import { loadDirectSalePosMetaMap } from '../lib/direct-sale/pos-enrichment';
import { resolvePosArticleId } from '../lib/services/direct-sale-pos-sync.service';
import { resolveCatalogueItemFromDb } from '../lib/services/catalogue-service';

type Check = { name: string; ok: boolean; detail: string };

async function main() {
  const prisma = new PrismaClient();
  try {
    const checks: Check[] = [];

    const article = await prisma.directSaleArticle.findFirst({
      where: { slug: 'carte-de-visite-standard' },
      include: {
        priceTiers: { where: { active: true } },
        addons: { where: { active: true } },
      },
    });

    checks.push({
      name: 'Article seed présent',
      ok: Boolean(article),
      detail: article ? `${article.name} (${article.status})` : 'Exécutez npm run seed:direct-sale',
    });

    if (!article) {
      printReport(checks);
      process.exit(1);
    }

    checks.push({
      name: 'Paliers seed',
      ok: article.priceTiers.length >= 2,
      detail: `${article.priceTiers.length} palier(s)`,
    });

    checks.push({
      name: 'Supplément seed',
      ok: article.addons.length >= 1,
      detail: `${article.addons.length} addon(s)`,
    });

    const sync = await syncAllDirectSalePricingToPos({ userName: 'validate-script' });
    checks.push({
      name: 'Sync global POS',
      ok: sync.total > 0,
      detail: `directSale=${sync.directSale} fin=${sync.finishing} gf=${sync.grandFormat} design=${sync.design} total=${sync.total}`,
    });

    const posId = resolvePosArticleId(article);
    const profile = await prisma.articlePricingProfile.findUnique({ where: { articleId: posId } });
    checks.push({
      name: 'Profil ArticlePricingProfile',
      ok: Boolean(profile && profile.prixBase != null && profile.prixBase > 0),
      detail: profile
        ? `${posId} — prixBase=${profile.prixBase} status=${profile.status} source=${profile.source}`
        : `Profil manquant pour ${posId}`,
    });

    const tiers = await prisma.discountTier.findMany({
      where: { articleId: posId, source: 'direct-sale-sync', active: true },
    });
    checks.push({
      name: 'Paliers POS (DiscountTier)',
      ok: tiers.length >= 2,
      detail: `${tiers.length} palier(s) sync`,
    });

    const addonGroup = await prisma.productOptionGroup.findFirst({
      where: { articleId: posId, fieldKey: 'direct_sale_addons' },
      include: { values: true },
    });
    checks.push({
      name: 'Suppléments POS (ProductOptionGroup)',
      ok: Boolean(addonGroup && addonGroup.values.length >= 1),
      detail: addonGroup
        ? `groupe actif, ${addonGroup.values.length} valeur(s)`
        : 'Groupe direct_sale_addons absent',
    });

    const metaMap = await loadDirectSalePosMetaMap();
    const meta = metaMap.get(posId);
    checks.push({
      name: 'Métadonnées directSale pour POS',
      ok: Boolean(meta && meta.unitPrice > 0),
      detail: meta
        ? `${meta.unitPrice} Ar/${meta.unit}, addons=${meta.addonCount}, devisHorsStd=${meta.requiresQuoteIfCustom}`
        : `Pas de meta pour ${posId}`,
    });

    const catalogueItem = await resolveCatalogueItemFromDb(posId);
    checks.push({
      name: 'Catalogue unifié (resolveCatalogueItemFromDb)',
      ok: Boolean(catalogueItem?.directSale?.unitPrice === article.unitPrice),
      detail: catalogueItem
        ? `${catalogueItem.id} — directSale=${catalogueItem.directSale?.unitPrice} Ar, source=${catalogueItem.priceSource}`
        : `Article ${posId} introuvable dans le catalogue`,
    });

    printReport(checks);
    const failed = checks.filter((c) => !c.ok).length;
    process.exit(failed > 0 ? 1 : 0);
  } finally {
    await prisma.$disconnect();
  }
}

function printReport(checks: Check[]) {
  console.log('\n=== Validation vente directe ===\n');
  for (const c of checks) {
    console.log(`${c.ok ? '✓' : '✗'} ${c.name}`);
    console.log(`  ${c.detail}\n`);
  }
  const ok = checks.filter((c) => c.ok).length;
  console.log(`Résultat : ${ok}/${checks.length} OK\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
