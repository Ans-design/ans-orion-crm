/**
 * Provision Neon dédié pour ans-orion-crm (pas nextjs_space).
 * Usage: node scripts/provision-ans-orion-crm-neon.mjs
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const AUTH_PATH = path.join(process.env.APPDATA || '', 'xdg.data', 'com.vercel.cli', 'auth.json');
const TEAM = 'team_9SMBaEymb7i6bYTxuUlr5H9r';
const PROJECT_ID = 'prj_qgylkWNt4MoFA3rvO89atokROs1i'; // ans-orion-crm
const NEXTAUTH_URL = 'https://ans-orion-crm.vercel.app';

function loadToken() {
  return JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8')).token;
}

async function api(token, method, urlPath, body) {
  const res = await fetch(`https://api.vercel.com${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`${method} ${urlPath} → ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
    err.data = data;
    throw err;
  }
  return data;
}

async function listEnv(token) {
  return api(token, 'GET', `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM}`);
}

async function upsertEnv(token, key, value, type = 'encrypted', targets = ['production', 'preview']) {
  const { envs = [] } = await listEnv(token);
  const matches = envs.filter((e) => e.key === key);
  // Les vars Sensitive ne peuvent pas changer de type via PATCH — supprimer puis recréer.
  for (const found of matches) {
    try {
      await api(token, 'DELETE', `/v9/projects/${PROJECT_ID}/env/${found.id}?teamId=${TEAM}`);
      console.log(`  − ${key} (${found.id})`);
    } catch (e) {
      console.warn(`  ⚠ delete ${key}:`, e.message?.slice?.(0, 120) || e);
    }
  }
  await api(token, 'POST', `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM}`, {
    key,
    value,
    type,
    target: targets,
  });
  console.log(`  + ${key}=… (${type})`);
}

async function getEnvValue(token, key) {
  // list doesn't return decrypted values for encrypted — pull via CLI instead for DB URLs
  const { envs = [] } = await listEnv(token);
  return envs.find((e) => e.key === key);
}

async function main() {
  const token = loadToken();
  console.log('═══ Provision Neon pour ans-orion-crm ═══\n');

  const { envs = [] } = await listEnv(token);
  const keys = envs.map((e) => e.key);
  console.log('Env keys présentes:', keys.sort().join(', ') || '(aucune)');

  const hasDbHint = keys.some((k) =>
    ['DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL', 'POSTGRES_HOST'].includes(k),
  );

  if (!hasDbHint) {
    console.log('\n1️⃣ Création store Neon…');
    try {
      const res = await api(token, 'POST', `/v1/storage/stores?teamId=${TEAM}`, {
        type: 'neon',
        name: 'ans-orion-crm-db',
        projectId: PROJECT_ID,
      });
      console.log('  ✓ Store:', JSON.stringify(res).slice(0, 300));
    } catch (e) {
      console.log('  ⚠ API store:', e.message);
      console.log('  → Tentative intégration CLI…');
      try {
        execSync('npx vercel integration add neon', {
          stdio: 'inherit',
          env: { ...process.env, VERCEL_TOKEN: token },
        });
      } catch {
        console.log('  Ouvrir: https://vercel.com/ans-design/ans-orion-crm/stores');
        console.log('  Créer Neon DB manuellement puis relancer ce script.');
      }
    }
  } else {
    console.log('\n1️⃣ Neon/Postgres déjà détecté (clés présentes)');
  }

  // Pull decrypted env to local temp
  const pullFile = path.join(process.cwd(), '.env.ans-orion-crm.neon');
  try {
    execSync(`npx vercel env pull "${pullFile}" --environment=production --yes`, {
      stdio: 'inherit',
      env: { ...process.env, VERCEL_TOKEN: token },
    });
  } catch (e) {
    console.warn('env pull failed', e.message);
  }

  let pulled = {};
  if (fs.existsSync(pullFile)) {
    for (const line of fs.readFileSync(pullFile, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const i = line.indexOf('=');
      const k = line.slice(0, i);
      let v = line.slice(i + 1);
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      pulled[k] = v;
    }
  }

  const pg =
    [pulled.DATABASE_URL, pulled.POSTGRES_PRISMA_URL, pulled.POSTGRES_URL].find((u) =>
      u?.startsWith('postgres'),
    ) || '';

  console.log('\n2️⃣ DATABASE_URL:', pg ? `postgres…${pg.slice(-24)}` : 'ABSENT');

  if (!pg) {
    console.error('\n❌ Pas d’URL Postgres. Créer Neon dans Vercel Stores puis relancer.');
    process.exit(1);
  }

  console.log('\n3️⃣ Upsert env production…');
  if (!pulled.DATABASE_URL?.startsWith('postgres')) {
    await upsertEnv(token, 'DATABASE_URL', pg);
  }
  if (pulled.POSTGRES_URL_NON_POOLING?.startsWith('postgres')) {
    await upsertEnv(token, 'DATABASE_URL_UNPOOLED', pulled.POSTGRES_URL_NON_POOLING);
  } else if (pulled.DATABASE_URL_UNPOOLED?.startsWith('postgres')) {
    await upsertEnv(token, 'DATABASE_URL_UNPOOLED', pulled.DATABASE_URL_UNPOOLED);
  }

  await upsertEnv(token, 'USE_PRODUCTION_DB', 'true', 'plain');
  await upsertEnv(token, 'NEXTAUTH_URL', NEXTAUTH_URL, 'plain');
  await upsertEnv(token, 'AUTH_TRUST_HOST', 'true', 'plain');
  await upsertEnv(token, 'ALLOW_VERCEL_DB_PUSH_DATA_LOSS', 'true', 'plain'); // one-shot empty DB
  await upsertEnv(token, 'ALLOW_MEMORY_RATE_LIMIT', 'true', 'plain');
  await upsertEnv(token, 'DISABLE_LOGIN_LOCK', 'true', 'plain');
  await upsertEnv(token, 'RELAX_LOGIN_LOCK', 'true', 'plain');
  await upsertEnv(token, 'ALLOW_V29_AUTH', 'true', 'plain');

  // Write local file for subsequent seed scripts (do not commit)
  const out = path.join(process.cwd(), '.env.vercel.postgres.local');
  fs.writeFileSync(
    out,
    [
      `DATABASE_URL="${pg}"`,
      pulled.DATABASE_URL_UNPOOLED || pulled.POSTGRES_URL_NON_POOLING
        ? `DATABASE_URL_UNPOOLED="${pulled.DATABASE_URL_UNPOOLED || pulled.POSTGRES_URL_NON_POOLING}"`
        : '',
      'USE_PRODUCTION_DB=true',
      `NEXTAUTH_URL=${NEXTAUTH_URL}`,
    ]
      .filter(Boolean)
      .join('\n') + '\n',
  );
  console.log(`\n✅ Neon prêt. URL locale: ${out}`);
  console.log('   Prochaine étape: schema push + seed parity');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
