import { normalizeMaterialName } from '@/lib/server/modules/materials/material-key';
import type { CharacteristicType } from '@/lib/backoffice/material-table-fields';

export type ParsedMaterialLabel = {
  baseName: string;
  normalizedName: string;
  characteristicType: CharacteristicType | null;
  value: string | null;
  unit: string | null;
  displayValue: string | null;
};

const GRAMMAGE_SUFFIX = /\s+\d+(?:[.,]\d+)?(?:\s*)?(?:g\/m²|g\/m2|g|gr)\b.*$/i;
const THICKNESS_SUFFIX = /\s+\d+(?:[.,]\d+)?\s*mm\b.*$/i;
const LAIZE_SUFFIX = /\s+\d+(?:[.,]\d+)?\s*cm\b.*$/i;
const GRAMMAGE_TOKEN = /(\d+(?:[.,]\d+)?)\s*(?:g\/m²|g\/m2|g|gr)\b/i;
const THICKNESS_TOKEN = /(\d+(?:[.,]\d+)?)\s*mm\b/i;
const LAIZE_TOKEN = /(\d+(?:[.,]\d+)?)\s*cm\b/i;
const LAIZE_PREFIX = /^laize\s+/i;

function stripVariantSuffix(label: string): string {
  return label
    .replace(GRAMMAGE_SUFFIX, '')
    .replace(THICKNESS_SUFFIX, '')
    .replace(LAIZE_SUFFIX, '')
    .replace(LAIZE_PREFIX, '')
    .trim();
}

function isGrandFormatFamily(family?: string | null): boolean {
  return /grand format/i.test(family ?? '');
}

/** Extrait matière de base + caractéristique depuis un libellé brut (import / nettoyage). */
export function parseMaterialLabel(label: string, family?: string | null): ParsedMaterialLabel {
  const trimmed = label.trim().replace(/\s+/g, ' ');
  const normalizedName = normalizeMaterialName(stripVariantSuffix(trimmed));

  const laizeMatch = trimmed.match(LAIZE_TOKEN);
  if (laizeMatch || LAIZE_PREFIX.test(trimmed)) {
    const num = laizeMatch?.[1] ?? trimmed.match(/(\d+(?:[.,]\d+)?)/)?.[1];
    return {
      baseName: stripVariantSuffix(trimmed.replace(LAIZE_PREFIX, '')) || trimmed,
      normalizedName: normalizeMaterialName(stripVariantSuffix(trimmed.replace(LAIZE_PREFIX, '')) || trimmed),
      characteristicType: 'laize',
      value: num ?? null,
      unit: 'cm',
      displayValue: num ? `${num}cm` : null,
    };
  }

  const thicknessMatch = trimmed.match(THICKNESS_TOKEN);
  if (thicknessMatch) {
    const baseName = stripVariantSuffix(trimmed);
    return {
      baseName: baseName || trimmed,
      normalizedName: normalizeMaterialName(baseName || trimmed),
      characteristicType: 'epaisseur',
      value: thicknessMatch[1] ?? null,
      unit: 'mm',
      displayValue: thicknessMatch[0]?.replace(/\s+/g, '') ?? null,
    };
  }

  const grammageMatch = trimmed.match(GRAMMAGE_TOKEN);
  if (grammageMatch) {
    const baseName = stripVariantSuffix(trimmed);
    const unit = /g\/m²|g\/m2/i.test(trimmed) || isGrandFormatFamily(family) ? 'g/m²' : 'g';
    return {
      baseName: baseName || trimmed,
      normalizedName: normalizeMaterialName(baseName || trimmed),
      characteristicType: 'grammage',
      value: grammageMatch[1] ?? null,
      unit,
      displayValue: `${grammageMatch[1]}${unit === 'g/m²' ? 'g/m²' : 'g'}`,
    };
  }

  return {
    baseName: trimmed,
    normalizedName,
    characteristicType: null,
    value: null,
    unit: null,
    displayValue: null,
  };
}

export function uniqueMaterialKey(normalizedName: string, family: string): string {
  return `${normalizeMaterialName(normalizedName)}::${family.trim().toLowerCase()}`;
}

export function uniqueVariantKey(
  materialBaseKey: string,
  characteristicType: string,
  value: string | number,
  unit: string | null,
): string {
  return `${materialBaseKey}::${characteristicType}::${String(value)}::${unit ?? ''}`;
}
