/**
 * Audit Excel ANS paliers vs DiscountTier DB (toutes variantes).
 * Usage: npx tsx scripts/audit-ans-paliers-remise.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { PrismaClient } from '@prisma/client';
import {
  ANS_PALIER_ARTICLE_MAP,
  ANS_PALIER_SKIP_FAMILIES,
  buildAnsPalierVariantKey,
  normalizeAnsPalierTiers,
} from '../lib/pricing/ans-palier-remise-map';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const excelPath = join(process.cwd(), 'data', 'references', 'ANS_PALIERS_REMISE_SIMPLE_CURSOR.xlsx');
if (!existsSync(excelPath)) {
  console.error('Fichier introuvable:', excelPath);
  process.exit(1);
}

const absDb = join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
process.env.DATABASE_URL = `file:${absDb}`;
const prisma = new PrismaClient();

function tierKey(tiers: Array<{ minQty: number; maxQty: number | null; discountPercent: number | null }>) {
  return tiers
    .map((t) => `${t.minQty}-${t.maxQty ?? '∞'}:${Number(t.discountPercent ?? 0)}`)
    .join('|');
}

async function main() {
  const wb = XLSX.read(readFileSync(excelPath), { cellDates: false });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!], { defval: '' }) as Array<
    Record<string, unknown>
  >;

  // Packs Excel = (family, artId)
  const byArt = new Map<string, { family: string; artId: string; rows: typeof rows }>();
  for (const r of rows) {
    const family = String(r.article ?? '').trim();
    const artId = String(r.article_id ?? '').trim();
    if (!family || !artId || ANS_PALIER_SKIP_FAMILIES.has(family)) continue;
    if (!ANS_PALIER_ARTICLE_MAP[family]) continue;
    const k = `${family}||${artId}`;
    if (!byArt.has(k)) byArt.set(k, { family, artId, rows: [] });
    byArt.get(k)!.rows.push(r);
  }

  const usedKeys = new Map<string, Set<string>>();
  let ok = 0;
  let diff = 0;
  let missing = 0;

  const sorted = [...byArt.values()].sort((a, b) => a.artId.localeCompare(b.artId));
  for (const pack of sorted) {
    const targetId = ANS_PALIER_ARTICLE_MAP[pack.family]!;
    const first = pack.rows[0]!;
    let meta = buildAnsPalierVariantKey({
      family: pack.family,
      articleId: targetId,
      variante: String(first.variante ?? ''),
      option_prix: String(first.option_prix ?? ''),
      artId: pack.artId,
    });
    if (!usedKeys.has(targetId)) usedKeys.set(targetId, new Set());
    const used = usedKeys.get(targetId)!;
    let vk = meta.variantKey;
    if (used.has(vk)) vk = `${meta.variantKey}__${pack.artId.toLowerCase()}`;
    used.add(vk);

    const expected = normalizeAnsPalierTiers(pack.rows);
    const db = await prisma.discountTier.findMany({
      where: { articleId: targetId, variantKey: vk },
      orderBy: { minQty: 'asc' },
    });
    const exp = tierKey(expected);
    const got = tierKey(
      db.map((t) => ({
        minQty: t.minQty,
        maxQty: t.maxQty,
        discountPercent: t.discountPercent,
      })),
    );
    if (!db.length) {
      missing += 1;
      console.log('MISSING', targetId, vk, pack.artId, exp);
    } else if (exp !== got) {
      diff += 1;
      console.log('DIFF', targetId, vk, pack.artId, { exp, got });
    } else {
      ok += 1;
    }
  }

  const variantCount = await prisma.discountTier.groupBy({
    by: ['articleId', 'variantKey'],
    _count: true,
  });

  console.log('\n=== RÉSUMÉ ===', {
    ok,
    diff,
    missing,
    excelPacks: sorted.length,
    dbVariantGrids: variantCount.length,
    tierCount: await prisma.discountTier.count(),
  });

  if (diff > 0 || missing > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
