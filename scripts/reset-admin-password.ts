/**
 * Réinitialise le mot de passe admin — aucun défaut faible.
 * Usage: ADMIN_EMAIL=… ADMIN_PASSWORD=… (≥12) npx tsx scripts/reset-admin-password.ts
 * Force mustChangePassword=true sauf RESET_SKIP_MUST_CHANGE=true (local only).
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const skipMustChange =
  process.env.RESET_SKIP_MUST_CHANGE === 'true' &&
  ((process.env.APP_ENV || '').toLowerCase() === 'local' || process.env.LOCAL_DEV === 'true');

async function main() {
  if (!email || !email.includes('@')) {
    console.error('❌ ADMIN_EMAIL requis.');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('❌ ADMIN_PASSWORD requis (min. 12 caractères). Aucun défaut.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hash,
      role: 'admin',
      mustChangePassword: !skipMustChange,
    },
    create: {
      email,
      name: 'Admin ANS',
      password: hash,
      role: 'admin',
      mustChangePassword: !skipMustChange,
    },
  });
  console.log(`✅ Admin ${user.email} — mot de passe mis à jour (non affiché) mustChange=${user.mustChangePassword}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
