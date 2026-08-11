import { getUnreadTalkCount } from '@/lib/messaging/messaging-service';

export async function getUnreadMessageCount(userId: string) {
  return getUnreadTalkCount(userId);
}
