/**
 * Export ZIP portable « export ok crm » — indépendant du poste.
 * Inclut code + prisma/dev.db (snapshot live) + .env.local relatif + data/.
 * Exclut node_modules / .next / .next-build (réinstallables).
 *
 * Usage: node scripts/export-ok-crm-zip.mjs
 * Progression: console + Desktop/export-ok-crm-progress.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DESKTOP = path.join(process.env.USERPROFILE || ROOT, 'Desktop');
const OUT_ZIP = path.join(DESKTOP, 'export ok crm.zip');
const PROGRESS_FILE = path.join(DESKTOP, 'export-ok-crm-progress.txt');
const STAGING = path.join(DESKTOP, '_staging-export-ok-crm');

const SKIP_DIR = new Set([
  'node_modules',
  '.next',
  '.next-build',
  'playwright-report',
  'test-results',
  '.git',
  '_staging-export-ok-crm',
]);

const SKIP_FILE_RE = [
  /^tsconfig\.tsbuildinfo$/i,
  /^build-log/i,
  /^_tmp-/i,
  /^tmp-/i,
  /^\.DS_Store$/i,
  /^export-ok-crm-progress\.txt$/i,
];

const LIVE_DB = path.join(
  process.env.USERPROFILE || '',
  'Documents',
  'ANS OKOK TATY AORIAN',
  'PROJET AVANT FINAL',
  'prisma',
  'dev.db',
);

function writeProgress(pct, msg) {
  const line = `[${String(pct).padStart(3, ' ')}%] ${msg}`;
  console.log(line);
  fs.writeFileSync(
    PROGRESS_FILE,
    `EXPORT OK CRM — progression\n${line}\nMis à jour: ${new Date().toLocaleString('fr-FR')}\nDestination: ${OUT_ZIP}\n`,
    'utf8',
  );
}

function shouldSkipFile(name) {
  return SKIP_FILE_RE.some((re) => re.test(name));
}

function walk(dir, base = dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const ent of entries) {
    if (SKIP_DIR.has(ent.name)) continue;
    if (ent.name === '.cursor' || ent.name === '.cursor-refondation-spec') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full, base, acc);
    } else if (ent.isFile()) {
      if (shouldSkipFile(ent.name)) continue;
      acc.push({ full, rel: path.relative(base, full) });
    }
  }
  return acc;
}

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function portableEnv(srcEnvPath) {
  let raw = fs.readFileSync(srcEnvPath, 'utf8');
  // Forcer DB relative au dossier prisma (portable sur tout PC)
  raw = raw.replace(
    /^DATABASE_URL=.*$/m,
    'DATABASE_URL="file:./dev.db"',
  );
  if (!/^DATABASE_URL=/m.test(raw)) {
    raw = `DATABASE_URL="file:./dev.db"\n` + raw;
  }
  return raw;
}

function main() {
  writeProgress(0, 'Préparation staging…');
  rmrf(STAGING);
  fs.mkdirSync(STAGING, { recursive: true });

  writeProgress(3, 'Inventaire des fichiers source…');
  const files = walk(ROOT);
  writeProgress(8, `${files.length} fichiers à copier…`);

  let copied = 0;
  for (const f of files) {
    copyFile(f.full, path.join(STAGING, f.rel));
    copied += 1;
    if (copied % 200 === 0 || copied === files.length) {
      const pct = 8 + Math.floor((copied / files.length) * 55);
      writeProgress(pct, `Copie ${copied}/${files.length}…`);
    }
  }

  writeProgress(65, 'Injection .env.local portable (DATABASE_URL relatif)…');
  const envSrc = path.join(ROOT, '.env.local');
  if (fs.existsSync(envSrc)) {
    fs.writeFileSync(path.join(STAGING, '.env.local'), portableEnv(envSrc), 'utf8');
  }

  writeProgress(68, 'Snapshot base SQLite live…');
  const stagingDb = path.join(STAGING, 'prisma', 'dev.db');
  fs.mkdirSync(path.dirname(stagingDb), { recursive: true });
  if (fs.existsSync(LIVE_DB)) {
    copyFile(LIVE_DB, stagingDb);
    // garder aussi la copie workspace
    const wsDb = path.join(ROOT, 'prisma', 'dev.db');
    if (fs.existsSync(wsDb)) {
      copyFile(wsDb, path.join(STAGING, 'prisma', 'dev.db.workspace-copy'));
    }
  } else {
    // fallback workspace
    const wsDb = path.join(ROOT, 'prisma', 'dev.db');
    if (fs.existsSync(wsDb)) copyFile(wsDb, stagingDb);
  }

  writeProgress(72, 'Guide démarrage nouveau PC…');
  const readme = `# ANS ORION — Export OK CRM (portable)

Archive générée le ${new Date().toLocaleString('fr-FR')}.

## Pourquoi les interfaces / données disparaissaient

Sur l'ancien poste, \`.env.local\` pointait vers une base **hors projet** :
\`Documents/.../PROJET AVANT FINAL/prisma/dev.db\`

Sur un autre PC ce chemin n'existe pas → CRM / admin / sync vides ou incomplets.

**Cet export** contient :
- le code à jour
- \`prisma/dev.db\` (snapshot de la base live)
- \`.env.local\` avec \`DATABASE_URL="file:./dev.db"\` (portable)
- \`data/\` (talk-files, références, configs)

## Démarrage sur le nouveau PC

1. Dézipper dans un dossier (ex. \`Desktop/ANS-ORION\`)
2. Installer **Node.js 20+**
3. Dans le dossier :

\`\`\`bash
npm install
npx prisma generate
npm run dev
\`\`\`

4. Ouvrir http://127.0.0.1:3020

### Comptes

- Admin : \`john@doe.com\` / \`johndoe123\`
- Démo : \`SEED_DEMO_EMAIL\` / \`SEED_DEMO_PASSWORD\` (env local uniquement)
- Local admin : \`SEED_ADMIN_EMAIL\` / \`SEED_ADMIN_PASSWORD\` (env local uniquement)
- Aucun mot de passe littéral dans ce document.

### Non inclus (volontairement)

- \`node_modules\` → \`npm install\`
- \`.next\` / \`.next-build\` → reconstruit au premier \`npm run dev\`

Ces dossiers sont énormes et se régénèrent ; les inclure casse souvent le ZIP (chemins longs Windows).
`;
  fs.writeFileSync(path.join(STAGING, 'LIRE_MOI_NOUVEAU_PC.md'), readme, 'utf8');

  writeProgress(75, 'Compression ZIP via tar (peut prendre 1–3 min)…');
  if (fs.existsSync(OUT_ZIP)) fs.unlinkSync(OUT_ZIP);

  // Compteur fichiers pour estimation % pendant tar
  const zipFiles = walk(STAGING);
  const approx = zipFiles.length;
  writeProgress(76, `${approx} entrées → compression…`);

  const progressTimer = setInterval(() => {
    try {
      if (!fs.existsSync(OUT_ZIP)) {
        writeProgress(78, 'Compression en cours (création archive)…');
        return;
      }
      const sz = fs.statSync(OUT_ZIP).size;
      // estimation grossière jusqu’à ~95 %
      const pct = Math.min(95, 78 + Math.floor((sz / (80 * 1024 * 1024)) * 17));
      writeProgress(pct, `Compression… ${(sz / (1024 * 1024)).toFixed(1)} Mo écrits`);
    } catch {
      /* ignore */
    }
  }, 800);

  const r = spawnSync(
    'tar',
    ['-a', '-cf', OUT_ZIP, '-C', STAGING, '.'],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
  clearInterval(progressTimer);

  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || 'tar failed');
    writeProgress(99, 'ÉCHEC compression tar');
    process.exit(1);
  }

  if (!fs.existsSync(OUT_ZIP) || fs.statSync(OUT_ZIP).size < 1000) {
    writeProgress(99, 'ÉCHEC — ZIP vide ou absent');
    process.exit(1);
  }

  writeProgress(98, 'Nettoyage staging…');
  rmrf(STAGING);

  const sizeMb = (fs.statSync(OUT_ZIP).size / (1024 * 1024)).toFixed(1);
  writeProgress(100, `Terminé — ${OUT_ZIP} (${sizeMb} Mo)`);
  console.log('\nOK →', OUT_ZIP);
}

main();
