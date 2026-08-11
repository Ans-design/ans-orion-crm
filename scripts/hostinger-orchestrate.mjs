/**
 * Orchestrateur Hostinger — toutes les voies possibles.
 * Variables : HOSTINGER_API_TOKEN, HOSTINGER_USERNAME, HOSTINGER_WEBSITE_DOMAIN
 * Sous-domaine cible : orion.ansdesignprint.com
 */
import fs from 'fs';
import path from 'path';
import { pickPostgresUrl, directNeonUrl } from './postgres-env.mjs';

const API = 'https://developers.hostinger.com';
const TOKEN = process.env.HOSTINGER_API_TOKEN || '';
const SUBDOMAIN = process.env.HOSTINGER_SUBDOMAIN || 'orion';
const APEX = process.env.HOSTINGER_APEX_DOMAIN || 'ansdesignprint.com';
const FQDN = `${SUBDOMAIN}.${APEX}`;
const USERNAME = process.env.HOSTINGER_USERNAME || '';
const WEBSITE = process.env.HOSTINGER_WEBSITE_DOMAIN || '';

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
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

function section(title) {
  console.log(`\n${'═'.repeat(60)}\n ${title}\n${'═'.repeat(60)}`);
}

function loadEnvTemplate() {
  const files = ['.env.vercel.production', '.env.local', '.env'];
  const vars = {};
  for (const f of files) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val) vars[m[1]] = val;
    }
  }

  const db = pickPostgresUrl(vars);

  const secret = vars.NEXTAUTH_SECRET;
  if (!db) {
    console.log('⚠ Aucune DATABASE_URL PostgreSQL — renseignez deploy/hostinger/orion.env manuellement');
    return null;
  }

  const unpooled =
    vars.POSTGRES_URL_NON_POOLING ||
    vars.DATABASE_URL_UNPOOLED ||
    directNeonUrl(db);

  const siteUrl = (
    process.env.HOSTINGER_SITE_URL ||
    process.env.HOSTINGER_PUBLIC_URL ||
    `https://${process.env.HOSTINGER_FQDN || FQDN}`
  ).replace(/\/$/, '');

  const lines = [
    `DATABASE_URL=${db}`,
    `USE_PRODUCTION_DB=true`,
    `AUTH_TRUST_HOST=true`,
    `ALLOW_V29_AUTH=true`,
    `HOSTINGER_SITE_URL=${siteUrl}`,
    `NEXTAUTH_URL=${siteUrl}`,
    `AUTH_SECRET=${secret && secret.length >= 32 ? secret : 'REMPLACER-64-CARACTERES-MINIMUM-ALEATOIRES'}`,
    `NEXTAUTH_SECRET=${secret && secret.length >= 32 ? secret : 'REMPLACER-64-CARACTERES-MINIMUM-ALEATOIRES'}`,
    `ALLOW_V29_AUTH=true`,
    `NODE_ENV=production`,
    `PORT=3000`,
  ];
  if (vars.RESEND_API_KEY) lines.push(`RESEND_API_KEY=${vars.RESEND_API_KEY}`);
  if (vars.EMAIL_FROM) lines.push(`EMAIL_FROM=${vars.EMAIL_FROM}`);
  const out = path.join(process.cwd(), 'deploy', 'hostinger', 'orion.env');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join('\n') + '\n');
  console.log(`✓ Variables générées → deploy/hostinger/orion.env (${siteUrl})`);

  const bundledOut = path.join(process.cwd(), 'deploy', 'hostinger', 'database.bundled.env');
  fs.writeFileSync(
    bundledOut,
    [
      `POSTGRES_PRISMA_URL=${db}`,
      `POSTGRES_URL=${db}`,
      `DATABASE_URL=${db}`,
      `POSTGRES_URL_NON_POOLING=${unpooled}`,
      `DATABASE_URL_UNPOOLED=${unpooled}`,
      'USE_PRODUCTION_DB=true',
      '',
    ].join('\n'),
  );
  console.log(`✓ Fallback versionné → deploy/hostinger/database.bundled.env`);

  return out;
}

async function tryPackage() {
  section('1/5 — Archive ZIP (Node.js Web App hPanel)');
  const { execSync } = await import('child_process');
  execSync('node scripts/hostinger-package.mjs', { stdio: 'inherit' });
  console.log(`→ hPanel : Websites → Add Website → Node.js Web App → Upload ZIP`);
  console.log(`→ Build : npm run build:hostinger | Start : npm start | Node 20 | Port 3000`);
}

async function tryApiDiscover() {
  section('2/5 — API Hostinger — découverte');
  if (!TOKEN) {
    console.log('HOSTINGER_API_TOKEN absent.');
    console.log('Créez un jeton : hPanel → Profil → API → https://hpanel.hostinger.com/profile/api');
    return { websites: [], vms: [] };
  }
  const [websites, vms] = await Promise.all([
    api('GET', '/api/hosting/v1/websites?per_page=50').catch((e) => { console.warn(e.message); return { data: [] }; }),
    api('GET', '/api/vps/v1/virtual-machines').catch((e) => { console.warn(e.message); return []; }),
  ]);
  const siteList = websites.data ?? websites ?? [];
  const vmList = Array.isArray(vms) ? vms : vms.data ?? [];
  console.log(`Sites hébergement : ${siteList.length}`);
  siteList.slice(0, 10).forEach((s) => console.log(`  · ${s.domain ?? s.website ?? JSON.stringify(s)}`));
  console.log(`VPS : ${vmList.length}`);
  vmList.slice(0, 5).forEach((v) => {
    const ip = v.ipv4?.[0]?.address ?? v.ip ?? '?';
    console.log(`  · VM ${v.id ?? '?'} — ${ip} — ${v.hostname ?? v.name ?? ''}`);
  });
  return { websites: siteList, vms: vmList };
}

async function tryDnsHostinger() {
  section('3/5 — DNS sous-domaine Hostinger');
  if (!TOKEN) {
    console.log(`Manuel hPanel → DNS ${APEX} :`);
    console.log(`  Type A | Nom ${SUBDOMAIN} | IP de votre VPS`);
    console.log(`  ou après Node.js Web App : Connect domain → ${FQDN}`);
    return;
  }
  try {
    const records = await api('GET', `/api/dns/v1/zones/${APEX}`);
    console.log(`Zone DNS ${APEX} lue`);
    const vms = await api('GET', '/api/vps/v1/virtual-machines').catch(() => []);
    const vmList = Array.isArray(vms) ? vms : vms.data ?? [];
    const ip = vmList[0]?.ipv4?.[0]?.address;
    if (ip) {
      await api('PUT', `/api/dns/v1/zones/${APEX}`, {
        overwrite: false,
        zone: [{ name: SUBDOMAIN, type: 'A', ttl: 300, records: [{ content: ip }] }],
      });
      console.log(`✓ A ${FQDN} → ${ip}`);
    }
  } catch (e) {
    console.warn('DNS API:', e.message);
  }
}

async function tryNodeJsDeploy() {
  section('4/5 — API Node.js build from archive');
  const zipPath = path.join(process.cwd(), 'deploy', 'hostinger', 'orion-crm.zip');
  if (!TOKEN || !USERNAME || !WEBSITE) {
    console.log('Requis : HOSTINGER_API_TOKEN + HOSTINGER_USERNAME + HOSTINGER_WEBSITE_DOMAIN');
    console.log('(domaine du site Node.js créé dans hPanel, ex. orion.ansdesignprint.com ou *.hostingersite.com)');
    return;
  }
  if (!fs.existsSync(zipPath)) {
    console.log('Archive absente — lancez npm run hostinger:package');
    return;
  }
  const archive = fs.readFileSync(zipPath).toString('base64');
  const body = {
    archive,
    node_version: 20,
    package_manager: 'npm',
    build_script: 'build:hostinger',
  };
  const result = await api(
    'POST',
    `/api/hosting/v1/accounts/${encodeURIComponent(USERNAME)}/websites/${encodeURIComponent(WEBSITE)}/nodejs/builds/from-archive`,
    body,
  );
  console.log('Build lancé :', JSON.stringify(result, null, 2));
}

async function tryVpsInstructions(vms) {
  section('5/5 — VPS Hostinger (SSH / Docker)');
  if (vms.length) {
    const v = vms[0];
    const ip = v.ipv4?.[0]?.address ?? v.ip ?? 'IP_VPS';
    console.log(`SSH : ssh root@${ip}`);
    console.log(`DNS A : ${SUBDOMAIN} → ${ip}`);
  } else {
    console.log('Aucun VPS détecté via API — commandez KVM sur hPanel ou utilisez Node.js Web App.');
  }
  console.log(`Sur le VPS :`);
  console.log(`  scp deploy/hostinger/orion.env root@IP:/var/www/orion-crm/.env`);
  console.log(`  DOMAIN=${FQDN} bash deploy/hostinger/setup-vps.sh`);
  console.log(`Docker (alternative) : deploy/hostinger/docker-compose.yml`);
}

async function main() {
  console.log(`\nORION CRM — déploiement Hostinger multi-canal → https://${FQDN}\n`);
  loadEnvTemplate();
  await tryPackage();
  const { vms } = await tryApiDiscover();
  await tryDnsHostinger();
  await tryNodeJsDeploy();
  await tryVpsInstructions(vms);
  section('Récapitulatif — déploiement 100 % Hostinger');
  console.log(`
A) Node.js Web App (Business/Cloud) — ZIP hPanel
   npm run hostinger:package
   npm run hostinger:hpanel   (avec HOSTINGER_EMAIL + HOSTINGER_PASSWORD)

B) API automatique
   HOSTINGER_API_TOKEN + npm run hostinger:deploy

C) VPS SSH
   deploy/hostinger/setup-vps.sh

URL login : https://${FQDN}/login
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
