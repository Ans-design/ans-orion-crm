import { toggleMessageReaction } from '@/lib/messaging/messaging-service';

export async function toggleConversationMessageReaction(
  messageId: string,
  userId: string,
  emoji: string,
) {
  return toggleMessageReaction(messageId, userId, emoji);
}

export function mapReactionError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === 'NOT_MEMBER') return { status: 403, message: 'Accès refusé' };
  if (error.message === 'NOT_FOUND') return { status: 404, message: 'Message introuvable' };
  return null;
}
