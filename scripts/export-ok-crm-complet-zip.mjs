/**
 * Export ZIP COMPLET — code + DB + .env + data + node_modules
 * Exclut seulement : .next, .next-build, playwright-report, test-results
 * (caches reconstruites ; .next-build seul = ~2 Go inutiles)
 *
 * Sortie : Desktop/export ok crm COMPLET.zip
 * Progression : Desktop/export-ok-crm-complet-progress.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DESKTOP = path.join(process.env.USERPROFILE || ROOT, 'Desktop');
const OUT_ZIP = path.join(DESKTOP, 'export ok crm COMPLET.zip');
const PROGRESS_FILE = path.join(DESKTOP, 'export-ok-crm-complet-progress.txt');

const EXCLUDE_TOP = new Set([
  '.next',
  '.next-build',
  'playwright-report',
  'test-results',
  '_staging-export-ok-crm',
  'node_modules', // SEC-001 / taille — réinstaller via npm ci
]);

function writeProgress(pct, msg) {
  const line = `[${String(pct).padStart(3, ' ')}%] ${msg}`;
  console.log(line);
  fs.writeFileSync(
    PROGRESS_FILE,
    [
      'EXPORT OK CRM COMPLET — progression',
      line,
      `Mis à jour: ${new Date().toLocaleString('fr-FR')}`,
      `Destination: ${OUT_ZIP}`,
      '',
      'Inclus : code, prisma/dev.db, .env.local, data/, node_modules, docs…',
      'Exclus : .next / .next-build (caches — se régénèrent avec npm run dev)',
      '',
    ].join('\n'),
    'utf8',
  );
}

function listTopEntries() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => !EXCLUDE_TOP.has(e.name))
    .map((e) => e.name);
}

async function main() {
  writeProgress(0, 'Démarrage export COMPLET…');

  if (fs.existsSync(OUT_ZIP)) {
    writeProgress(2, 'Suppression ancien ZIP COMPLET…');
    fs.unlinkSync(OUT_ZIP);
  }

  // Assurer env portable — NE PAS modifier .env.local du workspace (SEC-001).
  // L’archive n’inclut plus .env* réels ni *.db (canaris).
  const readme = path.join(ROOT, 'LIRE_MOI_NOUVEAU_PC.md');
  fs.writeFileSync(
    readme,
    `# ANS ORION — Export OK CRM (sans secrets)

Archive générée le ${new Date().toLocaleString('fr-FR')}.

## Contenu

- Code source (sans node_modules / .next)
- Exemples \`.env*.example\` uniquement
- Docs, prisma schema + migrations

## Exclu (SEC-001)

- \`.env*\` réels, \`*.db\`, backups, node_modules, caches

## Nouveau PC

1. Dézipper
2. Node.js 20+
3. Copier \`.env.local.example\` → \`.env.local\` + placer \`prisma/dev.db\` si besoin
4. \`npm install && npx prisma generate && npm run dev:local\`
`,
    'utf8',
  );

  const entries = listTopEntries().filter((n) => {
    if (n.startsWith('.env') && !n.endsWith('.example')) return false;
    if (n.endsWith('.db') || n.endsWith('.sqlite')) return false;
    return true;
  });
  writeProgress(5, `${entries.length} éléments racine → tar…`);

  const args = [
    '-a',
    '-cf',
    OUT_ZIP,
    '-C',
    ROOT,
    '--exclude=.next',
    '--exclude=.next-build',
    '--exclude=playwright-report',
    '--exclude=test-results',
    '--exclude=_staging-export-ok-crm',
    '--exclude=node_modules',
    '--exclude=.env.local',
    '--exclude=.env.integrations',
    '--exclude=prisma/dev.db',
    '--exclude=prisma/e2e.db',
    '--exclude=export-ok-crm-complet-progress.txt',
    '.',
  ];

  await new Promise((resolve, reject) => {
    const child = spawn('tar', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let lastPct = 5;
    const timer = setInterval(() => {
      try {
        if (!fs.existsSync(OUT_ZIP)) {
          writeProgress(Math.min(12, lastPct + 1), 'Compression… (création archive)');
          lastPct = Math.min(12, lastPct + 1);
          return;
        }
        const sz = fs.statSync(OUT_ZIP).size;
        const mb = sz / (1024 * 1024);
        // estimation vers ~900–1200 Mo compressés typiques
        const pct = Math.min(95, 12 + Math.floor((mb / 1100) * 83));
        lastPct = pct;
        writeProgress(pct, `Compression… ${mb.toFixed(0)} Mo écrits dans le ZIP`);
      } catch {
        /* ignore */
      }
    }, 2000);

    let err = '';
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('error', (e) => {
      clearInterval(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearInterval(timer);
      if (code !== 0) {
        reject(new Error(err || `tar exit ${code}`));
      } else {
        resolve();
      }
    });
  });

  if (!fs.existsSync(OUT_ZIP) || fs.statSync(OUT_ZIP).size < 1_000_000) {
    writeProgress(99, 'ÉCHEC — ZIP trop petit ou absent');
    process.exit(1);
  }

  const sizeMb = (fs.statSync(OUT_ZIP).size / (1024 * 1024)).toFixed(0);
  writeProgress(100, `Terminé — ${OUT_ZIP} (${sizeMb} Mo)`);
  console.log('\nOK →', OUT_ZIP, `(${sizeMb} Mo)`);
}

main().catch((e) => {
  console.error(e);
  writeProgress(99, `ÉCHEC: ${e.message || e}`);
  process.exit(1);
});
