/**
 * Redéploiement Hostinger via API (sans Playwright / Cloudflare).
 * Variables : HOSTINGER_API_TOKEN, HOSTINGER_USERNAME, HOSTINGER_WEBSITE_DOMAIN
 * Ou fichier deploy/hostinger/.api-token (une ligne = token)
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const API = 'https://developers.hostinger.com';
const TOKEN =
  process.env.HOSTINGER_API_TOKEN ||
  (fs.existsSync(path.join(process.cwd(), 'deploy/hostinger/.api-token'))
    ? fs.readFileSync(path.join(process.cwd(), 'deploy/hostinger/.api-token'), 'utf8').trim()
    : '');
const USERNAME = process.env.HOSTINGER_USERNAME || 'ans.designprint@gmail.com';
const WEBSITE =
  process.env.HOSTINGER_WEBSITE_DOMAIN ||
  process.env.HOSTINGER_SITE ||
  'darkorchid-badger-644294.hostingersite.com';
const ZIP = path.join(process.cwd(), 'deploy', 'hostinger', 'orion-crm.zip');

async function api(method, p, body) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${p} → ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function pollBuild(uuid) {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 15_000));
    try {
      const logs = await api(
        'GET',
        `/api/hosting/v1/accounts/${encodeURIComponent(USERNAME)}/websites/${encodeURIComponent(WEBSITE)}/nodejs/builds/${uuid}/logs`,
      );
      const state = logs?.state ?? logs?.status ?? logs?.data?.state;
      console.log(`  [${i + 1}] état:`, state ?? '…');
      if (state === 'completed' || state === 'success' || state === 'deployed') {
        console.log('✓ Build terminé');
        return;
      }
      if (state === 'failed' || state === 'error') {
        throw new Error(`Build échoué: ${JSON.stringify(logs)}`);
      }
    } catch (e) {
      if (String(e).includes('Build échoué')) throw e;
      console.log('  poll…', e.message?.slice(0, 80));
    }
  }
  console.warn('⚠ Timeout polling — vérifiez hPanel → Déploiements');
}

async function main() {
  if (!TOKEN) {
    console.error('HOSTINGER_API_TOKEN requis (env ou deploy/hostinger/.api-token)');
    console.error('Créez un jeton : https://hpanel.hostinger.com/profile/api');
    process.exit(1);
  }

  console.log('→ Archive ZIP…');
  execSync('node scripts/hostinger-package.mjs', { stdio: 'inherit' });
  if (!fs.existsSync(ZIP)) {
    console.error('Archive introuvable:', ZIP);
    process.exit(1);
  }

  const sizeMb = (fs.statSync(ZIP).size / 1024 / 1024).toFixed(2);
  console.log(`→ Upload ${sizeMb} Mo vers ${WEBSITE}…`);

  const archive = fs.readFileSync(ZIP).toString('base64');
  const result = await api(
    'POST',
    `/api/hosting/v1/accounts/${encodeURIComponent(USERNAME)}/websites/${encodeURIComponent(WEBSITE)}/nodejs/builds/from-archive`,
    {
      archive,
      node_version: 20,
      package_manager: 'npm',
      build_script: 'build:hostinger',
      entry_file: 'node_modules/next/dist/bin/next',
    },
  );

  const uuid = result?.uuid ?? result?.data?.uuid ?? result?.id;
  console.log('✓ Build lancé:', JSON.stringify(result, null, 2));
  if (uuid) await pollBuild(uuid);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
