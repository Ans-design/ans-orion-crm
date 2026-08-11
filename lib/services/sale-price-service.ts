import { prisma } from '@/lib/prisma';
import { CATALOGUE } from '@/lib/data/catalogue';
import { containsQ } from '@/lib/prisma-filters';

const ARTICLE_PRODUCT_ALIASES: Record<string, string[]> = {
  'carte-visite': ['Carte de visite'],
  'fly-std': ['Flyers', 'Flyer'],
  'gf-bache': ['Bâche', 'Bache', 'Mesh', 'Banderole', 'Bâche 440G', 'Mesh 270G'],
  'gf-vinyl-blanc': ['Vinyle blanc brillant', 'Autocollant'],
  'cal-plateau': ['Calendrier', 'Calendrier plateau'],
  'cal-marquepage': ['Marque-page'],
  'plv-rollup': ['Roll up', 'Roll-up'],
  'fin-pelliculage': ['Pelliculage', 'Pelliculage mat', 'Pelliculage brillant'],
  'fin-vernis': ['Vernis', 'Vernis mat', 'Vernis brillant'],
  'fin-plastification': ['Plastification', 'Plastifié'],
  'fin-dorure': ['Dorure', 'Argenture', 'Dorure Or'],
  'fin-reliure': ['Reliure', 'Spirale', 'Piqûre à cheval', 'Dos carré collé'],
  'fin-rainage': ['Rainage', 'Pliage'],
  'fin-coins': ['Coins arrondis'],
  'fin-autocollant': ['Pose autocollant', 'Pose vinyle'],
  'fin-decoupe': ['Découpe flex'],
  'fin-perforation': ['Perforation'],
  'fin-gaufrage': ['Gaufrage', 'Débossage'],
  'fin-couture': ['Couture Oriflammes'],
  'fin-autres': ['Finition personnalisée'],
  'imp-impression': ['Impression sans finition', 'Offset 80g', 'PCB', 'PCM', 'Glossy'],
  'imp-offset': ['Offset 80g', 'Impression sans finition'],
  'imp-pcb': ['PCB', 'PCM', 'Glossy', 'Impression sans finition'],
};

function extractFormatLabel(config: Record<string, unknown>): string | undefined {
  const raw = String(
    config.dim || config.format || config.dimension || config.taille || '',
  ).trim();
  if (!raw) return undefined;
  const m = raw.match(/\b(A[0-9]\+?|DL|B[0-9])\b/i);
  return m ? m[1].toUpperCase().replace('A3+', 'A3+') : raw.slice(0, 40);
}

function extractFaceLabel(config: Record<string, unknown>): string | undefined {
  const face = String(config.face || config.impression || '').trim();
  if (!face) return undefined;
  if (/recto-verso|recto verso|2\s*faces?/i.test(face)) return 'Recto-verso';
  if (/recto/i.test(face)) return 'Recto';
  return face;
}

function qtyMatchesTier(qty: number, tier: string): boolean {
  const t = tier.toLowerCase();
  const range = t.match(/(\d+)\s*[-àa]\s*(\d+)/);
  if (range) {
    const min = parseInt(range[1], 10);
    const max = parseInt(range[2], 10);
    return qty >= min && qty <= max;
  }
  if (t.includes('1-9') || t.includes('1 à 9')) return qty >= 1 && qty <= 9;
  if (t.includes('10-49')) return qty >= 10 && qty <= 49;
  if (t.includes('50-99')) return qty >= 50 && qty <= 99;
  if (t.includes('100')) return qty >= 100;
  return true;
}

function scoreSalePriceRow(
  row: {
    format: string | null;
    face: string | null;
    material: string | null;
    grammage: string | null;
    qtyTier: string | null;
    productNormalized: string;
  },
  ctx: {
    format?: string;
    face?: string;
    material?: string;
    grammage?: string;
    qty: number;
    productTerms: string[];
  },
): number {
  let score = 0;
  const pn = row.productNormalized.toLowerCase();
  for (const term of ctx.productTerms) {
    if (pn.includes(term.toLowerCase())) score += 10;
  }
  if (ctx.format && row.format?.toLowerCase().includes(ctx.format.toLowerCase())) score += 8;
  if (ctx.face && row.face?.toLowerCase().includes(ctx.face.toLowerCase().slice(0, 5))) score += 5;
  if (ctx.material && row.material?.toLowerCase().includes(ctx.material.toLowerCase().slice(0, 3))) score += 3;
  if (ctx.grammage && row.grammage?.toLowerCase().includes(ctx.grammage.toLowerCase().replace(/\s/g, ''))) score += 3;
  if (row.qtyTier && qtyMatchesTier(ctx.qty, row.qtyTier)) score += 6;
  return score;
}

export function resolveProductSearchTerms(articleId: string, articleName: string): string[] {
  const terms = new Set<string>();
  terms.add(articleName);
  const firstWord = articleName.split(/[\s(—-]/)[0]?.trim();
  if (firstWord && firstWord.length > 2) terms.add(firstWord);
  for (const alias of ARTICLE_PRODUCT_ALIASES[articleId] ?? []) terms.add(alias);
  const article = CATALOGUE.find((a) => a.id === articleId);
  if (article?.name) terms.add(article.name);
  return [...terms].filter(Boolean);
}

/** Lookup PRIX 2026 par article + config — lit salePriceAr (valeur courante ANS_PRICE_STORE) */
export async function lookupSalePrice2026ForArticle(
  articleId: string,
  articleName: string,
  config: Record<string, unknown>,
  qty: number,
): Promise<{
  salePriceAr: number;
  sourcePriceAr: number | null;
  sourceId: string;
  rowId: string;
  productNormalized: string;
  faceInRow: boolean;
  adminModified: boolean;
} | null> {
  try {
    const productTerms = resolveProductSearchTerms(articleId, articleName);
    const ctx = {
      format: extractFormatLabel(config),
      face: extractFaceLabel(config),
      material: String(config.paperType || config.matiere || config.matiere_int || '').trim() || undefined,
      grammage: String(config.paperWeight || config.grammage || config.grammage_int || '').trim() || undefined,
      qty,
      productTerms,
    };

    const orProducts = productTerms.slice(0, 4).map((term) => ({
      productNormalized: containsQ(term),
    }));

    const candidates = await prisma.salePrice2026.findMany({
      where: {
        actif: true,
        priceType: 'auto',
        salePriceAr: { gt: 0 },
        OR: orProducts,
      },
      take: 80,
    });

    if (!candidates.length) return null;

    const ranked = candidates
      .map((row) => ({ row, score: scoreSalePriceRow(row, ctx) }))
      .filter((x) => x.score >= 10)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]?.row;
    if (!best?.salePriceAr) return null;

    return {
      salePriceAr: best.salePriceAr,
      sourcePriceAr: best.sourcePriceAr ?? best.salePriceAr ?? null,
      sourceId: best.sourceId ?? best.id,
      rowId: best.id,
      productNormalized: best.productNormalized,
      faceInRow: Boolean(best.face),
      adminModified: best.adminModified,
    };
  } catch {
    return null;
  }
}

/** Lookup prix vente PRIX 2026 en base — fallback null si devis manuel */
export async function lookupSalePrice2026(params: {
  productNormalized: string;
  format?: string;
  qtyTier?: string;
  material?: string;
  grammage?: string;
}) {
  const where: Record<string, unknown> = {
    actif: true,
    priceType: 'auto',
    productNormalized: containsQ(params.productNormalized),
  };
  if (params.format) where.format = containsQ(params.format);
  if (params.qtyTier) where.qtyTier = containsQ(params.qtyTier);

  const row = await prisma.salePrice2026.findFirst({
    where,
    orderBy: { salePriceAr: 'asc' },
  });

  if (!row?.salePriceAr) return null;
  return {
    sourceId: row.sourceId,
    salePriceAr: row.salePriceAr,
    productNormalized: row.productNormalized,
    format: row.format,
    qtyTier: row.qtyTier,
  };
}

/** Coût matière min par m² depuis stock + fournisseurs */
export async function getMaterialCostPerM2(materialKey: string): Promise<number | null> {
  const item = await prisma.stockItem.findFirst({
    where: {
      actif: true,
      OR: [{ materialKey }, { label: materialKey }],
    },
  });
  if (!item?.unitCost) return null;
  if (item.yieldM2 && item.yieldM2 > 0) {
    const minPrice = await prisma.supplierPrice.aggregate({
      where: { actif: true, articleNormalized: materialKey },
      _min: { purchasePrice: true },
    });
    if (minPrice._min.purchasePrice) {
      return minPrice._min.purchasePrice / item.yieldM2;
    }
  }
  return item.unitCost;
}

export function computeYieldM2(lengthM: number, widthM: number): number {
  return lengthM * widthM;
}

export function computeCostPerYield(purchasePrice: number, yieldValue: number): number {
  if (yieldValue <= 0) return 0;
  return purchasePrice / yieldValue;
}

export function computeMarginRate(salePrice: number, cost: number): number {
  if (salePrice <= 0) return 0;
  return (salePrice - cost) / salePrice;
}
