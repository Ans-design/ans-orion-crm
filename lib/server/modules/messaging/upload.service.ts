import { uploadTalkFiles } from '@/lib/messaging/attachment-service';

export type UploadTalkFileInput = {
  conversationId: string;
  userId: string;
  userName: string;
  userRole: string;
  files: { buffer: Buffer; originalFileName: string }[];
  commandeId?: string;
  version?: string;
};

export async function uploadConversationFiles(input: UploadTalkFileInput) {
  return uploadTalkFiles(input);
}

export function parseUploadTalkError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message.startsWith('FILE_TOO_LARGE')) return { status: 413, message: 'Fichier trop volumineux' };
  if (error.message.startsWith('BLOCKED_EXT')) return { status: 400, message: 'Type de fichier bloqué' };
  if (error.message.startsWith('UNSUPPORTED_EXT')) return { status: 400, message: 'Extension non supportée' };
  if (error.message.startsWith('MAGIC_BYTES')) return { status: 400, message: error.message.replace(/^MAGIC_BYTES:/, '') || 'Contenu fichier invalide' };
  if (error.message.startsWith('BAT_GUARD')) return { status: 400, message: 'Upload BAT : PDF/image + commande requis' };
  if (error.message === 'OBJECT_STORAGE_REQUIRED') {
    return { status: 503, message: 'Stockage objet obligatoire en production' };
  }
  if (error.message === 'NOT_MEMBER') return { status: 403, message: 'Accès refusé' };
  return null;
}
