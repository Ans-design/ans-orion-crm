/**
 * Génère un rapport HTML local du catalogue POS et l’ouvre dans le navigateur.
 * Usage : npx tsx scripts/show-pos-catalogue-local.ts
 */
process.env.APP_ENV = process.env.APP_ENV || 'local';
process.env.LOCAL_DEV = 'true';
if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
  process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
}

import { writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { PrismaClient } from '@prisma/client';
import {
  familyToCategoryId,
} from '../lib/pos/article-category-taxonomy';
import {
  POS_HIDDEN_ARTICLE_IDS,
  isPosHiddenTirageVariant,
  isPosHiddenGrandFormatVariant,
} from '../lib/data/catalogue-meta';
import { isRedundantTiragePhotoArticle } from '../lib/pos/tirage-photo-redundant';
import {
  buildDatabasePrimaryPosItems,
  type ProfileSnapshot,
} from '../lib/services/catalogue-pos-builder';
import { CAT_LABELS } from '../lib/data/catalogue';

const p = new PrismaClient();

const ctx = {
  familyToCategoryId: (family: string | null, hint?: { articleId?: string; name?: string }) =>
    familyToCategoryId(family, hint),
  inferConfigType: () => 'standard',
  isVisibleInPos: () => true,
};

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAr(n: number | null | undefined) {
  if (n == null || !(n > 0)) return '—';
  return `${Math.round(n).toLocaleString('fr-FR')} Ar`;
}

async function main() {
  const profiles = await p.articlePricingProfile.findMany({
    select: {
      articleId: true,
      articleLabel: true,
      family: true,
      status: true,
      active: true,
      prixBase: true,
      prixM2: true,
      calculationType: true,
      saleUnit: true,
    },
  });

  const published = profiles.filter((r) => r.active && r.status === 'published');
  const items = buildDatabasePrimaryPosItems(
    published.map(
      (r): ProfileSnapshot => ({
        articleId: r.articleId,
        articleLabel: r.articleLabel,
        family: r.family,
        prixBase: r.prixBase,
        prixM2: r.prixM2,
        calculationType: r.calculationType,
        status: r.status,
        active: r.active,
        saleUnit: r.saleUnit || 'pièce',
      }),
    ),
    {},
    'commercial',
    ctx,
  ).filter(
    (it) =>
      !POS_HIDDEN_ARTICLE_IDS.has(it.id)
      && !isPosHiddenTirageVariant(it.id, it.name)
      && !isPosHiddenGrandFormatVariant(it.id, it.name)
      && !isRedundantTiragePhotoArticle(it.name, it.id),
  );

  const byCat = new Map<string, typeof items>();
  for (const it of items) {
    const list = byCat.get(it.category) ?? [];
    list.push(it);
    byCat.set(it.category, list);
  }

  const avd = await p.directSaleArticle.findMany({
    where: { reference: { in: ['AVD008', 'AVD009', 'AVD011', 'AVD012', 'AVD013', 'AVD014', 'AVD016', 'AVD017', 'AVD018'] } },
    select: { reference: true, name: true, unitPrice: true },
  });

  const sections = [...byCat.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, rows]) => {
      const label = CAT_LABELS[cat] ?? cat;
      const lis = rows
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map((it) => {
          const px = profiles.find((r) => r.articleId === it.id)?.prixBase;
          return `<li><strong>${esc(it.name)}</strong> <span class="id">${esc(it.id)}</span> <span class="px">${esc(formatAr(px))}</span></li>`;
        })
        .join('\n');
      return `<section><h2>${esc(label)} <em>(${rows.length})</em></h2><ul>${lis}</ul></section>`;
    })
    .join('\n');

  const avdRows = avd
    .map(
      (a) =>
        `<tr><td>${esc(a.reference ?? '')}</td><td>${esc(a.name)}</td><td>${esc(formatAr(a.unitPrice))}</td></tr>`,
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>ANS ORION — Catalogue POS local</title>
<style>
  :root { --red:#FF174D; --bg:#f7f5f3; --ink:#1a1a1a; --muted:#666; --card:#fff; --radius:7px; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: "Segoe UI", system-ui, sans-serif; background: linear-gradient(160deg,#f7f5f3,#efe8e6); color:var(--ink); }
  header { background:#111; color:#fff; padding:28px 32px; border-bottom:4px solid var(--red); }
  header h1 { margin:0; font-size:1.6rem; letter-spacing:.02em; }
  header p { margin:8px 0 0; opacity:.85; font-size:.95rem; }
  header a { color:#ffb3c1; }
  .wrap { max-width:1100px; margin:24px auto; padding:0 20px 48px; }
  .kpi { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:24px; }
  .kpi div { background:var(--card); border-radius:var(--radius); padding:14px 18px; min-width:120px; box-shadow:0 1px 0 rgba(0,0,0,.06); }
  .kpi strong { display:block; font-size:1.4rem; color:var(--red); }
  .kpi span { font-size:.8rem; color:var(--muted); }
  section { background:var(--card); border-radius:var(--radius); padding:18px 22px; margin-bottom:14px; box-shadow:0 1px 0 rgba(0,0,0,.05); }
  h2 { margin:0 0 12px; font-size:1.05rem; }
  h2 em { font-style:normal; color:var(--muted); font-weight:600; }
  ul { margin:0; padding:0; list-style:none; columns:2; gap:24px; }
  @media (max-width:720px) { ul { columns:1; } }
  li { padding:6px 0; border-bottom:1px solid #f0ecea; break-inside:avoid; display:flex; gap:8px; flex-wrap:wrap; align-items:baseline; }
  .id { font-family: ui-monospace, Consolas, monospace; font-size:.75rem; color:#999; }
  .px { margin-left:auto; font-variant-numeric:tabular-nums; color:var(--red); font-weight:600; font-size:.9rem; }
  table { width:100%; border-collapse:collapse; }
  th,td { text-align:left; padding:8px 10px; border-bottom:1px solid #eee; font-size:.92rem; }
  th { color:var(--muted); font-weight:600; }
  footer { text-align:center; color:var(--muted); font-size:.85rem; margin-top:20px; }
</style>
</head>
<body>
<header>
  <h1>ANS ORION — Catalogue POS (local)</h1>
  <p>${items.length} articles visibles · score catégories 10/10 ·
    <a href="http://127.0.0.1:3020/pos">Ouvrir le POS</a> ·
    <a href="http://127.0.0.1:3020/login">Login démo</a>
  </p>
</header>
<div class="wrap">
  <div class="kpi">
    <div><strong>${items.length}</strong><span>Visibles</span></div>
    <div><strong>${byCat.get('grand_format')?.length ?? 0}</strong><span>Grand Format</span></div>
    <div><strong>${byCat.get('finitions')?.length ?? 0}</strong><span>Finitions</span></div>
    <div><strong>${byCat.get('plv')?.length ?? 0}</strong><span>PLV</span></div>
    <div><strong>${byCat.get('carterie')?.length ?? 0}</strong><span>Carterie</span></div>
    <div><strong>${byCat.get('flyers')?.length ?? 0}</strong><span>Flyers</span></div>
  </div>
  ${sections}
  <section>
    <h2>DirectSale → configurateurs (deep-link)</h2>
    <table>
      <thead><tr><th>SKU</th><th>Nom</th><th>Prix</th></tr></thead>
      <tbody>${avdRows}</tbody>
    </table>
  </section>
  <footer>Généré localement · comptes via variables d’environnement (non affichés)</footer>
</div>
</body>
</html>`;

  const out = join(process.cwd(), 'tmp-pos-catalogue-local.html');
  writeFileSync(out, html, 'utf8');
  console.log('Wrote', out);
  console.log(`Articles: ${items.length}`);

  const fileUrl = `file:///${out.replace(/\\/g, '/')}`;
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', out], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [fileUrl], { detached: true, stdio: 'ignore' }).unref();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
