import type { ConfigField } from '@/lib/data/config-types';
import {
  IMPRESSION_SF_FORMATS,
  IMPRESSION_SF_MATIERE_LABELS,
  IMPRESSION_SF_WEIGHTS_BY_MATIERE,
  impressionSfMaterialByLabel,
} from '@/lib/data/impression-sf-material-catalog';
import { canonicalFormatKey } from '@/lib/pos/format-display';
import { IMPRESSION_SF_CANONICAL_ID } from '@/lib/pos/impression-sf-catalog';
import {
  filterFaceOptionsForSupport,
  isRectoVersoAllowedForSupport,
} from '@/lib/pricing/support-face-rules';
import { getImpressionSfFaceRules } from '@/lib/pricing/impression-sf-pricing';
import { isRectoVerso } from '@/lib/pricing/config-normalize';

export const IMPRESSION_SF_ARTICLE_IDS = new Set([
  IMPRESSION_SF_CANONICAL_ID,
  'imp-offset',
  'imp-pcb',
  'imp-autocollant',
  'imp-pvc',
  'imp-sublimation',
  'imp-nb80',
  'imp-quadri',
  'imp-laser',
]);

const FORMAT_MAX_RANK: Record<string, number> = {
  A6: 1,
  A5: 2,
  B5: 3,
  DL: 4,
  B6: 5,
  A4: 6,
  A3: 7,
  'A3+': 8,
  SRA3: 8,
  A2: 9,
  A1: 10,
  A0: 11,
};

function resolveFormatRank(format: string): number | null {
  const key = canonicalFormatKey(format);
  return FORMAT_MAX_RANK[key] ?? FORMAT_MAX_RANK[format] ?? null;
}

const MAX_RANK_BY_LIMIT: Record<'A4' | 'A3' | 'A0', number> = { A4: 6, A3: 7, A0: 11 };

export function isImpressionSfArticleId(articleId: string, category?: string): boolean {
  if (IMPRESSION_SF_ARTICLE_IDS.has(articleId)) return true;
  return category === 'impression' && articleId.startsWith('imp-');
}

export function filterImpressionSfFormatOptions(matiere: string, options: string[]): string[] {
  const mat = impressionSfMaterialByLabel(matiere);
  if (!mat?.maxFormat) return options;
  const maxRank = MAX_RANK_BY_LIMIT[mat.maxFormat];
  return options.filter((o) => {
    if (/personnalis/i.test(o)) return true;
    const rank = resolveFormatRank(o);
    return rank == null || rank <= maxRank;
  });
}

export function filterImpressionSfMatiereOptions(format: string, options: string[]): string[] {
  const formatRank = resolveFormatRank(format);
  if (formatRank == null) return options;
  return options.filter((label) => {
    const mat = impressionSfMaterialByLabel(label);
    if (!mat?.maxFormat) return true;
    const maxRank = MAX_RANK_BY_LIMIT[mat.maxFormat];
    return formatRank <= maxRank;
  });
}

export function resolveImpressionSfGrammageOptions(
  field: ConfigField,
  config: Record<string, unknown>,
): string[] {
  const parentKey = field.optionsFilter?.field ?? 'matiere';
  const matVal = String(config[parentKey] ?? '').trim();
  const mat = impressionSfMaterialByLabel(matVal);
  if (mat?.noGrammage) return ['Grammage personnalisé'];
  const canonicalLabel = mat?.label ?? matVal;
  return (
    IMPRESSION_SF_WEIGHTS_BY_MATIERE[canonicalLabel]
    ?? IMPRESSION_SF_WEIGHTS_BY_MATIERE[matVal]
    ?? field.optionsFilter?.optionsByValue?.[canonicalLabel]
    ?? field.optionsFilter?.optionsByValue?.[matVal]
    ?? []
  );
}

export function applyImpressionSfMaterialRules(
  articleId: string,
  config: Record<string, unknown>,
  category?: string,
): Record<string, unknown> {
  if (!isImpressionSfArticleId(articleId, category)) return config;

  let next = { ...config };
  const formatRaw = String(next.format ?? '').trim();
  if (/^SRA3$/i.test(formatRaw)) {
    next.format = 'A3+';
  }
  const matiere = String(next.matiere ?? '').trim();
  const format = String(next.format ?? '').trim();

  if (matiere && format) {
    const allowedFormats = filterImpressionSfFormatOptions(matiere, [...IMPRESSION_SF_FORMATS]);
    const formatOk = allowedFormats.some((f) => canonicalFormatKey(f) === canonicalFormatKey(format));
    if (!formatOk) {
      next.format = allowedFormats.find((f) => canonicalFormatKey(f) === 'A4')
        ?? allowedFormats[0]
        ?? '';
    }
  }

  if (format && matiere) {
    const allowedMats = filterImpressionSfMatiereOptions(format, [...IMPRESSION_SF_MATIERE_LABELS]);
    const matOk = allowedMats.some((m) => m === matiere || impressionSfMaterialByLabel(matiere)?.label === m);
    if (!matOk) {
      next.matiere = '';
      next.grammage = '';
    } else {
      // Normalise libellé legacy (ex. Autocollant Adestor → Papier adhestor)
      const canonicalMat = impressionSfMaterialByLabel(matiere)?.label;
      if (canonicalMat && canonicalMat !== matiere) next.matiere = canonicalMat;
    }
  }

  const grammage = String(next.grammage ?? '').trim();
  if (matiere && grammage) {
    const allowedGram = resolveImpressionSfGrammageOptions(
      {
        key: 'grammage',
        type: 'chips',
        label: 'Grammage',
        optionsFilter: { field: 'matiere', optionsByValue: IMPRESSION_SF_WEIGHTS_BY_MATIERE },
      },
      next,
    );
    if (allowedGram.length && !allowedGram.includes(grammage)) {
      // Legacy Excel/POS : « 600g (300g×2) » → « 600g »
      if (/^600g/i.test(grammage) && allowedGram.includes('600g')) {
        next.grammage = '600g';
      } else {
        next.grammage = '';
      }
    }
  }

  // Recto-only supports : forcer face recto
  const faceRules = getImpressionSfFaceRules();
  if (matiere && !isRectoVersoAllowedForSupport(matiere, faceRules)) {
    if (isRectoVerso(next.face)) {
      next.face = 'Recto';
    }
  }

  return next;
}

/** Filtre les options face (Recto / Recto-verso) selon la matière. */
export function filterImpressionSfFaceOptions(
  matiere: string,
  options: string[],
): string[] {
  return filterFaceOptionsForSupport(matiere, options, getImpressionSfFaceRules());
}
