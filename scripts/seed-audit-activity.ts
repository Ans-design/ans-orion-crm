import type { PrismaClient } from '@prisma/client';

const DEMO_EVENTS = [
  { action: 'LOGIN', entity: 'Session', entityLabel: 'Connexion admin', userName: 'Admin ANS' },
  { action: 'CREATE', entity: 'Client', entityLabel: 'Orange Madagascar', userName: 'Tsiory R.' },
  { action: 'CREATE', entity: 'Commande', entityLabel: 'CMD-2024-001', userName: 'Tsiory R.' },
  { action: 'STATUS_CHANGE', entity: 'Commande', entityLabel: 'CMD-2024-003', userName: 'Fidy M.', details: '{"statut":"En production"}' },
  { action: 'CREATE', entity: 'Devis', entityLabel: 'DV-2026-001', userName: 'Sarobidy N.' },
  { action: 'ACCEPT', entity: 'Devis', entityLabel: 'DV-2026-001', userName: 'Liantsoa A.' },
  { action: 'CREATE', entity: 'Facture', entityLabel: 'FAC-2026-001', userName: 'Laingo T.' },
  { action: 'CREATE', entity: 'Paiement', entityLabel: 'Acompte OM-005', userName: 'Nirina R.' },
  { action: 'UPDATE', entity: 'Production', entityLabel: 'Konica C1100', userName: 'Hery R.' },
  { action: 'CREATE', entity: 'Livraison', entityLabel: 'LIV-2026-012', userName: 'Mamitiana O.' },
  { action: 'UPDATE', entity: 'Stock', entityLabel: 'Papier A4 80g', userName: 'Haja L.' },
  { action: 'CREATE', entity: 'Client', entityLabel: 'BOA Madagascar', userName: 'Tsiory R.' },
  { action: 'STATUS_CHANGE', entity: 'Commande', entityLabel: 'CMD-2024-007', userName: 'Tiana', details: '{"avancement":75}' },
  { action: 'LOGIN', entity: 'Session', entityLabel: 'Connexion commercial', userName: 'Tsiory R.' },
  { action: 'CREATE', entity: 'Commande', entityLabel: 'CMD-2024-011', userName: 'Tsiory R.' },
  { action: 'UPDATE', entity: 'Client', entityLabel: 'Quantum Solutions', userName: 'Sarobidy N.' },
  { action: 'CREATE', entity: 'Paiement', entityLabel: 'Solde BM-006', userName: 'Laingo T.' },
  { action: 'DELETE', entity: 'Devis', entityLabel: 'DV-brouillon', userName: 'Thomas A.' },
  { action: 'STATUS_CHANGE', entity: 'Facture', entityLabel: 'FAC-2026-001', userName: 'Laingo T.', details: '{"statut":"Payée"}' },
  { action: 'LOGIN', entity: 'Session', entityLabel: 'Connexion direction', userName: 'Liantsoa A.' },
];

/** Journal d'audit pour historique / rapports / seed-status. */
export async function seedAuditActivity(prisma: PrismaClient) {
  const existing = await prisma.auditLog.count();
  if (existing >= 10) {
    console.log(`${existing} audit logs déjà présents — skip`);
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const base = Date.now() - 14 * 86400000;

  for (let i = 0; i < DEMO_EVENTS.length; i++) {
    const ev = DEMO_EVENTS[i];
    await prisma.auditLog.create({
      data: {
        userId: admin?.id ?? null,
        userName: ev.userName,
        action: ev.action,
        entity: ev.entity,
        entityLabel: ev.entityLabel,
        details: ev.details ?? null,
        createdAt: new Date(base + i * 3600000 * 6),
      },
    });
  }
  console.log(`${DEMO_EVENTS.length} entrées audit seedées`);
}
