/**
 * Audit matières/grammages POS — génère docs/MATERIALS_GRAMMAGES_FULL_AUDIT.md
 * Usage: npx tsx scripts/audit-materials-grammages.ts
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { expandAllCatalogMaterials } from '../lib/server/modules/materials/materials-catalog-expander';
import { CATALOGUE } from '../lib/data/catalogue';
import { OFFICIAL_MATERIAL_COMPAT } from '../lib/data/material-compat-official';
import { SUPPLEMENTARY_MATERIAL_COMPAT } from '../lib/data/material-supplementary';

const catalog = expandAllCatalogMaterials();

const byFamily = new Map<string, typeof catalog>();
for (const c of catalog) {
  const list = byFamily.get(c.family) ?? [];
  list.push(c);
  byFamily.set(c.family, list);
}

let md = `# Audit complet Matières / Grammages / Supports POS\n\n`;
md += `Généré le ${new Date().toISOString()}\n\n`;
md += `## Résumé\n\n`;
md += `- **Matières/grammages catalogués** : ${catalog.length}\n`;
md += `- **OFFICIAL_MATERIAL_COMPAT** : ${OFFICIAL_MATERIAL_COMPAT.length} familles\n`;
md += `- **SUPPLEMENTARY** : ${SUPPLEMENTARY_MATERIAL_COMPAT.length} familles\n`;
md += `- **Articles POS catalogue** : ${CATALOGUE.length}\n\n`;

md += `## Par famille\n\n`;
for (const [family, items] of [...byFamily.entries()].sort()) {
  md += `### ${family} (${items.length})\n\n`;
  md += `| Matière | Grammage | Unité std | Source |\n|---|---|---|---|\n`;
  for (const i of items) {
    md += `| ${i.label} | ${i.grammage ?? '—'} | ${i.unitStandard ?? '—'} | ${i.source} |\n`;
  }
  md += `\n`;
}

md += `## Grammages Offset\n\n`;
catalog.filter((c) => c.materialKey.startsWith('offset:')).forEach((c) => {
  md += `- ${c.grammage}\n`;
});

md += `\n## Glossy / Couché brillant\n\n`;
catalog.filter((c) => c.materialKey.startsWith('glossy:')).forEach((c) => {
  md += `- ${c.grammage}\n`;
});

md += `\n## Autocopiant / NCR\n\n`;
catalog.filter((c) => c.materialKey.includes('autocopiant') || c.materialKey.includes('ncr')).forEach((c) => {
  md += `- ${c.label}\n`;
});

md += `\n## Recommandations\n\n`;
md += `1. Exécuter \`npm run seed:base-materials\` après \`npx prisma db push\`\n`;
md += `2. Compléter les prix base impression sans finition (anomalie si manquant)\n`;
md += `3. Publier matière par matière après validation\n`;
md += `4. Lier stock via Backoffice > Matières > Depuis stock\n`;

const matrixPath = join(process.cwd(), 'docs', 'MATERIALS_COMPLETENESS_MATRIX.md');
const auditPath = join(process.cwd(), 'docs', 'MATERIALS_GRAMMAGES_FULL_AUDIT.md');
writeFileSync(auditPath, md, 'utf8');

let matrix = `# Matrice exhaustivité Matières / Grammages\n\n`;
matrix += `| Famille | Matière | Grammage | Unité | Présent DB | Statut | Action |\n|---|---|---|---|---|---|---|\n`;
for (const c of catalog) {
  matrix += `| ${c.family} | ${c.label} | ${c.grammage ?? '—'} | ${c.unitStandard ?? '—'} | à sync | prix manquant | seed + compléter prix |\n`;
}
writeFileSync(matrixPath, matrix, 'utf8');

console.log(`✅ ${auditPath}`);
console.log(`✅ ${matrixPath}`);
console.log(`   ${catalog.length} lignes cataloguées`);
