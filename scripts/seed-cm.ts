import type { PrismaClient } from '@prisma/client';
import { seedCmDefaults } from '@/lib/services/cm-service';

export async function seedCm(prisma: PrismaClient) {
  await seedCmDefaults(prisma);

  const existing = await prisma.cmCampaign.count();
  if (existing > 0) {
    console.log('CM déjà seedé — skip campagnes');
    return;
  }

  const client = await prisma.client.findFirst({ where: { statut: 'Premium' } });
  const tplDevis = await prisma.cmMessageTemplate.findFirst({ where: { category: 'Relance devis' } });

  const campaign = await prisma.cmCampaign.create({
    data: {
      name: 'Print & PLV — Q2 2026',
      platform: 'Multi',
      statut: 'Active',
      objectif: 'Promouvoir offres packaging et roll-up',
      clientId: client?.id ?? null,
      createdBy: 'Admin ANS',
      posts: {
        create: [
          { titre: 'Nouveauté roll-up premium', platform: 'Facebook', statut: 'Planifié', scheduledAt: new Date(Date.now() + 86400000 * 2) },
          { titre: 'Behind the scenes atelier', platform: 'Instagram', statut: 'À créer' },
          { titre: 'Packaging sur mesure', platform: 'TikTok', statut: 'Idée' },
        ],
      },
    },
  });

  await prisma.cmRelance.createMany({
    data: [
      {
        clientId: client?.id ?? null,
        type: 'Devis',
        canal: 'Email',
        objet: 'Relance devis brochure A4',
        message: tplDevis?.body ?? null,
        templateId: tplDevis?.id ?? null,
        statut: 'Planifiée',
        dueDate: new Date(Date.now() - 86400000),
        assignedTo: 'Commercial ANS',
      },
      {
        type: 'Prospect',
        canal: 'WhatsApp',
        objet: 'Prospection hôtellerie',
        statut: 'Planifiée',
        dueDate: new Date(Date.now() + 86400000 * 3),
        assignedTo: 'Commercial ANS',
      },
    ],
  });

  console.log(`CM: campagne ${campaign.name} + 2 relances seedées`);
}
