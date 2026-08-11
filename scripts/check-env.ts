/**
 * Vérifie les variables d'environnement critiques (sans afficher les secrets).
 */
const REQUIRED = ['DATABASE_URL', 'NEXTAUTH_SECRET'] as const;
const RECOMMENDED = ['NEXTAUTH_URL', 'AUTH_SECRET', 'USE_PRODUCTION_DB'] as const;

function mask(url?: string): string {
  if (!url) return 'missing';
  if (url.startsWith('postgres')) return 'postgresql://***';
  if (url.startsWith('file:')) return url;
  return 'set';
}

function main() {
  console.log('\n═══ ANS ORION — check env ═══\n');
  let ok = true;

  for (const key of REQUIRED) {
    const val = process.env[key]?.trim();
    const valid = key === 'DATABASE_URL'
      ? Boolean(val?.startsWith('postgres') || val?.startsWith('file:'))
      : Boolean(val && val.length >= 32);
    console.log(`  ${valid ? '✓' : '✗'} ${key}`);
    if (!valid) ok = false;
  }

  for (const key of RECOMMENDED) {
    const val = process.env[key]?.trim();
    console.log(`  ${val ? '✓' : '○'} ${key}${val ? '' : ' (recommandé)'}`);
  }

  console.log(`\n  DATABASE_URL = ${mask(process.env.DATABASE_URL)}`);
  console.log(`  NEXTAUTH_URL = ${process.env.NEXTAUTH_URL || 'missing'}`);
  console.log(`  NODE_ENV     = ${process.env.NODE_ENV || 'development'}`);

  if (!ok) {
    console.log('\n❌ Variables obligatoires manquantes\n');
    process.exit(1);
  }
  console.log('\n✅ Environnement OK\n');
}

main();
