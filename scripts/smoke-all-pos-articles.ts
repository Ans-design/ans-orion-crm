/**
 * Smoke : calcule le prix pour les ~95 articles POS (config défaut / pilote).
 * Usage: npx tsx --require dotenv/config scripts/smoke-all-pos-articles.ts
 */
import 'dotenv/config';
import { patchPostgresSchema, restorePostgresSchema } from './lib/postgres-prisma-patch';
import { POS_CATALOGUE } from '../lib/data/catalogue-meta';
import { getProductConfig } from '../lib/data/config-types';
import { resolveMigrationPilotConfig } from '../lib/pricing/migration-pilot-configs';
import { articleHasDedicatedPricingEngine } from '../lib/pos/pos-price-policy';

type Row = {
  id: string;
  name: string;
  category: string;
  hasConfig: boolean;
  dedicated: boolean;
  status: 'ok' | 'sur_devis' | 'zero' | 'error' | 'no_config';
  unit: number;
  total: number;
  source: string;
  error?: string;
};

async function main() {
  process.env.APP_ENV = process.env.APP_ENV ?? 'local';
  process.env.LOCAL_DEV = process.env.LOCAL_DEV ?? 'true';
  if (!process.env.DATABASE_URL?.trim().startsWith('file:') && !process.env.DATABASE_URL?.trim().startsWith('postgres')) {
    process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
  }

  const url = process.env.DATABASE_URL ?? '';
  const usePostgres = url.startsWith('postgres');
  if (usePostgres) patchPostgresSchema();

  const { calculatePrice } = await import('../lib/pricing/calculate');

  const rows: Row[] = [];

  for (const art of POS_CATALOGUE) {
    const productConfig = getProductConfig(art.id, art.configType);
    const dedicated = articleHasDedicatedPricingEngine(art.id);
    if (!productConfig && !dedicated) {
      rows.push({
        id: art.id,
        name: art.name,
        category: art.category,
        hasConfig: false,
        dedicated,
        status: 'no_config',
        unit: 0,
        total: 0,
        source: '',
      });
      continue;
    }

    const config = resolveMigrationPilotConfig(art.id);
    const qty = Number(config.qty ?? config.quantite ?? 1) || 1;

    try {
      const result = await calculatePrice(art.id, config, { qty });
      const unit = result?.prixUnitaire ?? 0;
      const total = result?.totalHT ?? result?.sousTotal ?? 0;
      const source = String((result?.snapshot as Record<string, unknown> | undefined)?.priceSource ?? result?.formulaApplied ?? '');
      const surDevis = Boolean(result?.surDevis) || /sur.?devis/i.test(source);

      let status: Row['status'] = 'ok';
      if (surDevis) status = 'sur_devis';
      else if (!(unit > 0) && !(total > 0)) status = 'zero';

      rows.push({
        id: art.id,
        name: art.name,
        category: art.category,
        hasConfig: Boolean(productConfig),
        dedicated,
        status,
        unit,
        total,
        source,
      });
    } catch (e) {
      rows.push({
        id: art.id,
        name: art.name,
        category: art.category,
        hasConfig: Boolean(productConfig),
        dedicated,
        status: 'error',
        unit: 0,
        total: 0,
        source: '',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const ok = rows.filter((r) => r.status === 'ok');
  const sur = rows.filter((r) => r.status === 'sur_devis');
  const zero = rows.filter((r) => r.status === 'zero');
  const err = rows.filter((r) => r.status === 'error');
  const noCfg = rows.filter((r) => r.status === 'no_config');

  console.log('\n════════════════════════════════════════');
  console.log(`  SMOKE PRIX — ${POS_CATALOGUE.length} articles POS`);
  console.log('════════════════════════════════════════\n');
  console.log(`  ✅ Calculables     : ${ok.length}`);
  console.log(`  📋 Sur devis       : ${sur.length}`);
  console.log(`  ⚠️  Prix = 0        : ${zero.length}`);
  console.log(`  ❌ Erreurs         : ${err.length}`);
  console.log(`  🧩 Sans config     : ${noCfg.length}`);

  const byCat = new Map<string, { total: number; ok: number; bad: number }>();
  for (const r of rows) {
    const cur = byCat.get(r.category) ?? { total: 0, ok: 0, bad: 0 };
    cur.total += 1;
    if (r.status === 'ok' || r.status === 'sur_devis') cur.ok += 1;
    else cur.bad += 1;
    byCat.set(r.category, cur);
  }
  console.log('\n  Par catégorie :');
  for (const [cat, s] of [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`    ${cat.padEnd(16)} ${String(s.ok).padStart(2)}/${s.total}${s.bad ? `  (${s.bad} KO)` : ''}`);
  }

  if (err.length) {
    console.log('\n❌ Erreurs :');
    for (const r of err) console.log(`  - ${r.id} (${r.name}): ${r.error}`);
  }
  if (noCfg.length) {
    console.log('\n🧩 Sans productConfig :');
    for (const r of noCfg) console.log(`  - ${r.id} (${r.name})`);
  }
  if (zero.length) {
    console.log('\n⚠️  Prix zéro (config défaut insuffisante ou tarif manquant) :');
    for (const r of zero) {
      console.log(`  - ${r.id} (${r.name}) [${r.category}] src=${r.source || '—'} dedicated=${r.dedicated}`);
    }
  }
  if (sur.length) {
    console.log('\n📋 Sur devis (attendu pour certains) :');
    for (const r of sur.slice(0, 20)) console.log(`  - ${r.id} (${r.name})`);
    if (sur.length > 20) console.log(`  … +${sur.length - 20}`);
  }

  // Sortie machine
  const outPath = 'reports/smoke-all-pos-articles.json';
  try {
    const { mkdirSync, writeFileSync } = await import('fs');
    mkdirSync('reports', { recursive: true });
    writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), summary: {
      total: rows.length, ok: ok.length, sur_devis: sur.length, zero: zero.length, error: err.length, no_config: noCfg.length,
    }, rows }, null, 2));
    console.log(`\n📄 Rapport : ${outPath}`);
  } catch {
    /* ignore */
  }

  // Critères : 95 articles, 0 erreur runtime, 0 sans config (sauf dedicated accepté via moteur)
  const hardFail = err.length > 0 || noCfg.length > 0;
  if (hardFail) {
    console.log('\n❌ ÉCHEC — bugs bloquants (erreurs ou configs manquantes)');
    process.exit(1);
  }
  if (zero.length > Math.ceil(rows.length * 0.25)) {
    console.log(`\n⚠️  ATTENTION — ${zero.length} articles à prix 0 (>25%)`);
    process.exit(2);
  }
  console.log('\n✅ Smoke OK — aucun crash, configs présentes');
  process.exit(0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      restorePostgresSchema();
    } catch {
      /* ignore */
    }
  });
