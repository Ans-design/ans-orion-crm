/**
 * Résolution URL Postgres/Neon — scripts Hostinger (miroir lib/postgres-url.ts)
 */
import fs from 'fs';
import path from 'path';

export function neonHostToPooler(hostname) {
  if (!hostname.includes('neon.tech') || hostname.includes('-pooler')) return hostname;
  return hostname.replace(/\.c-\d+/, (m) => `-pooler${m}`);
}

export function normalizePostgresUrl(url) {
  const trimmed = String(url || '').trim();
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
    return trimmed.replace(/channel_binding=require&?/g, '');
  }
}

/** Pooler d'abord — évite saturation slots Neon sur Hostinger */
export function pickPostgresUrl(vars, preferDirect = false) {
  const pooled = [
    vars.POSTGRES_PRISMA_URL,
    vars.POSTGRES_URL,
    vars.DATABASE_URL,
  ];
  const direct = [
    vars.POSTGRES_URL_NON_POOLING,
    vars.DATABASE_URL_UNPOOLED,
  ];
  const list = preferDirect ? [...direct, ...pooled] : [...pooled, ...direct];
  const found = list.find((u) => u?.trim().startsWith('postgres'));
  return found ? normalizePostgresUrl(found.trim()) : undefined;
}

export function parseEnvFile(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val) vars[m[1]] = val;
  }
  return vars;
}

export function directNeonUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed.startsWith('postgres')) return trimmed;
  try {
    const u = new URL(trimmed);
    u.hostname = u.hostname.replace(/-pooler\.c-/, '.c-');
    u.searchParams.delete('pgbouncer');
    u.searchParams.delete('connection_limit');
    u.searchParams.delete('channel_binding');
    if (!u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'require');
    if (!u.searchParams.has('connect_timeout')) u.searchParams.set('connect_timeout', '15');
    return u.toString();
  } catch {
    return trimmed;
  }
}

export function loadPostgresFromEnvFiles(files, cwd = process.cwd()) {
  const merged = {};
  for (const file of files) {
    Object.assign(merged, parseEnvFile(path.join(cwd, file)));
  }
  return pickPostgresUrl(merged);
}
