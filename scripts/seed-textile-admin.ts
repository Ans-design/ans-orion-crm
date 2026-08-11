/**
 * Seed métier Textile — supports / marquage / main d’œuvre / règles / paliers.
 * Idempotent via excelId.
 */
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
  process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
}

const prisma = new PrismaClient();

async function upsertSupport(row: {
  excelId: string;
  articleId: string;
  matiere?: string;
  taille?: string;
  couleur?: string;
  typeModele?: string;
  prixSupportVierge: number;
  unit?: string;
  details?: string;
}) {
  const existing = await prisma.textileBaseSupportPrice.findFirst({ where: { excelId: row.excelId } });
  const data = {
    excelId: row.excelId,
    articleId: row.articleId,
    articleRef: row.articleId,
    family: 'Textiles',
    matiere: row.matiere ?? null,
    taille: row.taille ?? null,
    couleur: row.couleur ?? null,
    typeModele: row.typeModele ?? null,
    prixSupportVierge: row.prixSupportVierge,
    unit: row.unit ?? 'pièce',
    visiblePOS: true,
    active: true,
    status: 'published',
    details: row.details ?? null,
    deletedAt: null,
  };
  if (existing) {
    await prisma.textileBaseSupportPrice.update({ where: { id: existing.id }, data });
  } else {
    await prisma.textileBaseSupportPrice.create({ data });
  }
}

async function upsertMarking(row: {
  excelId: string;
  technique: string;
  tailleMarquage?: string;
  zoneMarquage?: string;
  prixMarquage: number;
  details?: string;
}) {
  const existing = await prisma.textileMarkingPrice.findFirst({ where: { excelId: row.excelId } });
  const data = {
    excelId: row.excelId,
    technique: row.technique,
    tailleMarquage: row.tailleMarquage ?? null,
    zoneMarquage: row.zoneMarquage ?? null,
    formatSurface: row.tailleMarquage ?? null,
    prixMarquage: row.prixMarquage,
    unit: 'pièce',
    visiblePOS: true,
    active: true,
    status: 'published',
    details: row.details ?? null,
    deletedAt: null,
  };
  if (existing) {
    await prisma.textileMarkingPrice.update({ where: { id: existing.id }, data });
  } else {
    await prisma.textileMarkingPrice.create({ data });
  }
}

async function upsertLabor(row: {
  excelId: string;
  typeLabor: string;
  techniqueLiee?: string;
  articleId?: string;
  prixLabor: number;
}) {
  const existing = await prisma.textileLaborPrice.findFirst({ where: { excelId: row.excelId } });
  const data = {
    excelId: row.excelId,
    typeLabor: row.typeLabor,
    techniqueLiee: row.techniqueLiee ?? null,
    articleId: row.articleId ?? '*',
    prixLabor: row.prixLabor,
    unit: 'pièce',
    visiblePOS: true,
    active: true,
    status: 'published',
    deletedAt: null,
  };
  if (existing) {
    await prisma.textileLaborPrice.update({ where: { id: existing.id }, data });
  } else {
    await prisma.textileLaborPrice.create({ data });
  }
}

async function upsertRule(row: {
  excelId: string;
  articleId: string;
  typeCalcul: string;
  utiliseSupportVierge: boolean;
  utiliseMarquage: boolean;
  utiliseMainOeuvre: boolean;
  utiliseSurfaceM2: boolean;
  exceptionLambahoany: boolean;
  formula?: string;
}) {
  const existing = await prisma.textilePricingRule.findFirst({
    where: { OR: [{ excelId: row.excelId }, { articleId: row.articleId }] },
  });
  const data = {
    excelId: row.excelId,
    articleId: row.articleId,
    typeCalcul: row.typeCalcul,
    utiliseSupportVierge: row.utiliseSupportVierge,
    utiliseMarquage: row.utiliseMarquage,
    utiliseMainOeuvre: row.utiliseMainOeuvre,
    utiliseSurfaceM2: row.utiliseSurfaceM2,
    exceptionLambahoany: row.exceptionLambahoany,
    formula: row.formula ?? null,
    visiblePOS: true,
    active: true,
    status: 'published',
    deletedAt: null,
  };
  if (existing) {
    await prisma.textilePricingRule.update({ where: { id: existing.id }, data });
  } else {
    await prisma.textilePricingRule.create({ data });
  }
}

async function upsertTier(row: {
  excelId: string;
  articleId: string;
  qtyMin: number;
  qtyMax: number | null;
  typeRemise: string;
  valeurRemise: number;
  details?: string;
}) {
  const existing = await prisma.textileDiscountTier.findFirst({ where: { excelId: row.excelId } });
  const data = {
    excelId: row.excelId,
    articleId: row.articleId,
    qtyMin: row.qtyMin,
    qtyMax: row.qtyMax,
    typeRemise: row.typeRemise,
    valeurRemise: row.valeurRemise,
    active: true,
    status: 'published',
    details: row.details ?? null,
    deletedAt: null,
  };
  if (existing) {
    await prisma.textileDiscountTier.update({ where: { id: existing.id }, data });
  } else {
    await prisma.textileDiscountTier.create({ data });
  }
}

const STANDARD_TX = [
  'tx-bob',
  'tx-casquette',
  'tx-tshirt',
  'tx-polo',
  'tx-sweat',
  'tx-gilet',
  'tx-maillot',
  'tx-totebag',
  'tx-trousse',
  'tx-combinaison',
  'tx-survetement',
] as const;

async function main() {
  // Bob — exemple métier 5000+2000+1000
  await upsertSupport({
    excelId: 'TX-BOB-COTON-S',
    articleId: 'tx-bob',
    typeModele: 'Bob',
    matiere: 'Coton',
    taille: 'S',
    prixSupportVierge: 5000,
    details: 'Bob coton taille S vierge',
  });
  await upsertSupport({
    excelId: 'TX-BOB-COTON-M',
    articleId: 'tx-bob',
    typeModele: 'Bob',
    matiere: 'Coton',
    taille: 'M',
    prixSupportVierge: 5200,
  });
  await upsertSupport({
    excelId: 'TX-BOB-COTON-L',
    articleId: 'tx-bob',
    typeModele: 'Bob',
    matiere: 'Coton',
    taille: 'L',
    prixSupportVierge: 5500,
  });

  // Supports de base autres textiles (placeholders éditables Admin)
  for (const id of STANDARD_TX) {
    if (id === 'tx-bob') continue;
    await upsertSupport({
      excelId: `TX-SUP-${id.toUpperCase()}-S`,
      articleId: id,
      typeModele: id.replace('tx-', ''),
      matiere: 'Coton',
      taille: 'S',
      prixSupportVierge: id.includes('sweat') || id.includes('combinaison') ? 18000 : 8000,
    });
  }

  // Marquage
  await upsertMarking({
    excelId: 'TX-MARK-PRESS-STD',
    technique: 'Flex textile',
    tailleMarquage: 'Petit logo — 10×10 cm',
    prixMarquage: 2000,
    details: 'Press / Flex standard',
  });
  await upsertMarking({
    excelId: 'TX-MARK-PRESS-A6',
    technique: 'Flex textile',
    tailleMarquage: 'A6 — 105×148 mm',
    prixMarquage: 2000,
    details: 'Bob / casquette A6',
  });
  await upsertMarking({
    excelId: 'TX-MARK-PRESS-MOYEN',
    technique: 'Flex textile',
    tailleMarquage: 'Logo moyen — 15×15 cm',
    prixMarquage: 2500,
  });
  await upsertMarking({
    excelId: 'TX-MARK-DTF-A4',
    technique: 'DTF',
    tailleMarquage: 'A4 — 210×297 mm',
    prixMarquage: 3500,
  });
  await upsertMarking({
    excelId: 'TX-MARK-SUBLIM',
    technique: 'Sublimation',
    tailleMarquage: 'A4 — 210×297 mm',
    prixMarquage: 4000,
  });
  await upsertMarking({
    excelId: 'TX-MARK-BRODERIE',
    technique: 'Broderie',
    tailleMarquage: 'Cœur — 8×8 cm',
    prixMarquage: 5000,
  });
  await upsertMarking({
    excelId: 'TX-MARK-SERI',
    technique: 'Sérigraphie',
    tailleMarquage: 'A3 — 297×420 mm',
    prixMarquage: 3000,
  });

  // Main d’œuvre
  await upsertLabor({
    excelId: 'TX-LABOR-PRESS',
    typeLabor: 'Press textile',
    techniqueLiee: 'Flex textile',
    articleId: '*',
    prixLabor: 1000,
  });
  await upsertLabor({
    excelId: 'TX-LABOR-POSE-FLEX',
    typeLabor: 'Pose flex',
    techniqueLiee: 'Flex textile',
    articleId: '*',
    prixLabor: 1000,
  });
  await upsertLabor({
    excelId: 'TX-LABOR-DTF',
    typeLabor: 'Pose DTF',
    techniqueLiee: 'DTF',
    articleId: '*',
    prixLabor: 1200,
  });
  await upsertLabor({
    excelId: 'TX-LABOR-BRODERIE',
    typeLabor: 'Préparation broderie',
    techniqueLiee: 'Broderie',
    articleId: '*',
    prixLabor: 1500,
  });
  await upsertLabor({
    excelId: 'TX-LABOR-LAMBA',
    typeLabor: 'Main d’œuvre impression textile',
    techniqueLiee: 'Impression textile',
    articleId: 'tx-lambahoany',
    prixLabor: 2000,
  });

  // Règles
  for (const id of STANDARD_TX) {
    await upsertRule({
      excelId: `TX-RULE-${id.toUpperCase()}`,
      articleId: id,
      typeCalcul: 'STANDARD',
      utiliseSupportVierge: true,
      utiliseMarquage: true,
      utiliseMainOeuvre: true,
      utiliseSurfaceM2: false,
      exceptionLambahoany: false,
      formula: 'support + marquage + main_oeuvre',
    });
  }

  await upsertRule({
    excelId: 'TX-RULE-LAMBAHOANY',
    articleId: 'tx-lambahoany',
    typeCalcul: 'SURFACE_M2',
    utiliseSupportVierge: false,
    utiliseMarquage: false,
    utiliseMainOeuvre: true,
    utiliseSurfaceM2: true,
    exceptionLambahoany: true,
    formula: 'surface_m2 × prix_m2 + main_oeuvre',
  });

  await upsertSupport({
    excelId: 'TX-LAMBA-M2-COTON',
    articleId: 'tx-lambahoany',
    typeModele: 'Lambahoany',
    matiere: 'Coton standard',
    prixSupportVierge: 20000,
    unit: 'm²',
    details: 'Prix impression textile / m²',
  });
  await upsertSupport({
    excelId: 'TX-LAMBA-M2-POLY',
    articleId: 'tx-lambahoany',
    typeModele: 'Lambahoany',
    matiere: 'Polyester',
    prixSupportVierge: 18000,
    unit: 'm²',
  });

  // Palier Bob 10 % dès 10 pièces
  await upsertTier({
    excelId: 'TX-TIER-BOB-10',
    articleId: 'tx-bob',
    qtyMin: 10,
    qtyMax: 49,
    typeRemise: 'percent',
    valeurRemise: 10,
    details: 'Remise 10 % dès 10 pièces',
  });
  await upsertTier({
    excelId: 'TX-TIER-BOB-50',
    articleId: 'tx-bob',
    qtyMin: 50,
    qtyMax: null,
    typeRemise: 'percent',
    valeurRemise: 15,
    details: 'Remise 15 % dès 50 pièces',
  });

  console.log('✓ Seed textile Admin OK (Bob 8000 Ar, Lambahoany 20 000 Ar/m²)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
