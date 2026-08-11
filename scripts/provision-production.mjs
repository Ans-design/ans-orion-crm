/**
 * Provision production: Neon via Vercel, env vars, deploy.
 * Usage: node scripts/provision-production.mjs
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const AUTH_PATH = path.join(process.env.APPDATA || '', 'xdg.data', 'com.vercel.cli', 'auth.json');
const TEAM = 'team_9SMBaEymb7i6bYTxuUlr5H9r';
const PROJECT_ID = 'prj_99vTmbT5l563SVlDQnrG9GW4qV5e';
const PRODUCTION_URL = 'https://nextjsspace-two-mu.vercel.app';

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
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(`${method} ${urlPath} → ${res.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

async function listEnv(token) {
  return api(token, 'GET', `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM}`);
}

async function upsertEnv(token, key, value, type = 'encrypted') {
  const { envs = [] } = await listEnv(token);
  const found = envs.find((e) => e.key === key);
  const target = type === 'plain'
    ? ['production', 'preview', 'development']
    : ['production', 'preview'];
  if (found) {
    const patchTarget = found.target?.length ? found.target : target;
    await api(token, 'PATCH', `/v9/projects/${PROJECT_ID}/env/${found.id}?teamId=${TEAM}`, {
      value,
      target: patchTarget,
    });
    console.log(`  ↻ ${key}`);
  } else {
    await api(token, 'POST', `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM}`, {
      key, value, type, target,
    });
    console.log(`  + ${key}`);
  }
}

async function tryCreateNeonStore(token) {
  try {
    const res = await api(token, 'POST', `/v1/storage/stores?teamId=${TEAM}`, {
      type: 'neon',
      name: 'ans-orion-erp',
      projectId: PROJECT_ID,
    });
    console.log('  ✓ Store Neon créé:', res?.store?.name || res?.name || 'ok');
    return res;
  } catch (e) {
    const msg = e.data?.error?.message || e.message;
    console.log('  ℹ Neon store:', msg);
    return null;
  }
}

async function removeEnv(token, key) {
  const { envs = [] } = await listEnv(token);
  const found = envs.find((e) => e.key === key);
  if (found) {
    await api(token, 'DELETE', `/v9/projects/${PROJECT_ID}/env/${found.id}?teamId=${TEAM}`);
    console.log(`  − ${key}`);
  }
}

async function main() {
  const token = loadToken();
  console.log('🔧 Provision ANS ORION production\n');

  const { envs = [] } = await listEnv(token);
  const get = (k) => envs.find((e) => e.key === k)?.value;
  const dbUrl = get('DATABASE_URL');

  console.log('1️⃣ Env actuel');
  console.log(`  DATABASE_URL: ${dbUrl?.startsWith('postgres') ? 'PostgreSQL ✓' : dbUrl ? 'autre' : 'absent'}`);
  console.log(`  DEMO_MODE: ${get('DEMO_MODE') ?? 'absent'}`);

  if (!dbUrl?.startsWith('postgres')) {
    console.log('\n1b️⃣ Création base Neon…');
    await tryCreateNeonStore(token);
    try {
      execSync('npx vercel integration add neon --name ans-orion-erp', {
        stdio: 'inherit',
        env: { ...process.env, VERCEL_TOKEN: token },
      });
    } catch {
      console.log('  → Accepter les CGU Neon (1 clic navigateur) :');
      console.log('     https://vercel.com/ans-design/~/integrations/accept-terms/neon?source=cli');
      console.log('  → Puis relancer: npm run provision:prod');
    }
    const refreshed = await listEnv(token);
    const newDb = refreshed.envs?.find((e) => e.key === 'DATABASE_URL')?.value;
    if (newDb?.startsWith('postgres')) console.log('  ✓ DATABASE_URL injecté par Neon');
  }

  const envAfterNeon = await listEnv(token);
  const getFresh = (k) => envAfterNeon.envs?.find((e) => e.key === k)?.value;

  const hasNeon = ['DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL', 'POSTGRES_HOST']
    .some((k) => envAfterNeon.envs?.some((e) => e.key === k));

  const pgUrl = getFresh('DATABASE_URL')
    || getFresh('POSTGRES_PRISMA_URL')
    || getFresh('POSTGRES_URL');
  if (pgUrl?.startsWith('postgres') && !getFresh('DATABASE_URL')?.startsWith('postgres')) {
    await upsertEnv(token, 'DATABASE_URL', pgUrl);
    console.log('  ✓ DATABASE_URL synchronisée depuis Neon');
  }

  console.log('\n2️⃣ Mise à jour env');
  await upsertEnv(token, 'NEXTAUTH_URL', PRODUCTION_URL, 'plain');

  const nextAuthSecret = getFresh('NEXTAUTH_SECRET') || process.env.NEXTAUTH_SECRET;
  const setupSecret = getFresh('SETUP_SECRET') || process.env.SETUP_SECRET;
  if (!nextAuthSecret || String(nextAuthSecret).trim().length < 32) {
    throw new Error('[SEC-002] NEXTAUTH_SECRET manquant ou trop court — fournir via Vercel/env, aucun fallback littéral');
  }
  if (!setupSecret || String(setupSecret).trim().length < 32) {
    throw new Error('[SEC-002] SETUP_SECRET manquant ou trop court — fournir via Vercel/env, aucun fallback littéral');
  }
  await upsertEnv(token, 'NEXTAUTH_SECRET', nextAuthSecret);
  await upsertEnv(token, 'SETUP_SECRET', setupSecret);

  const resendKey = getFresh('RESEND_API_KEY') || process.env.RESEND_API_KEY;
  if (resendKey) {
    await upsertEnv(token, 'RESEND_API_KEY', resendKey);
    await upsertEnv(token, 'EMAIL_FROM', getFresh('EMAIL_FROM') || 'ORION <onboarding@resend.dev>');
  }

  for (const k of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_ENDPOINT', 'S3_REGION', 'S3_FORCE_PATH_STYLE']) {
    const v = getFresh(k) || process.env[k];
    if (v) await upsertEnv(token, k, v);
  }

  const freshDb = (await listEnv(token)).envs?.find((e) => e.key === 'DATABASE_URL')?.value;
  const neonActive = freshDb?.startsWith('postgres') || hasNeon;

  if (neonActive) {
    await removeEnv(token, 'DEMO_MODE');
    await removeEnv(token, 'NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS');
    if (freshDb?.startsWith('postgres')) {
      console.log('\n3️⃣ Seed PostgreSQL');
      execSync('node scripts/setup-production-db.mjs', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: freshDb },
      });
    } else {
      console.log('\n3️⃣ Neon actif (POSTGRES_*) — seed via build ou setup-db');
    }
  } else {
    console.log('\n⚠️  Pas de Neon — mode démo SQLite');
    console.log('   Neon: https://vercel.com/ans-design/nextjs_space/stores');
    await upsertEnv(token, 'DEMO_MODE', 'true', 'plain');
  }

  console.log('\n4️⃣ Deploy production');
  execSync(`npx vercel deploy --prod --yes --token ${token}`, { stdio: 'inherit' });
  console.log(`\n✅ ${PRODUCTION_URL}`);
}

main().catch((e) => {
  console.error('❌', e.message, e.data || '');
  process.exit(1);
});
