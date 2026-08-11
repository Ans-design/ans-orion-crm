#!/usr/bin/env node
/**
 * Vérifie DB locale + comptes (env uniquement) + smoke HTTP modules critiques.
 * SEC-01 : aucun mot de passe hardcodé.
 *
 * Requis : READY_EMAIL+READY_PASSWORD ou SEED_DEMO_EMAIL+SEED_DEMO_PASSWORD (≥12)
 * Usage: APP_ENV=local node scripts/ready-check-local.mjs
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const BASE = process.env.READY_BASE_URL || 'http://127.0.0.1:3020';
const prisma = new PrismaClient();

function loadAccountsFromEnv() {
  const accounts = [];
  const demoEmail = (process.env.READY_EMAIL || process.env.SEED_DEMO_EMAIL || process.env.DEMO_EMAIL || '').trim();
  const demoPassword =
    process.env.READY_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_PASSWORD || '';
  if (demoEmail && demoPassword.length >= 12) {
    accounts.push({
      email: demoEmail.toLowerCase(),
      password: demoPassword,
      name: process.env.SEED_DEMO_NAME || 'Demo ORION',
      role: 'admin',
    });
  }
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';
  if (
    adminEmail &&
    adminPassword.length >= 12 &&
    adminEmail.toLowerCase() !== (demoEmail || '').toLowerCase()
  ) {
    accounts.push({
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      name: process.env.ADMIN_NAME || 'Admin ANS',
      role: 'admin',
    });
  }
  return accounts;
}

function parseSetCookie(res) {
  const raw =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie')].filter(Boolean);
  const jar = [];
  for (const line of raw) {
    if (!line) continue;
    jar.push(String(line).split(';')[0]);
  }
  return jar;
}

async function ensureUsers(accounts) {
  for (const u of accounts) {
    const existing = await prisma.user.findFirst({ where: { email: u.email } });
    if (existing) {
      const hash = existing.password ?? '';
      const ok = hash ? await bcrypt.compare(u.password, hash) : false;
      if (!ok) {
        const password = await bcrypt.hash(u.password, 12);
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            password,
            role: u.role || existing.role,
            name: existing.name || u.name,
            mustChangePassword: false,
          },
        });
        console.log(`[user] repaired ${u.email}`);
      } else {
        console.log(`[user] ok ${u.email}`);
      }
    } else {
      const password = await bcrypt.hash(u.password, 12);
      await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          password,
          role: u.role,
          mustChangePassword: false,
        },
      });
      console.log(`[user] created ${u.email}`);
    }
  }
}

async function loginCookies(email, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  if (!csrfRes.ok) throw new Error(`csrf ${csrfRes.status}`);
  const csrfCookies = parseSetCookie(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const cookieHeader = csrfCookies.join('; ');

  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    json: 'true',
    callbackUrl: `${BASE}/dashboard`,
  });

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader,
    },
    body,
    redirect: 'manual',
  });

  const loginCookieList = parseSetCookie(loginRes);
  const all = [...csrfCookies, ...loginCookieList];
  const map = new Map();
  for (const c of all) {
    const name = c.split('=')[0];
    map.set(name, c);
  }
  return [...map.values()].join('; ');
}

async function smoke(cookie, paths) {
  const results = [];
  for (const path of paths) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: cookie ? { Cookie: cookie } : {},
        redirect: 'manual',
      });
      const ms = Date.now() - t0;
      const loc = res.headers.get('location') || '';
      let finalStatus = res.status;
      if (res.status >= 300 && res.status < 400 && loc && !loc.includes('/login')) {
        const abs = loc.startsWith('http') ? loc : `${BASE}${loc}`;
        const res2 = await fetch(abs, {
          headers: cookie ? { Cookie: cookie } : {},
          redirect: 'follow',
        });
        finalStatus = res2.status;
      }
      const pass = finalStatus < 500 && !(finalStatus === 401 || finalStatus === 403 || loc.includes('/login'));
      const authFail = loc.includes('/login') || finalStatus === 401;
      results.push({
        path,
        status: finalStatus,
        ms,
        ok: pass && !authFail,
        note: authFail ? 'auth' : '',
      });
    } catch (e) {
      results.push({ path, status: 0, ms: Date.now() - t0, ok: false, note: e.message });
    }
  }
  return results;
}

async function main() {
  if ((process.env.APP_ENV || '').toLowerCase() !== 'local' && process.env.LOCAL_DEV !== 'true') {
    console.error('❌ ready-check-local : APP_ENV=local ou LOCAL_DEV=true requis');
    process.exitCode = 1;
    return;
  }

  const accounts = loadAccountsFromEnv();
  if (accounts.length === 0) {
    console.error('❌ READY_EMAIL+READY_PASSWORD ou SEED_DEMO_* / DEMO_* requis (MDP ≥12).');
    process.exitCode = 1;
    return;
  }

  console.log('=== READY CHECK', BASE, '===');

  const ready = await fetch(`${BASE}/api/health/ready`);
  const readyBody = await ready.json().catch(() => ({}));
  console.log('[health/ready]', ready.status, readyBody?.data?.ok ?? readyBody?.ok);

  await ensureUsers(accounts);
  const counts = {
    clients: await prisma.client.count(),
    devis: await prisma.devis.count(),
    commandes: await prisma.commande.count(),
    stock: await prisma.stockItem.count(),
    factures: await prisma.facture.count(),
    paiements: await prisma.paiement.count(),
  };
  console.log('[counts]', JSON.stringify(counts));

  let cookie = '';
  try {
    cookie = await loginCookies(accounts[0].email, accounts[0].password);
    console.log('[login] ok cookies=', cookie.split(';').length, 'email=', accounts[0].email);
  } catch (e) {
    console.error('[login] FAIL', e.message);
    process.exitCode = 1;
    return;
  }

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: cookie },
  });
  const session = await sessionRes.json().catch(() => ({}));
  console.log('[session]', sessionRes.status, session?.user?.email || session?.user?.name || 'empty');

  const paths = [
    '/dashboard',
    '/clients',
    '/pos',
    '/devis',
    '/commandes',
    '/stock',
    '/production',
    '/machines',
    '/paiements',
    '/factures',
    '/livraisons',
    '/rapports',
    '/messagerie',
    '/administration/synchronisation',
    '/api/devis?summary=1',
    '/api/commandes?summary=1',
    '/api/stock/items?page=1&pageSize=5',
    '/api/dashboard/stats',
    '/api/nav/badges',
    '/api/alerts/ticker',
  ];

  const results = await smoke(cookie, paths);
  let fail = 0;
  for (const r of results) {
    const mark = r.ok ? 'OK ' : 'FAIL';
    if (!r.ok) fail += 1;
    console.log(`[${mark}] ${r.status} ${r.ms}ms ${r.path}${r.note ? ' (' + r.note + ')' : ''}`);
  }

  console.log(fail === 0 ? '\n✓ PROJET PRÊT À UTILISER' : `\n✗ ${fail} échec(s) — correction requise`);
  if (fail) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
