import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { annuleeCommandeStatut, completedCommandeStatuts, pendingDevisStatuts } from '@/lib/server/data/prisma-statut-bridge';
import { createNotification } from '@/lib/services/notification-service';
import { TALK_SERVICE_GROUPS, TALK_ORDER_MEMBER_ROLES, isTalkOrderMemberRole } from '@/lib/messaging/constants';
import { requireTalkMember, requireMessageMember } from '@/lib/messaging/permissions';
import { isDemoPrivilegeElevationAllowed } from '@/lib/local-dev';

function isDemoTalkElevated(role: string): boolean {
  return role === 'demo' && isDemoPrivilegeElevationAllowed();
}

export async function ensureServiceConversations() {
  for (const svc of TALK_SERVICE_GROUPS) {
    const existing = await prisma.talkConversation.findFirst({
      where: { type: 'service', serviceKey: svc.key },
    });
    if (existing) continue;
    await prisma.talkConversation.create({
      data: {
        name: `${svc.icon} ${svc.name}`,
        type: 'service',
        serviceKey: svc.key,
        description: `Groupe service ${svc.name}`,
        label: svc.name,
      },
    });
  }
}

export async function addUserToServiceGroups(userId: string, role: string) {
  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) return;

  await ensureServiceConversations();
  const { roleToServiceKeys } = await import('@/lib/messaging/constants');
  const keys = roleToServiceKeys(role);
  const demoAllowed = isDemoTalkElevated(role);
  const allService = role === 'admin' || role === 'manager' || demoAllowed
    ? TALK_SERVICE_GROUPS.map((s) => s.key)
    : keys;

  if (!allService.length) return;

  const convs = await prisma.talkConversation.findMany({
    where: { type: 'service', serviceKey: { in: allService } },
  });

  for (const c of convs) {
    await prisma.talkConversationMember.upsert({
      where: { conversationId_userId: { conversationId: c.id, userId } },
      create: { conversationId: c.id, userId, role: 'member' },
      update: {},
    });
  }
}

/** Membres groupe commande : rôles ops + responsables tâches + auteur courant. */
async function resolveOrderConversationMemberIds(
  commandeId: string,
  extraUserId?: string | null,
): Promise<string[]> {
  const [roleUsers, taskAssignees] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [...TALK_ORDER_MEMBER_ROLES] } },
      select: { id: true },
    }),
    prisma.metierTask.findMany({
      where: { commandeId, assigneeId: { not: null } },
      select: { assigneeId: true },
    }),
  ]);
  const ids = new Set<string>();
  for (const u of roleUsers) ids.add(u.id);
  for (const t of taskAssignees) {
    if (t.assigneeId) ids.add(t.assigneeId);
  }
  if (extraUserId) ids.add(extraUserId);
  return [...ids];
}

async function ensureOrderConversationMembers(
  conversationId: string,
  commandeId: string,
  extraUserId?: string | null,
) {
  const memberIds = await resolveOrderConversationMemberIds(commandeId, extraUserId);
  await Promise.all(
    memberIds.map((userId) =>
      prisma.talkConversationMember.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        create: { conversationId, userId, role: 'member' },
        update: { revokedAt: null },
      }),
    ),
  );
}

export async function createOrderConversation(
  commandeId: string,
  opts?: { userId?: string; userName?: string },
) {
  const existing = await prisma.talkConversation.findUnique({ where: { commandeId } });
  if (existing) {
    await ensureOrderConversationMembers(existing.id, commandeId, opts?.userId);
    return existing;
  }

  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    include: { client: { select: { name: true } } },
  });
  if (!commande) throw new Error('COMMANDE_NOT_FOUND');

  const memberIds = await resolveOrderConversationMemberIds(commandeId, opts?.userId);

  try {
    const conv = await prisma.talkConversation.create({
      data: {
        name: `📦 Commande #${commande.numero} — ${commande.client?.name ?? 'Client'}`,
        type: 'order',
        commandeId,
        description: `Groupe production synchronisé — ${commande.article}`,
        label: commande.priorite === 'Urgente' ? 'Urgent' : 'Commande',
        pinned: commande.priorite === 'Urgente',
        members: {
          create: memberIds.map((userId) => ({ userId, role: 'member' })),
        },
      },
    });

    await logAudit({
      userId: opts?.userId,
      userName: opts?.userName,
      action: 'TALK_ORDER_GROUP',
      entity: 'TalkConversation',
      entityId: conv.id,
      entityLabel: conv.name,
      details: { commandeId, numero: commande.numero },
    });

    return conv;
  } catch (err) {
    const raced = await prisma.talkConversation.findUnique({ where: { commandeId } });
    if (raced) {
      await ensureOrderConversationMembers(raced.id, commandeId, opts?.userId);
      return raced;
    }
    throw err;
  }
}

export async function createDevisConversation(
  devisId: string,
  opts?: { userId?: string; userName?: string },
) {
  const existing = await prisma.talkConversation.findUnique({ where: { devisId } });
  if (existing) return existing;

  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: { client: { select: { name: true } } },
  });
  if (!devis) throw new Error('DEVIS_NOT_FOUND');

  const users = await prisma.user.findMany({
    where: { role: { in: [...TALK_ORDER_MEMBER_ROLES] } },
    select: { id: true },
  });

  try {
    const conv = await prisma.talkConversation.create({
      data: {
        name: `📋 Devis ${devis.numero} — ${devis.client?.name ?? 'Client'}`,
        type: 'devis',
        devisId,
        description: `Discussion devis — ${formatPriceAr(devis.totalTTC)} TTC`,
        label: 'Devis',
        members: {
          create: users.map((u) => ({ userId: u.id, role: 'member' })),
        },
      },
    });

    await logAudit({
      userId: opts?.userId,
      userName: opts?.userName,
      action: 'TALK_DEVIS_GROUP',
      entity: 'TalkConversation',
      entityId: conv.id,
      entityLabel: conv.name,
      details: { devisId, numero: devis.numero },
    });

    return conv;
  } catch (err) {
    const raced = await prisma.talkConversation.findUnique({ where: { devisId } });
    if (raced) return raced;
    throw err;
  }
}

function formatPriceAr(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} Ar`;
}

export async function postDevisTalkUpdate(
  devisId: string,
  body: string,
  opts: { userId: string; userName: string; userRole?: string },
) {
  const conv = await prisma.talkConversation.findUnique({ where: { devisId } });
  if (!conv) return null;
  return sendTalkMessage({
    conversationId: conv.id,
    userId: opts.userId,
    userName: opts.userName,
    userRole: opts.userRole ?? 'commercial',
    body,
  });
}

export async function createDossierConversation(
  dossierId: string,
  opts?: { userId?: string; userName?: string },
) {
  const existing = await prisma.talkConversation.findUnique({ where: { productionDossierId: dossierId } });
  if (existing) return existing;

  const dossier = await prisma.productionDossier.findUnique({
    where: { id: dossierId },
    include: { commande: { include: { client: { select: { name: true } } } } },
  });
  if (!dossier) throw new Error('DOSSIER_NOT_FOUND');

  const users = await prisma.user.findMany({
    where: { role: { in: [...TALK_ORDER_MEMBER_ROLES] } },
    select: { id: true },
  });

  try {
    const conv = await prisma.talkConversation.create({
      data: {
        name: `🏭 Dossier GPAO — ${dossier.commande.numero}`,
        type: 'dossier',
        productionDossierId: dossierId,
        description: `Production — ${dossier.commande.article}`,
        label: 'GPAO',
        members: {
          create: users.map((u) => ({ userId: u.id, role: 'member' })),
        },
      },
    });

    await logAudit({
      userId: opts?.userId,
      userName: opts?.userName,
      action: 'TALK_DOSSIER_GROUP',
      entity: 'TalkConversation',
      entityId: conv.id,
      entityLabel: conv.name,
      details: { dossierId, commandeId: dossier.commandeId },
    });

    return conv;
  } catch (err) {
    const raced = await prisma.talkConversation.findUnique({ where: { productionDossierId: dossierId } });
    if (raced) return raced;
    throw err;
  }
}

/** Ré-adhère automatiquement aux groupes service/commande si le rôle le permet. */
export async function ensureTalkMembership(conversationId: string, userId: string, role: string) {
  const existing = await prisma.talkConversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (existing?.revokedAt) throw new Error('NOT_MEMBER');
  if (existing) return;

  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) throw new Error('NOT_MEMBER');

  const conv = await prisma.talkConversation.findUnique({ where: { id: conversationId } });
  if (!conv) throw new Error('NOT_FOUND');

  const demoTalk = isDemoTalkElevated(role);
  if (role === 'admin' || demoTalk) {
    if (conv.type === 'private') {
      const members = await prisma.talkConversationMember.findMany({
        where: { conversationId },
        select: { userId: true },
      });
      if (members.length >= 2 && !members.some((m) => m.userId === userId)) {
        throw new Error('NOT_MEMBER');
      }
    }
    await prisma.talkConversationMember.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId, role: 'admin' },
      update: {},
    });
    return;
  }

  const { roleToServiceKeys } = await import('@/lib/messaging/constants');
  let canJoin = false;

  if (conv.type === 'service' && conv.serviceKey) {
    const keys = role === 'admin' || role === 'manager' || demoTalk
      ? TALK_SERVICE_GROUPS.map((s) => s.key)
      : roleToServiceKeys(role);
    canJoin = keys.includes(conv.serviceKey);
  } else if (conv.type === 'order' && isTalkOrderMemberRole(role)) {
    canJoin = true;
  } else if (conv.type === 'dossier' && isTalkOrderMemberRole(role)) {
    canJoin = true;
  } else if (conv.type === 'devis' && isTalkOrderMemberRole(role)) {
    canJoin = true;
  }

  if (!canJoin) throw new Error('NOT_MEMBER');

  await prisma.talkConversationMember.create({
    data: { conversationId, userId, role: 'member' },
  });
}

/** Ajoute l'utilisateur aux groupes commande ouverts (rattrapage après création compte / changement rôle). */
export async function syncUserToOrderConversations(userId: string, role: string) {
  if (!isTalkOrderMemberRole(role)) return;

  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) return;

  const excludedStatuts = completedCommandeStatuts();
  const openDevisStatuts = pendingDevisStatuts();
  const convs = await prisma.talkConversation.findMany({
    where: {
      OR: [
        {
          type: { in: ['order', 'dossier'] },
          OR: [
            { commande: { statut: { notIn: excludedStatuts } } },
            { productionDossier: { commande: { statut: { notIn: excludedStatuts } } } },
          ],
        },
        {
          type: 'devis',
          devis: { statut: { in: openDevisStatuts } },
        },
      ],
    },
    select: { id: true },
    take: 80,
  });

  for (const c of convs) {
    await prisma.talkConversationMember.upsert({
      where: { conversationId_userId: { conversationId: c.id, userId } },
      create: { conversationId: c.id, userId, role: 'member' },
      update: {},
    });
  }
}

export async function findOrCreatePrivateConversation(
  userId: string,
  targetUserId: string,
  currentUserName: string,
) {
  if (userId === targetUserId) throw new Error('SELF_CHAT');

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new Error('USER_NOT_FOUND');

  const existing = await prisma.talkConversation.findFirst({
    where: {
      type: 'private',
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    include: { members: true },
  });
  if (existing && existing.members.length === 2) return existing;

  try {
    return await prisma.talkConversation.create({
      data: {
        name: target.name || target.email,
        type: 'private',
        description: `Discussion privée`,
        label: 'Interne',
        createdById: userId,
        members: {
          create: [
            { userId, role: 'member' },
            { userId: targetUserId, role: 'member' },
          ],
        },
      },
    });
  } catch {
    const raced = await prisma.talkConversation.findFirst({
      where: {
        type: 'private',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: { members: true },
    });
    if (raced && raced.members.length === 2) return raced;
    throw new Error('PRIVATE_CHAT_FAILED');
  }
}

export async function listConversationsForUser(userId: string, role: string) {
  // V14 P0-16 : lecture seule — pas d’upsert memberships sur GET.
  // Sync rôle/commande via jobs (ensureTalkMembership on write / cron).
  await ensureServiceConversations();

  const convInclude = {
    productionDossier: { select: { commandeId: true } },
    members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
    messages: {
      orderBy: { createdAt: 'desc' as const },
      take: 1,
      where: { deletedAt: null },
      include: { reads: true },
    },
    _count: { select: { messages: true } },
  };

  const isAdmin = role === 'admin' || isDemoTalkElevated(role);

  const convRows = isAdmin
    ? await prisma.talkConversation.findMany({
        where: {
          OR: [
            { type: { not: 'private' } },
            { members: { some: { userId } } },
          ],
        },
        include: convInclude,
        orderBy: { updatedAt: 'desc' },
        take: 100,
      })
    : (
        await prisma.talkConversationMember.findMany({
          where: { userId, revokedAt: null },
          include: { conversation: { include: convInclude } },
          orderBy: { conversation: { updatedAt: 'desc' } },
        })
      ).map((m) => m.conversation);

  const results = await Promise.all(convRows.map(async (conv) => {
    const lastMsg = conv.messages[0];
    const unread = await prisma.talkMessage.count({
      where: {
        conversationId: conv.id,
        deletedAt: null,
        senderId: { not: userId },
        NOT: { reads: { some: { userId } } },
      },
    });

    const noResponse = lastMsg ? lastMsg.senderId === userId : false;

    return {
      id: conv.id,
      name: conv.name,
      type: conv.type,
      serviceKey: conv.serviceKey,
      commandeId: conv.commandeId ?? conv.productionDossier?.commandeId ?? null,
      devisId: conv.devisId,
      productionDossierId: conv.productionDossierId,
      description: conv.description,
      label: conv.label,
      pinned: conv.pinned,
      noResponse,
      unreadCount: unread,
      lastMessage: lastMsg ? {
        id: lastMsg.id,
        body: lastMsg.body.slice(0, 160),
        senderName: lastMsg.senderName,
        createdAt: lastMsg.createdAt.toISOString(),
      } : null,
      members: conv.members.map((mb) => ({
        userId: mb.userId,
        name: mb.user.name || mb.user.email,
        role: mb.user.role,
      })),
      updatedAt: conv.updatedAt.toISOString(),
    };
  }));

  return results.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

/** Messages démo dans le premier groupe commande (UX preview). */
async function seedTalkDemoMessages() {
  const count = await prisma.talkMessage.count();
  if (count > 0) return;

  const conv = await prisma.talkConversation.findFirst({
    where: { type: 'order' },
    orderBy: { createdAt: 'asc' },
  });
  if (!conv) return;

  const commercial = await prisma.user.findFirst({ where: { role: 'commercial' }, select: { id: true, name: true, role: true } });
  const designer = await prisma.user.findFirst({ where: { role: 'designer' }, select: { id: true, name: true, role: true } });
  if (!commercial || !designer) return;

  await prisma.talkMessage.createMany({
    data: [
      {
        conversationId: conv.id,
        senderId: commercial.id,
        senderName: commercial.name || 'Commercial',
        senderRole: commercial.role,
        body: 'Bonjour l\'équipe, où en est-on sur le BAT de cette commande ?',
      },
      {
        conversationId: conv.id,
        senderId: designer.id,
        senderName: designer.name || 'Graphiste',
        senderRole: designer.role,
        body: 'BAT V1 finalisé — je dépose le PDF HD dans le fil. Merci de valider avant tirage.',
      },
    ],
  });
  await prisma.talkConversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date() },
  });
}

/** Initialise groupes service + adhésions + groupes commande (seed / premier déploiement). */
export async function bootstrapTalkFromSeed() {
  await ensureServiceConversations();
  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  for (const u of users) {
    if (u.role) await addUserToServiceGroups(u.id, u.role);
  }
  const commandes = await prisma.commande.findMany({
    where: { statut: { notIn: [annuleeCommandeStatut()] } },
    select: { id: true },
    take: 50,
  });
  for (const c of commandes) {
    try {
      await createOrderConversation(c.id);
    } catch {
      /* groupe déjà existant ou commande invalide */
    }
  }
  await seedTalkDemoMessages();
}

export async function getConversationMessages(
  conversationId: string,
  userId: string,
  role: string,
  opts?: { search?: string; limit?: number; before?: string },
) {
  // V14 P0-15 : GET lecture seule — pas de marquage lu ni upsert membership.
  void role;
  await requireTalkMember(conversationId, userId);

  const where: Record<string, unknown> = {
    conversationId,
    deletedAt: null,
  };
  if (opts?.search) {
    where.body = { contains: opts.search };
  }
  if (opts?.before) {
    where.createdAt = { lt: new Date(opts.before) };
  }

  const limit = opts?.limit ?? 100;
  const searchMode = Boolean(opts?.search);

  let messages;
  if (opts?.before) {
    messages = (await prisma.talkMessage.findMany({
      where: { conversationId, deletedAt: null, createdAt: { lt: new Date(opts.before) } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        reads: true,
        reactions: true,
        attachments: true,
        replyTo: { select: { id: true, body: true, senderName: true } },
        tasks: true,
      },
    })).reverse();
  } else if (searchMode) {
    messages = await prisma.talkMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        reads: true,
        reactions: true,
        attachments: true,
        replyTo: { select: { id: true, body: true, senderName: true } },
        tasks: true,
      },
    });
  } else {
    messages = (await prisma.talkMessage.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        reads: true,
        reactions: true,
        attachments: true,
        replyTo: { select: { id: true, body: true, senderName: true } },
        tasks: true,
      },
    })).reverse();
  }

  return messages.map((m) => serializeMessage(m, userId));
}

/** Marquage lu explicite jusqu’à un message (V14 P0-15). */
export async function markVisibleThrough(params: {
  conversationId: string;
  userId: string;
  throughMessageId: string;
}) {
  await requireTalkMember(params.conversationId, params.userId);

  const through = await prisma.talkMessage.findFirst({
    where: {
      id: params.throughMessageId,
      conversationId: params.conversationId,
      deletedAt: null,
    },
    select: { createdAt: true },
  });
  if (!through) throw new Error('NOT_FOUND');

  const toMark = await prisma.talkMessage.findMany({
    where: {
      conversationId: params.conversationId,
      deletedAt: null,
      senderId: { not: params.userId },
      createdAt: { lte: through.createdAt },
      NOT: { reads: { some: { userId: params.userId } } },
    },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const { id: messageId } of toMark) {
      await tx.talkMessageRead.upsert({
        where: { messageId_userId: { messageId, userId: params.userId } },
        create: { messageId, userId: params.userId, acked: false },
        update: {},
      });
    }
    await tx.talkConversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: params.conversationId,
          userId: params.userId,
        },
      },
      data: { lastReadAt: new Date() },
    });
  });

  return { marked: toMark.length };
}

function serializeMessage(
  m: {
    id: string;
    conversationId: string;
    senderId: string | null;
    senderName: string;
    senderRole: string | null;
    body: string;
    replyToId: string | null;
    pinned: boolean;
    editedAt: Date | null;
    commandeId: string | null;
    proofId: string | null;
    metierTaskId: string | null;
    createdAt: Date;
    reads: { userId: string; acked: boolean }[];
    reactions: { userId: string; emoji: string }[];
    attachments: {
      id: string;
      fileName: string;
      originalFileName: string;
      extension: string;
      mimeType: string;
      sizeBytes: number;
      checksumSha256: string;
      version: string;
      status: string;
      uploadedByName: string | null;
      createdAt: Date;
    }[];
    replyTo: { id: string; body: string; senderName: string } | null;
    tasks: { id: string; title: string; status: string; taskId: string | null }[];
  },
  currentUserId: string,
) {
  const reactionMap: Record<string, number> = {};
  for (const r of m.reactions) {
    reactionMap[r.emoji] = (reactionMap[r.emoji] ?? 0) + 1;
  }

  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: m.senderName,
    senderRole: m.senderRole,
    text: m.body,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    pinned: m.pinned,
    replyToId: m.replyToId,
    replyTo: m.replyTo,
    reads: m.reads.map((r) => r.userId),
    ackedBy: m.reads.filter((r) => r.acked).map((r) => r.userId),
    isMine: m.senderId === currentUserId,
    reactions: reactionMap,
    attachments: m.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      originalFileName: a.originalFileName,
      extension: a.extension,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      checksumSha256: a.checksumSha256,
      version: a.version,
      status: a.status,
      uploadedByName: a.uploadedByName,
      createdAt: a.createdAt.toISOString(),
    })),
    tasks: m.tasks,
    commandeId: m.commandeId,
    proofId: m.proofId,
    metierTaskId: m.metierTaskId,
  };
}

export async function sendTalkMessage(params: {
  conversationId: string;
  userId: string;
  userName: string;
  userRole: string;
  body: string;
  replyToId?: string;
  attachmentIds?: string[];
  commandeId?: string;
  clientMessageId?: string;
}) {
  await ensureTalkMembership(params.conversationId, params.userId, params.userRole);

  const conv = await prisma.talkConversation.findUnique({
    where: { id: params.conversationId },
    select: { commandeId: true, productionDossier: { select: { commandeId: true } } },
  });
  if (!conv) throw new Error('NOT_FOUND');

  const linkedCommandeId = conv.commandeId ?? conv.productionDossier?.commandeId ?? null;

  if (params.replyToId) {
    const reply = await prisma.talkMessage.findFirst({
      where: { id: params.replyToId, conversationId: params.conversationId, deletedAt: null },
    });
    if (!reply) throw new Error('INVALID_REPLY');
  }

  const trimmed = params.body.trim();
  if (!trimmed && !(params.attachmentIds?.length)) throw new Error('EMPTY_MESSAGE');

  const clientMessageId = params.clientMessageId?.trim() || null;

  if (clientMessageId) {
    const existing = await prisma.talkMessage.findFirst({
      where: {
        conversationId: params.conversationId,
        senderId: params.userId,
        clientMessageId,
      },
      include: {
        reads: true,
        reactions: true,
        attachments: true,
        replyTo: { select: { id: true, body: true, senderName: true } },
        tasks: true,
      },
    });
    if (existing) return serializeMessage(existing, params.userId);
  }

  const memberIds = (
    await prisma.talkConversationMember.findMany({
      where: {
        conversationId: params.conversationId,
        userId: { not: params.userId },
        muted: false,
        revokedAt: null,
      },
      select: { userId: true },
    })
  ).map((m) => m.userId);

  const full = await prisma.$transaction(async (tx) => {
    const msg = await tx.talkMessage.create({
      data: {
        conversationId: params.conversationId,
        senderId: params.userId,
        senderName: params.userName,
        senderRole: params.userRole,
        body: trimmed || '📎 Fichier joint',
        replyToId: params.replyToId || null,
        commandeId: linkedCommandeId,
        clientMessageId,
      },
    });

    if (params.attachmentIds?.length) {
      const linked = await tx.talkAttachment.updateMany({
        where: {
          id: { in: params.attachmentIds },
          conversationId: params.conversationId,
          uploadedById: params.userId,
          messageId: null,
        },
        data: { messageId: msg.id },
      });
      if (linked.count !== params.attachmentIds.length) throw new Error('INVALID_ATTACHMENTS');
    }

    await tx.talkConversation.update({
      where: { id: params.conversationId },
      data: { updatedAt: new Date(), noResponse: false },
    });

    const { enqueueOutbox } = await import('@/lib/server/outbox');
    await enqueueOutbox({
      type: 'TalkMessageCreated',
      aggregateType: 'TalkMessage',
      aggregateId: msg.id,
      idempotencyKey: clientMessageId
        ? `talk-msg:${params.conversationId}:${params.userId}:${clientMessageId}`
        : `talk-msg:${msg.id}`,
      payload: {
        messageId: msg.id,
        conversationId: params.conversationId,
        senderId: params.userId,
        senderName: params.userName,
        bodyPreview: params.body.slice(0, 120),
        memberUserIds: memberIds,
      },
      tx,
    });

    const loaded = await tx.talkMessage.findUnique({
      where: { id: msg.id },
      include: {
        reads: true,
        reactions: true,
        attachments: true,
        replyTo: { select: { id: true, body: true, senderName: true } },
        tasks: true,
      },
    });
    if (!loaded) throw new Error('SEND_FAILED');
    return loaded;
  });

  // Fan-out notifications in-app (e-mail scoped via onlyUserIds) — après TX réussie.
  if (memberIds.length) {
    await createNotification({
      userIds: memberIds,
      onlyUserIds: memberIds,
      title: 'ANS Talk',
      message: `${params.userName} : ${params.body.slice(0, 120)}`,
      link: `/messagerie?conv=${params.conversationId}`,
      type: 'info',
      category: 'commandes',
      dedupKey: `talk:${full.id}`,
      resourceType: 'TalkMessage',
      resourceId: full.id,
      sourceEventId: full.id,
    });
  }

  return serializeMessage(full, params.userId);
}

/** Révocation membership Talk (V14 P0-17) — soft, pas de suppression. */
export async function revokeTalkMembership(conversationId: string, userId: string) {
  await prisma.talkConversationMember.updateMany({
    where: { conversationId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function editTalkMessage(
  messageId: string,
  userId: string,
  role: string,
  body: string,
) {
  const msg = await prisma.talkMessage.findUnique({ where: { id: messageId } });
  if (!msg || msg.deletedAt) throw new Error('NOT_FOUND');
  await requireTalkMember(msg.conversationId, userId);
  const { canEditMessage } = await import('@/lib/messaging/permissions');
  if (!canEditMessage(msg.senderId, userId, role)) throw new Error('FORBIDDEN');

  return prisma.talkMessage.update({
    where: { id: messageId },
    data: { body: body.trim(), editedAt: new Date() },
  });
}

export async function deleteTalkMessage(messageId: string, userId: string, role: string) {
  const msg = await prisma.talkMessage.findUnique({ where: { id: messageId } });
  if (!msg || msg.deletedAt) throw new Error('NOT_FOUND');
  await requireTalkMember(msg.conversationId, userId);
  const { canDeleteMessage } = await import('@/lib/messaging/permissions');
  if (!canDeleteMessage(msg.senderId, userId, role)) throw new Error('FORBIDDEN');

  return prisma.talkMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date(), deletedById: userId, body: '[Message supprimé]' },
  });
}

export async function toggleMessagePin(messageId: string, pinned: boolean, role: string, userId: string) {
  const { canPinMessage } = await import('@/lib/messaging/permissions');
  if (!canPinMessage(role)) throw new Error('FORBIDDEN');
  const msg = await prisma.talkMessage.findUnique({ where: { id: messageId } });
  if (!msg || msg.deletedAt) throw new Error('NOT_FOUND');
  await requireTalkMember(msg.conversationId, userId);
  return prisma.talkMessage.update({ where: { id: messageId }, data: { pinned } });
}

export async function toggleMessageReaction(messageId: string, userId: string, emoji: string) {
  await requireMessageMember(messageId, userId);
  const existing = await prisma.talkMessageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });
  if (existing) {
    await prisma.talkMessageReaction.delete({ where: { id: existing.id } });
    return { removed: true };
  }
  await prisma.talkMessageReaction.create({ data: { messageId, userId, emoji } });
  return { added: true };
}

export async function ackMessage(messageId: string, userId: string) {
  await requireMessageMember(messageId, userId);
  return prisma.talkMessageRead.upsert({
    where: { messageId_userId: { messageId, userId } },
    create: { messageId, userId, acked: true },
    update: { acked: true, readAt: new Date() },
  });
}

export async function getUnreadTalkCount(userId: string): Promise<number> {
  const memberships = await prisma.talkConversationMember.findMany({
    where: { userId, revokedAt: null },
    select: { conversationId: true },
  });
  const convIds = memberships.map((m) => m.conversationId);
  if (!convIds.length) return 0;

  return prisma.talkMessage.count({
    where: {
      conversationId: { in: convIds },
      deletedAt: null,
      senderId: { not: userId },
      NOT: { reads: { some: { userId } } },
    },
  });
}

export async function createTaskFromMessage(params: {
  messageId: string;
  userId: string;
  userName: string;
  title: string;
  assigneeName?: string;
  commandeId?: string;
}) {
  const msg = await prisma.talkMessage.findUnique({
    where: { id: params.messageId },
    include: {
      conversation: {
        include: { productionDossier: { select: { commandeId: true } } },
      },
    },
  });
  if (!msg) throw new Error('NOT_FOUND');
  await requireTalkMember(msg.conversationId, params.userId);

  const commandeId =
    msg.conversation.commandeId
    ?? msg.conversation.productionDossier?.commandeId
    ?? msg.commandeId
    ?? null;
  if (params.commandeId && commandeId && params.commandeId !== commandeId) {
    throw new Error('INVALID_COMMANDE');
  }

  const task = await prisma.metierTask.create({
    data: {
      title: params.title,
      description: `Créée depuis ANS Talk — ${msg.body.slice(0, 200)}`,
      type: 'production',
      status: 'À faire',
      commandeId,
      conversationId: msg.conversationId,
      talkMessageId: params.messageId,
      createdById: params.userId,
      createdByName: params.userName,
      assigneeName: params.assigneeName || null,
    },
  });

  const link = await prisma.talkMessageTask.create({
    data: {
      messageId: params.messageId,
      taskId: task.id,
      title: params.title,
      status: task.status,
      assignedTo: params.assigneeName || null,
      createdById: params.userId,
    },
  });

  await prisma.talkMessage.update({
    where: { id: params.messageId },
    data: { metierTaskId: task.id },
  });

  await logAudit({
    userId: params.userId,
    userName: params.userName,
    action: 'TALK_CREATE_TASK',
    entity: 'MetierTask',
    entityId: task.id,
    entityLabel: task.title,
    details: { messageId: params.messageId },
  });

  return { task, link, commandeId, conversationId: msg.conversationId };
}
