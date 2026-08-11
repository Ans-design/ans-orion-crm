/** IDs / détection variantes Tirage photo (sans import Prisma — évite cycles). */

export const REDUNDANT_TIRAGE_PHOTO_IDS = new Set([
  'AVD032',
  'AVD033',
  'AVD034',
  'AVD035',
  'ph-tirage-a4',
  'ph-tirage-a5',
  'ph-tirage-a6',
  'ph-tirage-a3',
  'ph-tirage-a3-pellicule',
  'ph-tirage-a3-pelliculé',
  'ph-tirage-pellicule',
  'tirage-photo-a4',
  'tirage-photo-a5',
  'tirage-photo-a6',
  'tirage-photo-a3',
  'tirage-photo-a3-pellicule',
  'ds-tirage-photo-a4',
  'ds-tirage-photo-a5',
  'ds-tirage-photo-a6',
  'ds-tirage-photo-a3-pellicule',
]);

export const PH_TIRAGE_CANONICAL_ID = 'ph-tirage';

/**
 * True si l’article est une variante format de Tirage photo (pas le canonique).
 */
export function isRedundantTiragePhotoArticle(
  nameOrLabel: string | null | undefined,
  articleId?: string | null,
): boolean {
  const id = String(articleId ?? '').trim();
  if (id === PH_TIRAGE_CANONICAL_ID) return false;
  if (id && REDUNDANT_TIRAGE_PHOTO_IDS.has(id)) return true;
  if (id && /^AVD03[2-5]$/i.test(id)) return true;
  if (id && /^(ds-)?tirage-photo-/i.test(id)) return true;
  if (id && /^ph-tirage-/i.test(id)) return true;

  const name = String(nameOrLabel ?? '').trim();
  if (!name) return false;
  if (/^Tirage photo$/i.test(name)) return false;
  return /^Tirage photo\s+.+/i.test(name);
}

export function inferFormatFromRedundantTirageLabel(label: string): string | null {
  const v = String(label ?? '');
  if (/\bA3\+/i.test(v)) return 'A3+';
  if (/\bA3\b/i.test(v)) return 'A3';
  if (/\bA4\b/i.test(v)) return 'A4';
  if (/\bA5\b/i.test(v)) return 'A5';
  if (/\bA6\b/i.test(v)) return 'A6';
  const cm = v.match(/(\d+)\s*[x×]\s*(\d+)\s*cm/i);
  if (cm) return `${cm[1]}×${cm[2]} cm`;
  return null;
}
