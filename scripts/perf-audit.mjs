/**
 * Audit perf statique — imports lourds + routes Next volumineuses.
 * Usage: npm run perf:audit
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = process.cwd();

function rg(pattern, glob) {
  try {
    return execSync(`npx rg -l "${pattern}" ${glob}`, { encoding: 'utf8', cwd: root }).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

console.log('═══ ANS ORION — Perf audit ═══\n');

const catalogueInComponents = rg("from '@/lib/data/catalogue'|from \"@/lib/data/catalogue\"", 'components app --glob "!**/catalogue.ts"');
console.log(`Imports catalogue statique (hors data): ${catalogueInComponents.length}`);
for (const f of catalogueInComponents.slice(0, 15)) {
  console.log(`  · ${f}`);
}
if (catalogueInComponents.length > 15) console.log(`  … +${catalogueInComponents.length - 15}`);

const configTypesInLayout = rg("from '@/lib/data/config-types'", 'app --glob "**/layout.tsx"');
console.log(`\nconfig-types dans layouts: ${configTypesInLayout.length}`);
for (const f of configTypesInLayout) console.log(`  · ${f}`);

const buildMeta = path.join(root, '.next', 'build-manifest.json');
if (fs.existsSync(buildMeta)) {
  const manifest = JSON.parse(fs.readFileSync(buildMeta, 'utf8'));
  const pages = Object.keys(manifest.pages ?? {});
  console.log(`\nPages buildées: ${pages.length}`);
  console.log('Lancez ANALYZE=true npm run build pour le rapport bundle détaillé.');
} else {
  console.log('\nPas de build local — exécutez npm run build puis relancez perf:audit');
}

console.log('\n✓ Audit terminé — voir docs/PERFORMANCE.md');
