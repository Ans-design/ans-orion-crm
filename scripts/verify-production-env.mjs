/**
 * Vérifie la configuration production (Neon + Resend + R2).
 * Usage: node scripts/verify-production-env.mjs
 */
const checks = [
  {
    name: 'DATABASE_URL PostgreSQL',
    ok: () => process.env.DATABASE_URL?.startsWith('postgres'),
    hint: 'postgresql://user:pass@host/db?sslmode=require',
  },
  {
    name: 'NEXTAUTH_SECRET (32+ chars)',
    ok: () => (process.env.NEXTAUTH_SECRET?.length ?? 0) >= 32,
    hint: 'openssl rand -base64 32',
  },
  {
    name: 'NEXTAUTH_URL production',
    ok: () => Boolean(process.env.NEXTAUTH_URL?.startsWith('https://')),
    hint: 'https://votre-domaine.vercel.app',
  },
  {
    name: 'DEMO_MODE désactivé',
    ok: () => process.env.DEMO_MODE !== 'true',
    hint: 'Retirer DEMO_MODE ou DEMO_MODE=false',
  },
  {
    name: 'Resend (email)',
    ok: () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    hint: 'RESEND_API_KEY + EMAIL_FROM=ORION <alert@domaine.mg>',
    optional: true,
  },
  {
    name: 'S3/R2 (GED fichiers)',
    ok: () => Boolean(
      process.env.S3_BUCKET
      && process.env.S3_ACCESS_KEY_ID
      && process.env.S3_SECRET_ACCESS_KEY,
    ),
    hint: 'S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT (R2)',
    optional: true,
  },
];

let failed = 0;
let warned = 0;

console.log('\n🔍 Vérification environnement production ANS ORION\n');

for (const c of checks) {
  const pass = c.ok();
  if (pass) {
    console.log(`  ✅ ${c.name}`);
  } else if (c.optional) {
    console.log(`  ⚠️  ${c.name} — optionnel (${c.hint})`);
    warned++;
  } else {
    console.log(`  ❌ ${c.name} — ${c.hint}`);
    failed++;
  }
}

console.log('');
if (failed) {
  console.log(`❌ ${failed} variable(s) obligatoire(s) manquante(s).`);
  process.exit(1);
}
console.log(`✅ Configuration production OK${warned ? ` (${warned} optionnel(s) non configuré(s))` : ''}.`);
console.log('\nÉtapes suivantes :');
console.log('  1. npm run db:prod-setup   # init Neon (une fois)');
console.log('  2. npx vercel --prod       # déployer sans DEMO_MODE');
console.log('');
