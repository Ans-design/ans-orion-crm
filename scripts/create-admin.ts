/**
 * Crée ou réinitialise l'admin principal — aucun mot de passe par défaut.
 * Usage: ADMIN_EMAIL=… ADMIN_PASSWORD=… (≥12) npm run create:admin
 *
 * En production : définit mustChangePassword=true (changement obligatoire 1ʳᵉ connexion).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const name = process.env.ADMIN_NAME || 'Admin ANS';
const forceMustChange =
  process.env.ADMIN_MUST_CHANGE_PASSWORD === 'true' ||
  process.env.USE_PRODUCTION_DB === 'true' ||
  process.env.HOSTINGER === 'true' ||
  (process.env.APP_ENV || '').toLowerCase() === 'production';

const prisma = new PrismaClient();

async function main() {
  if (!email || !email.includes('@')) {
    console.error('❌ ADMIN_EMAIL requis.');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('❌ ADMIN_PASSWORD requis (min. 12 caractères). Aucun défaut faible.');
    process.exit(1);
  }
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.ORION_SEED_BOOTSTRAP_SECRET &&
    process.env.ALLOW_ADMIN_SCRIPT !== 'true'
  ) {
    console.error('❌ En production : ORION_SEED_BOOTSTRAP_SECRET ou ALLOW_ADMIN_SCRIPT=true requis.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hash,
      name,
      role: 'admin',
      mustChangePassword: forceMustChange,
    },
    create: {
      email,
      password: hash,
      name,
      role: 'admin',
      mustChangePassword: forceMustChange,
    },
  });
  console.log(`✅ Admin : ${user.email} (${user.id}) mustChangePassword=${user.mustChangePassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
