/**
 * Vérifie chaque profil v29 : User + Employee (local SQLite + Neon) puis login live Vercel.
 * N’affiche jamais les mots de passe.
 */
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const ROOT = process.cwd();

function parseEnvFile(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    vars[line.slice(0, i).trim()] = v;
  }
  return vars;
}

const localEnv = {
  ...parseEnvFile(path.join(ROOT, '.env')),
  ...parseEnvFile(path.join(ROOT, '.env.local')),
};
const neonEnv = {
  ...parseEnvFile(path.join(ROOT, '.env.ans-orion-crm.neon')),
  ...parseEnvFile(path.join(ROOT, '.env.vercel.postgres.local')),
};

process.env.ORION_V29_PASSWORDS_JSON =
  process.env.ORION_V29_PASSWORDS_JSON || localEnv.ORION_V29_PASSWORDS_JSON || '';

const { ORION_V29_PROFILES, getOrionV29Accounts } = await import('../lib/orion-v29-accounts.ts');
const accounts = getOrionV29Accounts();
const pwByMat = Object.fromEntries(accounts.map((a) => [a.matricule, a.password]));

const BASE = process.env.VERIFY_BASE_URL || 'https://ans-orion-crm.vercel.app';

function failRow(matricule, issues) {
  return { matricule, ok: false, issues };
}

async function auditSqlite() {
  const dbFile = path.join(ROOT, 'prisma', 'dev.db');
  if (!fs.existsSync(dbFile)) {
    return { label: 'local-sqlite', skipped: true, rows: [] };
  }
  const db = new DatabaseSync(dbFile);
  const rows = [];
  try {
    for (const p of ORION_V29_PROFILES) {
      const issues = [];
      const user = db.prepare('SELECT id, role, password, name FROM User WHERE lower(email) = ?').get(p.email.toLowerCase());
      if (!user) issues.push('user manquant');
      else {
        if (user.role !== p.role) issues.push(`role User=${user.role} attendu ${p.role}`);
        if (!user.password) issues.push('hash mot de passe vide');
        const pw = pwByMat[p.matricule];
        if (pw && user.password) {
          const match = await bcrypt.compare(pw, user.password);
          if (!match) issues.push('mot de passe JSON ≠ hash User');
        }
      }
      const emp = db.prepare('SELECT id, userId, statut, email, authRole FROM Employee WHERE matricule = ?').get(p.matricule);
      if (!emp) issues.push('fiche Employee manquante');
      else {
        if (String(emp.statut || '').toLowerCase() !== 'actif') issues.push(`statut=${emp.statut}`);
        if (user && emp.userId !== user.id) issues.push('Employee.userId non lié');
      }
      rows.push({
        matricule: p.matricule,
        email: p.email,
        role: p.role,
        ok: issues.length === 0,
        issues,
      });
    }
  } finally {
    db.close();
  }
  return { label: 'local-sqlite', skipped: false, rows };
}

async function auditNeon() {
  const pgUrl =
    neonEnv.DATABASE_URL_UNPOOLED ||
    neonEnv.POSTGRES_URL_NON_POOLING ||
    neonEnv.DATABASE_URL;
  if (!pgUrl?.startsWith('postgres')) {
    return { label: 'neon', skipped: true, rows: [] };
  }
  const client = new pg.Client({
    connectionString: pgUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const rows = [];
  try {
    for (const p of ORION_V29_PROFILES) {
      const issues = [];
      const u = await client.query(
        `SELECT id, role, password, name FROM "User" WHERE lower(email) = $1 LIMIT 1`,
        [p.email.toLowerCase()],
      );
      const user = u.rows[0];
      if (!user) issues.push('user manquant');
      else {
        if (user.role !== p.role) issues.push(`role User=${user.role} attendu ${p.role}`);
        if (!user.password) issues.push('hash mot de passe vide');
        const pw = pwByMat[p.matricule];
        if (pw && user.password) {
          const match = await bcrypt.compare(pw, user.password);
          if (!match) issues.push('mot de passe JSON ≠ hash User');
        }
      }
      const e = await client.query(
        `SELECT id, "userId", statut, email, "authRole" FROM "Employee" WHERE matricule = $1 LIMIT 1`,
        [p.matricule],
      );
      const emp = e.rows[0];
      if (!emp) issues.push('fiche Employee manquante');
      else {
        if (String(emp.statut || '').toLowerCase() !== 'actif') issues.push(`statut=${emp.statut}`);
        if (user && emp.userId !== user.id) issues.push('Employee.userId non lié');
      }
      rows.push({
        matricule: p.matricule,
        email: p.email,
        role: p.role,
        ok: issues.length === 0,
        issues,
      });
    }
  } finally {
    await client.end();
  }
  return { label: 'neon', skipped: false, rows };
}

async function repairNeon(missing) {
  if (!missing.length) return;
  const pgUrl =
    neonEnv.DATABASE_URL_UNPOOLED ||
    neonEnv.POSTGRES_URL_NON_POOLING ||
    neonEnv.DATABASE_URL;
  if (!pgUrl?.startsWith('postgres')) return;
  const client = new pg.Client({
    connectionString: pgUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    for (const p of missing) {
      const pw = pwByMat[p.matricule];
      if (!pw) {
        console.warn(`SKIP repair ${p.matricule} — pas de mot de passe local`);
        continue;
      }
      const hash = await bcrypt.hash(pw, 12);
      const names = p.name.split(' ');
      const firstName = names[0] ?? p.name;
      const lastName = names.slice(1).join(' ') || p.name;
      const user = await client.query(
        `INSERT INTO "User" (id, email, name, role, password, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, password = EXCLUDED.password, "updatedAt" = NOW()
         RETURNING id`,
        [p.email.toLowerCase(), p.name, p.role, hash],
      );
      const userId = user.rows[0].id;
      await client.query(`UPDATE "Employee" SET "userId" = NULL WHERE "userId" = $1`, [userId]);
      await client.query(
        `INSERT INTO "Employee" (id, matricule, "firstName", "lastName", poste, departement, "authRole", email, "horaireDebut", "horaireFin", site, statut, "presenceStatut", "dateEmbauche", "userId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, '08:00', '17:00', 'AX0', 'Actif', 'Absent', DATE '2022-06-01', $8, NOW(), NOW())
         ON CONFLICT (matricule) DO UPDATE SET
           "authRole" = EXCLUDED."authRole",
           email = EXCLUDED.email,
           poste = EXCLUDED.poste,
           departement = EXCLUDED.departement,
           statut = 'Actif',
           "userId" = EXCLUDED."userId",
           "updatedAt" = NOW()`,
        [p.matricule, firstName, lastName, p.poste, p.departement, p.role, p.email.toLowerCase(), userId],
      );
      console.log(`REPAIR neon ${p.matricule}`);
    }
  } finally {
    await client.end();
  }
}

function cookieJar(setCookieHeaders) {
  const map = new Map();
  for (const raw of setCookieHeaders) {
    const part = String(raw).split(';')[0];
    const i = part.indexOf('=');
    if (i > 0) map.set(part.slice(0, i), part.slice(i + 1));
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function liveLogin(email, password, matricule) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { 'user-agent': 'orion-verify' } });
  if (!csrfRes.ok) return failRow(matricule, [`csrf HTTP ${csrfRes.status}`]);
  const { csrfToken } = await csrfRes.json();
  let cookies = cookieJar(csrfRes.headers.getSetCookie?.() || []);
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    json: 'true',
    redirect: 'false',
    callbackUrl: `${BASE}/`,
  });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookies,
      'user-agent': 'orion-verify',
    },
    body,
    redirect: 'manual',
  });
  cookies = [cookies, cookieJar(res.headers.getSetCookie?.() || [])].filter(Boolean).join('; ');
  let payload = {};
  try {
    payload = await res.json();
  } catch {
    /* 302 */
  }
  const loc = res.headers.get('location') || '';
  const url = String(payload.url || loc || '');
  if (/error=/i.test(url) || res.status === 401) {
    return failRow(matricule, [`login refusé (${res.status})`]);
  }
  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { cookie: cookies, 'user-agent': 'orion-verify' },
  });
  const session = sessionRes.ok ? await sessionRes.json() : {};
  if (!session?.user?.email) {
    return failRow(matricule, ['session vide après login']);
  }
  return {
    matricule,
    ok: true,
    issues: [],
    sessionRole: session.user.role,
    sessionEmail: session.user.email,
  };
}

function printAudit(title, audit) {
  console.log(`\n=== ${title} ===`);
  if (audit.skipped) {
    console.log('skipped');
    return;
  }
  const bad = audit.rows.filter((r) => !r.ok);
  console.log(`${audit.rows.filter((r) => r.ok).length}/${audit.rows.length} OK`);
  for (const r of bad) {
    console.log(`  FAIL ${r.matricule} ${r.email} — ${r.issues.join('; ')}`);
  }
}

const sqlite = await auditSqlite();
printAudit('LOCAL SQLite', sqlite);

let neon = await auditNeon();
printAudit('NEON', neon);

const neonMissing = neon.skipped
  ? []
  : neon.rows.filter((r) => !r.ok).map((r) => ORION_V29_PROFILES.find((p) => p.matricule === r.matricule));
if (neonMissing.length && accounts.length) {
  console.log(`\nRéparation Neon (${neonMissing.length} comptes)…`);
  await repairNeon(neonMissing.filter(Boolean));
  neon = await auditNeon();
  printAudit('NEON après repair', neon);
}

console.log(`\n=== LIVE ${BASE} ===`);
if (!accounts.length) {
  console.log('ORION_V29_PASSWORDS_JSON absent — skip login live');
  process.exit(sqlite.rows.some((r) => !r.ok) || (!neon.skipped && neon.rows.some((r) => !r.ok)) ? 1 : 0);
}

const liveResults = [];
for (const acc of accounts) {
  const emailTry = await liveLogin(acc.email, acc.password, acc.matricule);
  liveResults.push({ ...emailTry, via: 'email' });
  if (emailTry.ok) {
    const matTry = await liveLogin(acc.matricule, acc.password, acc.matricule);
    liveResults.push({ ...matTry, via: 'matricule' });
  }
}

const liveFail = liveResults.filter((r) => !r.ok);
console.log(`${liveResults.filter((r) => r.ok).length}/${liveResults.length} logins live OK`);
for (const r of liveFail) {
  console.log(`  FAIL ${r.matricule} via ${r.via} — ${r.issues.join('; ')}`);
}

const anyFail =
  sqlite.rows.some((r) => !r.ok) ||
  (!neon.skipped && neon.rows.some((r) => !r.ok)) ||
  liveFail.length > 0;
process.exit(anyFail ? 1 : 0);
