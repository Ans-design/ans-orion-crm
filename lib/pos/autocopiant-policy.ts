import type { ConfigField } from '@/lib/data/config-types';

export const DOC_AUTOCOPIANT_IDS = new Set(['doc-carnet', 'doc-recu', 'doc-facturier']);

export const AUTOCOPIANT_SOUCHES_COLOR_OPTIONS = [
  'Jaune',
  'Rose',
  'Vert',
  'Bleu',
  'Autres',
] as const;

const DUPLICOPIE_VALUES = [
  'Duplicopie',
  'Triplicopie',
  'Quadruplicopie',
  'Quintuplicopie',
  'Autre nombre personnalisé (>4)',
] as const;

function readDuplicopie(config: Record<string, unknown>): string {
  return String(config.duplicopie ?? config.exemplaires ?? '');
}

export function isAutocopiantArticleId(articleId?: string | null): boolean {
  return Boolean(articleId && DOC_AUTOCOPIANT_IDS.has(articleId));
}

export function isAutocopiantCustomCopyCount(config: Record<string, unknown>): boolean {
  return /personnalis/i.test(readDuplicopie(config));
}

/** Nombre de couleurs choisissables (hors blanc fixe en 1ère souche). */
export function resolveAutocopiantColorCount(config: Record<string, unknown>): number {
  const dup = readDuplicopie(config);

  if (isAutocopiantCustomCopyCount(config)) {
    const n = parseInt(String(config.nb_copies ?? ''), 10);
    if (Number.isFinite(n) && n > 4) return n - 1;
    return 4;
  }

  if (/quintupli/i.test(dup)) return 4;
  if (/quadrupli/i.test(dup)) return 3;
  if (/tripli/i.test(dup)) return 2;
  if (/duplicopie|dupli/i.test(dup)) return 1;

  const type = String(config.type ?? '');
  if (/triplex/i.test(type)) return 2;
  if (/duplex|dupli/i.test(type)) return 1;
  if (/quadri|4\s*cop/i.test(type)) return 3;

  return 1;
}

export function patchAutocopiantCouleursField(
  field: ConfigField,
  config: Record<string, unknown>,
): ConfigField {
  const exact = resolveAutocopiantColorCount(config);
  return {
    ...field,
    selectionMode: 'multipleExact',
    exactSelections: exact,
    minSelections: exact,
    maxSelections: exact,
  };
}

export function applyAutocopiantColorRules(config: Record<string, unknown>): Record<string, unknown> {
  const max = resolveAutocopiantColorCount(config);
  const colors = Array.isArray(config.couleurs_souches)
    ? (config.couleurs_souches as string[]).filter((c) => c !== 'Blanc')
    : [];
  return { ...config, couleurs_souches: colors.slice(0, max) };
}

export function formatAutocopiantColorProgress(selected: string[], needed: number): string {
  const n = selected.length;
  const couleurLabel = needed > 1 ? 'couleurs' : 'couleur';
  const selLabel = n > 1 ? 'sélectionnées' : 'sélectionnée';
  return `Choisissez ${needed} ${couleurLabel} — ${n}/${needed} ${selLabel}`;
}

export function autocopiantDuplicopieOptions(): readonly string[] {
  return DUPLICOPIE_VALUES;
}

export function buildAutocopiantSouchePreview(selected: string[], colorCount: number): string[] {
  const slots = ['Blanc', ...selected.slice(0, colorCount)];
  while (slots.length < colorCount + 1) slots.push('—');
  return slots;
}
