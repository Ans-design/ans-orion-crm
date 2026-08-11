import { toggleMessagePin } from '@/lib/messaging/messaging-service';

export async function pinConversationMessage(
  messageId: string,
  pinned: boolean,
  auth: { userId: string; role: string },
) {
  return toggleMessagePin(messageId, pinned, auth.role, auth.userId);
}

export function mapPinError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === 'FORBIDDEN') return { status: 403, message: 'Épinglage réservé direction' };
  if (error.message === 'NOT_FOUND') return { status: 404, message: 'Message introuvable' };
  if (error.message === 'NOT_MEMBER') return { status: 403, message: 'Accès refusé' };
  return null;
}
