#!/usr/bin/env node
/**
 * Détecte un cache .next issu de `next build` lancé avant `next dev`.
 * Symptôme : HTML 200 mais /_next/static/chunks/main-app.js → 404 (affichage brut).
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const HASHED_CHUNK = /^(\d+-[a-f0-9]{8,}|\d+\.[a-f0-9]{8,})\.js$/;

export function isStaleProductionNextCache(root = process.cwd()) {
  const nextDir = path.join(root, '.next');
  if (!fs.existsSync(nextDir)) return false;

  // `next build` laisse BUILD_ID — incompatible avec `next dev` (chunks 404)
  if (fs.existsSync(path.join(nextDir, 'BUILD_ID'))) return true;

  const chunksDir = path.join(nextDir, 'static', 'chunks');
  if (!fs.existsSync(chunksDir)) return false;

  const mainApp = path.join(chunksDir, 'main-app.js');
  if (fs.existsSync(mainApp)) return false;

  try {
    for (const name of fs.readdirSync(chunksDir)) {
      if (HASHED_CHUNK.test(name)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function purgeNextCaches(root = process.cwd()) {
  const targets = [
    path.join(root, '.next'),
    path.join(root, '.turbo'),
    path.join(root, 'node_modules', '.cache'),
  ];
  let removed = 0;
  for (const dir of targets) {
    if (!fs.existsSync(dir)) continue;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      removed++;
      console.log(`✓ Supprimé : ${path.relative(root, dir)}`);
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : '';
      if (code === 'EPERM' || code === 'EBUSY') {
        console.error(`✗ Verrouillé — arrêtez le serveur dev (Ctrl+C) puis relancez.`);
        process.exit(1);
      }
      throw err;
    }
  }
  return removed;
}

/** Appelé avant `next dev` — purge auto si build prod résiduel. */
export function ensureDevNextReady(root = process.cwd()) {
  if (!isStaleProductionNextCache(root)) return;
  console.log('');
  console.log('⚠ Cache .next incompatible avec next dev (artefacts next build détectés).');
  console.log('  → Cause fréquente des 404 sur /_next/static/chunks/main-app.js');
  console.log('  → Purge automatique avant démarrage…');
  console.log('');
  purgeNextCaches(root);
}

if (process.argv[1]?.endsWith('ensure-dev-next.mjs') && process.argv[2] === 'check') {
  process.exit(isStaleProductionNextCache() ? 2 : 0);
}

if (process.argv[1]?.endsWith('ensure-dev-next.mjs') && process.argv[2] === 'purge') {
  purgeNextCaches();
  const gen = spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit', shell: true });
  process.exit(gen.status ?? 0);
}
