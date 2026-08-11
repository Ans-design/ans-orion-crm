import { prisma } from '@/lib/prisma';

export {
  canChangeAttachmentStatus,
  canDeleteMessage,
  canEditMessage,
  canPinMessage,
} from '@/lib/messaging/permissions-shared';

export async function isTalkMember(conversationId: string, userId: string): Promise<boolean> {
  const m = await prisma.talkConversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return Boolean(m && !m.revokedAt);
}

export async function requireTalkMember(conversationId: string, userId: string) {
  const ok = await isTalkMember(conversationId, userId);
  if (!ok) throw new Error('NOT_MEMBER');
}

export async function requireMessageMember(messageId: string, userId: string) {
  const msg = await prisma.talkMessage.findUnique({
    where: { id: messageId },
    select: { conversationId: true, deletedAt: true },
  });
  if (!msg || msg.deletedAt) throw new Error('NOT_FOUND');
  await requireTalkMember(msg.conversationId, userId);
  return msg.conversationId;
}
