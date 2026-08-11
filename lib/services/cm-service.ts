import { prisma } from '@/lib/prisma';

export {
  CAMPAIGN_PLATFORMS,
  CAMPAIGN_STATUTS,
  RELANCE_STATUTS,
  TEMPLATE_CATEGORIES,
} from '@/lib/constants/cm';

export async function listCmCampaigns(filters?: { statut?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.statut && filters.statut !== 'tous') where.statut = filters.statut;

  return prisma.cmCampaign.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      client: { select: { id: true, name: true, code: true } },
      posts: { orderBy: { scheduledAt: 'asc' }, take: 5 },
      _count: { select: { posts: true } },
    },
  });
}

export async function getCmCampaign(id: string) {
  return prisma.cmCampaign.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, code: true } },
      posts: { orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }] },
    },
  });
}

export async function createCmCampaign(data: {
  name: string;
  platform?: string;
  statut?: string;
  dateDebut?: Date | null;
  dateFin?: Date | null;
  objectif?: string | null;
  budget?: number | null;
  clientId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}) {
  return prisma.cmCampaign.create({
    data: {
      name: data.name.trim(),
      platform: data.platform ?? 'Multi',
      statut: data.statut ?? 'Brouillon',
      dateDebut: data.dateDebut ?? null,
      dateFin: data.dateFin ?? null,
      objectif: data.objectif?.trim() || null,
      budget: data.budget ?? null,
      clientId: data.clientId ?? null,
      notes: data.notes?.trim() || null,
      createdBy: data.createdBy ?? null,
    },
    include: { client: { select: { name: true } }, _count: { select: { posts: true } } },
  });
}

export async function addCampaignPost(
  campaignId: string,
  data: { titre: string; contenu?: string | null; platform?: string; statut?: string; scheduledAt?: Date | null },
) {
  return prisma.cmCampaignPost.create({
    data: {
      campaignId,
      titre: data.titre.trim(),
      contenu: data.contenu?.trim() || null,
      platform: data.platform ?? 'Facebook',
      statut: data.statut ?? 'Idée',
      scheduledAt: data.scheduledAt ?? null,
    },
  });
}

export async function updateCampaignPost(
  postId: string,
  data: Partial<{ statut: string; titre: string; contenu: string; scheduledAt: Date | null }>,
) {
  const patch: Record<string, unknown> = { ...data };
  if (data.statut === 'Publié') patch.publishedAt = new Date();
  return prisma.cmCampaignPost.update({ where: { id: postId }, data: patch });
}

export async function listCmRelances(filters?: { statut?: string; overdue?: boolean }) {
  const where: Record<string, unknown> = {};
  if (filters?.statut && filters.statut !== 'tous') where.statut = filters.statut;
  if (filters?.overdue) {
    where.statut = 'Planifiée';
    where.dueDate = { lt: new Date() };
  }

  return prisma.cmRelance.findMany({
    where,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    include: {
      client: { select: { id: true, name: true, code: true, email: true, tel: true } },
      template: { select: { id: true, name: true, subject: true, body: true } },
    },
  });
}

export async function createCmRelance(data: {
  clientId?: string | null;
  type?: string;
  canal?: string;
  objet: string;
  message?: string | null;
  dueDate?: Date | null;
  templateId?: string | null;
  assignedTo?: string | null;
}) {
  let message = data.message?.trim() || null;
  if (data.templateId && !message) {
    const tpl = await prisma.cmMessageTemplate.findUnique({ where: { id: data.templateId } });
    if (tpl) message = tpl.body;
  }

  return prisma.cmRelance.create({
    data: {
      clientId: data.clientId ?? null,
      type: data.type ?? 'Commercial',
      canal: data.canal ?? 'Email',
      objet: data.objet.trim(),
      message,
      dueDate: data.dueDate ?? null,
      templateId: data.templateId ?? null,
      assignedTo: data.assignedTo ?? null,
    },
    include: { client: { select: { name: true } }, template: true },
  });
}

export async function markRelanceSent(id: string) {
  return prisma.cmRelance.update({
    where: { id },
    data: { statut: 'Envoyée', sentAt: new Date() },
  });
}

export async function listMessageTemplates(category?: string) {
  const where: Record<string, unknown> = {};
  if (category && category !== 'tous') where.category = category;
  return prisma.cmMessageTemplate.findMany({ where, orderBy: { name: 'asc' } });
}

export async function createMessageTemplate(data: {
  name: string;
  canal?: string;
  category?: string;
  subject?: string | null;
  body: string;
}) {
  return prisma.cmMessageTemplate.create({
    data: {
      name: data.name.trim(),
      canal: data.canal ?? 'Email',
      category: data.category ?? 'Commercial',
      subject: data.subject?.trim() || null,
      body: data.body.trim(),
    },
  });
}

export async function getCmStats() {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [campagnesActives, postsAPlanifier, relancesPending, relancesOverdue, templates] = await Promise.all([
    prisma.cmCampaign.count({ where: { statut: { in: ['Active', 'Planifiée'] } } }),
    prisma.cmCampaignPost.count({
      where: {
        statut: { in: ['Idée', 'À créer', 'En validation', 'Planifié'] },
        scheduledAt: { lte: weekEnd },
      },
    }),
    prisma.cmRelance.count({ where: { statut: 'Planifiée' } }),
    prisma.cmRelance.count({ where: { statut: 'Planifiée', dueDate: { lt: now } } }),
    prisma.cmMessageTemplate.count(),
  ]);

  return { campagnesActives, postsAPlanifier, relancesPending, relancesOverdue, templates };
}

export async function seedCmDefaults(prismaClient: typeof prisma) {
  const tplCount = await prismaClient.cmMessageTemplate.count();
  if (tplCount > 0) return;

  const templates = [
    {
      name: 'Relance devis en attente',
      category: 'Relance devis',
      subject: 'Votre devis ANS Design',
      body: 'Bonjour,\n\nNous revenons vers vous concernant le devis transmis. Souhaitez-vous que nous le finalisions ensemble ?\n\nCordialement,\nANS Design',
    },
    {
      name: 'Relance facture impayée',
      category: 'Relance facture',
      subject: 'Rappel paiement — ANS Design',
      body: 'Bonjour,\n\nSauf erreur de notre part, votre facture reste en attente de règlement. Merci de nous confirmer la date prévue.\n\nCordialement,\nANS Design',
    },
    {
      name: 'Prospection print B2B',
      category: 'Prospection',
      subject: 'Solutions impression ANS Design',
      body: 'Bonjour,\n\nANS Design accompagne les entreprises à Antananarivo en impression, PLV et packaging. Puis-je vous envoyer notre catalogue ?\n\nCordialement',
    },
  ];

  for (const t of templates) {
    await prismaClient.cmMessageTemplate.create({ data: t });
  }
}
