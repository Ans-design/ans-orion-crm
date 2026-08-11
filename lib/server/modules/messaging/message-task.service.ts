import { createTaskFromMessage } from '@/lib/messaging/messaging-service';
import type { CreateTaskFromMessageInput } from './messages.validation';

export async function createMessageLinkedTask(
  messageId: string,
  input: CreateTaskFromMessageInput,
  auth: { userId: string; userName: string },
) {
  return createTaskFromMessage({
    messageId,
    userId: auth.userId,
    userName: auth.userName,
    title: input.title,
    assigneeName: input.assigneeName,
    commandeId: input.commandeId,
  });
}
