#!/usr/bin/env node
/**
 * Smoke production locale (hors Hostinger) :
 * build déjà présent → next start → health + redirects.
 * Ne touche jamais Hostinger / domaine public.
 */
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.LOCAL_PROD_SMOKE_PORT || 3299);
const base = `http://127.0.0.1:${port}`;

function waitOk(pathname, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      http
        .get(`${base}${pathname}`, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve(res.statusCode);
          else retry();
        })
        .on('error', retry);
      function retry() {
        if (Date.now() - start > timeoutMs) reject(new Error(`Timeout ${pathname}`));
        else setTimeout(tick, 1000);
      }
    };
    tick();
  });
}

async function getJson(pathname) {
  return new Promise((resolve, reject) => {
    http
      .get(`${base}${pathname}`, (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') });
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

const env = {
  ...process.env,
  APP_ENV: 'local',
  LOCAL_DEV: 'true',
  NODE_ENV: 'production',
  PORT: String(port),
  HOST: '127.0.0.1',
  NEXTAUTH_URL: base,
  NEXT_PUBLIC_APP_URL: base,
  USE_PRODUCTION_DB: 'false',
  HOSTINGER: '',
  DISABLE_HOSTINGER_DEPLOY: 'true',
};

console.log('[local-prod-smoke] next start', base);
const child = spawn('npx', ['next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  cwd: root,
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
});

let failed = false;
try {
  await waitOk('/api/health');
  const health = await getJson('/api/health');
  if (health.status !== 200 || health.body.ok !== true) {
    throw new Error(`health fail: ${JSON.stringify(health)}`);
  }
  console.log('[local-prod-smoke] /api/health OK');

  const login = await new Promise((resolve, reject) => {
    http
      .get(`${base}/login`, (res) => {
        res.resume();
        resolve(res.statusCode);
      })
      .on('error', reject);
  });
  if (!login || login >= 500) throw new Error(`/login status ${login}`);
  console.log('[local-prod-smoke] /login OK', login);
  console.log('[local-prod-smoke] PASS');
} catch (e) {
  failed = true;
  console.error('[local-prod-smoke] FAIL', e);
} finally {
  child.kill('SIGTERM');
  setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch {
      /* ignore */
    }
    process.exit(failed ? 1 : 0);
  }, 1500);
}
