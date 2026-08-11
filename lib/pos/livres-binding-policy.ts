import { BINDING_LABELS, parsePagesFromConfig } from '@/lib/data/binding-catalog';
import {
  getNearestMultiplesOf4,
  validateSaddleStitchPageCount,
} from '@/lib/print/binding-rules';
import { formatChipSortArea } from '@/lib/pos/format-chip-sort';
import { LIVRES_CANONICAL_ID, isLivresLegacyId } from '@/lib/pos/livres-catalog';

const A4_SHORT_MM = 210;
const A4_LONG_MM = 297;

export const LIVRES_SADDLE_STITCH_FORMAT_ALERT =
  'La piqûre à cheval est disponible uniquement jusqu\'au format A4.';

export const LIVRES_SADDLE_STITCH_PAGES_ALERT =
  'Pour la piqûre à cheval, le nombre de pages doit être un multiple de 4.';

export const LIVRES_MIXTE_PAGES_ALERT =
  'Le total des pages noir + quadri doit être égal au nombre total de pages.';

const STD_FORMAT_MM: Record<string, [number, number]> = {
  A6: [105, 148],
  A5: [148, 210],
  A4: [210, 297],
  'A4+': [216, 303],
  A3: [297, 420],
  DL: [99, 210],
};

export function isLivresArticleId(articleId: string): boolean {
  return articleId === LIVRES_CANONICAL_ID || isLivresLegacyId(articleId);
}

export function parseLivresFormatDimensionsMm(
  format: string,
  config?: Record<string, unknown>,
): { short: number; long: number } | null {
  const raw = String(format ?? '').trim();
  if (!raw) return null;

  if (/personnalis/i.test(raw) && config) {
    const w = Number(config.longueur ?? config.largeur_format ?? config.largeur);
    const h = Number(config.largeur ?? config.hauteur_format ?? config.hauteur);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { short: Math.min(w, h), long: Math.max(w, h) };
    }
    return null;
  }

  const dim = raw.match(/(\d+)\s*×\s*(\d+)\s*mm/i);
  if (dim) {
    const w = Number(dim[1]);
    const h = Number(dim[2]);
    return { short: Math.min(w, h), long: Math.max(w, h) };
  }

  const key = raw.match(/\b(A6|A5|A4\+?|A3|DL)\b/i)?.[1]?.toUpperCase();
  if (key && STD_FORMAT_MM[key]) {
    const [w, h] = STD_FORMAT_MM[key];
    return { short: Math.min(w, h), long: Math.max(w, h) };
  }

  const area = formatChipSortArea(raw);
  if (area == null) return null;
  const side = Math.sqrt(area);
  return { short: Math.min(side, area / side), long: Math.max(side, area / side) };
}

/** Piqûre à cheval : autorisée uniquement si les deux côtés ≤ format A4. */
export function livresFormatAllowsSaddleStitch(
  format: string,
  config?: Record<string, unknown>,
): boolean {
  const dims = parseLivresFormatDimensionsMm(format, config);
  if (!dims) return true;
  return dims.short <= A4_SHORT_MM && dims.long <= A4_LONG_MM;
}

export function isLivresMixteCouleurInt(config: Record<string, unknown>): boolean {
  return /mixte/i.test(String(config.couleur_int ?? ''));
}

export function nextMultipleOf4(pageCount: number): number {
  if (pageCount <= 0) return 4;
  return Math.ceil(pageCount / 4) * 4;
}

export function livresSaddleStitchPagesHint(config: Record<string, unknown>): string | null {
  const reliure = String(config.reliure ?? '').trim();
  if (reliure !== BINDING_LABELS.PIQURE) return null;
  const pages = parsePagesFromConfig(config);
  if (pages == null || pages <= 0 || validateSaddleStitchPageCount(pages)) return null;
  const suggested = nextMultipleOf4(pages);
  return `${LIVRES_SADDLE_STITCH_PAGES_ALERT} Suggestion : ${suggested} pages.`;
}

export function validateLivresMixtePages(config: Record<string, unknown>): string | null {
  if (!isLivresMixteCouleurInt(config)) return null;
  const total = parsePagesFromConfig(config);
  if (total == null || total <= 0) return null;

  const noirRaw = config.pages_noir;
  const quadriRaw = config.pages_quadri;
  const noir = typeof noirRaw === 'number' ? noirRaw : parseInt(String(noirRaw ?? ''), 10);
  const quadri = typeof quadriRaw === 'number' ? quadriRaw : parseInt(String(quadriRaw ?? ''), 10);
  if (!Number.isFinite(noir) || noir < 0 || !Number.isFinite(quadri) || quadri < 0) {
    return 'Indiquez le nombre de pages en noir et en quadri (≥ 0).';
  }
  if (noir + quadri !== total) return LIVRES_MIXTE_PAGES_ALERT;
  return null;
}

export function validateLivresConfig(config: Record<string, unknown>): string | null {
  const reliure = String(config.reliure ?? '').trim();
  const format = String(config.format ?? '');

  if (reliure === BINDING_LABELS.PIQURE) {
    if (!livresFormatAllowsSaddleStitch(format, config)) {
      return LIVRES_SADDLE_STITCH_FORMAT_ALERT;
    }
    const pages = parsePagesFromConfig(config);
    if (pages != null && pages > 0 && !validateSaddleStitchPageCount(pages)) {
      const { upper } = getNearestMultiplesOf4(pages);
      return `${LIVRES_SADDLE_STITCH_PAGES_ALERT} Suggestion : ${upper} pages.`;
    }
  }

  return validateLivresMixtePages(config);
}

export function filterLivresReliureOptions(
  options: string[],
  config: Record<string, unknown>,
): string[] {
  const format = String(config.format ?? '');
  if (livresFormatAllowsSaddleStitch(format, config)) return options;
  return options.filter((o) => o !== BINDING_LABELS.PIQURE);
}

export function applyLivresConfigRules(
  articleId: string,
  config: Record<string, unknown>,
  changedKey?: string,
): Record<string, unknown> {
  if (!isLivresArticleId(articleId)) return config;

  let next = config;
  const format = String(next.format ?? '');
  const reliure = String(next.reliure ?? '').trim();

  const formatChanged = changedKey === 'format';
  const saddleBlocked =
    reliure === BINDING_LABELS.PIQURE && !livresFormatAllowsSaddleStitch(format, next);

  if (saddleBlocked && (formatChanged || changedKey === 'reliure')) {
    next = { ...next, reliure: '' };
  }

  return next;
}

export function livresConfigRuleToast(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  changedKey?: string,
): string | null {
  if (changedKey !== 'format') return null;
  const hadSaddle = String(prev.reliure ?? '').trim() === BINDING_LABELS.PIQURE;
  const cleared = hadSaddle && String(next.reliure ?? '').trim() !== BINDING_LABELS.PIQURE;
  if (!cleared) return null;
  if (livresFormatAllowsSaddleStitch(String(next.format ?? ''), next)) return null;
  return LIVRES_SADDLE_STITCH_FORMAT_ALERT;
}
