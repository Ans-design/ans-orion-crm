import { prisma } from '@/lib/server/db/prisma';
import {
  findOrCreatePrivateConversation,
  listConversationsForUser,
} from '@/lib/messaging/messaging-service';
import type { CreateConversationInput } from './conversations.validation';

export async function listUserConversations(userId: string, role: string) {
  return listConversationsForUser(userId, role);
}

export async function createConversationRecord(
  input: CreateConversationInput,
  auth: { userId: string; userName: string },
) {
  if (input.type === 'private') {
    if (!input.targetUserId) {
      return { ok: false as const, code: 'BAD_REQUEST' as const, message: 'targetUserId requis' };
    }
    try {
      const conv = await findOrCreatePrivateConversation(
        auth.userId,
        input.targetUserId,
        auth.userName,
      );
      return { ok: true as const, conversation: conv };
    } catch (error) {
      if (error instanceof Error && error.message === 'SELF_CHAT') {
        return { ok: false as const, code: 'SELF_CHAT' as const, message: 'Impossible de créer un chat avec vous-même' };
      }
      throw error;
    }
  }

  if (!input.name || !input.memberIds?.length) {
    return { ok: false as const, code: 'BAD_REQUEST' as const, message: 'Nom et membres requis pour un groupe' };
  }
  if (input.memberIds.length > 24) {
    return { ok: false as const, code: 'BAD_REQUEST' as const, message: 'Maximum 24 membres par groupe' };
  }

  const memberIds = Array.from(new Set([auth.userId, ...input.memberIds]));
  const validMembers = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true },
  });
  if (validMembers.length !== memberIds.length) {
    return { ok: false as const, code: 'BAD_REQUEST' as const, message: 'Un ou plusieurs membres sont introuvables' };
  }

  const conversation = await prisma.talkConversation.create({
    data: {
      name: input.name,
      type: 'group',
      description: 'Groupe personnalisé',
      label: 'Groupe',
      createdById: auth.userId,
      members: {
        create: memberIds.map((userId) => ({
          userId,
          role: userId === auth.userId ? 'admin' : 'member',
        })),
      },
    },
  });

  return { ok: true as const, conversation };
}
