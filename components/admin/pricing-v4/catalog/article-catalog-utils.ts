import { CATALOGUE } from '@/lib/data/catalogue';
import type { ArticleFamilyFilterId } from '@/lib/pricing/pricing-admin-ui';
import type { ArticleProfileRow, ArticleWarning, EnrichedArticleRow } from './article-catalog-types';
import { familyToCategoryId } from '@/lib/pos/article-category-taxonomy';
import { isRedundantGrandFormatPosCard } from '@/lib/pos/grand-format-redundant';

const IMPRIMERIE_FAMILIES = new Set([
  'imprimerie', 'carterie', 'goodies', 'packaging', 'etiquette', 'bloc_note', 'agenda',
  'flyers', 'finitions', 'calendrier', 'carterie', 'livres', 'plv', 'notes',
]);

const GOODIES_FAMILIES = new Set(['goodies', 'packaging']);
const EVENT_FAMILIES = new Set(['evenementiel', 'plv', 'photo']);

export function catalogueMeta(articleId: string) {
  return CATALOGUE.find((a) => a.id === articleId);
}

export function enrichArticleRow(p: ArticleProfileRow): EnrichedArticleRow {
  const meta = catalogueMeta(p.articleId);
  const publishedFv = p.formulaVersions?.find((f) => f.status === 'published');
  const hasPublishedFormula = Boolean(publishedFv);
  const formulaLabel = publishedFv
    ? `v${publishedFv.version}`
    : p._count?.formulaVersions
      ? 'Brouillon'
      : '—';
  const posVisible = (p.optionGroups ?? []).some((g) => g.visiblePos);
  const category = meta?.category ?? p.family;
  const categoryLabel = category.replace(/_/g, ' ');
  const warnings = getArticleWarnings(p, hasPublishedFormula);

  const searchParts = [
    p.articleId,
    p.articleLabel,
    p.family,
    category,
    categoryLabel,
    p.calculationType,
    meta?.configType,
    meta?.description,
    p.status,
    formulaLabel,
    ...(p.optionGroups?.map((g) => g.label) ?? []),
  ];

  return {
    ...p,
    icon: meta?.icon ?? '📦',
    category,
    categoryLabel,
    configType: meta?.configType ?? p.calculationType,
    hasPublishedFormula,
    formulaLabel,
    posVisible,
    warnings,
    searchBlob: searchParts.filter(Boolean).join(' ').toLowerCase(),
  };
}

export function getArticleWarnings(
  p: ArticleProfileRow,
  hasPublishedFormula: boolean,
): ArticleWarning[] {
  const w: ArticleWarning[] = [];
  if (!hasPublishedFormula) {
    w.push({ id: 'no-formula', label: 'Sans formule', severity: 'warn' });
  }
  if (p.prixBase == null) {
    w.push({ id: 'no-price', label: 'Prix manquant', severity: 'danger' });
  }
  if (p.status === 'published' && !hasPublishedFormula) {
    w.push({ id: 'published-incomplete', label: 'À vérifier', severity: 'danger' });
  }
  if ((p._count?.materialPrices ?? 0) === 0 && ['m2', 'cm2', 'laize'].includes(p.calculationType)) {
    w.push({ id: 'no-material', label: 'Sans matière', severity: 'warn' });
  }
  if (p.status === 'published' && p.prixBase == null) {
    w.push({ id: 'pos-incomplete', label: 'POS incomplet', severity: 'danger' });
  }
  return w;
}

export function matchesFamilyFilter(row: EnrichedArticleRow, filter: ArticleFamilyFilterId): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return row.status === 'published';
  if (filter === 'archived') return row.status === 'archived';
  if (filter === 'no-formula') return !row.hasPublishedFormula;
  if (filter === 'invalid') return Boolean(row.warnings?.some((w) => w.severity === 'danger'));
  if (filter === 'grand_format') {
    if (row.status === 'archived') return false;
    if (isRedundantGrandFormatPosCard(row.articleLabel, row.articleId)) return false;
    const cat = familyToCategoryId(row.family, {
      articleId: row.articleId,
      name: row.articleLabel,
    });
    return cat === 'grand_format';
  }
  if (filter === 'textile') return row.family === 'textile' || row.category === 'textile';
  if (filter === 'imprimerie') return IMPRIMERIE_FAMILIES.has(row.family) || IMPRIMERIE_FAMILIES.has(row.category);
  if (filter === 'goodies') return GOODIES_FAMILIES.has(row.family) || GOODIES_FAMILIES.has(row.category);
  if (filter === 'evenementiel') return EVENT_FAMILIES.has(row.family) || EVENT_FAMILIES.has(row.category);
  return true;
}

export function matchesSearch(row: EnrichedArticleRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return row.searchBlob.includes(q);
}

export function pickInitialArticleId(
  rows: EnrichedArticleRow[],
  initialArticleId?: string | null,
  lastStoredId?: string | null,
): string | null {
  if (initialArticleId && rows.some((r) => r.articleId === initialArticleId)) {
    return initialArticleId;
  }
  if (lastStoredId && rows.some((r) => r.articleId === lastStoredId)) {
    return lastStoredId;
  }
  const firstActive = rows.find((r) => r.status === 'published');
  if (firstActive) return firstActive.articleId;
  return rows[0]?.articleId ?? null;
}

export function formatRelativeDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch {
    return '—';
  }
}

export function formatPrixBase(prix: number | null): string {
  if (prix == null || !Number.isFinite(prix)) return '—';
  return `${Math.round(prix).toLocaleString('fr-FR')} Ar`;
}
