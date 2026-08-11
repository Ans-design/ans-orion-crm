/**
 * Tri central des options chips POS — formats, matières, grammages, etc.
 * Admin `order` (si présent) prime ; sinon règles métier.
 */
import { sortFormatChipOptions } from '@/lib/pos/format-chip-sort';
import { sortGrammageChipOptions } from '@/lib/pos/grammage-chip-sort';
import { sortMatiereChipOptions } from '@/lib/pos/material-chip-sort';

export { sortFormatChipOptions, sortFormatsForPOS } from '@/lib/pos/format-chip-sort';
export { sortGrammageChipOptions, sortGrammageChipOptions as sortGrammages } from '@/lib/pos/grammage-chip-sort';
export { sortMatiereChipOptions } from '@/lib/pos/material-chip-sort';
export { normalizeDimensionLabel } from '@/lib/dimensions/petit-format-units';
export {
  normalizeFormatOption,
  dedupeFormatOptions,
  formatIdentityKey,
  extractIsoFormatCode,
  normalizeFormatAlias,
  getCanonicalFormat,
  getCommercialFormatLabel,
  getPriceEquivalentFormat,
  FORMAT_COMMERCIAL_ALIASES,
  CANONICAL_ISO_FORMAT_LABELS,
} from '@/lib/pos/normalize-format-options';

function isCustomLabel(label: string): boolean {
  return /personnalis|autres|sur devis/i.test(label);
}

/** Quantités / paliers numériques croissants, personnalisé en dernier. */
export function sortQuantityChipOptions(options: string[]): string[] {
  if (options.length <= 1) return options;
  const custom = options.filter(isCustomLabel);
  const regular = options.filter((o) => !isCustomLabel(o));
  const sorted = [...regular].sort((a, b) => {
    const na = parseFloat(String(a).replace(/[^\d.,]/g, '').replace(',', '.'));
    const nb = parseFloat(String(b).replace(/[^\d.,]/g, '').replace(',', '.'));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    if (Number.isFinite(na) && !Number.isFinite(nb)) return -1;
    if (!Number.isFinite(na) && Number.isFinite(nb)) return 1;
    return options.indexOf(a) - options.indexOf(b);
  });
  return [...sorted, ...custom];
}

/** Couleurs / finitions : conserve l’ordre relatif, personnalisé en dernier. */
export function sortCustomLastOptions(options: string[]): string[] {
  if (options.length <= 1) return options;
  const custom = options.filter(isCustomLabel);
  const regular = options.filter((o) => !isCustomLabel(o));
  return [...regular, ...custom];
}

export type PosOptionBlock =
  | 'format'
  | 'grammage'
  | 'matiere'
  | 'papier'
  | 'quantite'
  | 'couleur'
  | 'finition'
  | 'couverture'
  | 'type'
  | 'other';

/** Déduit le bloc de tri depuis fieldKey / titre de section. */
export function inferPosOptionBlock(fieldKeyOrBlock: string): PosOptionBlock {
  const k = String(fieldKeyOrBlock ?? '').toLowerCase();
  if (/format|dimension|taille_format|laize/.test(k) && !/grammage/.test(k)) return 'format';
  if (/grammage|poids|weight|epaisseur/.test(k)) return 'grammage';
  if (/matiere|mati[eè]re|paper|papier|support|dos\b|famille_papier/.test(k)) return 'matiere';
  if (/quantit|qty|pages|nombre|qte/.test(k)) return 'quantite';
  if (/couleur|color|teinte/.test(k)) return 'couleur';
  if (/finition|pellicul|reliure|coins|vernis/.test(k)) return 'finition';
  if (/couverture|cover/.test(k)) return 'couverture';
  if (/^type|sous_type|technologie/.test(k)) return 'type';
  return 'other';
}

/**
 * Trie les options POS selon le bloc.
 * @param blockName fieldKey, titre section, ou bloc explicite (format|matiere|…)
 */
export function sortPOSOptions(blockName: string, options: string[]): string[] {
  if (!options?.length || options.length <= 1) return options ?? [];
  const block = inferPosOptionBlock(blockName);
  switch (block) {
    case 'format':
      return sortFormatChipOptions(options);
    case 'grammage':
      return sortGrammageChipOptions(options);
    case 'matiere':
    case 'papier':
      return sortMatiereChipOptions(options);
    case 'quantite':
      return sortQuantityChipOptions(options);
    case 'couleur':
    case 'finition':
    case 'couverture':
    case 'type':
    case 'other':
    default:
      return sortCustomLastOptions(options);
  }
}
