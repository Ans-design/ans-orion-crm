/**
 * Audit complet ANS ORION — architecture, APIs, design, modules.
 * Usage: npm run audit:orion
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const SKIP = new Set(['node_modules', '.next', '.git', 'dist', 'test-results', 'playwright-report']);

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(name.name)) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function countLines(file) {
  return fs.readFileSync(file, 'utf8').split('\n').length;
}

const allFiles = walk(root);
const tsFiles = allFiles.filter((f) => /\.(tsx?|jsx?)$/.test(f) && !f.includes('node_modules'));
const apiRoutes = tsFiles.filter((f) => rel(f).startsWith('app/api/') && f.endsWith('route.ts'));
const pages = tsFiles.filter((f) => /app\/\(app\).*page\.tsx$/.test(rel(f)));
const uiComponents = allFiles.filter((f) => rel(f).startsWith('components/ui/') && f.endsWith('.tsx'));

const largeFiles = tsFiles
  .map((f) => ({ file: rel(f), lines: countLines(f) }))
  .filter((x) => x.lines > 400)
  .sort((a, b) => b.lines - a.lines);

const apisWithoutGuard = [];
const apisWithAuth = [];
const apisWithTimeout = [];
let apisWithTryCatch = 0;

for (const route of apiRoutes) {
  const content = fs.readFileSync(route, 'utf8');
  const r = rel(route);
  const guarded = /try\s*\{/.test(content) || /runApiHandler/.test(content);
  if (!guarded) apisWithoutGuard.push(r);
  if (/try\s*\{/.test(content)) apisWithTryCatch += 1;
  if (/requireAuth|requireAdmin|requirePermission/.test(content)) apisWithAuth.push(r);
  if (/withTimeout|maxDuration/.test(content)) apisWithTimeout.push(r);
}

const pagesWithoutEmpty = [];
for (const page of pages) {
  const content = fs.readFileSync(page, 'utf8');
  if (!/EmptyState|AppEmptyState|empty-state/.test(content) && !/loading/.test(content)) {
    pagesWithoutEmpty.push(rel(page));
  }
}

let htmlRoutes = 0;
try {
  const map = fs.readFileSync(path.join(root, 'lib/html-source-route-map.ts'), 'utf8');
  htmlRoutes = (map.match(/nextRoute:/g) || []).length;
} catch { /* ignore */ }

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalTsFiles: tsFiles.length,
    apiRoutes: apiRoutes.length,
    appPages: pages.length,
    uiComponents: uiComponents.length,
    largeFilesOver400: largeFiles.length,
    apisGuarded: apiRoutes.length - apisWithoutGuard.length,
    apisWithTryCatch,
    apisWithAuth: apisWithAuth.length,
    apisWithTimeout: apisWithTimeout.length,
    htmlRoutesMapped: htmlRoutes,
  },
  largeFiles: largeFiles.slice(0, 25),
  apisMissingGuard: apisWithoutGuard.slice(0, 30),
  pagesToEnhanceEmptyStates: pagesWithoutEmpty.slice(0, 20),
  designSystem: {
    tokensCss: fs.existsSync('styles/design-tokens.css'),
    tokensTs: fs.existsSync('lib/design/tokens.ts'),
    appUiBarrel: fs.existsSync('components/ui/app-ui.ts'),
    formatters: fs.existsSync('lib/formatters.ts'),
  },
  recommendations: [
    largeFiles.length > 0 ? `Découper ${largeFiles.length} fichier(s) > 400 lignes` : null,
    apisWithoutGuard.length > 0
      ? `Protéger ${apisWithoutGuard.length} route(s) API (try/catch ou runApiHandler)`
      : null,
    'POS : ne pas refactoriser — sync prix via Excel',
    'Design : utiliser AppPageHeader + orion-card sur toutes les pages',
  ].filter(Boolean),
};

const outDir = path.join(root, 'data', 'reference');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'ORION_AUDIT_REPORT.json'), JSON.stringify(report, null, 2));

const md = `# Audit ORION — ${report.generatedAt.split('T')[0]}

## Résumé

| Métrique | Valeur |
|----------|--------|
| Fichiers TS/TSX | ${report.summary.totalTsFiles} |
| Routes API | ${report.summary.apiRoutes} |
| Pages app | ${report.summary.appPages} |
| Composants UI | ${report.summary.uiComponents} |
| Fichiers > 400 lignes | ${report.summary.largeFilesOver400} |
| APIs protégées | ${report.summary.apisGuarded}/${report.summary.apiRoutes} |
| APIs avec auth | ${report.summary.apisWithAuth}/${report.summary.apiRoutes} |
| APIs avec timeout | ${report.summary.apisWithTimeout}/${report.summary.apiRoutes} |
| Routes HTML mappées | ${report.summary.htmlRoutesMapped} |

## Fichiers volumineux (top 10)

${largeFiles.slice(0, 10).map((f) => `- \`${f.file}\` — ${f.lines} lignes`).join('\n')}

## Design system

- tokens CSS : ${report.designSystem.tokensCss ? '✓' : '✗'}
- tokens TS : ${report.designSystem.tokensTs ? '✓' : '✗'}
- app-ui barrel : ${report.designSystem.appUiBarrel ? '✓' : '✗'}
- formatters : ${report.designSystem.formatters ? '✓' : '✗'}

## Recommandations

${report.recommendations.map((r) => `- ${r}`).join('\n')}
`;

fs.writeFileSync(path.join(outDir, 'ORION_AUDIT_REPORT.md'), md);
console.log('\n═══ Audit ORION ═══\n');
console.log(JSON.stringify(report.summary, null, 2));
console.log(`\n→ ${path.join(outDir, 'ORION_AUDIT_REPORT.md')}\n`);
