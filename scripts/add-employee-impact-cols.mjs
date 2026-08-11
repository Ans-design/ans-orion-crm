import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

try {
  const envPath = resolve(process.cwd(), '.env');
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env.DATABASE_URL = v;
    break;
  }
} catch {
  /* ignore */
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
}

const prisma = new PrismaClient();

async function tryExec(sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('OK', sql.slice(0, 60));
  } catch (e) {
    console.log('SKIP', String(e?.message || e).slice(0, 140));
  }
}

await tryExec('ALTER TABLE ClientReclamation ADD COLUMN employeeId TEXT');
await tryExec('ALTER TABLE MaterialWaste ADD COLUMN employeeId TEXT');
await tryExec(
  'CREATE INDEX IF NOT EXISTS ClientReclamation_employeeId_idx ON ClientReclamation(employeeId)',
);
await tryExec(
  'CREATE INDEX IF NOT EXISTS MaterialWaste_employeeId_idx ON MaterialWaste(employeeId)',
);

const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info('ClientReclamation')`);
console.log(
  'ClientReclamation cols:',
  cols.map((c) => c.name).join(', '),
);
await prisma.$disconnect();
