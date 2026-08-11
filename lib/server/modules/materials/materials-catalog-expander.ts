import { OFFICIAL_MATERIAL_COMPAT, type OfficialMaterialCompat } from '@/lib/data/material-compat-official';
import { SUPPLEMENTARY_MATERIAL_COMPAT } from '@/lib/data/material-supplementary';
import {
  IMPRESSION_SF_MATERIALS,
  IMPRESSION_SF_WEIGHTS_BY_MATIERE,
} from '@/lib/data/impression-sf-material-catalog';
import { buildMaterialKey, normalizeMaterialName } from './material-key';

export type ExpandedMaterialRow = {
  materialKey: string;
  label: string;
  normalizedName: string;
  displayName: string;
  family: string;
  grammage: string | null;
  thickness: string | null;
  source: string;
  aliases: string[];
  unitDisplay: string | null;
  unitStandard: string | null;
  conversionFactor: number | null;
};

function expandCompatList(list: OfficialMaterialCompat[], defaultSource?: string): ExpandedMaterialRow[] {
  const rows: ExpandedMaterialRow[] = [];
  const seen = new Set<string>();

  for (const m of list) {
    const variants: (string | null)[] = m.grammages.length ? m.grammages : [null];
    for (const g of variants) {
      const grammage = g;
      const materialKey = buildMaterialKey(m.key, grammage);
      if (seen.has(materialKey)) continue;
      seen.add(materialKey);

      const displayName = grammage ? `${m.label} ${grammage}` : m.label;
      rows.push({
        materialKey,
        label: displayName,
        normalizedName: normalizeMaterialName(m.label),
        displayName,
        family: m.family,
        grammage,
        thickness: grammage?.includes('mm') ? grammage : null,
        source: m.source ?? defaultSource ?? 'catalog',
        aliases: [m.label, m.key],
        unitDisplay: inferUnitDisplay(m.family, grammage),
        unitStandard: inferUnitStandard(m.family),
        conversionFactor: inferDefaultConversion(m.family, grammage),
      });
    }
  }
  return rows;
}

function inferUnitDisplay(family: string, grammage: string | null): string | null {
  if (family === 'Grand format') {
    if (grammage?.includes('mm')) return 'plaque';
    return 'rouleau';
  }
  if (grammage && !grammage.includes('mm')) return 'rame';
  return null;
}

function inferUnitStandard(family: string): string | null {
  if (family === 'Grand format') return 'm2';
  return 'feuille';
}

function inferDefaultConversion(family: string, grammage: string | null): number | null {
  if (family === 'Grand format') {
    if (grammage?.includes('mm')) return 2.9768; // plaque 122×244 cm
    return 80; // rouleau bâche 1.6×50 m
  }
  if (grammage && !grammage.includes('mm')) return 500; // rame standard
  return null;
}

/** Toutes les matières/grammages depuis catalogues officiels (sans DB). */
export function expandAllCatalogMaterials(): ExpandedMaterialRow[] {
  const map = new Map<string, ExpandedMaterialRow>();

  const add = (rows: ExpandedMaterialRow[]) => {
    for (const r of rows) {
      if (!map.has(r.materialKey)) map.set(r.materialKey, r);
    }
  };

  add(expandCompatList(OFFICIAL_MATERIAL_COMPAT, 'material-compat-official'));
  add(expandCompatList(SUPPLEMENTARY_MATERIAL_COMPAT, 'material-supplementary'));

  for (const m of IMPRESSION_SF_MATERIALS) {
    const weights = (IMPRESSION_SF_WEIGHTS_BY_MATIERE[m.label] ?? []).filter(
      (w) => w !== 'Grammage personnalisé',
    );
    if (weights.length === 0) {
      const materialKey = m.id;
      if (!map.has(materialKey)) {
        map.set(materialKey, {
          materialKey,
          label: m.label,
          normalizedName: normalizeMaterialName(m.label),
          displayName: m.label,
          family: 'Petit format',
          grammage: null,
          thickness: null,
          source: 'impression-sf-material-catalog',
          aliases: [m.id, m.label],
          unitDisplay: 'feuille',
          unitStandard: 'feuille',
          conversionFactor: 500,
        });
      }
      continue;
    }
    for (const g of weights) {
      const materialKey = buildMaterialKey(m.id, g);
      if (map.has(materialKey)) continue;
      const displayName = `${m.label} ${g}`;
      map.set(materialKey, {
        materialKey,
        label: displayName,
        normalizedName: normalizeMaterialName(m.label),
        displayName,
        family: 'Petit format',
        grammage: g.includes('mm') ? null : g,
        thickness: g.includes('mm') ? g : null,
        source: 'impression-sf-material-catalog',
        aliases: [m.label, m.id],
        unitDisplay: 'feuille',
        unitStandard: 'feuille',
        conversionFactor: 500,
      });
    }
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}
