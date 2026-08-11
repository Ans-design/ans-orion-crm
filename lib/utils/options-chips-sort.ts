import type { ChipArticleSummary, ChipTableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';

export type ArticleSortKey =
  | 'name-asc'
  | 'name-desc'
  | 'family'
  | 'vars-desc'
  | 'vars-asc'
  | 'active-desc'
  | 'anomalies-desc'
  | 'source';

export type ChipRowSortKey =
  | 'pos-order'
  | 'block'
  | 'label-asc'
  | 'label-desc'
  | 'price'
  | 'source'
  | 'active';

export const ARTICLE_SORT_OPTIONS: { value: ArticleSortKey; label: string }[] = [
  { value: 'name-asc', label: 'Nom A → Z' },
  { value: 'name-desc', label: 'Nom Z → A' },
  { value: 'family', label: 'Groupe / famille' },
  { value: 'vars-desc', label: 'Variables (↓)' },
  { value: 'vars-asc', label: 'Variables (↑)' },
  { value: 'active-desc', label: 'Actives (↓)' },
  { value: 'anomalies-desc', label: 'Anomalies (↓)' },
  { value: 'source', label: 'Source' },
];

export function sortChipArticles(
  articles: ChipArticleSummary[],
  sort: ArticleSortKey,
): ChipArticleSummary[] {
  const copy = [...articles];
  switch (sort) {
    case 'name-desc':
      return copy.sort((a, b) => b.articleLabel.localeCompare(a.articleLabel, 'fr'));
    case 'family':
      return copy.sort((a, b) => {
        const f = a.family.localeCompare(b.family, 'fr');
        return f !== 0 ? f : a.articleLabel.localeCompare(b.articleLabel, 'fr');
      });
    case 'vars-desc':
      return copy.sort((a, b) => b.variableCount - a.variableCount || a.articleLabel.localeCompare(b.articleLabel, 'fr'));
    case 'vars-asc':
      return copy.sort((a, b) => a.variableCount - b.variableCount || a.articleLabel.localeCompare(b.articleLabel, 'fr'));
    case 'active-desc':
      return copy.sort((a, b) => b.activeCount - a.activeCount || a.articleLabel.localeCompare(b.articleLabel, 'fr'));
    case 'anomalies-desc':
      return copy.sort((a, b) => b.anomalyCount - a.anomalyCount || a.articleLabel.localeCompare(b.articleLabel, 'fr'));
    case 'source':
      return copy.sort((a, b) => {
        const s = a.dataSource.localeCompare(b.dataSource);
        return s !== 0 ? s : a.articleLabel.localeCompare(b.articleLabel, 'fr');
      });
    case 'name-asc':
    default:
      return copy.sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr'));
  }
}

export function sortChipRows(rows: ChipTableRow[], sort: ChipRowSortKey): ChipTableRow[] {
  const copy = [...rows];
  switch (sort) {
    case 'block':
      return copy.sort((a, b) => a.blockKey.localeCompare(b.blockKey, 'fr') || a.sortOrder - b.sortOrder);
    case 'label-desc':
      return copy.sort((a, b) => b.label.localeCompare(a.label, 'fr'));
    case 'label-asc':
      return copy.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    case 'price':
      return copy.sort((a, b) => Number(b.impactsPrice) - Number(a.impactsPrice) || a.sortOrder - b.sortOrder);
    case 'source':
      return copy.sort((a, b) => a.source.localeCompare(b.source) || a.sortOrder - b.sortOrder);
    case 'active':
      return copy.sort((a, b) => Number(b.active && !b.archived) - Number(a.active && !a.archived) || a.sortOrder - b.sortOrder);
    case 'pos-order':
    default:
      return copy.sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
