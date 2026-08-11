#!/usr/bin/env node

/**

 * Nettoie les artefacts de build Next.js (résout chunks/CSS 404 après changement de config).

 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();

const targets = [
  path.join(root, '.next'),
  path.join(root, '.turbo'),
  path.join(root, 'node_modules', '.cache'),
  // Ne pas supprimer node_modules/.prisma — provoque EPERM + prisma generate obligatoire
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removeDirWindowsFallback(dir) {
  const result = spawnSync('cmd', ['/c', 'rd', '/s', '/q', dir], {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });
  return result.status === 0 || !fs.existsSync(dir);
}

function removeDirSync(dir) {
  const opts = { recursive: true, force: true, maxRetries: 8, retryDelay: 250 };
  try {
    fs.rmSync(dir, opts);
    return true;
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? err.code : '';
    if (code === 'ENOTEMPTY' && process.platform === 'win32') {
      return removeDirWindowsFallback(dir);
    }
    throw err;
  }
}

async function removeDirWithRetries(dir, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    if (!fs.existsSync(dir)) return true;
    try {
      if (removeDirSync(dir)) return true;
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : '';
      if (code === 'EPERM' || code === 'EBUSY' || code === 'ENOTEMPTY') {
        if (i < attempts - 1) {
          await sleep(300 * (i + 1));
          continue;
        }
        if (process.platform === 'win32' && removeDirWindowsFallback(dir)) return true;
        return false;
      }
      throw err;
    }
    if (!fs.existsSync(dir)) return true;
    await sleep(200);
  }
  return !fs.existsSync(dir);
}

let removed = 0;
for (const dir of targets) {
  const rel = path.relative(root, dir);
  if (!fs.existsSync(dir)) {
    console.log(`· Absent : ${rel}`);
    continue;
  }
  const ok = await removeDirWithRetries(dir);
  if (ok) {
    console.log(`✓ Supprimé : ${rel}`);
    removed++;
  } else {
    console.log(`⚠ Verrouillé (serveur actif ?) — ignoré : ${rel}`);
  }
}



console.log('');

if (removed === 0) {

  console.log('· Aucun cache à purger.');

} else {

  console.log(`✓ ${removed} dossier(s) de cache supprimé(s).`);

}

console.log('');

console.log('  Arrêtez d’abord le serveur dev (Ctrl+C), puis :');

console.log('    npx prisma generate');

console.log('    npm run dev:local');

console.log('');

console.log('  URL : http://127.0.0.1:3020');

console.log('  Hard refresh navigateur : Ctrl+Shift+R');

console.log('');

