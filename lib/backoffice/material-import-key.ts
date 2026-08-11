import type { CharacteristicType } from '@/lib/backoffice/material-table-fields';
import { normalizeMaterialName } from '@/lib/server/modules/materials/material-key';

export type MaterialImportKeyParts = {
  materialName: string;
  characteristicType: CharacteristicType | string;
  characteristicValue: string;
  characteristicUnit?: string | null;
  priceUnit: string;
  family: string;
};

function normToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** Clé logique import Excel — matière + déclinaison + unité + famille */
export function buildMaterialImportKey(parts: MaterialImportKeyParts): string {
  const name = normalizeMaterialName(parts.materialName);
  const type = normToken(String(parts.characteristicType || 'autre'));
  const value = normToken(parts.characteristicValue);
  const unit = normToken(parts.characteristicUnit ?? '');
  const priceUnit = normToken(parts.priceUnit || 'feuille');
  const family = normToken(parts.family || 'autre');
  return [name, type, value, unit, priceUnit, family].join('|');
}

export function parseCharacteristicTypeLabel(label: string): CharacteristicType {
  const t = label.trim().toLowerCase();
  const map: Record<string, CharacteristicType> = {
    grammage: 'grammage',
    épaisseur: 'epaisseur',
    epaisseur: 'epaisseur',
    laize: 'laize',
    format: 'format',
    taille: 'taille',
    face: 'face',
    finition: 'finition',
    couleur: 'couleur',
    autre: 'autre',
  };
  return map[t] ?? 'autre';
}
