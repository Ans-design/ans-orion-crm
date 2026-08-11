/**
 * Export ZIP COMPLET « export tena final » — Windows
 * Aucun oubli volontaire : code + node_modules + .env + DB + .next + .git + data…
 * Sortie : %USERPROFILE%\Desktop\export tena final.zip
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DESKTOP = path.join(process.env.USERPROFILE || ROOT, 'Desktop');
const OUT_ZIP = path.join(DESKTOP, 'export tena final.zip');
const PROGRESS_FILE = path.join(DESKTOP, 'export-tena-final-progress.txt');
const MANIFEST_FILE = path.join(DESKTOP, 'export-tena-final-manifest.txt');

function writeProgress(pct, msg) {
  const line = `[${String(pct).padStart(3, ' ')}%] ${msg}`;
  console.log(line);
  fs.writeFileSync(
    PROGRESS_FILE,
    [
      'EXPORT TENA FINAL — ZIP COMPLET (rien omis)',
      line,
      `Mis à jour: ${new Date().toLocaleString('fr-FR')}`,
      `Destination: ${OUT_ZIP}`,
      '',
      'Inclus : TOUT le dossier projet (node_modules, .next, .env*, prisma/*.db, .git, data…)',
      'Exclus : uniquement le fichier ZIP de sortie lui-même (sur le Bureau).',
      '',
    ].join('\n'),
    'utf8',
  );
}

function walkCount(dir, acc = { files: 0, bytes: 0 }) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkCount(full, acc);
    } else if (e.isFile()) {
      acc.files += 1;
      try {
        acc.bytes += fs.statSync(full).size;
      } catch {
        /* ignore */
      }
    }
  }
  return acc;
}

async function main() {
  writeProgress(0, 'Inventaire du projet…');

  const stats = walkCount(ROOT);
  const gb = (stats.bytes / (1024 ** 3)).toFixed(2);
  fs.writeFileSync(
    MANIFEST_FILE,
    [
      'MANIFEST — export tena final',
      `Date: ${new Date().toLocaleString('fr-FR')}`,
      `Racine: ${ROOT}`,
      `Fichiers: ${stats.files}`,
      `Taille brute: ${gb} Go (${stats.bytes} octets)`,
      `ZIP: ${OUT_ZIP}`,
      '',
      'Entrées racine:',
      ...fs.readdirSync(ROOT, { withFileTypes: true }).map((e) => {
        const kind = e.isDirectory() ? 'DIR ' : 'FILE';
        return `  ${kind}  ${e.name}`;
      }),
      '',
    ].join('\n'),
    'utf8',
  );

  writeProgress(3, `Inventaire: ${stats.files} fichiers · ${gb} Go bruts`);

  const readme = path.join(ROOT, 'LIRE_MOI_EXPORT_COMPLET_WINDOWS.md');
  fs.writeFileSync(
    readme,
    `# ANS ORION — Export Windows COMPLET « export tena final »

Généré le ${new Date().toLocaleString('fr-FR')}.

Archive : \`export tena final.zip\` (Bureau Windows).

## Contenu

Export **intégral** du dossier projet :
- code (\`app\`, \`components\`, \`lib\`, …)
- \`node_modules\`
- caches \`.next\` / \`.next-e2e\`
- \`.env*\` (dont \`.env.local\`)
- bases Prisma (\`prisma/*.db\` si présentes)
- \`.git\`, docs, data, scripts, tests…

## Extraction (Windows)

1. Clic droit → Extraire tout… vers un dossier court, ex. \`C:\\ANS-ORION\`
2. Ouvrir ce dossier (vous devez voir \`package.json\`, \`app\`, \`node_modules\`)
3. Si besoin : \`npx prisma generate\` puis \`npm run dev:local\`
4. http://127.0.0.1:3020

**Ne pas publier** cette archive (secrets + DB inclus).
`,
    'utf8',
  );

  if (fs.existsSync(OUT_ZIP)) {
    writeProgress(4, 'Suppression ancien ZIP…');
    fs.unlinkSync(OUT_ZIP);
  }

  writeProgress(5, 'Compression tar → ZIP (peut durer longtemps)…');

  // Archive COMPLÈTE : aucun --exclude (sauf fichiers hors ROOT)
  const args = ['-a', '-cf', OUT_ZIP, '-C', ROOT, '.'];

  await new Promise((resolve, reject) => {
    const child = spawn('tar', args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let lastPct = 5;
    const timer = setInterval(() => {
      try {
        if (!fs.existsSync(OUT_ZIP)) {
          writeProgress(Math.min(10, lastPct + 1), 'Compression… (création archive)');
          lastPct = Math.min(10, lastPct + 1);
          return;
        }
        const sz = fs.statSync(OUT_ZIP).size;
        const mb = sz / (1024 * 1024);
        // estimation large (~40–55 % du brut selon contenus)
        const estFinalMb = Math.max(800, (stats.bytes / (1024 * 1024)) * 0.45);
        const pct = Math.min(95, 10 + Math.floor((mb / estFinalMb) * 85));
        lastPct = pct;
        writeProgress(pct, `Compression… ${mb.toFixed(0)} Mo écrits dans le ZIP`);
      } catch {
        /* ignore */
      }
    }, 3000);

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

  if (!fs.existsSync(OUT_ZIP)) {
    writeProgress(99, 'ÉCHEC — ZIP absent');
    process.exit(1);
  }

  const sizeMb = fs.statSync(OUT_ZIP).size / (1024 * 1024);
  // Un vrai complet avec node_modules doit largement dépasser ~100 Mo
  if (sizeMb < 100) {
    writeProgress(99, `ÉCHEC — ZIP trop petit (${sizeMb.toFixed(1)} Mo) : export incomplet`);
    process.exit(1);
  }

  writeProgress(100, `Terminé — ${OUT_ZIP} (${sizeMb.toFixed(0)} Mo)`);
  console.log('\nOK →', OUT_ZIP, `(${sizeMb.toFixed(0)} Mo)`);
  console.log('Manifest →', MANIFEST_FILE);
}

main().catch((e) => {
  console.error(e);
  writeProgress(99, `ÉCHEC: ${e.message || e}`);
  process.exit(1);
});
