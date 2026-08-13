/**
 * Assure ORION_V29_PASSWORDS_JSON complet dans .env.local (tous les matricules v29).
 * Préserve les mots de passe déjà définis. Ne touche pas la prod.
 *
 * Usage : node scripts/ensure-v29-local-passwords.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env.local');

/** Matricules alignés sur lib/orion-v29-accounts.ts — à garder en sync. */
const MATRICULES = [
  'DIRECTEUR',
  'DIR01',
  'ADM01',
  'ADM02',
  'GRA01',
  'COM01',
  'FAC01',
  'LOG01',
  'OPE01',
  'CM01',
  'TECH01',
  'ACC01',
  'COND01',
  'STOCK01',
  'CAISSE01',
  'FIN01',
  'LEC01',
  'GRA02',
  'FAC02',
  'QUAL01',
  'GRA03',
  'COM02',
  'FAC03',
  'FAC04',
  'ACC02',
  'CM02',
];

/** Alias obsolètes → matricule canonique. */
const LEGACY_ALIASES = {
  CAI01: 'CAISSE01',
};

function stripQuotes(v) {
  const t = v.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function derivedPassword(matricule) {
  // Unique par profil, ≥8 car., jamais commit dans le code métier auth.
  return `${matricule}!Orion26`;
}

function parseExistingJson(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(stripQuotes(raw));
    if (!parsed || typeof parsed !== 'object') return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.trim().length >= 8) {
        out[String(k).trim().toUpperCase()] = v.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

function buildMergedMap(existing) {
  const map = { ...existing };

  // Migrer alias legacy
  for (const [legacy, canon] of Object.entries(LEGACY_ALIASES)) {
    if (map[legacy] && !map[canon]) {
      map[canon] = map[legacy];
    }
    delete map[legacy];
  }

  for (const m of MATRICULES) {
    if (!map[m] || map[m].length < 8) {
      map[m] = derivedPassword(m);
    }
  }

  // Ne garder que les matricules connus (+ éventuels extras déjà présents hors liste)
  return map;
}

function upsertEnvLine(content, key, value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const line = `${key}=${serialized}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) {
    return content.replace(re, line);
  }
  const block = `\n# Matricules v29 — tous les profils (généré local)\n${line}\n`;
  return `${content.trimEnd()}\n${block}`;
}

if (!fs.existsSync(ENV_PATH)) {
  console.error('[ensure-v29] .env.local introuvable — copiez .env.local.example d’abord');
  process.exit(1);
}

const content = fs.readFileSync(ENV_PATH, 'utf8');
const m = content.match(/^ORION_V29_PASSWORDS_JSON=(.*)$/m);
const existing = parseExistingJson(m?.[1] ?? '');
const merged = buildMergedMap(existing);
const sorted = Object.fromEntries(
  Object.keys(merged)
    .sort()
    .map((k) => [k, merged[k]]),
);

const next = upsertEnvLine(content, 'ORION_V29_PASSWORDS_JSON', sorted);
fs.writeFileSync(ENV_PATH, next, 'utf8');

console.log(
  `[ensure-v29] ${Object.keys(sorted).length} profils dans ORION_V29_PASSWORDS_JSON (${MATRICULES.length} attendus)`,
);
console.log(`[ensure-v29] Matricules : ${MATRICULES.join(', ')}`);
console.log('[ensure-v29] Mot de passe manquant → dérivé {MATRICULE}!Orion26 (local only)');
console.log('[ensure-v29] Relancer seed : npm run seed:incremental  (ou seed)');
