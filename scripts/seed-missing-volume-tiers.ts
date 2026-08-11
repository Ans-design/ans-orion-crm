/**
 * Complète les DiscountTier manquants pour le catalogue POS (événementiel + proches).
 * N’écrase jamais une grille déjà présente.
 *
 * Usage: npx tsx scripts/seed-missing-volume-tiers.ts
 */
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { POS_CATALOGUE } from '../lib/data/catalogue-meta';

const absDb = join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
process.env.APP_ENV = 'local';
process.env.DATABASE_URL = `file:${absDb}`;

const prisma = new PrismaClient();

type TierSpec = { minQty: number; maxQty: number | null; discountPercent: number };

/** Affiches / supports surface (m² ou pièces) — min dès 0,01 m². */
const TIERS_SURFACE_OR_PIECE: TierSpec[] = [
  { minQty: 0.01, maxQty: 0.99, discountPercent: 0 },
  { minQty: 1, maxQty: 4, discountPercent: 5 },
  { minQty: 5, maxQty: 19, discountPercent: 12 },
  { minQty: 20, maxQty: 49, discountPercent: 18 },
  { minQty: 50, maxQty: null, discountPercent: 25 },
];

/** Volume pièces événementiel (badges, billets, bracelets…). */
const TIERS_PIECE_VOLUME: TierSpec[] = [
  { minQty: 1, maxQty: 9, discountPercent: 0 },
  { minQty: 10, maxQty: 49, discountPercent: 10 },
  { minQty: 50, maxQty: 99, discountPercent: 18 },
  { minQty: 100, maxQty: 499, discountPercent: 25 },
  { minQty: 500, maxQty: null, discountPercent: 33 },
];

/** Petits runs carterie / pochettes. */
const TIERS_SMALL_RUN: TierSpec[] = [
  { minQty: 1, maxQty: 49, discountPercent: 0 },
  { minQty: 50, maxQty: 99, discountPercent: 8 },
  { minQty: 100, maxQty: 499, discountPercent: 15 },
  { minQty: 500, maxQty: 999, discountPercent: 22 },
  { minQty: 1000, maxQty: null, discountPercent: 30 },
];

const SURFACE_IDS = new Set([
  'evt-affiche',
  'evt-photocall',
  'evt-photobooth',
  'evt-comptoir',
  'cal-plateau',
]);

const SMALL_RUN_IDS = new Set([
  'evt-pochette',
  'evt-carte-voeux',
  'evt-cheque',
  'evt-enveloppe',
  'cv-fidelite',
  'cv-jeux',
]);

function tiersFor(articleId: string): TierSpec[] {
  if (SURFACE_IDS.has(articleId)) return TIERS_SURFACE_OR_PIECE;
  if (SMALL_RUN_IDS.has(articleId)) return TIERS_SMALL_RUN;
  return TIERS_PIECE_VOLUME;
}

function shouldSeed(articleId: string, category: string): boolean {
  if (articleId.startsWith('ds-')) return false;
  if (articleId.startsWith('evt-')) return true;
  if (articleId.startsWith('cal-')) return true;
  if (category === 'evenementiel') return true;
  // Carterie complémentaire encore vide
  if (articleId === 'cv-fidelite' || articleId === 'cv-jeux') return true;
  return false;
}

async function ensureProfile(articleId: string, label: string, family: string) {
  const existing = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  if (existing) return existing;
  return prisma.articlePricingProfile.create({
    data: {
      articleId,
      articleLabel: label,
      family,
      calculationType: 'dynamic',
      saleUnit: SURFACE_IDS.has(articleId) ? 'm² / pièce' : 'pièce',
      status: 'draft',
      active: true,
      source: 'seed-missing-volume-tiers',
    },
  });
}

async function seedArticle(articleId: string, label: string, family: string) {
  await ensureProfile(articleId, label, family);
  const count = await prisma.discountTier.count({ where: { articleId } });
  if (count > 0) {
    console.log('SKIP (déjà rempli)', articleId, 'n=', count);
    return 'skip';
  }
  const tiers = tiersFor(articleId);
  await prisma.$transaction(async (tx) => {
    for (const t of tiers) {
      await tx.discountTier.create({
        data: {
          articleId,
          variantKey: '',
          variantLabel: 'Défaut produit',
          minQty: t.minQty,
          maxQty: t.maxQty,
          unitPrice: null,
          discountPercent: t.discountPercent,
          active: true,
          source: 'seed-missing-volume-tiers',
        },
      });
    }
  });
  console.log(
    'OK',
    articleId,
    '|',
    tiers.map((t) => `${t.minQty}-${t.maxQty ?? '∞'}:${t.discountPercent}%`).join(', '),
  );
  return 'ok';
}

async function main() {
  let ok = 0;
  let skip = 0;

  const targets = POS_CATALOGUE.filter((c) => shouldSeed(c.id, c.category));
  console.log('Cibles catalogue:', targets.length);

  for (const c of targets) {
    const family =
      c.category === 'evenementiel'
        ? 'Événementiel'
        : c.category === 'calendriers'
          ? 'Calendriers & Marque-page'
          : c.category;
    const r = await seedArticle(c.id, c.name, family);
    if (r === 'ok') ok += 1;
    else skip += 1;
  }

  // Sécurité : evt-affiche même si hors filtre catalogue
  const affiche = await seedArticle('evt-affiche', 'Affiche événement', 'Événementiel');
  if (affiche === 'ok') ok += 1;
  if (affiche === 'skip') skip += 1;

  const verify = await prisma.discountTier.findMany({
    where: { articleId: 'evt-affiche' },
    orderBy: { minQty: 'asc' },
  });
  console.log({
    ok,
    skip,
    evtAffiche: verify.map((t) => `${t.minQty}-${t.maxQty ?? '∞'}:${t.discountPercent}%`),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
