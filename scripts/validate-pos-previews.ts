/**
 * Validation anti-mockup faux — registre POS preview
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POS_CATALOGUE } from '../lib/data/catalogue-meta';
import {
  PRODUCT_PREVIEW_REGISTRY,
  PRODUCT_PREVIEW_REGISTRY_COUNT,
} from '../lib/pos-preview/product-preview.registry';
import {
  CUP_PRODUCT_IDS,
  DEPRECATED_ASSET_PATTERNS,
  MUG_PRODUCT_IDS,
} from '../lib/pos-preview/product-preview.types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const errors: string[] = [];
const warnings: string[] = [];
const lines: string[] = [];

function scanDir(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) acc = scanDir(full, acc);
    else acc.push(full);
  }
  return acc;
}

function rel(p: string) {
  return path.relative(root, p).replace(/\\/g, '/');
}

if (PRODUCT_PREVIEW_REGISTRY_COUNT !== 95) {
  errors.push(`Registre: ${PRODUCT_PREVIEW_REGISTRY_COUNT} entrées, attendu 95`);
}

for (const item of POS_CATALOGUE) {
  const entry = PRODUCT_PREVIEW_REGISTRY[item.id];
  if (!entry) {
    errors.push(`Produit manquant: ${item.id}`);
    continue;
  }
  if (!entry.family) errors.push(`${item.id}: famille manquante`);
  if (!entry.fallbackComponent) errors.push(`${item.id}: fallback manquant`);
  if (!entry.previewMode) errors.push(`${item.id}: previewMode manquant`);
  if (!entry.orientationMode) errors.push(`${item.id}: orientationMode manquant`);

  if (entry.mockupKey === 'mug' && !MUG_PRODUCT_IDS.has(item.id)) {
    errors.push(`${item.id}: mockupKey mug interdit (seul gd-mug autorisé)`);
  }
  if (entry.mockupKey === 'cup' && !CUP_PRODUCT_IDS.has(item.id)) {
    errors.push(`${item.id}: mockupKey cup interdit (seul pkg-gobelet autorisé)`);
  }

  for (const asset of [entry.mockup2D, entry.mockup3D, ...entry.allowedAssets].filter(Boolean)) {
    for (const pattern of DEPRECATED_ASSET_PATTERNS) {
      const p = pattern.replace(/\/$/, '');
      if (String(asset).includes(p)) {
        errors.push(`${item.id}: asset deprecated référencé: ${asset}`);
      }
    }
  }

  lines.push(
    `| ${item.name} | ${entry.family} | ${entry.fallbackComponent} | ${entry.previewMode} | ${entry.mockupKey ?? '—'} | OK |`,
  );
}

const legacyPatterns = [
  'article-mockups',
  '/assets/products/studio/',
  '/assets/products/fallbacks/mug-white',
];

for (const dir of [path.join(root, 'components/pos-preview'), path.join(root, 'components/pos')]) {
  if (!fs.existsSync(dir)) continue;
  const files = scanDir(dir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pat of legacyPatterns) {
      if (content.includes(pat)) {
        warnings.push(`${rel(file)}: référence legacy "${pat}"`);
      }
    }
  }
}

const reportPath = path.join(root, 'docs/POS_PREVIEW_VALIDATION_REPORT.md');
const report = `# Rapport validation aperçus POS

Généré: ${new Date().toISOString()}

## Résultat

- Produits registre: **${PRODUCT_PREVIEW_REGISTRY_COUNT}**
- Erreurs: **${errors.length}**
- Avertissements: **${warnings.length}**
- Statut: **${errors.length === 0 ? 'PASS' : 'FAIL'}**

## Erreurs

${errors.length ? errors.map((e) => `- ${e}`).join('\n') : '_Aucune_'}

## Avertissements

${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '_Aucun_'}

## Détail produits

| Produit | Famille | Fallback | Mode | MockupKey | Statut |
|---------|---------|----------|------|-----------|--------|
${lines.join('\n')}
`;

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report, 'utf8');

console.log(`Validation POS previews: ${errors.length === 0 ? 'PASS' : 'FAIL'}`);
if (errors.length) {
  errors.forEach((e) => console.error('  ERROR:', e));
  process.exit(1);
}
if (warnings.length) warnings.forEach((w) => console.warn('  WARN:', w));
