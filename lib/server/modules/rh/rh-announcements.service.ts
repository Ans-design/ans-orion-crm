import { createRhAnnouncement, listRhAnnouncements } from '@/lib/services/rh-service';
import type { CreateRhAnnouncementInput } from './rh.validation';

export async function listRhAnnouncementRecords() {
  return listRhAnnouncements();
}

export async function createRhAnnouncementRecord(
  input: CreateRhAnnouncementInput,
  auth: { userId: string; userName: string },
) {
  return createRhAnnouncement({
    ...input,
    authorName: auth.userName,
    authorId: auth.userId,
  });
}
