/**
 * Config CLI Prisma 6.x (seed / chemins).
 * La datasource `url` reste dans prisma/schema.prisma — requis par Prisma 6.19.
 *
 * L’erreur IDE « url is no longer supported » = extension Prisma 7 sur projet v6.
 * Mitigations workspace : prisma.pinToPrisma6 + prisma.enableDiagnostics=false
 * (diagnostics CLI : npm run db:validate).
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'prisma/config';

/** Quand ce fichier est chargé, Prisma saute le dotenv natif — on force SQLite si schema sqlite. */
try {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
  if (schema.includes('provider = "sqlite"')) {
    const current = process.env.DATABASE_URL?.trim() ?? '';
    if (!current.startsWith('file:')) {
      const abs = join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
      process.env.DATABASE_URL = (
        process.env.DATABASE_URL_SQLITE || `file:${abs}`
      ).trim();
    } else if (
      current === 'file:./prisma/dev.db'
      || current === 'file:./dev.db'
      || current.includes('prisma/prisma/dev.db')
    ) {
      const abs = join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
      process.env.DATABASE_URL = `file:${abs}`;
    } else if (
      current === 'file:./prisma/e2e.db'
      || current === 'file:./e2e.db'
      || current.includes('prisma/prisma/e2e.db')
      || /[/\\]prisma[/\\]e2e\.db$/.test(current.replace(/^file:/, ''))
    ) {
      const abs = join(process.cwd(), 'prisma', 'e2e.db').replace(/\\/g, '/');
      process.env.DATABASE_URL = `file:${abs}`;
    }
  }
} catch {
  /* ignore */
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx --require dotenv/config scripts/safe-seed.ts',
  },
});
