/**
 * V14 — validation magic bytes fichiers Talk (P0-22).
 */

export type MagicCheck = { ok: true; detectedMime: string } | { ok: false; reason: string };

const SIGNATURES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF….WEBP
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'application/zip', bytes: [0x50, 0x4b, 0x03, 0x04] }, // docx/xlsx/zip
];

export function assertMagicBytes(buffer: Buffer, claimedExt: string): MagicCheck {
  if (buffer.length < 4) {
    return { ok: false, reason: 'Fichier trop court pour validation' };
  }

  const ext = claimedExt.toLowerCase().replace(/^\./, '');
  const textLike = new Set(['txt', 'csv', 'json', 'md']);
  // svg exclu volontairement — doit passer par refus upload / octet-stream
  if (textLike.has(ext)) {
    return { ok: true, detectedMime: 'text/plain' };
  }
  if (ext === 'svg') {
    return { ok: false, reason: 'SVG non accepté pour validation contenu' };
  }

  for (const sig of SIGNATURES) {
    const offset = sig.offset ?? 0;
    const match = sig.bytes.every((b, i) => buffer[offset + i] === b);
    if (!match) continue;

    if (sig.mime === 'image/webp') {
      const webp = buffer.slice(8, 12).toString('ascii') === 'WEBP';
      if (!webp) continue;
    }

    // Extension vs magic coherence (soft for zip containers)
    if (sig.mime === 'application/pdf' && ext !== 'pdf') {
      return { ok: false, reason: 'Extension PDF incohérente avec le contenu' };
    }
    if (sig.mime.startsWith('image/') && !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return { ok: false, reason: 'Extension image incohérente avec le contenu' };
    }

    return { ok: true, detectedMime: sig.mime };
  }

  // Office docs often zip — allow known office ext
  if (['docx', 'xlsx', 'pptx', 'odt'].includes(ext) && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return { ok: true, detectedMime: 'application/zip' };
  }

  return { ok: false, reason: `Signature fichier non reconnue (.${ext})` };
}
