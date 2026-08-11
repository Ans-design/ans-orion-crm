/**
 * Import Excel ANS_PALIERS_REMISE → DiscountTier (toutes variantes).
 * Usage: npx tsx scripts/import-ans-paliers-remise.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { PrismaClient } from '@prisma/client';
import {
  ANS_PALIER_ARTICLE_MAP,
  ANS_PALIER_SKIP_FAMILIES,
  buildAnsPalierVariantKey,
  isPreferredDefaultVariant,
  normalizeAnsPalierTiers,
} from '../lib/pricing/ans-palier-remise-map';
import {
  listPriceForGfVariant,
  unitPriceFromRemise,
} from '../lib/pricing/prix-2026-gf-list-prices';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const fileArgIdx = process.argv.indexOf('--file');
const excelPath =
  (fileArgIdx >= 0 ? process.argv[fileArgIdx + 1] : null)
  || join(process.cwd(), 'data', 'references', 'ANS_PALIERS_REMISE_SIMPLE_CURSOR.xlsx');

if (!existsSync(excelPath)) {
  console.error('Fichier introuvable:', excelPath);
  process.exit(1);
}

const absDb = join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
process.env.APP_ENV = 'local';
process.env.DATABASE_URL = `file:${absDb}`;

const prisma = new PrismaClient();

type TierRow = {
  minQty: number;
  maxQty: number | null;
  discountPercent: number;
  unitPrice?: number | null;
};

function chainMins(rows: TierRow[]): TierRow[] {
  if (rows.length <= 1) return rows.map((r) => ({ ...r }));
  const next = rows.map((r) => ({ ...r }));
  for (let i = 1; i < next.length; i++) {
    const prev = next[i - 1]!;
    if (prev.maxQty != null && Number.isFinite(prev.maxQty) && prev.maxQty >= 0.01) {
      const step = Number.isInteger(prev.maxQty) && prev.maxQty >= 1 ? 1 : 0.01;
      next[i]!.minQty = Math.round((prev.maxQty + step) * 1000) / 1000;
      if (next[i]!.maxQty != null && next[i]!.maxQty! < next[i]!.minQty) {
        next[i]!.maxQty = next[i]!.minQty;
      }
    }
  }
  for (let i = 0; i < next.length - 1; i++) {
    const cur = next[i]!;
    const fol = next[i + 1]!;
    if (cur.maxQty == null || cur.maxQty >= fol.minQty) {
      const step = Number.isInteger(fol.minQty) && fol.minQty >= 1 ? 1 : 0.01;
      cur.maxQty = Math.round((fol.minQty - step) * 1000) / 1000;
      if (cur.maxQty < cur.minQty) cur.maxQty = cur.minQty;
    }
  }
  return next;
}

async function ensureProfile(articleId: string, label: string) {
  const existing = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  if (existing) return existing;
  return prisma.articlePricingProfile.create({
    data: {
      articleId,
      articleLabel: label,
      family: 'Import paliers',
      calculationType: 'dynamic',
      saleUnit: 'pièce',
      status: 'draft',
      active: true,
      source: 'ans-paliers-remise-import',
    },
  });
}

async function replaceVariantTiers(
  articleId: string,
  variantKey: string,
  variantLabel: string,
  tiers: TierRow[],
) {
  await prisma.$transaction(async (tx) => {
    await tx.discountTier.deleteMany({ where: { articleId, variantKey } });
    for (const t of tiers) {
      await tx.discountTier.create({
        data: {
          articleId,
          variantKey,
          variantLabel,
          minQty: t.minQty,
          maxQty: t.maxQty,
          unitPrice: t.unitPrice ?? null,
          discountPercent: t.discountPercent,
          active: true,
          source: 'ans-paliers-remise-excel',
        },
      });
    }
  });
}

/** Sync TextileDiscountTier % pour que le moteur textile consomme la même grille. */
async function syncTextileTiers(articleId: string, tiers: TierRow[], variantKey: string) {
  if (!articleId.startsWith('tx-')) return;
  // Ne synchroniser que la grille défaut / avec-support (évite doublons qtyMin)
  if (!isPreferredDefaultVariant(variantKey, articleId) && variantKey !== 'avec-support') {
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.textileDiscountTier.updateMany({
      where: { articleId, deletedAt: null },
      data: { deletedAt: new Date(), active: false },
    });
    let sort = 0;
    for (const t of tiers) {
      await tx.textileDiscountTier.create({
        data: {
          articleId,
          qtyMin: t.minQty,
          qtyMax: t.maxQty,
          typeRemise: 'percent',
          valeurRemise: Math.round(t.discountPercent),
          active: true,
          status: 'published',
          sortOrder: sort++,
          details: JSON.stringify({ variantKey, source: 'ans-paliers-remise-excel' }),
        },
      });
    }
  });
}

type Pack = {
  family: string;
  artId: string;
  targetId: string;
  variantKey: string;
  variantLabel: string;
  isDefault: boolean;
  rows: Array<Record<string, unknown>>;
};

async function main() {
  const wb = XLSX.read(readFileSync(excelPath), { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Array<Record<string, unknown>>;
  console.log('Lignes Excel:', rows.length);

  // Grouper par (family, artId)
  const byArt = new Map<string, { family: string; artId: string; rows: typeof rows }>();
  for (const r of rows) {
    const family = String(r.article ?? '').trim();
    const artId = String(r.article_id ?? '').trim();
    if (!family || !artId) continue;
    if (ANS_PALIER_SKIP_FAMILIES.has(family)) continue;
    const targetId = ANS_PALIER_ARTICLE_MAP[family];
    if (!targetId) continue;
    const k = `${family}||${artId}`;
    if (!byArt.has(k)) byArt.set(k, { family, artId, rows: [] });
    byArt.get(k)!.rows.push(r);
  }

  // Construire packs avec variantKey ; désambiguïser collisions
  const packs: Pack[] = [];
  const usedKeys = new Map<string, Set<string>>(); // targetId → set of variantKeys

  const artEntries = [...byArt.entries()].sort((a, b) => a[1].artId.localeCompare(b[1].artId));
  for (const [, pack] of artEntries) {
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
    if (used.has(vk)) {
      vk = `${meta.variantKey}__${pack.artId.toLowerCase()}`;
      meta = { ...meta, variantKey: vk, isDefault: false };
    }
    used.add(vk);

    // Marquer default : premier ART préféré pour la clé « canonique »
    const isDefault = meta.isDefault && ![...used].some((k) => {
      // already claimed a preferred default without art suffix
      return isPreferredDefaultVariant(k, targetId) && !k.includes('art-');
    });

    packs.push({
      family: pack.family,
      artId: pack.artId,
      targetId,
      variantKey: vk,
      variantLabel: meta.variantLabel,
      isDefault: Boolean(isDefault || meta.isDefault),
      rows: pack.rows,
    });
  }

  // Grille fallback : ART preferred par article
  const defaultByArticle = new Map<string, Pack>();
  for (const p of packs) {
    const baseKey = p.variantKey.replace(/__art-[a-z0-9-]+$/i, '');
    if (!isPreferredDefaultVariant(baseKey, p.targetId)) continue;
    const prev = defaultByArticle.get(p.targetId);
    if (!prev || p.artId < prev.artId) defaultByArticle.set(p.targetId, p);
  }
  for (const articleId of new Set(packs.map((p) => p.targetId))) {
    if (defaultByArticle.has(articleId)) continue;
    const candidates = packs
      .filter((p) => p.targetId === articleId)
      .sort((a, b) => a.artId.localeCompare(b.artId));
    if (candidates[0]) defaultByArticle.set(articleId, candidates[0]);
  }

  type PackWithTiers = Pack & { tiers: TierRow[] };
  const enriched: PackWithTiers[] = [];
  for (const pack of packs) {
    let tiers = chainMins(normalizeAnsPalierTiers(pack.rows)).map((t) => {
      const list = listPriceForGfVariant(pack.family, pack.variantKey);
      if (list == null || list <= 0) return { ...t, unitPrice: null as number | null };
      return {
        ...t,
        unitPrice: unitPriceFromRemise(list, t.discountPercent),
      };
    });
    // Dernière bande ouverte (Excel ferme souvent à 200 — volume illimité en atelier)
    if (tiers.length) {
      const last = tiers[tiers.length - 1]!;
      if (last.maxQty != null) {
        tiers = tiers.map((t, i) => (i === tiers.length - 1 ? { ...t, maxQty: null } : t));
      }
    }
    if (!tiers.length) continue;
    enriched.push({ ...pack, tiers });
  }

  const tierSig = (tiers: TierRow[]) =>
    tiers.map((t) => `${t.minQty}-${t.maxQty ?? '∞'}:${t.discountPercent}`).join('|');

  // Une grille « canonique » par signature (évite 17× la même reliure)
  const uniquePacks: PackWithTiers[] = [];
  const sigOwner = new Map<string, PackWithTiers>();
  for (const pack of enriched.sort((a, b) => a.artId.localeCompare(b.artId))) {
    const k = `${pack.targetId}::${tierSig(pack.tiers)}`;
    const prev = sigOwner.get(k);
    if (!prev) {
      sigOwner.set(k, pack);
      uniquePacks.push(pack);
      continue;
    }
    const prevPref = isPreferredDefaultVariant(prev.variantKey, prev.targetId);
    const curPref = isPreferredDefaultVariant(pack.variantKey, pack.targetId);
    if ((!prevPref && curPref) || (prevPref === curPref && pack.artId < prev.artId)) {
      const idx = uniquePacks.indexOf(prev);
      if (idx >= 0) uniquePacks[idx] = pack;
      sigOwner.set(k, pack);
    }
  }

  const sigCountByArticle = new Map<string, number>();
  for (const p of uniquePacks) {
    sigCountByArticle.set(p.targetId, (sigCountByArticle.get(p.targetId) ?? 0) + 1);
  }
  // Une seule signature → uniquement variantKey ""
  const packsToWrite: PackWithTiers[] = uniquePacks.map((p) => {
    if ((sigCountByArticle.get(p.targetId) ?? 0) <= 1) {
      return { ...p, variantKey: '', variantLabel: 'Défaut produit', isDefault: true };
    }
    return p;
  });

  // Alias : même remises, autre option (sable / réfléchissant…) — pas de suffixe __art-*
  const skipAliasArticles = new Set([
    'fin-reliure',
    'fin-collage',
    'fin-pelliculage',
    'fin-plastification',
  ]);
  const writtenKeys = new Set(packsToWrite.map((p) => `${p.targetId}::${p.variantKey}`));
  let aliasCount = 0;
  for (const pack of enriched) {
    if (skipAliasArticles.has(pack.targetId)) continue;
    // Ne jamais réintroduire les clés techniques __art-xxxx (redondance / confusion UI)
    if (/__art-[a-z0-9-]+$/i.test(pack.variantKey)) continue;
    const key = `${pack.targetId}::${pack.variantKey}`;
    if (!pack.variantKey || writtenKeys.has(key)) continue;
    const owner = sigOwner.get(`${pack.targetId}::${tierSig(pack.tiers)}`);
    if (!owner) continue;
    packsToWrite.push({
      ...pack,
      tiers: owner.tiers.map((t) => ({ ...t })),
      isDefault: false,
    });
    writtenKeys.add(key);
    aliasCount += 1;
  }

  let ok = 0;
  let fail = 0;
  let variantCount = 0;
  const skippedDup = enriched.length - uniquePacks.length;

  const articles = new Set(packsToWrite.map((p) => p.targetId));
  for (const articleId of articles) {
    await ensureProfile(
      articleId,
      packsToWrite.find((p) => p.targetId === articleId)?.family ?? articleId,
    );
    await prisma.discountTier.deleteMany({ where: { articleId } });
  }

  const writtenDefault = new Set<string>();
  for (const pack of packsToWrite) {
    try {
      await replaceVariantTiers(pack.targetId, pack.variantKey, pack.variantLabel, pack.tiers);
      variantCount += 1;
      ok += 1;
      console.log(
        'OK',
        pack.targetId,
        pack.variantKey || '(défaut)',
        '←',
        pack.artId,
        '|',
        pack.tiers.map((t) => `${t.minQty}-${t.maxQty ?? '∞'}:${t.discountPercent}%`).join(', '),
      );

      if (pack.variantKey === '') {
        writtenDefault.add(pack.targetId);
        await syncTextileTiers(pack.targetId, pack.tiers, 'avec-support');
      } else if (
        !writtenDefault.has(pack.targetId)
        && (defaultByArticle.get(pack.targetId)?.artId === pack.artId
          || isPreferredDefaultVariant(pack.variantKey, pack.targetId))
      ) {
        await replaceVariantTiers(
          pack.targetId,
          '',
          `${pack.variantLabel} (défaut)`,
          pack.tiers,
        );
        writtenDefault.add(pack.targetId);
        await syncTextileTiers(pack.targetId, pack.tiers, pack.variantKey);
      }
    } catch (e) {
      fail += 1;
      console.error('FAIL', pack.targetId, pack.variantKey, e instanceof Error ? e.message : e);
    }
  }

  const reliure = packsToWrite.find((p) => p.targetId === 'fin-reliure');
  if (reliure) {
    for (const articleId of ['__volume_global__', 'imp-impression'] as const) {
      await ensureProfile(
        articleId,
        articleId === '__volume_global__' ? 'Remises volume globales' : 'Impression sans finition',
      );
      await prisma.discountTier.deleteMany({ where: { articleId } });
      await replaceVariantTiers(articleId, '', 'Volume standard', reliure.tiers);
      console.log('OK', articleId, '← reliure volume');
      ok += 1;
    }
  }

  console.log({
    ok,
    fail,
    variantCount,
    skippedDup,
    aliasCount,
    articles: articles.size,
    tierCount: await prisma.discountTier.count(),
    withTiers: await prisma.articlePricingProfile.count({
      where: { discountTiers: { some: {} } },
    }),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
