import { normalizePostgresUrl } from '@/lib/postgres-url';

/** Test Neon/Postgres sans Prisma — utile si client Prisma généré en SQLite par erreur. */
export async function probePostgresRaw(url: string, timeoutMs = 4_000): Promise<{ latencyMs: number }> {
  const started = Date.now();
  const connectionString = normalizePostgresUrl(url);

  const probe = async () => {
    const { Client } = await import('pg');
    const client = new Client({
      connectionString,
      connectionTimeoutMillis: timeoutMs,
      ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
  };

  await Promise.race([
    probe(),
    new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('pg_health timeout')), timeoutMs);
    }),
  ]);

  return { latencyMs: Date.now() - started };
}

export function isPrismaSqliteMismatch(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('must start with the protocol `file:`')
    || msg.includes('provider = "sqlite"')
    || msg.includes('must start with the protocol `postgresql://`')
    || msg.includes('provider = "postgresql"')
  );
}
