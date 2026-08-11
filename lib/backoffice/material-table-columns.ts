import type { CSSProperties } from 'react';
import type { MasterDataColumn } from '@/components/backoffice-v2/ui/MasterDataVirtualTable';
import { MASTER_DATA_MATERIAL_COLUMNS } from '@/components/backoffice-v2/ui/MasterDataVirtualTable';

/**
 * Préréglages colonnes (Ultra-Prompt §6.2) — ne pas afficher 20 colonnes à la fois.
 * `essential` / `compact` / `full` conservés pour rétrocompat toolbar.
 */
export type MaterialColumnPresetId =
  | 'essential'
  | 'compact'
  | 'full'
  | 'unified'
  | 'master'
  | 'formats'
  | 'costs'
  | 'stock'
  | 'usage'
  | 'anomalies';

export type MaterialMasterColumnGroup = {
  id: string;
  label: string;
  columnIds: string[];
};

/** Table maîtresse — colonnes fusion + 2e caractéristique. */
export const MATERIAL_MASTER_COLUMN_ORDER = [
  'material',
  'refPrimary',
  'family',
  'charType',
  'charValue',
  'charType2',
  'charValue2',
  'format',
  'grammage',
  'thickness',
  'laize',
  'size',
  'color',
  'priceUnit',
  'blank',
  'marginGain',
  'price',
  'purchase',
  'lastPurchasePrice',
  'lastPurchaseDate',
  'contextPrices',
  'stockPhysical',
  'stockReserved',
  'stock',
  'threshold',
  'alerts',
  'supplier',
  'location',
  'status',
  'actions',
] as const;

export const MATERIAL_MASTER_COLUMN_GROUPS: MaterialMasterColumnGroup[] = [
  {
    id: 'identification',
    label: 'Identification',
    columnIds: ['material', 'refPrimary', 'family'],
  },
  {
    id: 'characteristics',
    label: 'Caractéristiques techniques',
    columnIds: ['charType', 'charValue', 'charType2', 'charValue2'],
  },
  {
    id: 'dimensions',
    label: 'Dimensions et finition',
    columnIds: ['format', 'grammage', 'thickness', 'laize', 'size', 'color', 'priceUnit'],
  },
  {
    id: 'pricing',
    label: 'Tarification',
    columnIds: [
      'blank',
      'marginGain',
      'price',
      'purchase',
      'lastPurchasePrice',
      'lastPurchaseDate',
      'contextPrices',
    ],
  },
  {
    id: 'stock',
    label: 'Stock et statut',
    columnIds: [
      'stockPhysical',
      'stockReserved',
      'stock',
      'threshold',
      'alerts',
      'supplier',
      'location',
      'status',
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    columnIds: ['actions'],
  },
];

const MATERIAL_MASTER_LABELS: Record<string, string> = {
  material: 'Matière',
  refPrimary: 'Référence',
  family: 'Famille',
  charType: 'Type',
  charValue: 'Valeur',
  charType2: 'Type secondaire',
  charValue2: 'Valeur secondaire',
  format: 'Format',
  grammage: 'Grammage',
  thickness: 'Épaisseur',
  laize: 'Laize',
  size: 'Taille',
  color: 'Couleur',
  priceUnit: 'Unité',
  blank: 'Prix matière',
  marginGain: 'Marge de gain',
  price: 'Prix imprimé',
  purchase: 'Coût d’achat',
  lastPurchasePrice: 'Dernier prix d’achat',
  lastPurchaseDate: 'Date du dernier prix',
  contextPrices: 'Prix contextuel',
  stockPhysical: 'Stock physique',
  stockReserved: 'Stock réservé',
  stock: 'Stock',
  threshold: 'Seuil d’alerte',
  alerts: 'Alertes',
  supplier: 'Fournisseur',
  location: 'Emplacement',
  status: 'Statut',
  actions: 'Actions',
};

const ALL_IDS = MASTER_DATA_MATERIAL_COLUMNS.map((c) => c.id);

/** Masque tout sauf les colonnes listées (+ material / actions toujours visibles). */
function hideExcept(keep: string[]): string[] {
  const keepSet = new Set(['material', 'actions', ...keep]);
  return ALL_IDS.filter((id) => !keepSet.has(id));
}

/**
 * Ordre colonnes hub fusionné :
 * Référentiel + Coûts & prix + Stock & fournisseurs (maquette CPS).
 */
export const MATERIAL_UNIFIED_COLUMN_ORDER = [
  'material',
  'charType',
  'charValue',
  'color',
  'refPrimary',
  'purchase',
  'blank',
  'marginGain',
  'price',
  'stock',
  'stockReserved',
  'supplier',
  'family',
  'status',
  'alerts',
  'actions',
] as const;

export const MATERIAL_COLUMN_PRESETS: Record<
  MaterialColumnPresetId,
  { label: string; hiddenIds: string[] }
> = {
  /** Vue Essentielle / Référentiel — type + valeur séparés */
  essential: {
    label: 'Référentiel',
    hiddenIds: hideExcept([
      'charType',
      'charValue',
      'refPrimary',
      'family',
      'blank',
      'marginGain',
      'price',
      'priceUnit',
      'alerts',
      'status',
    ]),
  },
  compact: {
    label: 'Compacte',
    hiddenIds: hideExcept(['charType', 'charValue', 'refPrimary', 'blank', 'marginGain', 'price', 'alerts']),
  },
  full: {
    label: 'Avancée',
    hiddenIds: [],
  },
  /** Fusion hub : identité + prix achat/vierge/imprimé + stock/fournisseur */
  unified: {
    label: 'Complet (réf. · coûts · stock)',
    hiddenIds: hideExcept([
      'charType',
      'charValue',
      'color',
      'refPrimary',
      'purchase',
      'blank',
      'marginGain',
      'price',
      'stock',
      'stockReserved',
      'supplier',
      'family',
      'status',
      'alerts',
    ]),
  },
  /** Table maîtresse — vue compacte type PrintFlow (pas de scroll horizontal). */
  master: {
    label: 'Matières — Caractéristiques, Prix & Stock',
    hiddenIds: [
      // Demandé masqué (toujours dispo via « Colonnes »)
      'lastPurchasePrice',
      'lastPurchaseDate',
      'contextPrices',
      'stockPhysical',
      'stockReserved',
      'alerts',
      // Fusionnés dans l’identité / stock / fiche détail
      'refPrimary',
      'charType2',
      'charValue2',
      'format',
      'grammage',
      'thickness',
      'laize',
      'size',
      'color',
      'purchase',
      'threshold',
      'supplier',
      'location',
      'status',
    ],
  },
  formats: {
    label: 'Formats & laizes',
    hiddenIds: hideExcept([
      'charType',
      'charValue',
      'refPrimary',
      'family',
      'format',
      'grammage',
      'thickness',
      'laize',
      'size',
      'color',
      'status',
    ]),
  },
  costs: {
    label: 'Coûts & prix',
    hiddenIds: hideExcept([
      'charType',
      'charValue',
      'refPrimary',
      'purchase',
      'blank',
      'marginGain',
      'price',
      'priceUnit',
      'contextPrices',
      'alerts',
      'status',
    ]),
  },
  stock: {
    label: 'Stock & fournisseurs',
    hiddenIds: hideExcept([
      'charValue',
      'refPrimary',
      'stock',
      'threshold',
      'stockPhysical',
      'stockReserved',
      'supplier',
      'lastPurchasePrice',
      'lastPurchaseDate',
      'location',
      'alerts',
      'status',
    ]),
  },
  usage: {
    label: 'Usages produits',
    hiddenIds: hideExcept([
      'charType',
      'charValue',
      'refPrimary',
      'family',
      'blank',
      'marginGain',
      'price',
      'alerts',
      'status',
    ]),
  },
  anomalies: {
    label: 'Anomalies',
    hiddenIds: hideExcept([
      'charType',
      'charValue',
      'refPrimary',
      'purchase',
      'blank',
      'marginGain',
      'price',
      'stock',
      'alerts',
      'status',
    ]),
  },
};

export function materialColumnsForPreset(preset: MaterialColumnPresetId): MasterDataColumn[] {
  const hidden = new Set(MATERIAL_COLUMN_PRESETS[preset].hiddenIds);

  if (preset === 'master') {
    const byId = new Map(MASTER_DATA_MATERIAL_COLUMNS.map((c) => [c.id, c]));
    return MATERIAL_MASTER_COLUMN_ORDER.map((id) => {
      const base = byId.get(id);
      if (!base) return null;
      const stickyLeft = id === 'material';
      const stickyRight = id === 'actions';
      return {
        ...base,
        label: MATERIAL_MASTER_LABELS[id] ?? base.label,
        priority: 'high' as const,
        stickyLeft,
        stickyRight,
        stickyLeftIndex: id === 'material' ? 1 : undefined,
        stickyRightIndex: id === 'actions' ? 1 : undefined,
      };
    }).filter(Boolean) as MasterDataColumn[];
  }

  const visible = MASTER_DATA_MATERIAL_COLUMNS.filter((c) => !hidden.has(c.id));
  if (preset !== 'unified') return visible;

  const UNIFIED_LABELS: Record<string, string> = {
    purchase: 'Prix achat',
    blank: 'Prix matière',
    marginGain: 'Marge de gain',
    price: 'Prix imprimé',
    stock: 'Disponible',
    stockReserved: 'Réservé',
    charType: 'Type',
    charValue: 'Valeur',
    refPrimary: 'Référence',
    color: 'Couleur',
    supplier: 'Fournisseur',
    family: 'Famille',
    status: 'État',
    alerts: 'Alertes',
  };

  const byId = new Map(visible.map((c) => [c.id, c]));
  const ordered: MasterDataColumn[] = [];
  for (const id of MATERIAL_UNIFIED_COLUMN_ORDER) {
    const col = byId.get(id);
    if (!col) continue;
    ordered.push({
      ...col,
      label: UNIFIED_LABELS[id] ?? col.label,
      priority: 'high',
    });
  }
  for (const col of visible) {
    if (!ordered.some((c) => c.id === col.id)) ordered.push(col);
  }
  return ordered;
}

export const MATERIAL_COLUMN_WIDTHS: Record<string, string> = {
  material: 'minmax(0, 2.6fr)',
  refPrimary: 'minmax(120px, 1.2fr)',
  charType: 'minmax(120px, 1.1fr)',
  charValue: 'minmax(0, 1.1fr)',
  charType2: 'minmax(140px, 1.2fr)',
  charValue2: 'minmax(110px, 1fr)',
  purchase: 'minmax(110px, 1fr)',
  blank: 'minmax(0, 1.1fr)',
  marginGain: 'minmax(0, 1fr)',
  price: 'minmax(0, 1.1fr)',
  stock: 'minmax(88px, 1.15fr)',
  alerts: 'minmax(100px, 0.9fr)',
  status: 'minmax(100px, 0.9fr)',
  priceUnit: 'minmax(0, 0.9fr)',
  otherDetails: 'minmax(110px, 1fr)',
  actions: 'minmax(0, 0.85fr)',
  format: 'minmax(90px, 0.9fr)',
  grammage: 'minmax(90px, 0.9fr)',
  thickness: 'minmax(90px, 0.9fr)',
  laize: 'minmax(90px, 0.85fr)',
  size: 'minmax(90px, 0.85fr)',
  color: 'minmax(90px, 0.9fr)',
  family: 'minmax(0, 1.05fr)',
  supplier: 'minmax(120px, 1.1fr)',
  threshold: 'minmax(100px, 0.9fr)',
  stockPhysical: 'minmax(110px, 1fr)',
  stockReserved: 'minmax(110px, 1fr)',
  lastPurchasePrice: 'minmax(130px, 1.1fr)',
  lastPurchaseDate: 'minmax(130px, 1.1fr)',
  contextPrices: 'minmax(120px, 1.1fr)',
  location: 'minmax(110px, 1fr)',
};

/** Filtre colonnes selon breakpoint (priorité responsive). */
export function filterColumnsByBreakpoint(
  columns: MasterDataColumn[],
  breakpoint: 'lg' | 'md' | 'sm',
): MasterDataColumn[] {
  return columns.filter((c) => {
    const p = c.priority ?? 'high';
    if (breakpoint === 'sm') return p === 'high';
    if (breakpoint === 'md') return p !== 'low';
    return true;
  });
}

export function materialGridStyle(columns: MasterDataColumn[]): CSSProperties {
  /** Toujours 100 % — jamais de min-width 2800px (scroll horizontal interdit sur Matières). */
  return {
    width: '100%',
    minWidth: '100%',
    maxWidth: '100%',
    gridTemplateColumns: columns
      .map((c) => MATERIAL_COLUMN_WIDTHS[c.id] ?? 'minmax(0, 1fr)')
      .join(' '),
  };
}

export function materialColumnsWithHidden(hiddenIds: string[]): MasterDataColumn[] {
  const hidden = new Set(hiddenIds);
  return MASTER_DATA_MATERIAL_COLUMNS.filter((c) => !hidden.has(c.id));
}

export const MATERIAL_TOGGLEABLE_COLUMNS = MASTER_DATA_MATERIAL_COLUMNS.filter(
  (c) => !['material', 'actions'].includes(c.id),
);

/** Colonnes masquables pour la table maîtresse (27 cols — material/actions toujours visibles). */
export const MATERIAL_MASTER_TOGGLEABLE_COLUMNS = MATERIAL_MASTER_COLUMN_ORDER.filter(
  (id) => id !== 'material' && id !== 'actions',
).map((id) => ({
  id,
  label: MATERIAL_MASTER_LABELS[id] ?? id,
}));

/** Sous-vues domaine Matières (Ultra-Prompt §6.1) ↔ préréglage + filtre rapide. */
export type MaterialStudioSubViewId =
  | 'referentiel'
  | 'formats'
  | 'couts'
  | 'stock'
  | 'usages'
  | 'anomalies';

export const MATERIAL_STUDIO_SUBVIEWS: {
  id: MaterialStudioSubViewId;
  label: string;
  preset: MaterialColumnPresetId;
  chip: 'all' | 'missingPrice' | 'unlinked' | 'verify' | 'pos';
}[] = [
  { id: 'referentiel', label: 'Référentiel', preset: 'unified', chip: 'all' },
  { id: 'formats', label: 'Formats & laizes', preset: 'formats', chip: 'all' },
  { id: 'couts', label: 'Coûts & prix matière', preset: 'costs', chip: 'all' },
  { id: 'stock', label: 'Stock & fournisseurs', preset: 'stock', chip: 'all' },
  { id: 'usages', label: 'Usages produits', preset: 'usage', chip: 'all' },
  { id: 'anomalies', label: 'Anomalies', preset: 'anomalies', chip: 'verify' },
];

export function parseMaterialStudioSubView(raw: string | null | undefined): MaterialStudioSubViewId {
  const v = (raw ?? '').toLowerCase();
  if (v === 'master' || v === 'unified' || v === 'referentiel') return 'referentiel';
  if (v === 'formats' || v === 'format' || v === 'laizes') return 'formats';
  if (v === 'couts' || v === 'costs' || v === 'prix' || v === 'prix-contexte') return 'couts';
  if (v === 'stock' || v === 'fournisseurs') return 'stock';
  if (v === 'usages' || v === 'usage' || v === 'produits') return 'usages';
  if (v === 'anomalies' || v === 'anomaly' || v === 'verify') return 'anomalies';
  return 'referentiel';
}
