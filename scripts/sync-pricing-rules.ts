/**
 * Seed + sync + vérification cohérence règles prix (local SQLite).
 * Usage: npm run sync:pricing-rules
 */
process.env.APP_ENV = 'local';
process.env.LOCAL_DEV = 'true';
if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
  process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
}

async function main() {
  const {
    ensurePricingRulesSeeded,
    syncAllPricingRules,
    verifyPricingConsistency,
  } = await import('../lib/services/pricing-rules-sync.service');

  console.log('→ DB:', process.env.DATABASE_URL);
  console.log('→ Seed règles prix…');
  await ensurePricingRulesSeeded();
  console.log('→ Sync all…');
  const sync = await syncAllPricingRules();
  console.log('  formats:', sync.formats, 'faces:', sync.faces, 'tech:', sync.tech, 'services:', sync.services);
  console.log('  volume:', sync.volume);
  console.log('→ Vérification cohérence…');
  const v = await verifyPricingConsistency();
  for (const issue of v.issues) {
    console.log(`  [${issue.severity}] ${issue.code}: ${issue.message}`);
  }
  if (v.ok) {
    console.log('✓ Cohérence OK (warnings possibles ci-dessus)');
  } else {
    console.log('✗ Erreurs de cohérence — corriger avant prod');
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
