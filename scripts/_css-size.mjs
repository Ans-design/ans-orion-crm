import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';
const g = readFileSync('app/globals.css', 'utf8');
const imports = [...g.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
let total = 0;
for (const i of imports) {
  const p = resolve('app', i);
  if (existsSync(p)) total += statSync(p).size;
}
console.log(JSON.stringify({ imports: imports.length, kb: +(total / 1024).toFixed(1) }));
