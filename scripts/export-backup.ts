/**
 * Export JSON des tables essentielles (backup léger).
 * Usage: DATABASE_URL=... npm run backup:export
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const outDir = path.join(process.cwd(), 'deploy', 'backups');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

async function main() {
  const data = {
    exportedAt: new Date().toISOString(),
    users: await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } }),
    clients: await prisma.client.findMany(),
    commandes: await prisma.commande.findMany({ take: 5000 }),
    devis: await prisma.devis.findMany({ take: 5000 }),
    auditLogs: await prisma.auditLog.findMany({ take: 2000, orderBy: { createdAt: 'desc' } }),
  };
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `orion-backup-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`✅ Export → ${file}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
