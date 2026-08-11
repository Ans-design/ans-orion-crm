/**
 * Génère une migration baseline PostgreSQL depuis schema.prisma (état vide → schéma actuel).
 * Usage: npm run db:migrate:baseline
 *
 * Sur Neon déjà provisionné via db push :
 *   npm run db:migrate:resolve:neon
 * Puis pour les futures migrations :
 *   npm run db:migrate:neon
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const migrationName = process.argv[2] || '0_baseline';
const migrationDir = path.join(migrationsDir, migrationName);
const migrationFile = path.join(migrationDir, 'migration.sql');

const backup = fs.readFileSync(schemaPath, 'utf8');

function patchForPostgres(content) {
  return content.replace('provider = "sqlite"', 'provider = "postgresql"');
}

if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

if (fs.existsSync(migrationFile)) {
  console.error(`❌ Migration existe déjà : ${migrationFile}`);
  console.error('   Supprimez le dossier ou passez un autre nom : node scripts/prisma-baseline-migrate.mjs <nom>');
  process.exit(1);
}

const tmpSchema = path.join(process.cwd(), 'prisma', '.schema.postgres.tmp.prisma');
fs.writeFileSync(tmpSchema, patchForPostgres(backup));

console.log(`Génération baseline → prisma/migrations/${migrationName}/migration.sql`);

try {
  const sql = execSync(
    `npx prisma migrate diff --from-empty --to-schema-datamodel "${tmpSchema}" --script`,
    { encoding: 'utf8', env: process.env },
  );
  fs.mkdirSync(migrationDir, { recursive: true });
  fs.writeFileSync(migrationFile, sql);
  console.log(`✅ ${migrationFile} (${(sql.length / 1024).toFixed(1)} Ko)`);
  console.log('\nProchaines étapes Neon (DB déjà à jour via db push) :');
  console.log('  npm run db:migrate:resolve:neon');
} catch (err) {
  console.error('❌ migrate diff échoué:', err?.message || err);
  process.exit(1);
} finally {
  fs.unlinkSync(tmpSchema);
}
