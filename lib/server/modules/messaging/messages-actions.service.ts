import { deleteTalkMessage, editTalkMessage } from '@/lib/messaging/messaging-service';

export async function editConversationMessage(
  messageId: string,
  body: string,
  auth: { userId: string; role: string },
) {
  return editTalkMessage(messageId, auth.userId, auth.role, body);
}

export async function deleteConversationMessage(
  messageId: string,
  auth: { userId: string; role: string },
) {
  return deleteTalkMessage(messageId, auth.userId, auth.role);
}

export function mapMessageActionError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === 'FORBIDDEN') return { status: 403, message: 'Action non autorisée' };
  if (error.message === 'NOT_FOUND') return { status: 404, message: 'Message introuvable' };
  return null;
}
