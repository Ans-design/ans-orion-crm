/** Regroupe les matières par catégorie (PCB, Acrylique, etc.) — variantes sous le même groupe */

import { deriveMaterialTableFields } from '@/lib/backoffice/material-table-fields';
import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';

export type MasterDataGroup<T> = {
  key: string;
  label: string;
  subtitle?: string;
  rows: T[];
};

export type MasterDataFlatItem<T> =
  | { kind: 'group'; key: string; label: string; count: number; subtitle?: string }
  | { kind: 'row'; key: string; row: T; groupKey: string; indexInGroup: number };

type GroupableRow = {
  id: string;
  name: string;
  materialKey?: string;
  grammage?: string | null;
  thickness?: string | null;
  stockSku?: string | null;
};

const VARIANT_SUFFIX = /\s+\d+[\s,.]*(g|G|gr|grammes?|mm|cm|µm|microns?)\b.*$/i;

/** Normalise les clés papier : Glossy ≠ PCB (Papier Couché Brillant) */
export function normalizePaperGroupKey(name: string): string {
  const t = name.trim().toLowerCase();
  if (t === 'pcb' || /papier couch[eé] brillant|couch[eé] brillant/.test(t)) return 'pcb';
  if (t === 'pcm' || /papier couch[eé] mat/.test(t)) return 'pcm';
  if (/glossy\s*\/|glossy.*couch[eé]/i.test(t)) return 'pcb';
  if (t === 'glossy' || t.startsWith('glossy ')) return 'glossy';
  return t;
}

/** Clé de regroupement : base matière (Glossy, PCB, Acrylic…) sans grammage */
export function deriveMaterialGroupKey(row: GroupableRow): string {
  const key = row.materialKey?.trim();
  if (key && key.length > 1 && key !== row.id && !key.startsWith('print-')) {
    const baseKey = key.split(':')[0]!;
    return normalizePaperGroupKey(baseKey);
  }

  const fields = deriveMaterialTableFields(row as unknown as MaterialPriceUnifiedRow);
  const stripped = fields.materialName.replace(VARIANT_SUFFIX, '').trim();
  if (stripped.length >= 2) return normalizePaperGroupKey(stripped);

  const first = row.name.split(/\s+/)[0];
  return normalizePaperGroupKey(first ?? row.name);
}

export function formatGroupLabel(key: string, sampleName: string): string {
  if (key === 'pcb') return 'PCB (Papier Couché Brillant)';
  if (key === 'pcm') return 'PCM (Papier Couché Mat)';
  if (key === 'glossy') return 'Glossy';
  const display = key.charAt(0).toUpperCase() + key.slice(1);
  if (/acryl|acrylic|plexi/i.test(key)) return `${display} (Plexiglas)`;
  if (/akilux/i.test(key)) return display;
  return sampleName.split(VARIANT_SUFFIX)[0]?.trim() || display;
}

export function groupMasterDataRows<T extends GroupableRow>(rows: T[]): MasterDataGroup<T>[] {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const gk = deriveMaterialGroupKey(row);
    const list = map.get(gk) ?? [];
    list.push(row);
    map.set(gk, list);
  }

  const groups: MasterDataGroup<T>[] = [];
  for (const [key, groupRows] of map.entries()) {
    groupRows.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const label = formatGroupLabel(key, groupRows[0]!.name);
    const subtitle = `${groupRows.length} déclinaison${groupRows.length > 1 ? 's' : ''}`;

    groups.push({ key, label, subtitle, rows: groupRows });
  }

  groups.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  return groups;
}

export function flattenMasterDataGroups<T>(groups: MasterDataGroup<T>[]): MasterDataFlatItem<T>[] {
  const flat: MasterDataFlatItem<T>[] = [];
  for (const g of groups) {
    flat.push({
      kind: 'group',
      key: `group-${g.key}`,
      label: g.label,
      count: g.rows.length,
      subtitle: g.subtitle,
    });
    g.rows.forEach((row, i) => {
      flat.push({
        kind: 'row',
        key: `row-${(row as GroupableRow).id}`,
        row,
        groupKey: g.key,
        indexInGroup: i,
      });
    });
  }
  return flat;
}

/** Filtre live : nom, réf, SKU, famille, caractéristique — multi-mots (tous les tokens doivent matcher) */
export function filterMasterDataRows<T extends GroupableRow & { family?: string | null; articleName?: string | null }>(
  rows: T[],
  query: string,
): T[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return rows;

  return rows.filter((r) => {
    const fields = deriveMaterialTableFields(r as unknown as MaterialPriceUnifiedRow);
    const characteristicText = [
      fields.materialName,
      fields.mainCharacteristic?.display,
      fields.mainCharacteristic?.typeLabel,
      fields.primaryReference,
      fields.secondaryReference,
    ].filter(Boolean).join(' ');

    const haystack = [
      r.name,
      r.articleName,
      r.family,
      r.materialKey,
      r.stockSku,
      r.id,
      r.grammage,
      r.thickness,
      characteristicText,
      deriveMaterialGroupKey(r),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return tokens.every((token) => haystack.includes(token));
  });
}
