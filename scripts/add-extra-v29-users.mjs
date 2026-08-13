/**
 * Met à jour ORION_V29_PASSWORDS_JSON (local + Vercel) avec les 5 nouveaux profils,
 * seed Neon, sans toucher aux mots de passe déjà définis.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

const EXTRA = {
  GRA02: 'GRA02!Orion26',
  FAC02: 'FAC02!Orion26',
  CQ01: 'CQ01!Orion26',
  GRA03: 'GRA03!Orion26',
  COM02: 'COM02!Orion26',
};

const BASE = {
  DIRECTEUR: 'DIRECTEUR!Orion26',
  DIR01: 'DIR01!Orion26',
  ADM01: 'OrionLocal2026!',
  ADM02: 'ADM02!Orion26',
  GRA01: 'GRA01!Orion26',
  COM01: 'Demo2026!',
  FAC01: 'FAC01!Orion26',
  LOG01: 'LOG01!Orion26',
  OPE01: 'OPE01!Orion26',
  CM01: 'CM01!Orion26',
  TECH01: 'TECH01!Orion26',
  ACC01: 'ACC01!Orion26',
  COND01: 'COND01!Orion26',
  STOCK01: 'STOCK01!Orion26',
  CAISSE01: 'Demo2026!',
  FIN01: 'FIN01!Orion26',
  LEC01: 'LEC01!Orion26',
  ...EXTRA,
};

function parseEnvFile(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    vars[line.slice(0, i)] = v;
  }
  return vars;
}

function upsertLocalJson(map) {
  const envPath = path.join(ROOT, '.env.local');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const line = `ORION_V29_PASSWORDS_JSON=${JSON.stringify(map)}`;
  if (/^ORION_V29_PASSWORDS_JSON=/m.test(content)) {
    content = content.replace(/^ORION_V29_PASSWORDS_JSON=.*$/m, line);
  } else {
    content = `${content.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(envPath, content);
  console.log('✓ .env.local ORION_V29_PASSWORDS_JSON mis à jour (', Object.keys(map).length, 'clés)');
}

function upsertParitySecrets(map) {
  const p = path.join(ROOT, '.env.vercel.parity.secrets');
  const existing = parseEnvFile(p);
  const lines = [];
  for (const [k, v] of Object.entries(existing)) {
    if (k === 'ORION_V29_PASSWORDS_JSON') continue;
    lines.push(`${k}=${JSON.stringify(v)}`);
  }
  lines.push(`ORION_V29_PASSWORDS_JSON=${JSON.stringify(map)}`);
  fs.writeFileSync(p, `${lines.join('\n')}\n`);
}

async function upsertVercelJson(map) {
  const authPath = path.join(
    process.env.APPDATA || '',
    'xdg.data',
    'com.vercel.cli',
    'auth.json',
  );
  const token = JSON.parse(fs.readFileSync(authPath, 'utf8')).token;
  const team = 'team_9SMBaEymb7i6bYTxuUlr5H9r';
  const proj = 'prj_qgylkWNt4MoFA3rvO89atokROs1i';
  const list = await fetch(
    `https://api.vercel.com/v9/projects/${proj}/env?teamId=${team}`,
    { headers: { Authorization: `Bearer ${token}` } },
  ).then((r) => r.json());
  for (const e of (list.envs || []).filter((x) => x.key === 'ORION_V29_PASSWORDS_JSON')) {
    await fetch(
      `https://api.vercel.com/v9/projects/${proj}/env/${e.id}?teamId=${team}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
  }
  const json = JSON.stringify(map);
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${proj}/env?teamId=${team}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'ORION_V29_PASSWORDS_JSON',
        value: json,
        type: 'encrypted',
        target: ['production', 'preview'],
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Vercel env: ${res.status} ${await res.text()}`);
  }
  console.log('✓ Vercel ORION_V29_PASSWORDS_JSON (', Object.keys(map).length, 'clés)');
}

function seedNeon(map) {
  const merged = {
    ...parseEnvFile('.env.ans-orion-crm.neon'),
    ...parseEnvFile('.env.vercel.postgres.local'),
    ...parseEnvFile('.env.vercel.parity.secrets'),
  };
  let pg =
    merged.DATABASE_URL_UNPOOLED ||
    merged.POSTGRES_URL_NON_POOLING ||
    merged.DATABASE_URL;
  if (!pg?.startsWith('postgres')) {
    console.warn('⚠ Pas d’URL Neon — seed Neon sauté');
    return;
  }
  const u = new URL(pg);
  u.searchParams.set('connection_limit', '5');
  pg = u.toString();

  const schemaPath = path.join(ROOT, 'prisma', 'schema.prisma');
  const backup = fs.readFileSync(schemaPath, 'utf8');
  fs.writeFileSync(
    schemaPath,
    backup.replace('provider = "sqlite"', 'provider = "postgresql"'),
  );
  const env = {
    ...process.env,
    DATABASE_URL: pg,
    USE_NEON_LOCAL: 'true',
    USE_PRODUCTION_DB: 'false',
    LOCAL_DEV: 'true',
    APP_ENV: 'local',
    ORION_V29_PASSWORDS_JSON: JSON.stringify(map),
    ALLOW_V29_AUTH: 'true',
    NEXTAUTH_SECRET:
      process.env.NEXTAUTH_SECRET || 'ans-orion-local-dev-secret-2026-parity-seed',
  };
  try {
    execSync('npx prisma generate', { stdio: 'inherit', env });
    execSync('npx tsx scripts/seed-v29-local.ts', { stdio: 'inherit', env });
    console.log('✓ Seed Neon v29 OK');
  } finally {
    fs.writeFileSync(schemaPath, backup.includes('sqlite') ? backup.replace('provider = "postgresql"', 'provider = "sqlite"') : backup.replace('provider = "postgresql"', 'provider = "sqlite"'));
    let s = fs.readFileSync(schemaPath, 'utf8');
    s = s.replace('provider = "postgresql"', 'provider = "sqlite"');
    fs.writeFileSync(schemaPath, s);
    try {
      execSync('npx prisma generate', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: 'file:./prisma/dev.db',
          USE_PRODUCTION_DB: 'false',
        },
      });
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  upsertLocalJson(BASE);
  upsertParitySecrets(BASE);
  await upsertVercelJson(BASE);
  seedNeon(BASE);
  console.log('\nNouveaux comptes:');
  for (const [m, pw] of Object.entries(EXTRA)) {
    console.log(`  ${m} → ${pw}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
