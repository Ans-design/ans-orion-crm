export const IMPRESSION_SF_CANONICAL_ID = 'imp-impression';

const LEGACY_PREFILLS: Record<string, Record<string, string>> = {
  'imp-offset': { matiere: 'Standard / Offset', grammage: '80g' },
  'imp-pcb': { matiere: 'PCB' },
  'imp-nb80': { matiere: 'Standard / Offset', grammage: '80g', type: 'Impression numérique N&B' },
  'imp-quadri': { type: 'Impression numérique couleur' },
  'imp-laser': { type: 'Impression laser' },
  'imp-autocollant': { matiere: 'Papier autocollant' },
  'imp-pvc': { matiere: 'PVC translucide' },
  'imp-sublimation': { matiere: 'Papier sublimation' },
  GF008: { matiere: 'PVC translucide' },
  GF009: { matiere: 'PVC opaque' },
};

const LEGACY_IDS = new Set(Object.keys(LEGACY_PREFILLS));

export function isImpressionSfLegacyId(articleId: string): boolean {
  return LEGACY_IDS.has(articleId);
}

export function resolveImpressionSfCanonicalId(articleId: string): string {
  if (LEGACY_IDS.has(articleId)) return IMPRESSION_SF_CANONICAL_ID;
  return articleId;
}

export function impressionSfLegacyPrefill(articleId: string): Record<string, string> | null {
  return LEGACY_PREFILLS[articleId] ?? null;
}

export function impressionSfLegacyRedirectTarget(articleId: string): string | null {
  if (LEGACY_IDS.has(articleId)) return IMPRESSION_SF_CANONICAL_ID;
  return null;
}

export function impressionSfLegacyRedirectParams(
  articleId: string,
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  const prefill = impressionSfLegacyPrefill(articleId);
  if (prefill) {
    for (const [key, val] of Object.entries(prefill)) {
      params.set(key, val);
    }
  }
  return params;
}
