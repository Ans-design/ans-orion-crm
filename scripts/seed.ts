import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { commandeStatutFromLabel } from '@/lib/server/data/prisma-statut-bridge';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database (local/dev only — never use known passwords in production)...');

  if (process.env.NODE_ENV === 'production' || process.env.HOSTINGER === 'true' || process.env.USE_PRODUCTION_DB === 'true') {
    if (process.env.ALLOW_VERCEL_PARITY_SEED !== 'true') {
      console.error('❌ scripts/seed.ts interdit en production. Utiliser: npm run seed:production + ORION_SEED_BOOTSTRAP_SECRET');
      process.exit(1);
    }
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'john@doe.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || process.env.ORION_SEED_BOOTSTRAP_SECRET;
  const demoEmail = process.env.SEED_DEMO_EMAIL || 'demo@example.local';
  const demoPassword = process.env.SEED_DEMO_PASSWORD || process.env.ORION_SEED_BOOTSTRAP_SECRET;

  // E2E / SQLite local / parité Neon : seuil assoupli (mots de passe machine déjà présents) — prod reste ≥12
  const isLocalE2e =
    process.env.E2E_MODE === 'true'
    || process.env.APP_ENV === 'local'
    || process.env.LOCAL_DEV === 'true'
    || process.env.ALLOW_VERCEL_PARITY_SEED === 'true'
    || Boolean(process.env.DATABASE_URL?.startsWith('file:'));
  const minPw = isLocalE2e ? 8 : 12;

  if (!adminPassword || adminPassword.length < minPw) {
    console.error(`❌ SEED_ADMIN_PASSWORD ou ORION_SEED_BOOTSTRAP_SECRET requis (min. ${minPw} caractères).`);
    console.error('   Exemple local: SEED_ADMIN_PASSWORD=… SEED_DEMO_PASSWORD=… npx tsx scripts/seed.ts');
    process.exit(1);
  }
  if (!demoPassword || demoPassword.length < minPw) {
    console.error(`❌ SEED_DEMO_PASSWORD ou ORION_SEED_BOOTSTRAP_SECRET requis (min. ${minPw} caractères).`);
    process.exit(1);
  }

  // Admin user
  const hashedPw = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPw, name: 'Admin ANS', role: 'admin', mustChangePassword: false },
    create: {
      email: adminEmail,
      name: 'Admin ANS',
      password: hashedPw,
      role: 'admin',
      mustChangePassword: false,
    },
  });
  console.log(`Admin user seeded (${adminEmail}) — mot de passe non loggé`);

  if (demoEmail.toLowerCase() === adminEmail.toLowerCase()) {
    console.log(`Compte démo ignoré (même email que admin) — rôle admin conservé`);
  } else {
    const demoPw = await bcrypt.hash(demoPassword, 12);
    await prisma.user.upsert({
      where: { email: demoEmail },
      update: { password: demoPw, name: 'Compte Démo', role: 'demo', mustChangePassword: false },
      create: {
        email: demoEmail,
        name: 'Compte Démo',
        password: demoPw,
        role: 'demo',
        mustChangePassword: false,
      },
    });
    console.log(`Compte démo seedé (${demoEmail}) — mot de passe non loggé`);
  }

  // Clients
  const clients = [
    { code: 'QS-001', name: 'Quantum Solutions', tel: '+261 34 00 101', email: 'contact@quantum-sol.mg', type: 'Entreprise', ca: '12 500 000 Ar', cmds: 24, statut: 'Actif', notes: 'Client fidèle depuis 2021' },
    { code: 'NX-002', name: 'Nexus Corp', tel: '+261 34 00 102', email: 'info@nexus-corp.mg', type: 'Entreprise', ca: '8 700 000 Ar', cmds: 18, statut: 'Actif', notes: 'Commandes régulières mensuelles' },
    { code: 'HC-003', name: 'Hôtel Colbert', tel: '+261 20 22 202', email: 'print@hotelcolbert.mg', type: 'Hôtellerie', ca: '6 200 000 Ar', cmds: 12, statut: 'Actif', notes: 'Menus, flyers événements' },
    { code: 'MR-004', name: 'Madarail SA', tel: '+261 20 22 303', email: 'com@madarail.mg', type: 'Transport', ca: '4 800 000 Ar', cmds: 9, statut: 'Actif', notes: 'Rapports annuels, affiches' },
    { code: 'OM-005', name: 'Orange Madagascar', tel: '+261 34 00 500', email: 'marketing@orange.mg', type: 'Télécom', ca: '22 300 000 Ar', cmds: 35, statut: 'Premium', notes: 'Gros volumes PLV et flyers' },
    { code: 'BM-006', name: 'BOA Madagascar', tel: '+261 20 22 600', email: 'comm@boa.mg', type: 'Banque', ca: '15 100 000 Ar', cmds: 28, statut: 'Premium', notes: 'Docs admin, cartes de visite' },
    { code: 'UV-007', name: 'Université Antananarivo', tel: '+261 20 22 700', email: 'imprimerie@univ-tana.mg', type: 'Éducation', ca: '3 400 000 Ar', cmds: 7, statut: 'Actif', notes: 'Supports de cours, mémoires' },
    { code: 'AT-008', name: 'Air Madagascar', tel: '+261 20 22 800', email: 'print@airmadagascar.mg', type: 'Aérien', ca: '9 600 000 Ar', cmds: 15, statut: 'Inactif', notes: 'Contrat suspendu temporairement' },
    { code: 'PR-009', name: 'Hôtel Carlton', tel: '+261 34 11 201', email: 'events@carlton.mg', type: 'Hôtellerie', ca: '0 Ar', cmds: 0, statut: 'Prospect', notes: 'Prospection événementiel Q2' },
    { code: 'PR-010', name: 'TechStart MG', tel: '+261 34 22 302', email: 'hello@techstart.mg', type: 'Startup', ca: '0 Ar', cmds: 0, statut: 'Prospect', notes: 'Identité visuelle + PLV' },
    { code: 'PR-011', name: 'Groupe Ylang', tel: '+261 34 33 403', email: 'contact@ylang.mg', type: 'Cosmétique', ca: '0 Ar', cmds: 0, statut: 'Prospect', notes: 'Packaging & étiquettes' },
  ];

  for (const c of clients) {
    await prisma.client.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log(`${clients.length} clients seeded`);

  // Commandes
  const allClients = await prisma.client.findMany();
  const clientMap: Record<string, string> = {};
  for (const cl of allClients) {
    clientMap[cl.code] = cl.id;
  }

  const commandes = [
    { numero: 'CMD-2024-001', clientCode: 'OM-005', article: 'Flyers A5 CMJN R/V', qty: 5000, total: 450000, acompte: 225000, reste: 225000, statut: 'Livré', avancement: 100, operateur: 'Rakoto', priorite: 'Haute', machine: 'Konica C1100' },
    { numero: 'CMD-2024-002', clientCode: 'BM-006', article: 'Cartes de visite 350g Pelliculé', qty: 2000, total: 180000, acompte: 180000, reste: 0, statut: 'Livré', avancement: 100, operateur: 'Hery', priorite: 'Normal', machine: 'Konica C1100' },
    { numero: 'CMD-2024-003', clientCode: 'QS-001', article: 'Brochure A4 Piqûre 16p', qty: 500, total: 620000, acompte: 310000, reste: 310000, statut: 'En production', avancement: 60, operateur: 'Fidy', priorite: 'Haute', machine: 'Ricoh 9200' },
    { numero: 'CMD-2024-004', clientCode: 'HC-003', article: 'Menu restaurant A3 plié', qty: 200, total: 95000, acompte: 95000, reste: 0, statut: 'Livré', avancement: 100, operateur: 'Naina', priorite: 'Normal', machine: 'Konica C1100' },
    { numero: 'CMD-2024-005', clientCode: 'NX-002', article: 'Roll-up 85×200 Premium', qty: 4, total: 320000, acompte: 160000, reste: 160000, statut: 'En production', avancement: 40, operateur: 'Tiana', priorite: 'Normal', machine: 'Roland VG2' },
    { numero: 'CMD-2024-006', clientCode: 'MR-004', article: 'Rapport annuel A4 DCC 80p', qty: 100, total: 1250000, acompte: 500000, reste: 750000, statut: 'À planifier', avancement: 0, operateur: 'Rakoto', priorite: 'Haute', machine: '' },
    { numero: 'CMD-2024-007', clientCode: 'OM-005', article: 'Bâche 3×2m 440g', qty: 10, total: 540000, acompte: 270000, reste: 270000, statut: 'En production', avancement: 75, operateur: 'Tiana', priorite: 'Urgente', machine: 'Roland VG2' },
    { numero: 'CMD-2024-008', clientCode: 'UV-007', article: 'Mémoire A4 Spirale 120p', qty: 50, total: 375000, acompte: 200000, reste: 175000, statut: 'En finition', avancement: 85, operateur: 'Fidy', priorite: 'Normal', machine: 'Ricoh 9200' },
    { numero: 'CMD-2024-009', clientCode: 'BM-006', article: 'Carnet autocopiant A5 3 feuillets', qty: 500, total: 420000, acompte: 420000, reste: 0, statut: 'Livré', avancement: 100, operateur: 'Hery', priorite: 'Normal', machine: 'Konica C1100' },
    { numero: 'CMD-2024-010', clientCode: 'QS-001', article: 'T-shirt sérigraphie logo', qty: 100, total: 850000, acompte: 425000, reste: 425000, statut: 'En attente stock', avancement: 10, operateur: 'Naina', priorite: 'Normal', machine: '' },
    { numero: 'CMD-2024-011', clientCode: 'OM-005', article: 'Oriflamme 60×240', qty: 20, total: 680000, acompte: 340000, reste: 340000, statut: 'En production', avancement: 50, operateur: 'Tiana', priorite: 'Haute', machine: 'Roland VG2' },
    { numero: 'CMD-2024-012', clientCode: 'NX-002', article: 'Calendrier chevalet luxe', qty: 300, total: 510000, acompte: 255000, reste: 255000, statut: 'À planifier', avancement: 0, operateur: '', priorite: 'Normal', machine: '' },
    { numero: 'CMD-2024-013', clientCode: 'HC-003', article: 'Affiche A2 Photo Premium', qty: 30, total: 125000, acompte: 125000, reste: 0, statut: 'Livré', avancement: 100, operateur: 'Rakoto', priorite: 'Normal', machine: 'Roland VG2' },
    { numero: 'CMD-2024-014', clientCode: 'AT-008', article: 'Étiquettes bagages vinyl', qty: 10000, total: 780000, acompte: 0, reste: 780000, statut: 'Suspendu', avancement: 0, operateur: '', priorite: 'Basse', machine: '' },
    { numero: 'CMD-2024-015', clientCode: 'MR-004', article: 'Entêtes de lettre A4 NdG', qty: 1000, total: 195000, acompte: 100000, reste: 95000, statut: 'En finition', avancement: 90, operateur: 'Hery', priorite: 'Normal', machine: 'Konica C1100' },
  ];

  for (const cmd of commandes) {
    const cId = clientMap[cmd.clientCode];
    await prisma.commande.upsert({
      where: { numero: cmd.numero },
      update: {},
      create: {
        numero: cmd.numero,
        clientId: cId ?? null,
        article: cmd.article,
        qty: cmd.qty,
        total: cmd.total,
        acompte: cmd.acompte,
        reste: cmd.reste,
        statut: commandeStatutFromLabel(cmd.statut),
        avancement: cmd.avancement,
        operateur: cmd.operateur || null,
        priorite: cmd.priorite,
        machine: cmd.machine || null,
        dateCmd: new Date('2024-01-15'),
        dateLiv: cmd.statut === 'Livré' || cmd.statut === 'Livrée' ? new Date('2024-02-01') : null,
      },
    });
  }
  console.log(`${commandes.length} commandes seeded`);

  const { seedStock } = await import('./seed-stock');
  await seedStock(prisma);

  const { seedPhase3 } = await import('./seed-phase3');
  await seedPhase3(prisma);

  const { seedPhase4 } = await import('./seed-phase4');
  await seedPhase4(prisma);

  const { seedOps } = await import('./seed-ops');
  await seedOps(prisma);

  const { seedMateriels } = await import('./seed-materiels');
  await seedMateriels(prisma);

  const { seedEquipe } = await import('./seed-equipe');
  await seedEquipe(prisma);

  const { seedTaches } = await import('./seed-taches');
  await seedTaches(prisma);

  const { seedRh } = await import('./seed-rh');
  await seedRh(prisma);

  const { seedV29Employees } = await import('./seed-v29-employees');
  await seedV29Employees(prisma);

  const { seedV29Users } = await import('./seed-v29-users');
  await seedV29Users(prisma);

  const { seedAuditActivity } = await import('./seed-audit-activity');
  await seedAuditActivity(prisma);

  const { seedDashboardMetrics } = await import('./seed-dashboard-metrics');
  await seedDashboardMetrics(prisma);

  try {
    const { syncAllCommandePaymentSnapshots } = await import('./seed-sync-commande-payments');
    await syncAllCommandePaymentSnapshots(prisma);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    console.warn('[seed] sync payment snapshots ignoré:', code ?? (error instanceof Error ? error.message : error));
  }

  const { seedFinance } = await import('./seed-finance');
  await seedFinance(prisma);

  const { seedGpao } = await import('./seed-gpao');
  await seedGpao(prisma);

  try {
    const { seedStudio } = await import('./seed-studio');
    await seedStudio(prisma);
  } catch (error) {
    console.warn('[seed] studio ignoré:', (error as Error)?.message?.slice(0, 120));
  }

  try {
    const { seedCm } = await import('./seed-cm');
    await seedCm(prisma);
  } catch (error) {
    console.warn('[seed] cm ignoré:', (error as Error)?.message?.slice(0, 120));
  }

  try {
    const { seedAnnexes } = await import('./seed-annexes');
    await seedAnnexes(prisma);
  } catch (error) {
    console.warn('[seed] annexes ignoré:', (error as Error)?.message?.slice(0, 120));
  }

  // E2E / SKIP_FUSION : données déterministes sans import Excel (pas de chemin Desktop, pas de 1140 lignes métier).
  const skipFusion =
    process.env.E2E_MODE === 'true' ||
    process.env.SKIP_FUSION === '1' ||
    process.env.SKIP_FUSION === 'true';
  if (skipFusion) {
    console.log('Fusion Excel ignorée (E2E_MODE / SKIP_FUSION) — seed déterministe sans archive tarifaire');
  } else {
    try {
      const { runFusionImport } = await import('./import-fusion-excel');
      await runFusionImport(prisma);
      console.log('Fusion métier Excel importée');
    } catch (err) {
      console.log('Fusion Excel ignorée (fichier absent ou SKIP_FUSION):', (err as Error).message?.slice(0, 80));
    }
  }

  try {
    if (process.env.SKIP_TALK_BOOTSTRAP === 'true' || process.env.ALLOW_VERCEL_PARITY_SEED === 'true') {
      console.log('ANS Talk bootstrap ignoré (parité / SKIP_TALK_BOOTSTRAP)');
    } else {
      const { bootstrapTalkFromSeed } = await import('../lib/messaging/messaging-service');
      await bootstrapTalkFromSeed();
      console.log('ANS Talk : groupes service et commandes initialisés');
    }
  } catch (err) {
    console.log('ANS Talk bootstrap ignoré:', (err as Error).message?.slice(0, 120));
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
