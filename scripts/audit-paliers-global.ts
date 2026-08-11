/**
 * Audit global paliers DiscountTier — ordre, couverture, PU GF.
 * Usage: npx tsx scripts/audit-paliers-global.ts
 */
import { join } from 'path';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import {
  ANS_PALIER_ARTICLE_MAP,
  ANS_PALIER_SKIP_FAMILIES,
  buildAnsPalierVariantKey,
  normalizeAnsPalierTiers,
  isPreferredDefaultVariant,
} from '../lib/pricing/ans-palier-remise-map';
import { qtyChainStep, TIER_QTY_EPSILON } from '../lib/pricing/validate-discount-tiers';
import { POS_CATALOGUE } from '../lib/data/catalogue-meta';
import { POS_PARENT_IDS } from '../lib/pos/article-2026-canonical-map';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const absDb = join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
process.env.DATABASE_URL = `file:${absDb}`;
const prisma = new PrismaClient();

type Tier = {
  articleId: string;
  variantKey: string;
  variantLabel: string | null;
  minQty: number;
  maxQty: number | null;
  discountPercent: number | null;
  unitPrice: number | null;
  active: boolean;
};

function sig(
  tiers: Array<{ minQty: number; maxQty: number | null; discountPercent: number | null }>,
) {
  return tiers
    .map((t) => `${t.minQty}-${t.maxQty ?? '∞'}:${Number(t.discountPercent ?? 0)}`)
    .join('|');
}

function checkChain(tiers: Tier[]): string[] {
  const errs: string[] = [];
  if (!tiers.length) return ['vide'];
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i]!;
    if (!(t.minQty >= TIER_QTY_EPSILON)) errs.push(`min invalide ${t.minQty}`);
    if (t.maxQty != null && t.maxQty < t.minQty) errs.push(`max<min ${t.minQty}-${t.maxQty}`);
    const pct = Number(t.discountPercent ?? 0);
    if (pct < 0 || pct > 100) errs.push(`% hors bornes ${pct}`);
    if (i === 0) continue;
    const prev = sorted[i - 1]!;
    if (prev.maxQty == null) {
      errs.push(`bande ouverte avant ${t.minQty}`);
      continue;
    }
    const step = qtyChainStep(prev.maxQty);
    const expectMin = Math.round((prev.maxQty + step) * 1000) / 1000;
    if (Math.abs(t.minQty - expectMin) > 0.001) {
      errs.push(`trou/chevauche ${prev.maxQty} → ${t.minQty} (attendu ${expectMin})`);
    }
  }
  const last = sorted[sorted.length - 1]!;
  if (last.maxQty != null) errs.push(`dernière bande fermée max=${last.maxQty}`);
  // % croissants (volume) — warning soft si baisse
  for (let i = 1; i < sorted.length; i++) {
    const a = Number(sorted[i - 1]!.discountPercent ?? 0);
    const b = Number(sorted[i]!.discountPercent ?? 0);
    if (b + 0.001 < a) errs.push(`remise décroissante ${a}% → ${b}%`);
  }
  return errs;
}

async function main() {
  const all = (await prisma.discountTier.findMany({
    orderBy: [{ articleId: 'asc' }, { variantKey: 'asc' }, { minQty: 'asc' }],
  })) as Tier[];

  const byGrid = new Map<string, Tier[]>();
  for (const t of all) {
    const k = `${t.articleId}::${t.variantKey}`;
    if (!byGrid.has(k)) byGrid.set(k, []);
    byGrid.get(k)!.push(t);
  }

  // 1) Ordre / chaîne
  const chainBad: Array<{ grid: string; errs: string[] }> = [];
  for (const [grid, tiers] of byGrid) {
    const errs = checkChain(tiers);
    if (errs.length) chainBad.push({ grid, errs });
  }

  // 2) Excel signatures couvertes (exact OU même sig sur article)
  const excelPath = join(process.cwd(), 'data', 'references', 'ANS_PALIERS_REMISE_SIMPLE_CURSOR.xlsx');
  let excelUncovered: Array<{ articleId: string; artId: string; variante: string; sig: string }> = [];
  const articleSigs = new Map<string, Set<string>>();
  for (const [grid, tiers] of byGrid) {
    const [articleId] = grid.split('::') as [string, string];
    if (!articleSigs.has(articleId)) articleSigs.set(articleId, new Set());
    articleSigs.get(articleId)!.add(sig(tiers));
  }

  if (existsSync(excelPath)) {
    const wb = XLSX.read(readFileSync(excelPath), { cellDates: false });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!], { defval: '' }) as Array<
      Record<string, unknown>
    >;
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
    const used = new Map<string, Set<string>>();
    for (const pack of [...byArt.values()].sort((a, b) => a.artId.localeCompare(b.artId))) {
      const targetId = ANS_PALIER_ARTICLE_MAP[pack.family]!;
      const first = pack.rows[0]!;
      const meta = buildAnsPalierVariantKey({
        family: pack.family,
        articleId: targetId,
        variante: String(first.variante ?? ''),
        option_prix: String(first.option_prix ?? ''),
        artId: pack.artId,
      });
      if (!used.has(targetId)) used.set(targetId, new Set());
      let vk = meta.variantKey;
      if (used.get(targetId)!.has(vk)) vk = `${meta.variantKey}__${pack.artId.toLowerCase()}`;
      used.get(targetId)!.add(vk);

      const expectedRaw = normalizeAnsPalierTiers(pack.rows);
      const expected =
        expectedRaw.length && expectedRaw[expectedRaw.length - 1]!.maxQty != null
          ? expectedRaw.map((t, i) =>
              i === expectedRaw.length - 1 ? { ...t, maxQty: null } : t,
            )
          : expectedRaw;
      const expSig = sig(expected);
      const hasExact = byGrid.has(`${targetId}::${vk}`);
      const hasSig = articleSigs.get(targetId)?.has(expSig);
      // Défaut produit "" avec même signature = OK (dédup import)
      const defaultSig = byGrid.has(`${targetId}::`)
        ? sig(byGrid.get(`${targetId}::`)!)
        : null;
      const covered =
        hasExact
        || hasSig
        || (defaultSig === expSig && isPreferredDefaultVariant(vk, targetId))
        || defaultSig === expSig;
      if (!covered) {
        excelUncovered.push({
          articleId: targetId,
          artId: pack.artId,
          variante: `${vk} · ${String(first.variante ?? '').slice(0, 40)}`,
          sig: expSig,
        });
      }
    }
  }

  // Audit PU : ignorer grilles R/V __art-* si on vérifie contre list recto — utiliser resolveArticleVariantListPrice
  const gfPuBad: Array<{ grid: string; detail: string }> = [];
  const { resolveArticleVariantListPrice, unitPriceFromRemise } = await import(
    '../lib/pricing/prix-2026-gf-list-prices'
  );
  for (const [grid, tiers] of byGrid) {
    const [articleId, variantKey] = grid.split('::') as [string, string];
    if (!articleId.startsWith('gf-') && articleId !== 'ph-tirage' && articleId !== 'plv-rollup') {
      continue;
    }
    const list = resolveArticleVariantListPrice(
      articleId,
      variantKey,
      tiers[0]?.variantLabel ?? null,
    );
    if (list == null || list <= 0) continue;
    for (const t of tiers) {
      if (t.unitPrice == null) {
        gfPuBad.push({ grid, detail: `PU null @${t.minQty} (list ${list})` });
        continue;
      }
      const expect = unitPriceFromRemise(list, Number(t.discountPercent ?? 0));
      if (Math.abs(t.unitPrice - expect) > 1) {
        gfPuBad.push({
          grid,
          detail: `@${t.minQty} PU ${t.unitPrice} ≠ ${expect} (list ${list}, ${t.discountPercent}%)`,
        });
      }
    }
  }

  // 4) Articles mappés Excel ANS sans aucun palier (critique)
  const withTiers = new Set(all.map((t) => t.articleId));
  const mappedTargets = [...new Set(Object.values(ANS_PALIER_ARTICLE_MAP))];
  const mappedEmpty = mappedTargets.filter((id) => !withTiers.has(id));

  // Parents POS sans paliers — info seulement si hors Excel / hors seed volume
  const priorityIds = [
    ...POS_PARENT_IDS,
    ...mappedTargets,
    'evt-affiche',
  ];
  const posEmpty = [...new Set(priorityIds)].filter((id) => {
    const inCat = POS_CATALOGUE.some((c) => c.id === id) || POS_PARENT_IDS.has(id);
    return inCat && !withTiers.has(id);
  });
  const posEmptyInfo = posEmpty.filter((id) => !mappedTargets.includes(id));

  // 5) Stats
  const articles = [...new Set(all.map((t) => t.articleId))];
  console.log('=== AUDIT PALIERS GLOBAL ===\n');
  console.log('Articles avec paliers:', articles.length);
  console.log('Grilles (article×variante):', byGrid.size);
  console.log('Lignes DiscountTier:', all.length);

  console.log('\n--- 1. Chaîne min/max ---');
  if (!chainBad.length) console.log('OK — toutes les grilles enchaînées');
  else {
    console.log('ANOMALIES:', chainBad.length);
    for (const x of chainBad.slice(0, 40)) {
      console.log(' ', x.grid, '→', x.errs.join('; '));
    }
    if (chainBad.length > 40) console.log('  …', chainBad.length - 40, 'de plus');
  }

  console.log('\n--- 2. Couverture signatures Excel ANS ---');
  if (!excelUncovered.length) console.log('OK — chaque grille Excel couverte (exact ou dédup)');
  else {
    console.log('NON COUVERTES (vraies différences):', excelUncovered.length);
    for (const x of excelUncovered.slice(0, 50)) {
      console.log(`  ${x.articleId} ${x.artId} ${x.variante} → ${x.sig}`);
    }
    if (excelUncovered.length > 50) console.log('  …', excelUncovered.length - 50, 'de plus');
  }

  console.log('\n--- 3. PU grand format vs PRIX 2026 ---');
  if (!gfPuBad.length) console.log('OK — PU alignés quand list price connu');
  else {
    console.log('ÉCARTS PU:', gfPuBad.length);
    for (const x of gfPuBad.slice(0, 30)) console.log(' ', x.grid, x.detail);
  }

  console.log('\n--- 4. Articles Excel ANS sans paliers ---');
  if (!mappedEmpty.length) console.log('OK — tous les articles mappés ont une grille');
  else console.log('VIDES:', mappedEmpty.join(', '));

  console.log('\n--- 5. Autres parents POS sans paliers % (moteur dédié / hors Excel) ---');
  console.log(
    posEmptyInfo.length
      ? `INFO ${posEmptyInfo.length}: ${posEmptyInfo.join(', ')}`
      : 'OK — aucun',
  );

  // Bâche spot-check
  console.log('\n--- 6. Spot bâche ---');
  for (const vk of ['180__a4', '180__a0', '240-320__a0']) {
    const t = byGrid.get(`gf-bache::${vk}`) ?? [];
    console.log(
      vk,
      t.map((x) => `${x.minQty}-${x.maxQty ?? '∞'}:${x.unitPrice}`).join(' | ') || 'ABSENT',
    );
  }

  console.log('\n--- 7. Spot alias options GF ---');
  for (const grid of ['gf-frosted::a4__sable', 'gf-reflechissant::a4__reflechissant', 'gf-tissu::a0__tissu-drapeau']) {
    const t = byGrid.get(grid) ?? [];
    console.log(grid, t.length ? sig(t) : 'ABSENT');
  }

  const fail =
    chainBad.length > 0
    || excelUncovered.length > 0
    || gfPuBad.length > 0
    || mappedEmpty.length > 0;

  console.log('\n=== VERDICT ===', fail ? 'À CORRIGER' : 'TOUT OK');
  if (fail) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
