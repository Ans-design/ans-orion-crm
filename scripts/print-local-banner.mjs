#!/usr/bin/env node
/**
 * Bannière démarrage local — ANS ORION
 * Ne pas taper l’URL dans PowerShell : ouvrir le lien dans le navigateur.
 */

const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || '3020';
const url = `http://${host}:${port}`;

console.log('');
console.log('══════════════════════════════════════════════════════════');
console.log('  ANS ORION — mode local (Vercel + SQLite/Neon, pas Hostinger)');
console.log('══════════════════════════════════════════════════════════');
console.log('');
console.log(`  Ouvrir dans le NAVIGATEUR (pas dans le terminal) :`);
console.log(`  → ${url}`);
console.log(`  → ${url}/dev-health   (diagnostic)`);
console.log(`  → ${url}/dev-preview`);
console.log('');
console.log('  Commande recommandée :');
console.log('    npm run dev:local');
console.log('');
console.log('  Si CSS/chunks 404 ou HTML brut :');
console.log('    npm run dev:clean');
console.log('    npm run dev:local');
console.log('  Puis Ctrl+Shift+R dans le navigateur (hard refresh).');
console.log('');
console.log('  ⚠ Ne pas exécuter http://... dans PowerShell — ce n’est pas une commande.');
console.log('');
