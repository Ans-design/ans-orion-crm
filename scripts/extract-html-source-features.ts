/**
 * Analyse A-Z du fichier HTML source v29 et compare avec le projet Next.js.
 * Usage: HTML_SOURCE_PATH="..." npx tsx scripts/extract-html-source-features.ts
 */
import fs from 'fs';
import path from 'path';
import { HTML_PAGE_ROUTE_MAP, HTML_ROLE_MAP } from '../lib/html-source-route-map';

const CANDIDATE_PATHS = [
  process.env.HTML_SOURCE_PATH,
  path.join(process.cwd(), 'data', 'reference', 'ans-orion-v29-source.html'),
  path.join(process.cwd(), 'data', 'ANS_ORION_FUSION_METIER_POS_STOCK_PRIX_COMPLET.xlsx'),
  'e:\\C\\Telegram Desktop\\1\\crm complet ans design sauf devis deja fini par les developpeur ok.html',
  path.join(process.env.USERPROFILE || '', 'Downloads', 'crm complet ans design sauf devis deja fini par les developpeur ok.html'),
].filter(Boolean) as string[];

function resolveHtmlPath(): string {
  for (const p of CANDIDATE_PATHS) {
    if (p.endsWith('.html') && fs.existsSync(p)) return p;
  }
  throw new Error(
    'Fichier HTML introuvable. Copiez-le vers data/reference/ans-orion-v29-source.html ou définissez HTML_SOURCE_PATH.',
  );
}

function appRoutesExist(): string[] {
  const appDir = path.join(process.cwd(), 'app');
  const routes: string[] = [];
  function walk(dir: string, prefix = '') {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = `${prefix}/${ent.name}`.replace(/\\/g, '/');
      if (ent.isDirectory()) walk(path.join(dir, ent.name), rel);
      else if (ent.name === 'page.tsx') {
        let route = rel.replace(/\/page\.tsx$/, '') || '/';
        route = route.replace(/^\/?\(app\)/, '').replace(/^\/?\(auth\)/, '') || '/';
        routes.push(route);
      }
    }
  }
  walk(appDir);
  return routes;
}

function extractNavIds(html: string): Record<string, string[]> {
  const navs: Record<string, string[]> = {};
  const navStart = html.indexOf('const NAVS = {');
  if (navStart < 0) return navs;
  let depth = 0;
  let navEnd = -1;
  for (let i = navStart + 'const NAVS = '.length; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') {
      depth--;
      if (depth === 0) {
        navEnd = i + 1;
        break;
      }
    }
  }
  if (navEnd < 0) return navs;
  const block = html.slice(navStart, navEnd);
  for (const roleMatch of block.matchAll(/\n\s*(\w+):\s*\[/g)) {
    const role = roleMatch[1];
    const start = roleMatch.index! + roleMatch[0].length;
    const slice = block.slice(start);
    const end = slice.indexOf('\n  ],');
    const section = end > 0 ? slice.slice(0, end) : slice.slice(0, 500);
    const ids = [...section.matchAll(/\{id:'([^']+)'/g)].map((m) => m[1]);
    if (ids.length) navs[role] = ids;
  }
  return navs;
}

function extractPages(html: string): string[] {
  return [...html.matchAll(/\/\/ ─── PAGE: ([^─]+) ───/g)].map((m) => m[1].trim());
}

function extractMatricules(html: string): string[] {
  const mats = new Set<string>();
  for (const m of html.matchAll(/mat:\s*'([^']+)'/g)) mats.add(m[1]);
  return [...mats].sort();
}

function main() {
  const htmlPath = resolveHtmlPath();
  const html = fs.readFileSync(htmlPath, 'utf8');
  const navs = extractNavIds(html);
  const pages = extractPages(html);
  const matricules = extractMatricules(html);
  const appRoutes = appRoutesExist();

  const allNavIds = [...new Set(Object.values(navs).flat())];
  const mapped: { htmlId: string; route: string; exists: boolean }[] = [];
  const missingRoutes: string[] = [];

  for (const id of allNavIds) {
    const route = HTML_PAGE_ROUTE_MAP[id];
    if (!route) {
      missingRoutes.push(id);
      continue;
    }
    const exists = appRoutes.some((r) => r === route || r.startsWith(`${route}/`));
    mapped.push({ htmlId: id, route, exists });
  }

  const report = {
    source: htmlPath,
    analyzedAt: new Date().toISOString(),
    stats: {
      htmlPages: pages.length,
      navRoles: Object.keys(navs).length,
      navIds: allNavIds.length,
      matricules: matricules.length,
      mappedRoutes: mapped.filter((m) => m.exists).length,
      unmappedNavIds: missingRoutes.length,
      brokenMappings: mapped.filter((m) => !m.exists).length,
    },
    navsByRole: navs,
    htmlPages: pages,
    matricules,
    roleMapping: HTML_ROLE_MAP,
    routeMapping: mapped,
    unmappedNavIds: missingRoutes,
    missingNextRoutes: mapped.filter((m) => !m.exists),
    recommendations: [
      missingRoutes.length
        ? `Créer ou mapper ${missingRoutes.length} IDs NAV non reliés à Next.js`
        : 'Tous les IDs NAV principaux sont mappés',
      mapped.some((m) => !m.exists)
        ? 'Certaines routes mappées n\'existent pas encore dans app/'
        : 'Routes mappées présentes dans app/',
      'POS et devis : préserver l\'existant, corriger prix/articles via sync:pos-prices',
      'Seed équipe v29 : npm run seed:production (ORION_V29_ACCOUNTS déjà intégrés)',
    ],
  };

  const outDir = path.join(process.cwd(), 'data', 'reference');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'html-source-gap-report.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log('═══ ANS ORION — analyse HTML source ═══\n');
  console.log(`Source : ${htmlPath}`);
  console.log(`Pages HTML : ${pages.length}`);
  console.log(`Rôles NAV : ${Object.keys(navs).length}`);
  console.log(`IDs navigation : ${allNavIds.length}`);
  console.log(`Matricules : ${matricules.length}`);
  console.log(`Routes OK : ${report.stats.mappedRoutes}/${mapped.length}`);
  console.log(`IDs non mappés : ${missingRoutes.join(', ') || 'aucun'}`);
  console.log(`\nRapport → ${outFile}`);
}

main();
