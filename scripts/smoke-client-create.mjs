/**
 * Smoke test — création client (colonnes CRM dont canalVente).
 * Usage: node scripts/smoke-client-create.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const code = `TST-${Date.now().toString(36).toUpperCase()}`;

try {
  const client = await prisma.client.create({
    data: {
      code,
      name: 'Test CRM Workflow',
      nif: '123456789',
      canalVente: 'Bouche à oreille',
      canalDecouverte: 'Google',
      type: 'Entreprise',
      statut: 'Actif',
      categorie: 'Client',
    },
  });
  console.log('OK client créé:', client.id, client.code, client.canalVente);
  await prisma.client.delete({ where: { id: client.id } });
  console.log('OK client test supprimé');
} catch (e) {
  console.error('ÉCHEC:', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
