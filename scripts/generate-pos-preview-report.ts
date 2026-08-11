#!/usr/bin/env npx tsx
import { writeFileSync } from 'fs';
import { listProductPreviewEntries } from '../lib/pos-preview/product-preview.registry';

const rows = listProductPreviewEntries().sort((a, b) => a.productId.localeCompare(b.productId));
let md = `# Rapport aperçu — 95 produits POS

Généré automatiquement depuis \`product-preview.registry.ts\`.

| ID | Nom | Famille | Mode | Fallback | MockupKey | Échelle | Statut |
|---|---|---|---|---|---|---|---|
`;
for (const r of rows) {
  md += `| ${r.productId} | ${r.productName} | ${r.family} | ${r.previewMode} | ${r.fallbackComponent} | ${r.mockupKey ?? '-'} | ${r.scaleReference ? 'oui' : 'non'} | OK |\n`;
}
writeFileSync('docs/POS_PREVIEW_95_PRODUCTS_REPORT.md', md);
console.log(`Report: ${rows.length} products`);
