import {
  downloadTalkAttachment,
  updateAttachmentStatus,
} from '@/lib/messaging/attachment-service';

export async function downloadConversationAttachment(
  attachmentId: string,
  userId: string,
  userName: string,
) {
  return downloadTalkAttachment(attachmentId, userId, userName);
}

export async function patchAttachmentStatus(
  attachmentId: string,
  status: string,
  auth: { userId: string; userName: string; role: string },
) {
  return updateAttachmentStatus(
    attachmentId,
    status,
    auth.userId,
    auth.userName,
    auth.role,
  );
}
