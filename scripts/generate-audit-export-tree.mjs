#!/usr/bin/env node
/** Generate 02_PROJECT_TREE.md for audit bundle */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'audit-export-ans-orion', '02_PROJECT_TREE.md');
const EXCLUDE = new Set([
  'node_modules', '.next', '.turbo', 'dist', 'build', 'coverage', '.git',
  'audit-export-ans-orion', 'playwright-report', 'test-results', '.audit-screenshots',
]);
const MAX_DEPTH = 4;
const MAX_LINES = 350;

const FOLDER_NOTES = {
  app: 'Pages Next.js App Router + routes API (`app/api/**`)',
  components: 'Composants React UI (layout, POS, CRM, admin, messagerie…)',
  lib: 'Logique métier, services, data, auth, navigation, Prisma helpers',
  prisma: 'Schéma DB, migrations PostgreSQL, demo.db SQLite local',
  public: 'Assets statiques (SVG, mockups, images système — pas uploads clients)',
  scripts: 'Seeds, deploy, audits, migrations, utilitaires CLI',
  docs: 'Documentation technique et audits internes',
  hooks: 'Hooks React partagés',
  e2e: 'Tests Playwright end-to-end',
  tests: 'Tests Vitest unitaires/intégration',
  types: 'Types TypeScript globaux',
  styles: 'CSS global, tokens design',
};

function walk(dir, depth = 0, lines = []) {
  if (depth > MAX_DEPTH || lines.length >= MAX_LINES) return lines;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return lines;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    if (EXCLUDE.has(e.name) || e.name.startsWith('.env')) continue;
    const rel = path.relative(root, path.join(dir, e.name)).replace(/\\/g, '/');
    const indent = '  '.repeat(depth);
    if (e.isDirectory()) {
      lines.push(`${indent}${e.name}/`);
      walk(path.join(dir, e.name), depth + 1, lines);
    } else if (depth <= 2) {
      lines.push(`${indent}${e.name}`);
    }
    if (lines.length >= MAX_LINES) break;
  }
  return lines;
}

const tree = walk(root);
let md = `# Arborescence projet ANS ORION

> Généré automatiquement — profondeur max ${MAX_DEPTH}, ${tree.length} lignes (tronqué si nécessaire).
> Exclus : node_modules, .next, .git, .env*, audit-export-ans-orion

## Statistiques fichiers source

| Dossier | Fichiers .ts/.tsx/.js/.jsx (approx.) |
|---------|--------------------------------------|
| app/ | ~329 |
| components/ | ~280 |
| lib/ | ~526 |
| scripts/ | ~51 |
| tests/ | ~163 |
| e2e/ | ~21 |

## Dossiers principaux

`;
for (const [k, v] of Object.entries(FOLDER_NOTES)) {
  md += `- **${k}/** — ${v}\n`;
}
md += `\n## Arbre (racine)\n\n\`\`\`\n${tree.join('\n')}\n\`\`\`\n`;
fs.writeFileSync(out, md, 'utf8');
console.log('Wrote', out);
