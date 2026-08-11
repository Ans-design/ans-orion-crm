import { getConversationMessages, sendTalkMessage } from '@/lib/messaging/messaging-service';
import { listConversationAttachments } from '@/lib/messaging/attachment-service';
import type { MessageListQuery, SendMessageInput } from './messages.validation';

export async function listConversationMessages(
  conversationId: string,
  auth: { userId: string; role: string },
  query: MessageListQuery,
) {
  const messages = await getConversationMessages(conversationId, auth.userId, auth.role, {
    search: query.search,
    before: query.before,
    limit: query.limit,
  });
  let attachments: Awaited<ReturnType<typeof listConversationAttachments>> = [];
  try {
    attachments = await listConversationAttachments(conversationId, auth.userId, auth.role);
  } catch {
    /* pièces jointes optionnelles */
  }
  return { messages, attachments };
}

export async function sendConversationMessage(
  conversationId: string,
  input: SendMessageInput,
  auth: { userId: string; userName: string; role: string },
) {
  const body = input.body?.trim() ?? '';
  if (!body && !(input.attachmentIds?.length)) {
    return { ok: false as const, code: 'EMPTY' as const, message: 'Message ou pièce jointe requis' };
  }

  try {
    const message = await sendTalkMessage({
      conversationId,
      userId: auth.userId,
      userName: auth.userName,
      userRole: auth.role,
      body: body || '📎 Fichier joint',
      replyToId: input.replyToId,
      attachmentIds: input.attachmentIds,
      clientMessageId: input.clientMessageId,
    });
    return { ok: true as const, message };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_MEMBER') {
        return { ok: false as const, code: 'FORBIDDEN' as const, message: 'Accès refusé' };
      }
      if (error.message === 'INVALID_REPLY') {
        return { ok: false as const, code: 'BAD_REQUEST' as const, message: 'Message de réponse invalide' };
      }
      if (error.message === 'INVALID_ATTACHMENTS') {
        return { ok: false as const, code: 'BAD_REQUEST' as const, message: 'Pièces jointes invalides' };
      }
    }
    throw error;
  }
}
