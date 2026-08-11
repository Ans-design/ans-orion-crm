export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { requireMessagingWrite } from '@/lib/messaging/route-auth';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { parseBody } from '@/lib/validators/common';
import { created } from '@/lib/server/http/api-response';
import {
  messagingUploadMetaSchema,
  validateMessagingUploadFiles,
} from '@/lib/server/modules/messaging/messaging-upload.validation';
import {
  parseUploadTalkError,
  uploadConversationFiles,
} from '@/lib/server/modules/messaging/upload.service';

export async function POST(req: NextRequest) {
  const auth = await requireMessagingWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging upload POST', async (): Promise<Response> => {
    try {
      const form = await req.formData();
      const metaParsed = parseBody(messagingUploadMetaSchema, {
        conversationId: String(form.get('conversationId') || ''),
        commandeId: form.get('commandeId') ? String(form.get('commandeId')) : undefined,
        version: form.get('version') ? String(form.get('version')) : undefined,
      });
      if (!metaParsed.ok) return apiError(metaParsed.error, 400);

      const { conversationId, commandeId, version } = metaParsed.data;

      const files: { buffer: Buffer; originalFileName: string }[] = [];
      for (const [key, value] of form.entries()) {
        if (key.startsWith('file') && value instanceof File) {
          const buffer = Buffer.from(await value.arrayBuffer());
          files.push({ buffer, originalFileName: value.name });
        }
      }

      const fileCheck = validateMessagingUploadFiles(files);
      if (!fileCheck.ok) return apiError(fileCheck.message, 400);

      const uploadedAttachments = await uploadConversationFiles({
        conversationId,
        userId: auth.userId,
        userName: auth.userName,
        userRole: auth.role,
        files,
        commandeId,
        version: version ?? 'V1',
      });

      return created({ attachments: uploadedAttachments });
    } catch (error) {
      const mapped = parseUploadTalkError(error);
      if (mapped) return apiError(mapped.message, mapped.status);
      return apiError(safeErrorMessage(error, 'Erreur upload'), 500);
    }
  });
}
