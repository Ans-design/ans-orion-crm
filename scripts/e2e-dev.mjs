#!/usr/bin/env node
/** Serveur E2E en mode dev — auth dev + source à jour (onglets fusion). */
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildE2eProcessEnv } from './e2e-env.mjs';

const port = Number(process.env.PORT || 3099);
const root = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.join(root, '..');

function killPort(p) {
  try {
    if (process.platform === 'win32') {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${p} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { stdio: 'ignore' },
      );
    } else {
      execSync(`lsof -ti:${p} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore', shell: true });
    }
  } catch {
    /* port libre */
  }
}

const env = buildE2eProcessEnv(port, {
  NEXTAUTH_URL: process.env.E2E_BASE_URL || `http://localhost:${port}`,
});

console.log(`[e2e:dev] Libération port ${port}…`);
killPort(port);

console.log('[e2e:dev] Préparation base (generate + db push + seed)…');
const nextDir = path.join(cwd, '.next');
if (fs.existsSync(nextDir)) {
  console.log('[e2e:dev] Nettoyage cache .next (bundle admin-control à jour)…');
  fs.rmSync(nextDir, { recursive: true, force: true });
}
execSync('npx prisma generate', { stdio: 'inherit', env, cwd });
execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env, cwd });
execSync('npm run seed', { stdio: 'inherit', env, cwd });

console.log(`[e2e:dev] next dev :${port}…`);
const child = spawn('npx', ['next', 'dev', '-p', String(port)], {
  stdio: 'inherit',
  env,
  cwd,
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 1));
