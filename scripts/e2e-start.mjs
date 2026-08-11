#!/usr/bin/env node
/**
 * Serveur E2E : libère le port, prépare la DB, puis next dev (auth HTTP + routes à jour).
 * Le build prod est réservé au déploiement ; les tests locaux ciblent localhost:3199.
 */
import { execSync, spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildE2eProcessEnv, DEFAULT_E2E_PORT } from './e2e-env.mjs';

const E2E_PORT = DEFAULT_E2E_PORT;
const port = Number(process.env.E2E_PORT || E2E_PORT);
const root = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.join(root, '..');

function killPort(p) {
  for (let round = 0; round < 3; round++) {
    try {
      if (process.platform === 'win32') {
        execSync(
          `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${p} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
          { stdio: 'ignore' },
        );
        execSync('powershell -NoProfile -Command "Start-Sleep -Milliseconds 800"', { stdio: 'ignore' });
      } else {
        execSync(`lsof -ti:${p} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore', shell: true });
        execSync('sleep 0.8', { stdio: 'ignore', shell: true });
      }
    } catch {
      /* port libre */
    }
  }
}

function waitForHttpOk(path, timeoutMs = 180_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      http.get(`http://127.0.0.1:${port}${path}`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve(res.statusCode);
          return;
        }
        retry();
      }).on('error', retry);

      function retry() {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout: ${path} injoignable sur :${port}`));
          return;
        }
        setTimeout(tick, 1500);
      }
    };
    tick();
  });
}

const env = buildE2eProcessEnv(port);

console.log(`[e2e:server] Libération port ${port}…`);
killPort(port);

console.log('[e2e:server] Préparation base (generate + db push + seed)…');
try {
  execSync('npx prisma generate', { stdio: 'inherit', env, cwd });
} catch {
  console.warn('[e2e:server] prisma generate ignoré (client existant ou DLL verrouillée)');
}
execSync('npx prisma db push --accept-data-loss --skip-generate', { stdio: 'inherit', env, cwd });
execSync('npm run seed', { stdio: 'inherit', env, cwd });

console.log(`[e2e:server] Démarrage next dev :${port}…`);
const child = spawn('npx', ['next', 'dev', '-p', String(port)], {
  stdio: ['inherit', 'pipe', 'inherit'],
  env,
  cwd,
  shell: true,
});

child.stdout?.on('data', (chunk) => process.stdout.write(chunk));

try {
  await waitForHttpOk('/login');
  const fusionStatus = await waitForHttpOk('/api/fusion/status');
  console.log(`[e2e:server] Fusion API OK (HTTP ${fusionStatus})`);
  console.log('[e2e:server] serveur frais vérifié');
} catch (err) {
  console.error('[e2e:server]', err.message);
  child.kill('SIGTERM');
  process.exit(1);
}

child.on('exit', (code) => process.exit(code ?? 1));
