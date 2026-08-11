import fs from 'fs';

const cat = fs.readFileSync('lib/data/catalogue.ts', 'utf8');
const cfg = fs.readFileSync('lib/data/config-types.ts', 'utf8');
const catalogueBlock = cat.match(/export const CATALOGUE[\s\S]*?\n\];/)?.[0] ?? '';
const ids = [...catalogueBlock.matchAll(/\{id:'([^']+)'/g)].map((m) => m[1]);
const unmapped = ids.filter((id) => !cfg.includes(`'${id}':`));
console.log('Catalogue:', ids.length);
console.log('Unmapped:', unmapped.length);
unmapped.forEach((id) => console.log(' -', id));
