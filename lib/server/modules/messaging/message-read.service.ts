import { ackMessage } from '@/lib/messaging/messaging-service';

export async function acknowledgeMessage(messageId: string, userId: string) {
  return ackMessage(messageId, userId);
}
