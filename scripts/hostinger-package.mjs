/**
 * Crée deploy/hostinger/orion-crm.zip pour upload hPanel Node.js ou API from-archive (max 50 Mo).
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const outDir = path.join(root, 'deploy', 'hostinger');
const outZip = path.join(outDir, 'orion-crm.zip');

const EXCLUDE_DIRS = new Set([
  'node_modules', '.next', '.git', '.vercel', 'dist', 'out',
  'test-results', 'playwright-report', 'blob-report', '.turbo',
  'agent-tools', 'coverage', '.audit-screenshots',
  '.chrome-cdp', '.pw-profile', 'screenshots',
]);

const EXCLUDE_FILES = /\.(db|log|zip|tgz)$/i;
const EXCLUDE_PATH_PARTS = [
  'node_modules', '.next', '.git', 'test-results', 'playwright-report',
];

function shouldSkip(rel) {
  const norm = rel.replace(/\\/g, '/');
  if (EXCLUDE_PATH_PARTS.some((p) => norm.includes(`/${p}/`) || norm.startsWith(`${p}/`))) return true;
  const base = path.basename(rel);
  if (EXCLUDE_FILES.test(base)) return true;
  if (norm.includes('.env') && !norm.endsWith('.env.example')) return true;
  if (norm.startsWith('deploy/hostinger/') && /\.(zip|env)$/i.test(base)) return true;
  if (norm.startsWith('deploy/hostinger/') && base.startsWith('.')) return true;
  return false;
}

function collectFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (EXCLUDE_DIRS.has(e.name) && e.isDirectory()) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    if (shouldSkip(rel)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...collectFiles(full, rel));
    else files.push({ full, rel: rel.replace(/\\/g, '/') });
  }
  return files;
}

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

const files = collectFiles(root);
const listFile = path.join(outDir, '.zip-list.txt');
fs.writeFileSync(listFile, files.map((f) => f.rel).join('\n'));

const isWin = process.platform === 'win32';
if (isWin) {
  const existing = files.filter((f) => fs.existsSync(f.full));
  const psScript = path.join(outDir, '_zip.ps1');
  const zipEsc = outZip.replace(/'/g, "''");
  const lines = [
    `$zip = '${zipEsc}'`,
    'if (Test-Path $zip) { Remove-Item $zip -Force }',
    '$items = @(',
    ...existing.map((f) => `  '${f.full.replace(/'/g, "''")}'`),
    ')',
    'Compress-Archive -Path $items -DestinationPath $zip -CompressionLevel Optimal',
  ];
  fs.writeFileSync(psScript, lines.join('\n'));
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScript}"`, { stdio: 'inherit' });
  fs.unlinkSync(psScript);
} else {
  execSync(`cd "${root}" && zip -r "${outZip}" -@ < "${listFile}"`, { stdio: 'inherit', shell: true });
}

fs.unlinkSync(listFile);
const sizeMb = (fs.statSync(outZip).size / (1024 * 1024)).toFixed(2);
console.log(`\n✓ Archive: ${outZip} (${sizeMb} Mo)`);
if (fs.statSync(outZip).size > 50 * 1024 * 1024) {
  console.error('ATTENTION: > 50 Mo — réduire data/ ou exclure plus de fichiers pour l’API Hostinger.');
  process.exit(1);
}
