import {
  PH_TIRAGE_ID,
  PH_TIRAGE_LEGACY_IDS,
} from '@/lib/pricing/tirage-photo-pricing';

export const TIRAGE_PHOTO_CANONICAL_ID = PH_TIRAGE_ID;

const LEGACY_PREFILLS: Record<string, Record<string, string>> = {
  'ph-tirage-a4': { format: 'A4' },
  'ph-tirage-a5': { format: 'A5' },
  'ph-tirage-a6': { format: 'A6' },
  'ph-tirage-a3': { format: 'A3' },
  'ph-tirage-a3-pellicule': { format: 'A3' },
  'ph-tirage-a3-pelliculé': { format: 'A3' },
  'ph-tirage-pellicule': { format: 'A4' },
  'tirage-photo-a4': { format: 'A4' },
  'tirage-photo-a5': { format: 'A5' },
  'tirage-photo-a6': { format: 'A6' },
  'tirage-photo-a3': { format: 'A3' },
  'tirage-photo-a3-pellicule': { format: 'A3' },
  AVD032: { format: 'A6' },
  AVD033: { format: 'A5' },
  AVD034: { format: 'A4' },
  AVD035: { format: 'A3' },
  'ds-tirage-photo-a4': { format: 'A4' },
  'ds-tirage-photo-a5': { format: 'A5' },
  'ds-tirage-photo-a6': { format: 'A6' },
  'ds-tirage-photo-a3-pellicule': { format: 'A3' },
};

export function isTiragePhotoLegacyId(articleId: string): boolean {
  return PH_TIRAGE_LEGACY_IDS.has(articleId);
}

export function resolveTiragePhotoCanonicalId(articleId: string): string {
  if (PH_TIRAGE_LEGACY_IDS.has(articleId)) return TIRAGE_PHOTO_CANONICAL_ID;
  return articleId;
}

export function tiragePhotoLegacyPrefill(articleId: string): Record<string, string> | null {
  return LEGACY_PREFILLS[articleId] ?? null;
}

export function tiragePhotoLegacyRedirectTarget(articleId: string): string | null {
  if (PH_TIRAGE_LEGACY_IDS.has(articleId)) return TIRAGE_PHOTO_CANONICAL_ID;
  return null;
}

export function tiragePhotoLegacyRedirectParams(
  articleId: string,
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  const prefill = tiragePhotoLegacyPrefill(articleId);
  if (prefill) {
    for (const [key, val] of Object.entries(prefill)) {
      params.set(key, val);
    }
  }
  return params;
}
