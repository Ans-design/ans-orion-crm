#!/usr/bin/env node
/**
 * Liste les fichiers secrets présents dans le workspace (hors git).
 * Ne supprime rien — rappel hygiène P0 audit.
 */
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const patterns = [
  '.env.integrations',
  '.env.vercel.production',
  '.env.vercel.local',
  '.env.production',
  '.env.local',
];

const found = [];

for (const name of patterns) {
  if (existsSync(join(root, name))) found.push(name);
}

for (const entry of readdirSync(root)) {
  if (entry.startsWith('.env.backup')) found.push(entry);
}

console.log('\n🔐 Hygiène secrets ANS ORION\n');
if (found.length === 0) {
  console.log('Aucun fichier secret sensible détecté à la racine.');
} else {
  console.log('Fichiers présents (ignorés par git — NE PAS committer / NE PAS zipper) :');
  for (const f of found) console.log(`  - ${f}`);
  console.log('\nSi un ZIP d’audit a déjà été partagé avec ces fichiers : révoquer / régénérer les secrets.');
}
console.log('\n.gitignore couvre : .env, .env.local, .env.production, .env.backup*, .env.integrations, .env.vercel.*');
console.log('Export audit : npm run audit:build-snapshot (exclusions DB / CDP / e2e auth).\n');
