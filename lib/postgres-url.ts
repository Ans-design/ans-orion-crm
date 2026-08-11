function neonHostToPooler(hostname: string): string {
  if (!hostname.includes('neon.tech') || hostname.includes('-pooler')) return hostname;
  return hostname.replace(/\.c-\d+/, (m) => `-pooler${m}`);
}

/** Normalise une URL Postgres/Neon pour hébergeurs sans support channel_binding. */
export function normalizePostgresUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith('postgres')) return trimmed;
  try {
    const u = new URL(trimmed);
    u.searchParams.delete('channel_binding');
    u.hostname = neonHostToPooler(u.hostname);

    const isPooler =
      u.hostname.includes('-pooler.') ||
      u.searchParams.get('pgbouncer') === 'true';

    if (isPooler) {
      u.searchParams.set('pgbouncer', 'true');
      if (!u.searchParams.has('connection_limit')) {
        u.searchParams.set('connection_limit', '1');
      }
    }

    if (!u.searchParams.has('connect_timeout')) {
      u.searchParams.set('connect_timeout', '15');
    }
    if (!u.searchParams.has('sslmode')) {
      u.searchParams.set('sslmode', 'require');
    }

    return u.toString();
  } catch {
    return trimmed
      .replace(/([?&])channel_binding=require&?/g, '$1')
      .replace(/[?&]$/, '');
  }
}

/** Ordre de résolution URL — pooler d'abord (Hostinger/Neon serverless). */
export function pickPostgresUrl(
  sources: Record<string, string | undefined>,
  preferDirect = false,
): string | undefined {
  const pooled = [
    sources.POSTGRES_PRISMA_URL,
    sources.POSTGRES_URL,
    sources.DATABASE_URL,
  ];
  const direct = [
    sources.POSTGRES_URL_NON_POOLING,
    sources.DATABASE_URL_UNPOOLED,
  ];
  const list = preferDirect ? [...direct, ...pooled] : [...pooled, ...direct];
  const found = list.find((u) => u?.trim().startsWith('postgres'));
  return found ? normalizePostgresUrl(found.trim()) : undefined;
}

export function databaseUrlScheme(url?: string | null): 'postgresql' | 'file' | 'missing' {
  const u = url?.trim();
  if (!u) return 'missing';
  if (u.startsWith('postgres')) return 'postgresql';
  if (u.startsWith('file:')) return 'file';
  return 'missing';
}
