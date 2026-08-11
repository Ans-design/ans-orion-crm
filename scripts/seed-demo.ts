/**
 * SEC-01 — seed démo LOCAL uniquement.
 * Jamais de mot de passe hardcodé ni loggé.
 *
 * Usage local :
 *   APP_ENV=local SEED_DEMO_EMAIL=… SEED_DEMO_PASSWORD=… npx tsx scripts/seed-demo.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function assertLocalOnly() {
  const app = (process.env.APP_ENV || '').toLowerCase();
  const prodLike =
    process.env.NODE_ENV === 'production' ||
    process.env.HOSTINGER === 'true' ||
    process.env.USE_PRODUCTION_DB === 'true' ||
    app === 'production' ||
    app === 'prod' ||
    app === 'staging';
  if (prodLike && app !== 'local') {
    console.error('❌ seed-demo interdit hors environnement local.');
    process.exit(1);
  }
  if (app !== 'local' && process.env.LOCAL_DEV !== 'true' && process.env.NODE_ENV === 'production') {
    console.error('❌ seed-demo : APP_ENV=local ou LOCAL_DEV=true requis.');
    process.exit(1);
  }
}

async function main() {
  assertLocalOnly();

  const email = (process.env.SEED_DEMO_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_DEMO_PASSWORD || '';
  const name = process.env.SEED_DEMO_NAME || 'Compte Démo';

  if (!email || !email.includes('@')) {
    console.error('❌ SEED_DEMO_EMAIL requis (ex. demo@example.local).');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('❌ SEED_DEMO_PASSWORD requis (min. 12 caractères). Aucun défaut.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { password: hash, name, role: 'demo', mustChangePassword: false },
    create: {
      email,
      name,
      password: hash,
      role: 'demo',
      mustChangePassword: false,
    },
  });
  console.log(`Compte démo prêt : ${email} — mot de passe non affiché`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
