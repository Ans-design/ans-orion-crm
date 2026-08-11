/**
 * Diagnostic PRX-01 — surface legacy Excel encore importable.
 * Usage: npx tsx scripts/diagnose-prx-legacy.ts
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { readdirSync, statSync } from 'fs';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

async function main() {
  const { isPrix2026LegacyEnabled } = await import('../lib/pricing/prix-2026-legacy');
  const { isStrictPosPricing } = await import('../lib/pos/pos-price-policy');
  const { articleHasPrix2026Grid } = await import('../lib/data/prix-2026-grids');

  const gridDir = resolve(process.cwd(), 'lib/data/prix-2026-grids');
  const files = readdirSync(gridDir).filter((f) => f.endsWith('.ts'));
  let bytes = 0;
  for (const f of files) bytes += statSync(resolve(gridDir, f)).size;

  const sample = ['gd-mug', 'plv-rollup', 'cv-std', 'fly-std', 'tx-tshirt', 'gf-vinyl-blanc'];
  const sampleHits = Object.fromEntries(sample.map((id) => [id, articleHasPrix2026Grid(id)]));

  const report = {
    USE_PRIX_2026_LEGACY: process.env.USE_PRIX_2026_LEGACY ?? null,
    STRICT_POS_PRICING: process.env.STRICT_POS_PRICING ?? null,
    NODE_ENV: process.env.NODE_ENV ?? null,
    APP_ENV: process.env.APP_ENV ?? null,
    isPrix2026LegacyEnabled: isPrix2026LegacyEnabled(),
    isStrictPosPricing: isStrictPosPricing(),
    archiveFiles: files.length,
    archiveBytesApprox: bytes,
    sampleHasGrid: sampleHits,
    note: 'Archives conservées (zéro suppression) ; runtime gated hors legacy local',
  };

  console.log(JSON.stringify(report, null, 2));
  if (isPrix2026LegacyEnabled() && isStrictPosPricing()) {
    console.error('❌ Incohérent : legacy ON + STRICT ON');
    process.exit(1);
  }
  console.log('✅ Diagnostic PRX OK (legacy désactivé en STRICT/prod)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
