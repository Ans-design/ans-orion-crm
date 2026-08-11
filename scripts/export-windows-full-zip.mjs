/**
 * Export ZIP Windows compatible Explorateur.
 * Ne jamais archiver "." → sinon entrées "./…" et l’Explorateur affiche un zip « vide ».
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DESKTOP = path.join(process.env.USERPROFILE || ROOT, 'Desktop');
const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '');
const OUT_ZIP = path.join(DESKTOP, `ANS_ORION_EXPORT_COMPLET_WINDOWS_${stamp}.zip`);
const PROGRESS_FILE = path.join(DESKTOP, 'ANS_ORION_export_complet_progress.txt');
const OLD_BAD = path.join(DESKTOP, 'ANS_ORION_EXPORT_COMPLET_2026-08-06_0659.zip');

const EXCLUDE_TOP = new Set([
  '.next',
  '.next-build',
  '.next-e2e',
  '.turbo',
  'coverage',
  'playwright-report',
  'test-results',
  'blob-report',
  'export-clean',
  '_staging-export-ok-crm',
]);

function writeProgress(pct, msg) {
  const line = `[${String(pct).padStart(3, ' ')}%] ${msg}`;
  console.log(line);
  fs.writeFileSync(
    PROGRESS_FILE,
    [
      'ANS ORION — EXPORT WINDOWS COMPLET',
      line,
      `Mis à jour : ${new Date().toLocaleString('fr-FR')}`,
      `Destination : ${OUT_ZIP}`,
      '',
      'Sans préfixe "./" → visible dans l’Explorateur Windows',
      '',
    ].join('\n'),
    'utf8',
  );
}

async function main() {
  writeProgress(0, 'Démarrage…');

  fs.writeFileSync(
    path.join(ROOT, 'LIRE_MOI_EXPORT_COMPLET_WINDOWS.md'),
    `# ANS ORION — Export Windows COMPLET

Généré le ${new Date().toLocaleString('fr-FR')}.

Ouvrez le ZIP : vous devez voir \`package.json\`, \`app\`, \`node_modules\`, etc.

Puis dans le dossier extrait :
\`\`\`
npx prisma generate
npm run dev:local
\`\`\`
http://127.0.0.1:3020

Ne pas publier (.env.local + DB inclus).
`,
    'utf8',
  );

  const entries = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .map((d) => d.name)
    .filter((n) => !EXCLUDE_TOP.has(n))
    .filter((n) => !n.endsWith('.zip'))
    .filter((n) => !n.startsWith('_staging_orion'))
    .sort();

  if (!entries.includes('package.json')) throw new Error('package.json manquant');
  writeProgress(5, `${entries.length} éléments racine à zipper…`);

  for (const old of [OUT_ZIP, OLD_BAD]) {
    try {
      if (fs.existsSync(old)) fs.unlinkSync(old);
    } catch {
      /* ignore */
    }
  }

  // Chemins nommés (PAS ".") → a.txt / app/ … sans "./"
  const args = [
    '-a',
    '-cf',
    OUT_ZIP,
    '-C',
    ROOT,
    '--exclude=.next',
    '--exclude=.next-build',
    '--exclude=.next-e2e',
    '--exclude=.turbo',
    '--exclude=coverage',
    '--exclude=playwright-report',
    '--exclude=test-results',
    '--exclude=blob-report',
    ...entries,
  ];

  writeProgress(8, 'Compression…');

  await new Promise((resolve, reject) => {
    const child = spawn('tar', args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let last = 8;
    const timer = setInterval(() => {
      try {
        if (!fs.existsSync(OUT_ZIP)) {
          last = Math.min(15, last + 1);
          writeProgress(last, 'Compression… création');
          return;
        }
        const mb = fs.statSync(OUT_ZIP).size / (1024 * 1024);
        last = Math.min(95, 15 + Math.floor((mb / 1800) * 80));
        writeProgress(last, `Compression… ${mb.toFixed(0)} Mo`);
      } catch {
        /* ignore */
      }
    }, 3000);
    let err = '';
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('close', (code) => {
      clearInterval(timer);
      if (code !== 0) reject(new Error(err || `tar exit ${code}`));
      else resolve();
    });
  });

  const sizeMb = fs.statSync(OUT_ZIP).size / (1024 * 1024);
  if (sizeMb < 50) throw new Error(`ZIP trop petit (${sizeMb.toFixed(1)} Mo)`);

  const list = spawnSync('tar', ['-tf', OUT_ZIP], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 128 * 1024 * 1024,
  });
  const lines = (list.stdout || '').split(/\r?\n/).filter(Boolean);
  const dot = lines.filter((l) => l.startsWith('./')).length;
  const hasPkg = lines.some((l) => l === 'package.json' || l.endsWith('/package.json') && !l.includes('/'));
  const hasPkgRoot = lines.includes('package.json');

  writeProgress(98, `Entrées=${lines.length} préfixe_./=${dot} package.json_racine=${hasPkgRoot}`);

  if (dot > 0 || !hasPkgRoot) {
    throw new Error(`Structure encore mauvaise (./=${dot}, package.json=${hasPkgRoot})`);
  }

  // .NET check
  const ps = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${OUT_ZIP.replace(/'/g, "''")}'); Write-Output ('NET_FIRST=' + $z.Entries[0].FullName); Write-Output ('NET_COUNT=' + $z.Entries.Count); $z.Dispose()`,
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  console.log((ps.stdout || '').trim());

  writeProgress(100, `Terminé — ${OUT_ZIP} (${sizeMb.toFixed(0)} Mo)`);
  console.log('\n✅ ZIP visible Explorateur :', OUT_ZIP);
  console.log(`   ${sizeMb.toFixed(0)} Mo — ${lines.length} fichiers`);
  console.log('   À l’ouverture vous devez voir package.json, app, node_modules…');
}

main().catch((e) => {
  console.error(e);
  try {
    writeProgress(99, `ÉCHEC: ${e.message || e}`);
  } catch {
    /* ignore */
  }
  process.exit(1);
});
