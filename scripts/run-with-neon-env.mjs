/**
 * Exécute une commande npm avec DATABASE_URL Neon depuis deploy/hostinger/database.bundled.env
 * Usage: node scripts/run-with-neon-env.mjs verify:pos-prices
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const bundled = path.join(process.cwd(), 'deploy', 'hostinger', 'database.bundled.env');
if (!fs.existsSync(bundled)) {
  console.error('❌ deploy/hostinger/database.bundled.env introuvable');
  process.exit(1);
}

const line = fs
  .readFileSync(bundled, 'utf8')
  .split('\n')
  .find((l) => l.startsWith('DATABASE_URL=') && !l.includes('UNPOOLED'));

if (!line) {
  console.error('❌ DATABASE_URL absent de database.bundled.env');
  process.exit(1);
}

const url = line.replace(/^DATABASE_URL=/, '').trim().replace(/^"|"$/g, '');
const script = process.argv[2];
if (!script) {
  console.error('Usage: node scripts/run-with-neon-env.mjs <npm-script>');
  process.exit(1);
}

const result = spawnSync('npm', ['run', script], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DATABASE_URL: url },
});

process.exit(result.status ?? 1);
