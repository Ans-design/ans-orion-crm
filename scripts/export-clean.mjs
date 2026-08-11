#!/usr/bin/env node
/**
 * Prépare un export workspace propre (sans secrets ni artefacts lourds).
 * Usage: npm run export:clean [-- --zip]
 *
 * SEC-001 V10 : allowlist + exclusions + scan canaris (échec si secret/DB détectés).
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  statSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from 'fs';
import { join, relative } from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const outDir = join(root, 'export-clean');
const makeZip = process.argv.includes('--zip');

const FORBIDDEN_CONTENT_RE = [
  /CANARY_SECRET_EXPORT_V10_DO_NOT_SHIP/i,
  /CANARY_DB_EXPORT_V10_DO_NOT_SHIP/i,
  /BEGIN (RSA |OPENSSH )?PRIVATE KEY/i,
  /AKIA[0-9A-Z]{16}/,
];

/** Fichiers qui définissent les canaris (pas une fuite réelle). */
const CANARY_DEFINITION_RE =
  /^(lib\/security\/export-canaries\.ts|scripts\/export-clean\.mjs|tests\/export-clean-canaries\.test\.ts)$/i;

function isForbiddenExportPath(relPath) {
  const base = relPath.replace(/\\/g, '/').split('/').pop() ?? '';
  return (
    /^\.env(?!\.example$)/i.test(base) ||
    /\.env\.backup/i.test(base) ||
    /\.db$/i.test(base) ||
    /\.sqlite/i.test(base) ||
    /\.pem$/i.test(base) ||
    /\.key$/i.test(base) ||
    /id_rsa/i.test(base)
  );
}

export { FORBIDDEN_CONTENT_RE, isForbiddenExportPath };

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.next',
  '.next-build',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '.git',
  'export-clean',
  'test-results',
  'playwright-report',
  'audit-export-ans-orion',
  '_staging-export-ok-crm',
]);

const EXCLUDE_FILE_PATTERNS = [
  /^\.env(?!\.example$)/,
  /\.env\.backup/,
  /\.db$/,
  /\.sqlite$/,
  /\.zip$/,
  /^ANS_ORION_FULL_AUDIT_BUNDLE/,
  /^tsconfig\.tsbuildinfo$/i,
];

const EXCLUDE_PATH_FRAGMENTS = [
  'deploy/hostinger/.chrome-cdp',
  'e2e/.auth',
  'prisma/dev.db',
  'prisma/e2e.db',
];

export function shouldSkip(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  if (EXCLUDE_PATH_FRAGMENTS.some((f) => norm.includes(f))) return true;
  const parts = norm.split('/');
  if (parts.some((p) => EXCLUDE_DIRS.has(p))) return true;
  const base = parts[parts.length - 1] ?? '';
  return EXCLUDE_FILE_PATTERNS.some((re) => re.test(base));
}

export function scanExportTreeForSecrets(dir, relBase = '') {
  const findings = [];
  if (!existsSync(dir)) return findings;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findings.push(...scanExportTreeForSecrets(full, rel));
      continue;
    }
    if (isForbiddenExportPath(rel)) {
      findings.push({ path: rel, reason: 'forbidden_name' });
      continue;
    }
    const relNorm = rel.replace(/\\/g, '/');
    if (CANARY_DEFINITION_RE.test(relNorm)) continue;
    try {
      const st = statSync(full);
      if (st.size > 2_000_000) continue;
      const text = readFileSync(full, 'utf8');
      for (const re of FORBIDDEN_CONTENT_RE) {
        if (re.test(text)) {
          findings.push({ path: rel, reason: 'forbidden_content', pattern: String(re) });
          break;
        }
      }
    } catch {
      /* binaire */
    }
  }
  return findings;
}

function copyTree(srcDir, destDir) {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    const rel = relative(root, src);
    if (shouldSkip(rel)) continue;
    if (isForbiddenExportPath(rel)) continue;
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(dest, { recursive: true });
      copyTree(src, dest);
    } else if (entry.isFile()) {
      mkdirSync(join(dest, '..'), { recursive: true });
      copyFileSync(src, dest);
    }
  }
}

function main() {
  console.log('\n🧹 export:clean — workspace sans secrets (SEC-001)\n');

  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });

  const COPY_ROOTS = [
    'app',
    'components',
    'lib',
    'prisma/schema.prisma',
    'prisma/migrations',
    'scripts',
    'docs',
    'e2e',
    'tests',
    'public',
    'styles',
    'hooks',
    'types',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'next.config.js',
    'tailwind.config.ts',
    'middleware.ts',
    'vitest.config.ts',
    'playwright.config.ts',
    '.env.example',
    '.env.local.example',
    'LIRE_MOI_NOUVEAU_PC.md',
    'README.md',
    'README_LOCAL.md',
  ];

  for (const rel of COPY_ROOTS) {
    const src = join(root, rel);
    if (!existsSync(src)) continue;
    const dest = join(outDir, rel);
    if (statSync(src).isDirectory()) {
      mkdirSync(dest, { recursive: true });
      copyTree(src, dest);
      console.log(`  + ${rel}/`);
    } else {
      mkdirSync(join(dest, '..'), { recursive: true });
      copyFileSync(src, dest);
      console.log(`  + ${rel}`);
    }
  }

  const findings = scanExportTreeForSecrets(outDir);
  if (findings.length > 0) {
    console.error('❌ SEC-001 FAIL — artefacts sensibles détectés dans export-clean :');
    for (const f of findings.slice(0, 20)) {
      console.error(`  - ${f.path} (${f.reason})`);
    }
    process.exit(1);
  }

  const manifest = join(outDir, 'EXPORT_MANIFEST.txt');
  writeFileSync(
    manifest,
    [
      `Generated: ${new Date().toISOString()}`,
      'Policy: SEC-001 V10 canaries',
      'Exclusions: .env*, *.db, node_modules, .next, secrets, keys',
      'Scan: PASS',
    ].join('\n'),
  );

  console.log(`\n✅ Export propre : ${outDir}`);

  if (makeZip) {
    const zipName = `ANS_ORION_CLEAN_EXPORT_${new Date().toISOString().slice(0, 10)}.zip`;
    const zipPath = join(root, zipName);
    if (existsSync(zipPath)) rmSync(zipPath);
    const ps = spawnSync(
      'powershell',
      [
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force`,
      ],
      { stdio: 'inherit' },
    );
    if (ps.status !== 0) {
      console.error('❌ Échec création ZIP');
      process.exit(ps.status ?? 1);
    }
    const zipFindings = scanExportTreeForSecrets(outDir);
    if (zipFindings.length) {
      console.error('❌ Canaris après ZIP — abort');
      process.exit(1);
    }
    console.log(`📦 ZIP : ${zipName}`);
  }

  console.log('\nVoir docs/audit-v10/01_SECURITY_AND_SECRETS.md\n');
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('export-clean.mjs') ||
    process.argv[1].replace(/\\/g, '/').endsWith('scripts/export-clean.mjs'));

if (isMain) {
  main();
}
