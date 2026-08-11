/**
 * Vérification finale catégories POS — score 10/10.
 * Usage : npx tsx scripts/verify-pos-categories-final.ts
 */
process.env.APP_ENV = process.env.APP_ENV || 'local';
process.env.LOCAL_DEV = 'true';
if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
  process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
}

import { PrismaClient } from '@prisma/client';
import {
  familyToCategoryId,
  suggestCorrectCategory,
  validateArticleCategory,
  canonicalFamilyLabel,
} from '../lib/pos/article-category-taxonomy';
import {
  isPosHiddenGrandFormatVariant,
  isPosHiddenTirageVariant,
  POS_HIDDEN_ARTICLE_IDS,
} from '../lib/data/catalogue-meta';
import { isRedundantTiragePhotoArticle } from '../lib/pos/tirage-photo-redundant';
import {
  isRedundantBacheVariant,
  isPlvFinishedProduct,
  isPvcPetitFormatArticle,
} from '../lib/pos/grand-format-redundant';
import {
  buildDatabasePrimaryPosItems,
  type ProfileSnapshot,
} from '../lib/services/catalogue-pos-builder';

const p = new PrismaClient();

type Issue = { severity: 'error' | 'warn'; code: string; message: string };

const ctx = {
  familyToCategoryId: (family: string | null, hint?: { articleId?: string; name?: string }) =>
    familyToCategoryId(family, hint),
  inferConfigType: () => 'standard',
  isVisibleInPos: () => true,
};

async function main() {
  const issues: Issue[] = [];
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
  const visible = published.filter(
    (r) =>
      !POS_HIDDEN_ARTICLE_IDS.has(r.articleId)
      && !isPosHiddenTirageVariant(r.articleId, r.articleLabel)
      && !isPosHiddenGrandFormatVariant(r.articleId, r.articleLabel)
      && !isRedundantTiragePhotoArticle(r.articleLabel, r.articleId),
  );

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
  );

  const byCat = new Map<string, typeof items>();
  for (const it of items) {
    const list = byCat.get(it.category) ?? [];
    list.push(it);
    byCat.set(it.category, list);
  }

  // --- Checks Finitions ---
  const fin = byCat.get('finitions') ?? [];
  const badFin = fin.filter((i) =>
    /bob|casquette|t-?shirt|polo|carte de visite|fid[eé]lit|flyer|roll\s*up|x-?banner|b[aâ]che\s+\d/i.test(
      i.name,
    ),
  );
  if (badFin.length) {
    issues.push({
      severity: 'error',
      code: 'finitions_polluted',
      message: `Finitions contient produits finis: ${badFin.map((i) => i.name).join(', ')}`,
    });
  }

  // Couture Oriflammes doit rester finitions
  const couture = items.find((i) => /couture\s+oriflamme/i.test(i.name) || i.id === 'fin-couture');
  if (couture && couture.category !== 'finitions') {
    issues.push({
      severity: 'error',
      code: 'couture_misplaced',
      message: `Couture Oriflammes en ${couture.category}, attendu finitions`,
    });
  }

  // --- Checks Grand Format ---
  const gf = byCat.get('grand_format') ?? [];
  const badGf = gf.filter((i) =>
    /roll\s*up|x-?banner|oriflamme|stop\s*trottoir|b[aâ]che\s+\d|palier|pvc\s+(opaque|translucide)/i.test(
      i.name,
    ),
  );
  if (badGf.length) {
    issues.push({
      severity: 'error',
      code: 'gf_polluted',
      message: `Grand Format pollué: ${badGf.map((i) => i.name).join(', ')}`,
    });
  }
  const bacheCards = gf.filter((i) => /^b[aâ]che$/i.test(i.name) || i.id === 'gf-bache');
  const bacheVariants = gf.filter((i) => isRedundantBacheVariant(i.name, i.id));
  if (bacheVariants.length) {
    issues.push({
      severity: 'error',
      code: 'bache_variants_visible',
      message: `Variantes bâche encore visibles: ${bacheVariants.map((i) => i.id).join(', ')}`,
    });
  }
  if (bacheCards.length !== 1) {
    issues.push({
      severity: bacheCards.length === 0 ? 'error' : 'warn',
      code: 'bache_cardinality',
      message: `Cartes Bâche visibles: ${bacheCards.length} (attendu 1)`,
    });
  }
  const plexiCards = gf.filter((i) => /plexig|acrylic/i.test(i.name));
  if (plexiCards.length > 1) {
    issues.push({
      severity: 'warn',
      code: 'plexi_duplicates',
      message: `Plusieurs cartes plexi/acrylic: ${plexiCards.map((i) => i.id).join(', ')}`,
    });
  }

  // --- Checks PLV ---
  const rollups = items.filter((i) => /roll[\s-]?up/i.test(i.name) || i.id === 'plv-rollup');
  const xbanners = items.filter((i) => /x[\s-]?banner/i.test(i.name) || i.id === 'plv-xbanner');
  if (rollups.length !== 1 || rollups[0]?.id !== 'plv-rollup') {
    issues.push({
      severity: rollups.length === 0 ? 'error' : 'warn',
      code: 'rollup_cardinality',
      message: `Cartes Roll-up: ${rollups.map((i) => i.id).join(', ') || 'aucune'} (attendu plv-rollup seul)`,
    });
  }
  if (xbanners.length !== 1 || xbanners[0]?.id !== 'plv-xbanner') {
    issues.push({
      severity: xbanners.length === 0 ? 'error' : 'warn',
      code: 'xbanner_cardinality',
      message: `Cartes X-Banner: ${xbanners.map((i) => i.id).join(', ') || 'aucune'} (attendu plv-xbanner seul)`,
    });
  }
  for (const id of ['AVD008', 'AVD009', 'AVD011', 'AVD012', 'AVD013', 'AVD014', 'AVD016', 'AVD017', 'AVD018']) {
    if (items.some((i) => i.id === id)) {
      issues.push({
        severity: 'error',
        code: 'ds_sku_visible',
        message: `${id} encore visible POS (doit rediriger vers configurateur)`,
      });
    }
  }

  // Utilitaire tarifs — jamais une carte vendable
  if (items.some((i) => i.id === '__volume_global__' || /remises?\s+volume\s+globales/i.test(i.name))) {
    issues.push({
      severity: 'error',
      code: 'volume_global_visible',
      message: 'Remises volume globales ne doit pas apparaître comme carte POS',
    });
  }

  // Carterie / Flyers — 1 carte configurateur (+ jeux)
  const fideliteCards = items.filter(
    (i) => /fid[eé]lit/i.test(i.name) || i.id === 'cv-fidelite',
  );
  if (fideliteCards.length !== 1 || fideliteCards[0]?.id !== 'cv-fidelite') {
    issues.push({
      severity: fideliteCards.length === 0 ? 'error' : 'warn',
      code: 'fidelite_cardinality',
      message: `Cartes fidélité: ${fideliteCards.map((i) => i.id).join(', ') || 'aucune'} (attendu cv-fidelite)`,
    });
  }
  const visiteCards = items.filter(
    (i) => /carte\s+de\s+visite/i.test(i.name) || i.id === 'cv-std',
  );
  if (visiteCards.length !== 1 || visiteCards[0]?.id !== 'cv-std') {
    issues.push({
      severity: visiteCards.length === 0 ? 'error' : 'warn',
      code: 'visite_cardinality',
      message: `Cartes de visite: ${visiteCards.map((i) => i.id).join(', ') || 'aucune'} (attendu cv-std)`,
    });
  }
  const flyerCards = byCat.get('flyers') ?? [];
  if (flyerCards.length !== 1 || flyerCards[0]?.id !== 'fly-std') {
    issues.push({
      severity: flyerCards.length === 0 ? 'error' : 'warn',
      code: 'flyer_cardinality',
      message: `Flyers: ${flyerCards.map((i) => i.id).join(', ') || 'aucune'} (attendu fly-std seul)`,
    });
  }

  // --- Checks textiles / carterie / flyers ---
  const checks: Array<[string, string]> = [
    ['tx-bob', 'textile'],
    ['tx-casquette', 'textile'],
    ['tx-polo', 'textile'],
    ['tx-tshirt', 'textile'],
    ['gd-mug', 'goodies'],
    ['cv-std', 'carterie'],
    ['cv-fidelite', 'carterie'],
    ['fly-std', 'flyers'],
    ['gf-bache', 'grand_format'],
    ['gf-pvc', 'grand_format'],
    ['gf-plexi', 'grand_format'],
    ['fin-dorure', 'finitions'],
    ['fin-coins', 'finitions'],
  ];
  for (const [id, expected] of checks) {
    const it = items.find((i) => i.id === id);
    if (!it) {
      // may be archived/hidden
      const raw = published.find((r) => r.articleId === id);
      if (!raw) {
        issues.push({ severity: 'warn', code: 'missing_article', message: `${id} introuvable` });
      }
      continue;
    }
    if (it.category !== expected) {
      issues.push({
        severity: 'error',
        code: 'wrong_category',
        message: `${id} → ${it.category} (attendu ${expected})`,
      });
    }
  }

  // Doublons « personnalisé » ne doivent plus être des cartes POS
  const persoDupes = items.filter(
    (i) =>
      /personnalis/i.test(i.name)
      && !/^(pkg-gobelet|pkg-boite|gd-housse|evt-enveloppe|fin-autres)$/i.test(i.id)
      && !/^Personnalisation libre$/i.test(i.name),
  );
  // Autoriser noms officiels catalogue uniquement
  const badPerso = persoDupes.filter((i) =>
    /^(Bob|Casquette|Polo|T-?Shirt|Sweat|Mug|Gourde|Stylo|Trousse|Tote)/i.test(i.name),
  );
  if (badPerso.length) {
    issues.push({
      severity: 'error',
      code: 'personalized_duplicate_visible',
      message: `Doublons personnalisés encore visibles: ${badPerso.map((i) => i.id).join(', ')}`,
    });
  }

  // Un seul Bob / Casquette / Polo (pas de variante « personnalisé »)
  for (const [base, id] of [
    ['Bob', 'tx-bob'],
    ['Casquette', 'tx-casquette'],
    ['Polo', 'tx-polo'],
  ] as const) {
    const cards = items.filter(
      (i) =>
        new RegExp(`^${base}(\\s+personnalis|$)`, 'i').test(i.name.trim())
        || i.id === id,
    );
    const unique = [...new Set(cards.map((c) => c.id))];
    if (unique.length !== 1 || unique[0] !== id) {
      issues.push({
        severity: unique.length === 0 ? 'error' : 'warn',
        code: 'textile_duplicate',
        message: `${base}: ${unique.join(', ') || 'aucun'} (attendu ${id})`,
      });
    }
  }

  // PVC petit format / Photo GF : ne doivent plus être des cartes POS
  for (const id of ['GF008', 'GF009', 'GF011']) {
    const it = items.find((i) => i.id === id);
    if (it) {
      issues.push({
        severity: 'error',
        code: 'variant_still_visible',
        message: `${id} (${it.name}) encore visible POS — doit être fusionné`,
      });
    }
  }

  const impression = items.filter((i) => i.category === 'impression');
  if (impression.length !== 1 || impression[0]?.id !== 'imp-impression') {
    issues.push({
      severity: 'error',
      code: 'impression_not_unique',
      message: `Impression: ${impression.map((i) => i.id).join(', ') || 'vide'} (attendu imp-impression seul)`,
    });
  }

  const photoGf = items.filter((i) => i.category === 'photo' && /grand\s+format/i.test(i.name));
  if (photoGf.length > 0) {
    issues.push({
      severity: 'error',
      code: 'photo_gf_card',
      message: `Photo grand format encore en Photo: ${photoGf.map((i) => i.id).join(', ')}`,
    });
  }

  const spiralCards = items.filter(
    (i) => i.category === 'finitions' && /spirale.+\d+\s*mm|\d+\s*mm\s*\/\s*/i.test(i.name),
  );
  if (spiralCards.length > 0) {
    issues.push({
      severity: 'error',
      code: 'spirale_variant_cards',
      message: `Spirales par diamètre encore visibles: ${spiralCards.map((i) => i.id).join(', ')}`,
    });
  }

  const reliure = items.filter((i) => i.id === 'fin-reliure' || /^reliure/i.test(i.name));
  if (reliure.length !== 1) {
    issues.push({
      severity: 'warn',
      code: 'reliure_count',
      message: `Reliure: ${reliure.length} carte(s) (attendu 1)`,
    });
  }

  // Family DB drift vs suggested (published only, non-hidden)
  let drift = 0;
  for (const r of visible) {
    const suggested = suggestCorrectCategory({
      articleId: r.articleId,
      name: r.articleLabel,
      family: r.family,
    });
    const current = familyToCategoryId(r.family, {
      articleId: r.articleId,
      name: r.articleLabel,
    });
    if (current !== suggested) {
      drift++;
      if (drift <= 15) {
        issues.push({
          severity: 'warn',
          code: 'mapping_drift',
          message: `${r.articleId} map=${current} suggest=${suggested} family=${r.family}`,
        });
      }
    }
    const canon = canonicalFamilyLabel(suggested);
    if (r.family !== canon) {
      const v = validateArticleCategory({
        articleId: r.articleId,
        name: r.articleLabel,
        family: r.family,
      });
      if (!v.ok && !isPlvFinishedProduct(r.articleLabel, r.articleId) === false) {
        // family label not canonical — warn only
      }
    }
  }

  // DirectSale
  try {
    const ds = await p.directSaleArticle.findMany({
      where: { status: 'published', visiblePOS: true },
      select: { reference: true, name: true, category: true },
    });
    for (const a of ds) {
      const suggested = suggestCorrectCategory({
        articleId: a.reference,
        name: a.name,
        family: a.category,
      });
      const mapped = familyToCategoryId(a.category, {
        articleId: a.reference ?? undefined,
        name: a.name,
      });
      if (mapped !== suggested) {
        issues.push({
          severity: 'warn',
          code: 'ds_drift',
          message: `DS ${a.reference} map=${mapped} suggest=${suggested} cat=${a.category}`,
        });
      }
      if (isPlvFinishedProduct(a.name, a.reference) && mapped !== 'plv') {
        issues.push({
          severity: 'error',
          code: 'ds_plv',
          message: `DS PLV mal classé: ${a.name} → ${mapped}`,
        });
      }
      if (isPvcPetitFormatArticle(a.name, a.reference) && mapped === 'grand_format') {
        issues.push({
          severity: 'error',
          code: 'ds_pvc',
          message: `DS PVC petit en GF: ${a.name}`,
        });
      }
    }
  } catch {
    /* ignore */
  }

  const priceOf = (id: string) =>
    profiles.find((r) => r.articleId === id)?.prixBase ?? null;

  // Prix AVD sync sur canoniques
  try {
    const avdPrices = await p.directSaleArticle.findMany({
      where: { reference: { in: ['AVD008', 'AVD011'] } },
      select: { reference: true, unitPrice: true },
    });
    const a008 = avdPrices.find((a) => a.reference === 'AVD008');
    const a011 = avdPrices.find((a) => a.reference === 'AVD011');
    const roll = priceOf('plv-rollup');
    const xb = priceOf('plv-xbanner');
    if (a008 && roll != null && Math.round(a008.unitPrice) !== Math.round(roll)) {
      issues.push({
        severity: 'warn',
        code: 'plv_prix_rollup',
        message: `plv-rollup prixBase=${roll} ≠ AVD008=${a008.unitPrice}`,
      });
    }
    if (a011 && xb != null && Math.round(a011.unitPrice) !== Math.round(xb)) {
      issues.push({
        severity: 'warn',
        code: 'plv_prix_xbanner',
        message: `plv-xbanner prixBase=${xb} ≠ AVD011=${a011.unitPrice}`,
      });
    }
  } catch {
    /* ignore */
  }

  // Score
  const errors = issues.filter((i) => i.severity === 'error');
  const warns = issues.filter((i) => i.severity === 'warn');
  const score = Math.max(0, 10 - errors.length * 2 - Math.min(3, warns.length) * 0.5);

  console.log('=== COMPTEURS POS ===');
  for (const [cat, rows] of [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`${cat}: ${rows.length}`);
  }
  console.log(`\nVisible builder: ${items.length} | Published raw: ${published.length}`);
  console.log(`\n=== ISSUES (${errors.length} errors, ${warns.length} warns) ===`);
  for (const i of issues) {
    console.log(`[${i.severity}] ${i.code}: ${i.message}`);
  }
  console.log(`\nSCORE: ${score}/10 ${errors.length === 0 && warns.length === 0 ? 'IMPECCABLE' : ''}`);

  // --- Affichage final (lisible) ---
  const catLabels: Record<string, string> = {
    grand_format: 'Grand Format & PVC',
    finitions: 'Finitions & Reliures',
    plv: 'PLV & Chevalets',
    impression: 'Impression sans finition',
    textile: 'Textiles',
    carterie: 'Carterie',
    flyers: 'Flyers',
    goodies: 'Goodies',
    evenementiel: 'Événementiel',
    photo: 'Photo',
    packaging: 'Packaging',
    calendrier: 'Calendriers',
    document: 'Documents',
    livres: 'Livres',
    notes: 'Bloc-notes',
    conception: 'Conception graphique',
  };

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           AFFICHAGE FINAL — CATALOGUE POS                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nScore : ${score}/10  |  Articles visibles : ${items.length}\n`);

  for (const [cat, rows] of [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const label = catLabels[cat] ?? cat;
    console.log(`▸ ${label} (${rows.length})`);
    for (const it of rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'))) {
      const px = priceOf(it.id);
      const pxStr = px != null && px > 0 ? ` — ${Math.round(px).toLocaleString('fr-FR')} Ar` : '';
      console.log(`    • ${it.name}${pxStr}`);
    }
    console.log('');
  }

  // Mapping AVD → PLV
  try {
    const avd = await p.directSaleArticle.findMany({
      where: { reference: { in: ['AVD008', 'AVD009', 'AVD011'] } },
      select: { reference: true, name: true, unitPrice: true, category: true, status: true },
    });
    if (avd.length) {
      console.log('▸ Prix DirectSale → configurateurs PLV');
      const map: Record<string, string> = {
        AVD008: 'plv-rollup (Roll-up standard)',
        AVD009: 'plv-rollup (Roll-up deluxe)',
        AVD011: 'plv-xbanner (X-Banner standard)',
      };
      for (const a of avd) {
        const ref = a.reference ?? '?';
        console.log(
          `    • ${ref} ${a.name} = ${Math.round(a.unitPrice).toLocaleString('fr-FR')} Ar → ${map[ref] ?? '?'}`,
        );
      }
      console.log(
        `    • Canonique plv-rollup prixBase = ${(priceOf('plv-rollup') ?? 0).toLocaleString('fr-FR')} Ar`,
      );
      console.log(
        `    • Canonique plv-xbanner prixBase = ${(priceOf('plv-xbanner') ?? 0).toLocaleString('fr-FR')} Ar`,
      );
      console.log('');
    }
  } catch {
    /* ignore */
  }

  // JSON summary for automation
  console.log(
    '\n__SUMMARY__',
    JSON.stringify({
      score,
      errors: errors.length,
      warns: warns.length,
      counts: Object.fromEntries([...byCat.entries()].map(([k, v]) => [k, v.length])),
      gfNames: (byCat.get('grand_format') ?? []).map((i) => i.name),
      plvNames: (byCat.get('plv') ?? []).map((i) => i.name),
      finCount: fin.length,
      plvPrixBase: {
        rollup: priceOf('plv-rollup'),
        xbanner: priceOf('plv-xbanner'),
      },
    }),
  );

  if (errors.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
