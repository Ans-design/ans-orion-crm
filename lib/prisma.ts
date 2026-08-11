import '@/lib/init-server-env';
import { PrismaClient } from '@prisma/client';
import { isPrismaPricingReady } from '@/lib/server/modules/pricing/prisma-delegate-check';
import { prepareDemoDatabase } from '@/lib/demo-database';
import { resolveDatabaseUrl } from '@/lib/database-url';
import { normalizePostgresUrl } from '@/lib/postgres-url';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  demoDbUrl: string | undefined;
};

function prismaDatasourceUrl(): string | undefined {
  resolveDatabaseUrl();
  const url = process.env.DATABASE_URL?.trim();
  return url || undefined;
}

function createPrismaClient(): PrismaClient {
  prepareDemoDatabase();
  const url = prismaDatasourceUrl();
  if (url?.startsWith('postgres')) {
    const normalized = normalizePostgresUrl(url);
    return new PrismaClient({
      datasources: { db: { url: normalized } },
      log: process.env.PRISMA_LOG === '1' ? ['error', 'warn'] : ['error'],
    });
  }
  if (url?.startsWith('file:')) {
    return new PrismaClient({
      datasources: { db: { url } },
      log: process.env.PRISMA_LOG === '1' ? ['error', 'warn'] : ['error'],
    });
  }
  return new PrismaClient();
}

export function getPrismaClient(): PrismaClient {
  const demoUrl = prepareDemoDatabase();
  if (demoUrl && globalForPrisma.demoDbUrl !== demoUrl) {
    if (globalForPrisma.prisma) {
      void globalForPrisma.prisma.$disconnect().catch(() => {});
    }
    globalForPrisma.demoDbUrl = demoUrl;
    globalForPrisma.prisma = undefined;
  }

  const cached = globalForPrisma.prisma;
  if (cached && isPrismaPricingReady(cached)) return cached;

  if (cached) {
    if (process.env.NODE_ENV === 'development' && !isPrismaPricingReady(cached)) {
      console.warn('[prisma] client obsolète (BaseMaterial manquant) — régénération');
    }
    void cached.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV === 'development') {
    const u = prismaDatasourceUrl();
    console.log('[prisma] client initialisé', u?.startsWith('postgres') ? 'PostgreSQL' : 'SQLite');
  }
  globalForPrisma.prisma = client;
  return client;
}

/** Accès lazy — évite un client Prisma obsolète mis en cache par Next.js */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
