/**
 * Bascule temporairement le schéma Prisma en PostgreSQL pour scripts Neon en local (SQLite par défaut).
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
let schemaBackup: string | null = null;

export function patchPostgresSchema(): void {
  schemaBackup = fs.readFileSync(schemaPath, 'utf8');
  if (schemaBackup.includes('provider = "sqlite"')) {
    fs.writeFileSync(
      schemaPath,
      schemaBackup.replace('provider = "sqlite"', 'provider = "postgresql"'),
    );
    execSync('npx prisma generate', { stdio: 'inherit' });
  }
}

export function restorePostgresSchema(): void {
  if (!schemaBackup) return;
  fs.writeFileSync(schemaPath, schemaBackup);
  schemaBackup = null;
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
  } catch {
    console.log('ℹ prisma generate après restore ignoré (relancez npm run db:generate si besoin)');
  }
}
