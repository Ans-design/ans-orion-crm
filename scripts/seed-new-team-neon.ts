import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function parse(filePath: string) {
  const vars: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return vars;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    vars[line.slice(0, i)] = v;
  }
  return vars;
}

const ROOT = process.cwd();
const local = parse(path.join(ROOT, '.env.local'));
const neon = {
  ...parse(path.join(ROOT, '.env.ans-orion-crm.neon')),
  ...parse(path.join(ROOT, '.env.vercel.postgres.local')),
};
let pg =
  neon.DATABASE_URL_UNPOOLED || neon.POSTGRES_URL_NON_POOLING || neon.DATABASE_URL || '';
if (!pg.startsWith('postgres')) {
  console.error('Neon URL missing');
  process.exit(1);
}
const u = new URL(pg);
u.searchParams.set('connection_limit', '5');
pg = u.toString();

const pwJson = local.ORION_V29_PASSWORDS_JSON;
if (!pwJson) {
  console.error('ORION_V29_PASSWORDS_JSON missing');
  process.exit(1);
}

const schemaPath = path.join(ROOT, 'prisma', 'schema.prisma');
const backup = fs.readFileSync(schemaPath, 'utf8');
const workerPath = path.join(ROOT, 'scripts', 'neon-seed-worker.ts');

const workerSrc = [
  "import bcrypt from 'bcryptjs';",
  "import { PrismaClient } from '@prisma/client';",
  "import { ORION_V29_PROFILES, getOrionV29Accounts } from '../lib/orion-v29-accounts';",
  '',
  'async function main() {',
  '  const pg = process.env.DATABASE_URL!;',
  '  const prisma = new PrismaClient({ datasources: { db: { url: pg } } });',
  '  const accounts = getOrionV29Accounts();',
  "  console.log('Seeding', accounts.length, 'accounts…');",
  '  for (const acc of ORION_V29_PROFILES) {',
  '    await prisma.employee.upsert({',
  '      where: { matricule: acc.matricule },',
  '      create: {',
  '        matricule: acc.matricule,',
  "        firstName: acc.name.split(' ')[0] ?? acc.name,",
  "        lastName: acc.name.split(' ').slice(1).join(' ') || acc.name,",
  '        poste: acc.poste,',
  '        departement: acc.departement,',
  '        authRole: acc.role,',
  '        email: acc.email,',
  "        horaireDebut: '08:00',",
  "        horaireFin: '17:00',",
  "        site: 'AX0',",
  "        statut: 'Actif',",
  "        presenceStatut: 'Absent',",
  "        dateEmbauche: new Date('2022-06-01'),",
  '      },',
  '      update: {',
  '        poste: acc.poste,',
  '        departement: acc.departement,',
  '        authRole: acc.role,',
  '        email: acc.email,',
  '      },',
  '    });',
  '  }',
  '  for (const acc of accounts) {',
  '    const hashed = await bcrypt.hash(acc.password, 12);',
  '    const user = await prisma.user.upsert({',
  '      where: { email: acc.email.toLowerCase() },',
  '      update: { name: acc.name, role: acc.role, password: hashed },',
  '      create: {',
  '        email: acc.email.toLowerCase(),',
  '        name: acc.name,',
  '        role: acc.role,',
  '        password: hashed,',
  '      },',
  '    });',
  '    await prisma.$executeRawUnsafe(',
  '      `UPDATE \"Employee\" SET \"userId\" = NULL WHERE \"userId\" = $1`,',
  '      user.id,',
  '    );',
  '    const emp = await prisma.employee.findUnique({ where: { matricule: acc.matricule } });',
  '    if (emp) {',
  '      await prisma.employee.update({',
  '        where: { id: emp.id },',
  '        data: { userId: user.id, email: acc.email.toLowerCase() },',
  '      });',
  '    }',
  '  }',
  "  console.log('OK', accounts.length);",
  '  await prisma.$disconnect();',
  '}',
  'main().catch((e) => { console.error(e); process.exit(1); });',
  '',
].join('\n');

fs.writeFileSync(schemaPath, backup.replace('provider = "sqlite"', 'provider = "postgresql"'));
fs.writeFileSync(workerPath, workerSrc);

try {
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: pg, USE_PRODUCTION_DB: 'true' },
  });
  execSync('npx tsx scripts/neon-seed-worker.ts', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: pg,
      ORION_V29_PASSWORDS_JSON: pwJson,
      ALLOW_V29_AUTH: 'true',
      USE_NEON_LOCAL: 'true',
      USE_PRODUCTION_DB: 'false',
      LOCAL_DEV: 'true',
      APP_ENV: 'local',
      NEXTAUTH_SECRET: 'ans-orion-local-dev-secret-2026-parity-seed',
    },
  });

  // Vercel env via CLI stdin (no async fetch)
  const tmp = path.join(ROOT, '.tmp-v29-json.txt');
  fs.writeFileSync(tmp, pwJson);
  try {
    execSync('npx vercel env rm ORION_V29_PASSWORDS_JSON production --yes', {
      stdio: 'inherit',
      env: process.env,
    });
  } catch {
    /* may not exist */
  }
  try {
    execSync('npx vercel env rm ORION_V29_PASSWORDS_JSON preview --yes', {
      stdio: 'inherit',
      env: process.env,
    });
  } catch {
    /* may not exist */
  }
  execSync(`Get-Content -Raw .tmp-v29-json.txt | npx vercel env add ORION_V29_PASSWORDS_JSON production`, {
    stdio: 'inherit',
    shell: 'powershell.exe',
    env: process.env,
  });
  execSync(`Get-Content -Raw .tmp-v29-json.txt | npx vercel env add ORION_V29_PASSWORDS_JSON preview`, {
    stdio: 'inherit',
    shell: 'powershell.exe',
    env: process.env,
  });
  fs.unlinkSync(tmp);
  console.log('✅ Neon seed + Vercel env OK');
} finally {
  fs.writeFileSync(schemaPath, backup.replace('provider = "postgresql"', 'provider = "sqlite"'));
  try {
    fs.unlinkSync(workerPath);
  } catch {
    /* ignore */
  }
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: 'file:./prisma/dev.db',
        USE_PRODUCTION_DB: 'false',
      },
    });
  } catch {
    /* ignore */
  }
}
