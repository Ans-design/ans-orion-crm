import type { PrismaClient } from '@prisma/client';

const DEMO_MESSAGES = [
  {
    authorName: 'Admin ANS',
    authorRole: 'admin',
    content: 'Bienvenue sur le fil d\'actualité Orion ! Utilisez cet espace pour coordonner l\'équipe entre les annexes AX0 et AX1.',
    pinned: true,
  },
  {
    authorName: 'Compte Démo',
    authorRole: 'demo',
    content: 'Rappel : les commandes urgentes Orange Madagascar passent en priorité production cette semaine.',
    pinned: false,
  },
];

const DEMO_SUGGESTIONS = [
  {
    authorName: 'Équipe Production',
    title: 'Écran planning atelier sur TV',
    content: 'Installer un écran en salle de production pour afficher le planning du jour en temps réel.',
    status: 'En étude',
    votes: 5,
  },
  {
    authorName: 'Commercial',
    title: 'Relance auto devis > 7 jours',
    content: 'Notification automatique quand un devis reste en attente plus d\'une semaine.',
    status: 'Prioritaire',
    votes: 8,
  },
  {
    authorName: 'Studio Design',
    title: 'Checklist prépresse standard',
    content: 'Modèle de checklist BAT réutilisable pour tous les clients premium.',
    status: 'Validé',
    votes: 3,
  },
];

export async function seedEquipe(prisma: PrismaClient) {
  const existing = await prisma.teamMessage.count();
  if (existing > 0) {
    console.log('Communication équipe déjà seedée — skip');
    return;
  }

  for (const m of DEMO_MESSAGES) {
    await prisma.teamMessage.create({ data: m });
  }

  for (const s of DEMO_SUGGESTIONS) {
    await prisma.teamSuggestion.create({ data: s });
  }

  console.log(`${DEMO_MESSAGES.length} messages + ${DEMO_SUGGESTIONS.length} suggestions seedés`);
}
