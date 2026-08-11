/**
 * Affichage métier des profils tarifaires (Formules & règles).
 * Masque préfixes techniques / archives dans le titre principal.
 */

export type FormulaProfileStatusFilter =
  | 'all'
  | 'active'
  | 'draft'
  | 'published'
  | 'no_formula'
  | 'archived';

export type FormulaProfileLike = {
  articleId: string;
  articleLabel: string;
  family: string | null;
  calculationType?: string | null;
  status: string;
  formulaVersions?: { version: number; status: string }[];
  _count?: { formulaVersions?: number };
};

/** Retire tags type `[archivé→x]`, `#draft`, etc. du nom affiché. */
export function displayProfileLabel(raw: string): string {
  let s = String(raw ?? '').trim();
  s = s.replace(/^\[[^\]]*\]\s*/g, '');
  s = s.replace(/\s*\[[^\]]*\]\s*$/g, '');
  s = s.replace(/^#\w+\s+/i, '');
  return s.trim() || raw || 'Sans nom';
}

export function statusLabelFr(status: string): string {
  switch (String(status ?? '').toLowerCase()) {
    case 'published':
    case 'active':
      return 'Actif';
    case 'draft':
    case 'incomplete':
      return 'À corriger';
    case 'archived':
      return 'Archivé';
    case 'pending':
      return 'À valider';
    default:
      return status || '—';
  }
}

export function calculationLabelFr(calc: string | null | undefined): string {
  switch (String(calc ?? '').toLowerCase()) {
    case 'm2':
      return 'Surface m²';
    case 'cm2':
      return 'Surface cm²';
    case 'laize':
      return 'Laize';
    case 'developpe':
      return 'Développé';
    case 'formula':
      return 'Formule';
    case 'piece':
    default:
      return 'À la pièce';
  }
}

export type ProfileListState = {
  primary: string;
  tone: 'ok' | 'warn' | 'muted' | 'danger';
  detail: string;
};

export function resolveProfileListState(p: FormulaProfileLike): ProfileListState {
  const latest = p.formulaVersions?.[0];
  const published = p.formulaVersions?.find((v) => v.status === 'published') ??
    (latest?.status === 'published' ? latest : null);
  const profileArchived = p.status === 'archived';
  const hasFormula = Boolean(latest) || (p._count?.formulaVersions ?? 0) > 0;

  if (profileArchived) {
    return { primary: 'Inactif', tone: 'muted', detail: 'Hors liste principale' };
  }
  if (!hasFormula) {
    return { primary: 'À compléter', tone: 'warn', detail: 'Sans formule' };
  }
  if (p.status === 'published' && published) {
    return {
      primary: 'Actif',
      tone: 'ok',
      detail: 'Formule synchronisable POS',
    };
  }
  if (latest?.status === 'draft' || p.status === 'draft') {
    return {
      primary: 'Brouillon',
      tone: 'warn',
      detail: latest ? `v${latest.version} — non appliqué au POS` : 'Non appliqué au POS',
    };
  }
  return {
    primary: statusLabelFr(p.status),
    tone: 'muted',
    detail: latest ? `v${latest.version}` : '—',
  };
}

export function filterFormulaProfiles(
  profiles: FormulaProfileLike[],
  opts: {
    query: string;
    statusFilter: FormulaProfileStatusFilter;
    family: string | 'all';
    includeArchived?: boolean;
  },
): FormulaProfileLike[] {
  const q = opts.query.trim().toLowerCase();
  return profiles.filter((p) => {
    const archived = p.status === 'archived';
    if (archived && opts.statusFilter !== 'archived' && !opts.includeArchived) {
      if (opts.statusFilter !== 'all') return false;
      // défaut : masquer archivés
      return false;
    }
    if (opts.statusFilter === 'archived' && !archived) return false;
    if (opts.statusFilter === 'published' && p.status !== 'published') return false;
    if (opts.statusFilter === 'draft' && p.status !== 'draft') return false;
    if (opts.statusFilter === 'active' && (archived || p.status === 'archived')) return false;
    if (opts.statusFilter === 'no_formula') {
      const has = Boolean(p.formulaVersions?.[0]) || (p._count?.formulaVersions ?? 0) > 0;
      if (has) return false;
    }
    if (opts.family !== 'all' && (p.family ?? '') !== opts.family) return false;
    if (!q) return true;
    const label = displayProfileLabel(p.articleLabel).toLowerCase();
    return (
      label.includes(q)
      || p.articleId.toLowerCase().includes(q)
      || (p.family ?? '').toLowerCase().includes(q)
      || (p.calculationType ?? '').toLowerCase().includes(q)
    );
  });
}

export function uniqueFamilies(profiles: FormulaProfileLike[]): string[] {
  const set = new Set<string>();
  for (const p of profiles) {
    if (p.family?.trim()) set.add(p.family.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Mapping blocs → étapes du canvas (§8). */
export const FORMULA_STAGE_ORDER = [
  'base',
  'quantity',
  'materials',
  'options',
  'addons',
  'waste',
  'margin',
  'minimum',
  'discount',
  'round',
  'other',
] as const;

export type FormulaStageId = (typeof FORMULA_STAGE_ORDER)[number];

export const FORMULA_STAGE_LABELS: Record<FormulaStageId, string> = {
  base: 'Prix de base / coûts sources',
  quantity: 'Quantité et paliers',
  materials: 'Matières',
  options: 'Options et finitions',
  addons: 'Suppléments et charges',
  waste: 'Perte / gâche',
  margin: 'Marge ou coefficient',
  minimum: 'Minimum facturable',
  discount: 'Remises',
  round: 'Arrondi commercial',
  other: 'Autres blocs',
};

export function stageForBlockKind(kind: string): FormulaStageId {
  switch (kind) {
    case 'base_fixed':
    case 'surface_m2':
    case 'surface_cm2':
      return 'base';
    case 'base_tier':
      return 'quantity';
    case 'material_cost':
      return 'materials';
    case 'option_modifiers':
    case 'finishing':
      return 'options';
    case 'labor':
    case 'surcharge_fixed':
      return 'addons';
    case 'waste_percent':
      return 'waste';
    case 'margin_percent':
      return 'margin';
    case 'minimum':
      return 'minimum';
    case 'discount_percent':
      return 'discount';
    case 'round_ar':
      return 'round';
    default:
      return 'other';
  }
}
