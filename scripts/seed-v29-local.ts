/**
 * Seed local SQLite : employés + users pour tous les profils v29.
 * Charge .env.local (ORION_V29_PASSWORDS_JSON).
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

process.env.APP_ENV = process.env.APP_ENV || 'local';
process.env.LOCAL_DEV = 'true';

const prisma = new PrismaClient();

async function main() {
  const { getOrionV29Accounts, ORION_V29_PROFILES } = await import('../lib/orion-v29-accounts');
  const accounts = getOrionV29Accounts();
  console.log(`Profils catalogue : ${ORION_V29_PROFILES.length}`);
  console.log(`Comptes avec mot de passe : ${accounts.length}`);
  if (accounts.length === 0) {
    console.error('ORION_V29_PASSWORDS_JSON vide — lancez npm run ensure:v29');
    process.exit(1);
  }
  if (accounts.length < ORION_V29_PROFILES.length) {
    console.warn(
      `⚠ ${ORION_V29_PROFILES.length - accounts.length} profil(s) sans mot de passe — ensure:v29 recommandé`,
    );
  }

  const { seedV29Employees } = await import('./seed-v29-employees');
  const { seedV29Users } = await import('./seed-v29-users');
  await seedV29Employees(prisma);
  await seedV29Users(prisma);
  console.log('✅ Seed v29 local terminé — chaque profil a un login (email + matricule).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
