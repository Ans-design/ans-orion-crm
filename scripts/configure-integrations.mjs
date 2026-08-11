/**
 * Configure Resend, R2/S3 et domaine custom sur Vercel.
 * Usage: npm run configure:integrations
 *
 * Lit .env.integrations (copiez depuis .env.integrations.example).
 * Sans fichier : configure domaine + EMAIL_FROM, affiche guide Resend/R2.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from 'dotenv';

const AUTH_PATH = path.join(process.env.APPDATA || '', 'xdg.data', 'com.vercel.cli', 'auth.json');
const TEAM = 'team_9SMBaEymb7i6bYTxuUlr5H9r';
const PROJECT_ID = 'prj_99vTmbT5l563SVlDQnrG9GW4qV5e';
const CUSTOM_DOMAIN = 'orion.ansdesign.mg';
const PRODUCTION_URL = `https://${CUSTOM_DOMAIN}`;

const INTEGRATIONS_FILE = path.join(process.cwd(), '.env.integrations');

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
  const target = ['production', 'preview'];
  if (found) {
    await api(token, 'PATCH', `/v9/projects/${PROJECT_ID}/env/${found.id}?teamId=${TEAM}`, {
      value,
      target: found.target?.length ? found.target : target,
    });
    console.log(`  ↻ ${key}`);
  } else {
    await api(token, 'POST', `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM}`, {
      key, value, type, target,
    });
    console.log(`  + ${key}`);
  }
}

async function addDomain(token) {
  try {
    await api(token, 'POST', `/v10/projects/${PROJECT_ID}/domains?teamId=${TEAM}`, {
      name: CUSTOM_DOMAIN,
    });
    console.log(`  ✓ Domaine ${CUSTOM_DOMAIN} ajouté au projet`);
  } catch (e) {
    const msg = e.data?.error?.message || e.message;
    if (/already|exists|assigned/i.test(msg)) {
      console.log(`  ℹ Domaine ${CUSTOM_DOMAIN} déjà configuré`);
    } else {
      console.log(`  ⚠ Domaine: ${msg}`);
    }
  }
}

function loadIntegrations() {
  if (!fs.existsSync(INTEGRATIONS_FILE)) return {};
  config({ path: INTEGRATIONS_FILE });
  return process.env;
}

async function main() {
  const token = loadToken();
  const env = loadIntegrations();

  console.log('\n🔧 Configuration intégrations ANS ORION\n');

  console.log('1️⃣ Domaine custom');
  await addDomain(token);
  await upsertEnv(token, 'NEXTAUTH_URL', env.PRODUCTION_URL || PRODUCTION_URL, 'plain');

  console.log('\n2️⃣ Resend (emails transactionnels)');
  const resendKey = env.RESEND_API_KEY;
  const emailFrom = env.EMAIL_FROM || 'ORION <alert@ansdesign.mg>';
  if (resendKey?.startsWith('re_')) {
    await upsertEnv(token, 'RESEND_API_KEY', resendKey);
    await upsertEnv(token, 'EMAIL_FROM', emailFrom, 'plain');
    console.log(`  ✓ Resend configuré — expéditeur: ${emailFrom}`);
  } else {
    console.log('  ⚠ RESEND_API_KEY absent — ajoutez dans .env.integrations');
    console.log('    1. https://resend.com/signup');
    console.log('    2. Vérifier le domaine ansdesign.mg');
    console.log('    3. API Keys → créer → coller dans .env.integrations');
    console.log(`    4. EMAIL_FROM recommandé: ${emailFrom}`);
    await upsertEnv(token, 'EMAIL_FROM', emailFrom, 'plain');
  }

  console.log('\n3️⃣ Cloudflare R2 (GED fichiers)');
  const s3Keys = ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_ENDPOINT', 'S3_REGION', 'S3_FORCE_PATH_STYLE', 'S3_MAX_BYTES'];
  const hasS3 = env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY;
  if (hasS3) {
    for (const k of s3Keys) {
      const v = env[k];
      if (v) await upsertEnv(token, k, v, k === 'S3_FORCE_PATH_STYLE' ? 'plain' : 'encrypted');
    }
    console.log(`  ✓ R2 configuré — bucket: ${env.S3_BUCKET}`);
  } else {
    console.log('  ⚠ R2 non configuré — fichiers > 2 Mo restent en SQLite (démo)');
    console.log('    1. https://dash.cloudflare.com → R2 → Create bucket "ans-orion-files"');
    console.log('    2. Manage R2 API Tokens → Object Read & Write');
    console.log('    3. Remplir .env.integrations (voir .env.integrations.example)');
    console.log('    4. Relancer: npm run configure:integrations');
  }

  console.log('\n4️⃣ Déploiement production');
  execSync('npx vercel deploy --prod --yes', { stdio: 'inherit', cwd: process.cwd() });

  console.log('\n✅ Configuration terminée');
  console.log(`   URL cible : ${PRODUCTION_URL}`);
  console.log('   DNS (si ansdesign.mg chez Vercel) : sous-domaine orion → projet nextjs_space');
  console.log('   Sinon chez registrar : CNAME orion → cname.vercel-dns.com\n');
}

main().catch((e) => {
  console.error('❌', e.message, e.data || '');
  process.exit(1);
});
