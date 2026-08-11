/**
 * Variantes Finitions / Impression / Photo → une carte métier POS.
 * Les lignes Admin (diamètre, format, réf.) alimentent le configurateur, pas le catalogue.
 */

export type VariantMergeTarget = {
  canonicalId: string;
  /** Prefill configurateur si redirection legacy */
  prefill?: Record<string, string>;
  /** Clé d’option (fieldKey) pour le chip prix */
  optionFieldKey?: string;
  /** Libellé option / chip */
  optionLabel?: string;
  /** Prix unitaire Admin (Ar) à reporter sur le chip */
  priceAr?: number;
};

/** Canoniques Finitions & Reliures */
export const FIN_RELIURE_ID = 'fin-reliure';
export const FIN_COLLAGE_ID = 'fin-collage';
export const FIN_PLASTIFICATION_ID = 'fin-plastification';
export const FIN_PELLICULAGE_ID = 'fin-pelliculage';
export const FIN_DECOUPE_ID = 'fin-decoupe';
export const FIN_RAINAGE_ID = 'fin-rainage';
export const FIN_PERFORATION_ID = 'fin-perforation';
export const IMP_IMPRESSION_ID = 'imp-impression';
export const GF_PHOTO_ID = 'gf-photo';

/** IDs GF / SKU à archiver (pas de carte POS séparée) */
export const REDUNDANT_PVC_PETIT_IDS: Record<string, VariantMergeTarget> = {
  GF008: { canonicalId: IMP_IMPRESSION_ID, prefill: { matiere: 'PVC translucide' }, optionFieldKey: 'matiere', optionLabel: 'PVC translucide' },
  GF009: { canonicalId: IMP_IMPRESSION_ID, prefill: { matiere: 'PVC opaque' }, optionFieldKey: 'matiere', optionLabel: 'PVC opaque' },
};

export const REDUNDANT_PHOTO_GF_IDS: Record<string, VariantMergeTarget> = {
  GF011: { canonicalId: GF_PHOTO_ID, prefill: { matiere: 'Papier photo GF' } },
};

/** IDs connus = références FinishingPrice utilisées à tort comme articleId */
export const KNOWN_FINITION_VARIANT_IDS = new Set([
  'A3',
  'A4',
  'A5',
  'A6',
  'A6/A5/A4',
  'm2',
  'mètre linéaire',
  'Petit format',
  'standard',
  '6 mm / 1/4″',
  '6 mm / 1/4"',
  '8 mm / 5/16″',
  '8 mm / 5/16"',
  '10 mm / 3/8″',
  '10 mm / 3/8"',
  '12 mm / 7/16″',
  '12 mm / 7/16"',
  '14 mm / 9/16″',
  '14 mm / 9/16"',
  '16 mm / 5/8″',
  '16 mm / 5/8"',
  '18 mm / 3/4″',
  '18 mm / 3/4"',
]);

const CANONICAL_FIN_IDS = new Set([
  FIN_RELIURE_ID,
  FIN_COLLAGE_ID,
  FIN_PLASTIFICATION_ID,
  FIN_PELLICULAGE_ID,
  FIN_DECOUPE_ID,
  FIN_RAINAGE_ID,
  FIN_PERFORATION_ID,
  'fin-vernis',
  'fin-coins',
  'fin-dorure',
  'fin-gaufrage',
  'fin-couture',
  'fin-autocollant',
  'fin-autres',
]);

function normalizeQuotes(s: string): string {
  return s.replace(/[″″''']/g, '"').replace(/\s+/g, ' ').trim();
}

function extractDiameterLabel(nameOrRef: string): string | null {
  const s = normalizeQuotes(nameOrRef);
  const m = s.match(/(\d+)\s*mm(?:\s*\/\s*([\d/]+)\s*"?)?/i);
  if (!m) return null;
  const inch = m[2] ? ` / ${m[2]}"` : '';
  return `${m[1]} mm${inch}`;
}

/**
 * Résout la cible de fusion pour une variante (articleId / nom / catégorie Admin).
 * Retourne null si déjà canonique ou non reconnu.
 */
export function resolveFinitionVariantCanonical(
  name: string | null | undefined,
  articleId?: string | null,
  category?: string | null,
): VariantMergeTarget | null {
  const id = (articleId ?? '').trim();
  const n = normalizeQuotes(name ?? '');
  const cat = (category ?? '').trim().toLowerCase();

  if (REDUNDANT_PVC_PETIT_IDS[id]) return REDUNDANT_PVC_PETIT_IDS[id]!;
  if (REDUNDANT_PHOTO_GF_IDS[id]) return REDUNDANT_PHOTO_GF_IDS[id]!;

  // Canoniques : ne pas fusionner sur soi
  if (CANONICAL_FIN_IDS.has(id) || id === IMP_IMPRESSION_ID || id === GF_PHOTO_ID) {
    return null;
  }

  // PVC petit format (hors plaque GF)
  if (/^pvc\s+(opaque|translucide)/i.test(n) && !/2400|plaque|3\s*mm|5\s*mm|10\s*mm/i.test(n)) {
    const opaque = /opaque/i.test(n);
    return {
      canonicalId: IMP_IMPRESSION_ID,
      prefill: { matiere: opaque ? 'PVC opaque' : 'PVC translucide' },
      optionFieldKey: 'matiere',
      optionLabel: opaque ? 'PVC opaque' : 'PVC translucide',
    };
  }

  // Photo grand format → matière GF
  if (/^photo\s+grand\s+format$/i.test(n) || id === 'GF011') {
    return { canonicalId: GF_PHOTO_ID };
  }

  // Spirales / reliure par diamètre
  if (
    /spirale/i.test(n)
    || /reliure/i.test(cat)
    || /^\d+\s*mm\s*\/\s*[\d/]+/.test(id)
    || /^\d+\s*mm\s*\/\s*[\d/]+/.test(n)
  ) {
    if (/spirale|reliure/i.test(n) || /reliure/i.test(cat) || KNOWN_FINITION_VARIANT_IDS.has(id)) {
      const diam = extractDiameterLabel(n) || extractDiameterLabel(id);
      if (diam || /spirale/i.test(n)) {
        return {
          canonicalId: FIN_RELIURE_ID,
          optionFieldKey: 'diametre',
          optionLabel: diam ?? n,
          prefill: diam ? { diametre: diam } : undefined,
        };
      }
    }
  }

  // Collage A3/A4
  if (/^collage\b/i.test(n) || (/collage/i.test(cat) && /^(A3|A4)$/i.test(id))) {
    const fmt = n.match(/\b(A3|A4)\b/i)?.[1]?.toUpperCase()
      || (/^(A3|A4)$/i.test(id) ? id.toUpperCase() : null);
    if (fmt || /^collage\b/i.test(n)) {
      return {
        canonicalId: FIN_COLLAGE_ID,
        optionFieldKey: 'dim',
        optionLabel: fmt ?? 'Personnalisé',
        prefill: fmt ? { dim: fmt } : undefined,
      };
    }
  }

  // Plastification A6–A3
  if (/^plastification\b/i.test(n) || (/plastification/i.test(cat) && /^A[3-6]$/i.test(id))) {
    const fmt = n.match(/\b(A[3-6])\b/i)?.[1]?.toUpperCase()
      || (/^A[3-6]$/i.test(id) ? id.toUpperCase() : null);
    if (fmt || /^plastification\b/i.test(n)) {
      // Si le nom est exactement "Plastification" sans format → canonique (ne pas fusionner)
      if (/^plastification$/i.test(n) && !fmt) return null;
      return {
        canonicalId: FIN_PLASTIFICATION_ID,
        optionFieldKey: 'dim',
        optionLabel: fmt ?? n,
        prefill: fmt ? { dim: fmt } : undefined,
      };
    }
  }

  // Pelliculage (formats / R-V)
  if (/^pelliculage\b/i.test(n) || /pelliculage/i.test(cat)) {
    if (/^pelliculage(\s+mat|\s+brillant)?$/i.test(n) && !id) return null;
    const fmt = n.match(/\b(A6\/A5\/A4|A[3-6]\+?)\b/i)?.[1]
      || (id.match(/A6\/A5\/A4|A[3-6]/i)?.[0] ?? null);
    const face = /recto-verso|recto verso|r\/v/i.test(n)
      ? 'Recto-Verso'
      : /recto\b/i.test(n)
        ? 'Recto'
        : undefined;
    const type = /soft\s*touch/i.test(n)
      ? 'Soft touch'
      : /mat/i.test(n)
        ? 'Mat'
        : /brillant/i.test(n)
          ? 'Brillant'
          : undefined;
    return {
      canonicalId: FIN_PELLICULAGE_ID,
      optionFieldKey: 'dim',
      optionLabel: fmt ?? n,
      prefill: {
        ...(fmt ? { dim: fmt.includes('/') ? 'A4' : fmt } : {}),
        ...(face ? { face } : {}),
        ...(type ? { type } : {}),
      },
    };
  }

  // Découpe (unités / sous-types)
  if (/^d[eé]coupe\b/i.test(n) || /découpe|decoupe/i.test(cat)) {
    if (/^d[eé]coupe(\s+flex)?$/i.test(n) && id.startsWith('fin-')) return null;
    return {
      canonicalId: FIN_DECOUPE_ID,
      optionFieldKey: 'type',
      optionLabel: n || id,
      prefill: { type: n || 'Découpe personnalisée' },
    };
  }

  // Rainage / pliage / perforation « standard »
  if (/rainage|pliage|perforation|fa[cç]onnage/i.test(n) || /fa[cç]onnage/i.test(cat)) {
    if (/perforation/i.test(n) && !/rainage|pliage/i.test(n)) {
      return { canonicalId: FIN_PERFORATION_ID, optionFieldKey: 'type', optionLabel: n || 'standard' };
    }
    if (id === 'standard' || /standard/i.test(n) || /rainage|pliage/i.test(n)) {
      return {
        canonicalId: FIN_RAINAGE_ID,
        optionFieldKey: 'plis',
        optionLabel: n || 'standard',
      };
    }
  }

  // IDs orphelins connus (références Excel)
  if (KNOWN_FINITION_VARIANT_IDS.has(id)) {
    if (/mm\s*\//i.test(id)) {
      return {
        canonicalId: FIN_RELIURE_ID,
        optionFieldKey: 'diametre',
        optionLabel: extractDiameterLabel(id) ?? id,
      };
    }
    if (/^A[3-6]/i.test(id) || id === 'A6/A5/A4') {
      // Ambigu A3/A4 : collage vs plastif vs pelliculage — utiliser catégorie
      if (/collage/i.test(cat) || /collage/i.test(n)) {
        return { canonicalId: FIN_COLLAGE_ID, optionFieldKey: 'dim', optionLabel: id };
      }
      if (/plastif/i.test(cat) || /plastif/i.test(n)) {
        return { canonicalId: FIN_PLASTIFICATION_ID, optionFieldKey: 'dim', optionLabel: id };
      }
      if (/pellicul/i.test(cat) || /pellicul/i.test(n)) {
        return { canonicalId: FIN_PELLICULAGE_ID, optionFieldKey: 'dim', optionLabel: id };
      }
      // Défaut A5/A6 → plastification ; A3/A4 → collage (les plus fréquents en DB)
      if (/^A[56]$/i.test(id)) {
        return { canonicalId: FIN_PLASTIFICATION_ID, optionFieldKey: 'dim', optionLabel: id.toUpperCase() };
      }
      if (/^A[34]$/i.test(id)) {
        return { canonicalId: FIN_COLLAGE_ID, optionFieldKey: 'dim', optionLabel: id.toUpperCase() };
      }
      return { canonicalId: FIN_PELLICULAGE_ID, optionFieldKey: 'dim', optionLabel: id };
    }
    if (id === 'm2' || id === 'mètre linéaire' || id === 'Petit format') {
      return { canonicalId: FIN_DECOUPE_ID, optionFieldKey: 'type', optionLabel: id };
    }
    if (id === 'standard') {
      return { canonicalId: FIN_RAINAGE_ID, optionFieldKey: 'plis', optionLabel: 'standard' };
    }
  }

  return null;
}

/** True si l’article ne doit pas apparaître comme carte POS séparée. */
export function isRedundantFinitionVariantCard(
  name: string | null | undefined,
  articleId?: string | null,
  category?: string | null,
): boolean {
  const id = (articleId ?? '').trim();
  if (CANONICAL_FIN_IDS.has(id) || id === IMP_IMPRESSION_ID || id === GF_PHOTO_ID) return false;
  if (REDUNDANT_PVC_PETIT_IDS[id] || REDUNDANT_PHOTO_GF_IDS[id]) return true;
  if (KNOWN_FINITION_VARIANT_IDS.has(id)) return true;
  return resolveFinitionVariantCanonical(name, articleId, category) != null;
}

/**
 * Détecte et mappe les cartes variantes → article principal.
 * Exposée pour scripts / Admin / sync.
 */
export function mergeVariantCardsIntoMainArticle(
  entries: Array<{ articleId: string; name?: string | null; category?: string | null; priceAr?: number | null }>,
): Array<{ articleId: string; target: VariantMergeTarget }> {
  const out: Array<{ articleId: string; target: VariantMergeTarget }> = [];
  for (const e of entries) {
    const target = resolveFinitionVariantCanonical(e.name, e.articleId, e.category);
    if (!target) continue;
    if (target.canonicalId === e.articleId) continue;
    out.push({
      articleId: e.articleId,
      target: {
        ...target,
        priceAr: e.priceAr ?? target.priceAr,
      },
    });
  }
  return out;
}

export const REDUNDANT_VARIANT_POS_IDS = [
  ...Object.keys(REDUNDANT_PVC_PETIT_IDS),
  ...Object.keys(REDUNDANT_PHOTO_GF_IDS),
  ...KNOWN_FINITION_VARIANT_IDS,
] as const;
