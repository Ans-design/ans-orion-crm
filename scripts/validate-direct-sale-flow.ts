/**
 * @deprecated Utilisez npm run validate:direct-sale
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const mjs = join(dirname(fileURLToPath(import.meta.url)), 'validate-direct-sale-flow.mjs');

console.warn('\n⚠ Utilisez : npm run validate:direct-sale\n');

const result = spawnSync(process.execPath, [mjs], { stdio: 'inherit' });
process.exit(result.status ?? 1);
