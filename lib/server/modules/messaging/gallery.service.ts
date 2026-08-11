import { getConversationGallery } from '@/lib/messaging/attachment-service';

export async function listConversationGallery(
  conversationId: string,
  auth: { userId: string; role: string },
) {
  return getConversationGallery(conversationId, auth.userId, auth.role);
}

export function mapGalleryError(error: unknown): { status: number; message: string } | null {
  if (error instanceof Error && error.message === 'NOT_MEMBER') {
    return { status: 403, message: 'Accès refusé à cette conversation' };
  }
  return null;
}
