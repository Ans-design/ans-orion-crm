import { z } from 'zod';

const MAX_UPLOAD_FILES = 10;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const messagingUploadMetaSchema = z.object({
  conversationId: z.string().min(1),
  commandeId: z.string().optional(),
  version: z.string().max(20).optional(),
});

export type MessagingUploadMeta = z.infer<typeof messagingUploadMetaSchema>;

export function validateMessagingUploadFiles(
  files: { buffer: Buffer; originalFileName: string }[],
): { ok: true } | { ok: false; message: string } {
  if (files.length === 0) {
    return { ok: false, message: 'Aucun fichier' };
  }
  if (files.length > MAX_UPLOAD_FILES) {
    return { ok: false, message: `Maximum ${MAX_UPLOAD_FILES} fichiers par envoi` };
  }
  const totalBytes = files.reduce((sum, f) => sum + f.buffer.length, 0);
  if (totalBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, message: 'Taille totale des fichiers dépassée (25 Mo max)' };
  }
  for (const f of files) {
    if (!f.originalFileName.trim()) {
      return { ok: false, message: 'Nom de fichier invalide' };
    }
  }
  return { ok: true };
}
