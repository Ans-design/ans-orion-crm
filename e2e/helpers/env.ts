import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

/**
 * Charge .env.local / .env dans process.env du worker Playwright
 * (ORION_V29_PASSWORDS_JSON, DEMO_*, secrets locaux) — sans écraser
 * les valeurs déjà définies (CI / shell).
 */
function loadLocalEnvForPlaywright() {
  const root = process.cwd();
  for (const file of ['.env.local', '.env']) {
    const p = path.join(root, file);
    if (fs.existsSync(p)) dotenv.config({ path: p, override: false });
  }
}

loadLocalEnvForPlaywright();

/** Base SQLite dédiée aux tests E2E (chemin absolu = même fichier pour CLI + Next). */
const e2eDbAbs = path.resolve(process.cwd(), 'prisma', 'e2e.db').replace(/\\/g, '/');
export const E2E_SQLITE_DATABASE_URL = `file:${e2eDbAbs}`;

const E2E_V29_MATRICULES = [
  'DIRECTEUR', 'DIR01', 'ADM01', 'ADM02', 'GRA01', 'COM01', 'FAC01', 'LOG01',
  'OPE01', 'CM01', 'TECH01', 'ACC01', 'COND01', 'STOCK01', 'CAISSE01', 'FIN01', 'LEC01',
] as const;

function ensureE2eOrionV29PasswordsJson(existing: string | undefined): string {
  let map: Record<string, string> = {};
  if (existing?.trim()) {
    try {
      const parsed = JSON.parse(existing.trim()) as Record<string, unknown>;
      for (const [k, v] of Object.entries(parsed || {})) {
        if (typeof v === 'string' && v.trim().length >= 8) {
          map[String(k).trim().toUpperCase()] = v.trim();
        }
      }
    } catch {
      map = {};
    }
  }
  for (const m of E2E_V29_MATRICULES) {
    if (!map[m]) map[m] = `${m}!OrionE2e26`;
  }
  return JSON.stringify(map);
}

/**
 * Env cohérent E2E : SQLite locale, admin ≠ démo (évite seed qui dégrade admin → demo).
 * Aligné sur scripts/e2e-env.mjs.
 */
export function e2eEnv(): Record<string, string> {
  loadLocalEnvForPlaywright();
  const LOCAL_E2E_URL = 'http://localhost:3199';
  const E2E_PORT = 3199;
  const isRemoteE2E = process.env.E2E_REMOTE === 'true';
  const baseUrl = isRemoteE2E
    ? (process.env.E2E_BASE_URL || LOCAL_E2E_URL)
    : LOCAL_E2E_URL;

  const seedAdminPw =
    process.env.SEED_ADMIN_PASSWORD
    || process.env.E2E_ADMIN_PASSWORD
    || process.env.LOCAL_ADMIN_PASSWORD
    || process.env.DEMO_ADMIN_PASSWORD
    || process.env.E2E_PASSWORD
    || '';
  const seedDemoPw =
    process.env.SEED_DEMO_PASSWORD
    || process.env.DEMO_PASSWORD
    || process.env.E2E_DEMO_PASSWORD
    || process.env.E2E_PASSWORD
    || seedAdminPw;

  let seedAdminEmail =
    process.env.SEED_ADMIN_EMAIL
    || process.env.E2E_ADMIN_EMAIL
    || process.env.LOCAL_ADMIN_LOGIN
    || 'e2e-admin@ansdesign.local';
  let seedDemoEmail =
    process.env.SEED_DEMO_EMAIL
    || process.env.DEMO_EMAIL
    || process.env.E2E_DEMO_EMAIL
    || 'demo@example.local';
  if (seedAdminEmail.toLowerCase() === seedDemoEmail.toLowerCase()) {
    seedAdminEmail = process.env.LOCAL_ADMIN_LOGIN || 'e2e-admin@ansdesign.local';
  }

  const orionV29 = ensureE2eOrionV29PasswordsJson(process.env.ORION_V29_PASSWORDS_JSON);

  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
    ),
    DEMO_MODE: 'false',
    USE_PRODUCTION_DB: 'false',
    E2E_MODE: 'true',
    LOCAL_DEV: 'true',
    APP_ENV: 'local',
    ANS_LOCAL_SQLITE_SEED: '1',
    SKIP_RH_ATTENDANCE_GUARD_IN_DEV: 'true',
    SKIP_FUSION: '1',
    ALLOW_V29_AUTH: 'true',
    ORION_V29_PASSWORDS_JSON: orionV29,
    NEXTAUTH_URL: baseUrl,
    PORT: String(E2E_PORT),
    E2E_BASE_URL: baseUrl,
    E2E_PORT: String(E2E_PORT),
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || '.next-e2e',
    SEED_ADMIN_PASSWORD: seedAdminPw,
    SEED_DEMO_PASSWORD: seedDemoPw,
    SEED_ADMIN_EMAIL: seedAdminEmail,
    SEED_DEMO_EMAIL: seedDemoEmail,
    E2E_EMAIL: process.env.E2E_ADMIN_EMAIL || seedAdminEmail,
    E2E_PASSWORD: process.env.E2E_ADMIN_PASSWORD || seedAdminPw || process.env.E2E_PASSWORD || '',
    DATABASE_URL: E2E_SQLITE_DATABASE_URL,
    DATABASE_URL_SQLITE: E2E_SQLITE_DATABASE_URL,
  };

  // Appliquer au worker (loginAsAdmin lit process.env)
  process.env.SEED_ADMIN_EMAIL = env.SEED_ADMIN_EMAIL;
  process.env.SEED_DEMO_EMAIL = env.SEED_DEMO_EMAIL;
  process.env.SEED_ADMIN_PASSWORD = env.SEED_ADMIN_PASSWORD;
  process.env.SEED_DEMO_PASSWORD = env.SEED_DEMO_PASSWORD;
  process.env.E2E_EMAIL = env.E2E_EMAIL;
  if (env.E2E_PASSWORD) process.env.E2E_PASSWORD = env.E2E_PASSWORD;
  process.env.ORION_V29_PASSWORDS_JSON = orionV29;
  process.env.ALLOW_V29_AUTH = 'true';
  process.env.E2E_MODE = 'true';
  process.env.SKIP_FUSION = '1';

  return env;
}

e2eEnv();
