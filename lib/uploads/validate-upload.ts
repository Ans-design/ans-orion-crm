/**
 * Validateur d’upload centralisé (SEC-05 / SEC-07).
 * Extension allowlist + magic bytes — ne jamais faire confiance à file.type.
 */
import { isAllowedProExtension } from '@/lib/constants/file-assets';
import { assertMagicBytes } from '@/lib/messaging/magic-bytes';

export type UploadValidationOk = {
  ok: true;
  extension: string;
  detectedMime: string;
  safeFileName: string;
};

export type UploadValidationErr = {
  ok: false;
  reason: string;
  status: 400;
};

const MAX_NAME_LEN = 180;

export function sanitizeUploadFileName(name: string): string {
  const base = name.replace(/[/\\]/g, '_').replace(/\0/g, '').trim();
  const cleaned = base.replace(/[^\w.\- ()àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]+/gi, '_');
  return cleaned.slice(0, MAX_NAME_LEN) || 'fichier';
}

export function validateUploadBuffer(
  fileName: string,
  buffer: Buffer,
  opts?: { maxBytes?: number; rejectSvg?: boolean },
): UploadValidationOk | UploadValidationErr {
  const maxBytes = opts?.maxBytes ?? 50 * 1024 * 1024;
  if (!fileName?.trim()) {
    return { ok: false, reason: 'Nom de fichier requis', status: 400 };
  }
  if (buffer.length <= 0) {
    return { ok: false, reason: 'Fichier vide', status: 400 };
  }
  if (buffer.length > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, reason: `Fichier trop volumineux (max ${mb} Mo)`, status: 400 };
  }
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { ok: false, reason: 'Nom de fichier invalide (path traversal)', status: 400 };
  }
  if (!isAllowedProExtension(fileName)) {
    return { ok: false, reason: 'Extension non autorisée', status: 400 };
  }

  const extension = (fileName.split('.').pop() || '').toLowerCase();
  if (opts?.rejectSvg !== false && extension === 'svg') {
    // SEC-06 : SVG refusé à l’upload (XSS). Les archives existantes restent en attachment.
    return { ok: false, reason: 'Les fichiers SVG ne sont pas autorisés (sécurité)', status: 400 };
  }

  const magic = assertMagicBytes(buffer, extension);
  if (!magic.ok) {
    return { ok: false, reason: magic.reason, status: 400 };
  }

  return {
    ok: true,
    extension,
    detectedMime: magic.detectedMime,
    safeFileName: sanitizeUploadFileName(fileName),
  };
}
