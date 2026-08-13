/**
 * Seed nouveaux logins sur Neon (ans-orion-crm) + maj env Vercel ORION_V29_PASSWORDS_JSON.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

function parse(filePath) {
  const vars = {};
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
let pg = neon.DATABASE_URL_UNPOOLED || neon.POSTGRES_URL_NON_POOLING || neon.DATABASE_URL;
if (!pg?.startsWith('postgres')) {
  console.error('Neon URL missing — pull .env.ans-orion-crm.neon first');
  process.exit(1);
}
const u = new URL(pg);
u.searchParams.set('connection_limit', '5');
pg = u.toString();

const pwJson = local.ORION_V29_PASSWORDS_JSON;
if (!pwJson) {
  console.error('ORION_V29_PASSWORDS_JSON missing in .env.local');
  process.exit(1);
}

process.env.ORION_V29_PASSWORDS_JSON = pwJson;
process.env.ALLOW_V29_AUTH = 'true';

const schemaPath = path.join(ROOT, 'prisma', 'schema.prisma');
const backup = fs.readFileSync(schemaPath, 'utf8');
fs.writeFileSync(schemaPath, backup.replace('provider = "sqlite"', 'provider = "postgresql"'));

try {
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: pg, USE_PRODUCTION_DB: 'true' },
  });

  const { ORION_V29_PROFILES, getOrionV29Accounts } = await import('../lib/orion-v29-accounts.ts');
  const prisma = new PrismaClient({ datasources: { db: { url: pg } } });
  const accounts = getOrionV29Accounts();
  console.log(`Seeding ${accounts.length} accounts on Neon…`);

  for (const acc of ORION_V29_PROFILES) {
    await prisma.employee.upsert({
      where: { matricule: acc.matricule },
      create: {
        matricule: acc.matricule,
        firstName: acc.name.split(' ')[0] ?? acc.name,
        lastName: acc.name.split(' ').slice(1).join(' ') || acc.name,
        poste: acc.poste,
        departement: acc.departement,
        authRole: acc.role,
        email: acc.email,
        horaireDebut: '08:00',
        horaireFin: '17:00',
        site: 'AX0',
        statut: 'Actif',
        presenceStatut: 'Absent',
        dateEmbauche: new Date('2022-06-01'),
      },
      update: {
        poste: acc.poste,
        departement: acc.departement,
        authRole: acc.role,
        email: acc.email,
      },
    });
  }

  for (const acc of accounts) {
    const hashed = await bcrypt.hash(acc.password, 12);
    const user = await prisma.user.upsert({
      where: { email: acc.email.toLowerCase() },
      update: { name: acc.name, role: acc.role, password: hashed },
      create: {
        email: acc.email.toLowerCase(),
        name: acc.name,
        role: acc.role,
        password: hashed,
      },
    });
    await prisma.$executeRawUnsafe(
      `UPDATE "Employee" SET "userId" = NULL WHERE "userId" = $1`,
      user.id,
    );
    const emp = await prisma.employee.findUnique({ where: { matricule: acc.matricule } });
    if (emp) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { userId: user.id, email: acc.email.toLowerCase() },
      });
    }
  }

  console.log(`✅ Neon: ${accounts.length} users`);
  await prisma.$disconnect();

  // Update Vercel env
  const authPath = path.join(process.env.APPDATA || '', 'xdg.data', 'com.vercel.cli', 'auth.json');
  const token = JSON.parse(fs.readFileSync(authPath, 'utf8')).token;
  const TEAM = 'team_9SMBaEymb7i6bYTxuUlr5H9r';
  const PROJECT = 'prj_qgylkWNt4MoFA3rvO89atokROs1i';

  const listRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT}/env?teamId=${TEAM}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { envs = [] } = await listRes.json();
  for (const e of envs.filter((x) => x.key === 'ORION_V29_PASSWORDS_JSON')) {
    await fetch(`https://api.vercel.com/v9/projects/${PROJECT}/env/${e.id}?teamId=${TEAM}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  await fetch(`https://api.vercel.com/v9/projects/${PROJECT}/env?teamId=${TEAM}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: 'ORION_V29_PASSWORDS_JSON',
      value: pwJson,
      type: 'encrypted',
      target: ['production', 'preview'],
    }),
  });
  console.log('✅ Vercel ORION_V29_PASSWORDS_JSON updated');
} finally {
  fs.writeFileSync(schemaPath, backup.replace('provider = "postgresql"', 'provider = "sqlite"'));
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
