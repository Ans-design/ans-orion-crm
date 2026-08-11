#!/usr/bin/env node
/** Constantes env partagées E2E (importable depuis scripts/*.mjs). */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_E2E_PORT = 3199;

/** Matricules v29 requis pour les E2E d’autorisation (COM/LEC). */
const E2E_V29_MATRICULES = [
  'DIRECTEUR', 'DIR01', 'ADM01', 'ADM02', 'GRA01', 'COM01', 'FAC01', 'LOG01',
  'OPE01', 'CM01', 'TECH01', 'ACC01', 'COND01', 'STOCK01', 'CAISSE01', 'FIN01', 'LEC01',
];

/**
 * JSON V29 déterministe pour E2E uniquement (pas un secret prod).
 * Préserve les mots de passe déjà fournis via env.
 */
export function ensureE2eOrionV29PasswordsJson(existing) {
  let map = {};
  if (existing && String(existing).trim()) {
    try {
      const parsed = JSON.parse(String(existing).trim());
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string' && v.trim().length >= 8) {
            map[String(k).trim().toUpperCase()] = v.trim();
          }
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

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const e2eDbAbs = path.resolve(root, 'prisma', 'e2e.db').replace(/\\/g, '/');
/**
 * Chemin absolu — évite :
 * - Prisma CLI (relatif au schema → prisma/prisma/e2e.db)
 * - Next runtime (cwd → prisma/e2e.db vide)
 */
export const E2E_SQLITE_DATABASE_URL = `file:${e2eDbAbs}`;

/** Charge .env.local puis .env pour NEXTAUTH_SECRET etc. (sans écraser DATABASE_URL E2E). */
export function loadE2eDotenv() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(root, file);
    if (fs.existsSync(p)) dotenv.config({ path: p, override: false });
  }
}

export function buildE2eProcessEnv(port = DEFAULT_E2E_PORT, extra = {}) {
  loadE2eDotenv();
  const baseUrl = `http://localhost:${port}`;
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

  // Admin et démo doivent rester des emails distincts (sinon seed dégrade admin → demo)
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
  // E2E_EMAIL souvent = démo : ne pas l’utiliser comme admin si collision
  const e2eLoginEmail = process.env.E2E_EMAIL || '';
  if (e2eLoginEmail && e2eLoginEmail.toLowerCase() === seedDemoEmail.toLowerCase()) {
    /* garder seedAdminEmail distinct */
  } else if (!process.env.SEED_ADMIN_EMAIL && !process.env.E2E_ADMIN_EMAIL && !process.env.LOCAL_ADMIN_LOGIN && e2eLoginEmail) {
    seedAdminEmail = e2eLoginEmail;
  }

  const orionV29 = ensureE2eOrionV29PasswordsJson(process.env.ORION_V29_PASSWORDS_JSON);

  return {
    ...process.env,
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
    E2E_BASE_URL: baseUrl,
    E2E_PORT: String(port),
    PORT: String(port),
    // Évite collision avec `npm run dev` (même distDir = pages 404)
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || '.next-e2e',
    // Seed E2E : mappe les secrets locaux déjà présents (sans hardcoder)
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || seedAdminPw,
    SEED_DEMO_PASSWORD: process.env.SEED_DEMO_PASSWORD || seedDemoPw,
    SEED_ADMIN_EMAIL: seedAdminEmail,
    SEED_DEMO_EMAIL: seedDemoEmail,
    // Login Playwright admin = compte seedé admin (pas le démo)
    E2E_EMAIL: process.env.E2E_ADMIN_EMAIL || seedAdminEmail,
    E2E_PASSWORD: process.env.E2E_ADMIN_PASSWORD || seedAdminPw || process.env.E2E_PASSWORD || '',
    ...extra,
    // Après spread process.env / extra : gagne toujours sur .env.local
    DATABASE_URL: E2E_SQLITE_DATABASE_URL,
    DATABASE_URL_SQLITE: E2E_SQLITE_DATABASE_URL,
    // Re-appliquer après extra pour ne pas perdre le JSON V29 / flags E2E
    E2E_MODE: 'true',
    SKIP_FUSION: '1',
    ALLOW_V29_AUTH: 'true',
    ORION_V29_PASSWORDS_JSON: orionV29,
  };
}
