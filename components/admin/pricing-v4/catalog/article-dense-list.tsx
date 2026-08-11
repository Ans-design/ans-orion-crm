'use client';

import { memo, useRef } from 'react';
import type { EnrichedArticleRow } from './article-catalog-types';
import { formatPrixBase, formatRelativeDate } from './article-catalog-utils';
import { useWindowedRows } from '@/lib/hooks/use-windowed-rows';
import { stripArchivedDisplayPrefix } from '@/lib/administration/catalogue-display-label';

type Props = {
  rows: EnrichedArticleRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  focusedIndex: number;
  onFocusIndexChange: (i: number) => void;
  canEdit?: boolean;
  /** Décalage d'index quand rows est une page de la liste filtrée. */
  indexOffset?: number;
  checkedIds?: Set<string>;
  onToggleChecked?: (id: string) => void;
  onToggleCheckAll?: (ids: string[], checked: boolean) => void;
  onTogglePos?: (row: EnrichedArticleRow, next: boolean) => void;
};

function validationLabel(row: EnrichedArticleRow): string {
  if (row.warnings?.length) {
    const w = row.warnings[0]!;
    const text = typeof w === 'string' ? w : (w.label ?? w.id ?? '');
    if (/matière|materi/i.test(text)) return 'Matière manquante';
    if (/formule/i.test(text)) return 'Formule incomplète';
    if (/prix|tarif/i.test(text)) return 'Prix manquant';
    if (/règle|regle|palier/i.test(text)) return 'Règle invalide';
    return 'À vérifier';
  }
  if (!row.hasPublishedFormula && (row.prixBase == null || row.prixBase <= 0)) return 'Prix manquant';
  if (!row.hasPublishedFormula) return 'Formule incomplète';
  return 'Complet';
}

function formulaCell(row: EnrichedArticleRow): { text: string; tone: 'ok' | 'warn' | 'muted' } {
  if (row.hasPublishedFormula) {
    const n = row.formulaVersions?.find((f) => f.status === 'published')?.version
      ?? row._count?.formulaVersions
      ?? 1;
    return { text: `v${n} active`, tone: 'ok' };
  }
  if (row.formulaLabel === 'Brouillon') return { text: 'Brouillon', tone: 'warn' };
  return { text: 'Sans formule', tone: 'warn' };
}

function DenseRow({
  row,
  index,
  selected,
  focused,
  checked,
  canEdit,
  onSelect,
  onFocusIndexChange,
  onToggleChecked,
  onTogglePos,
}: {
  row: EnrichedArticleRow;
  index: number;
  selected: boolean;
  focused: boolean;
  checked: boolean;
  canEdit?: boolean;
  onSelect: (id: string) => void;
  onFocusIndexChange: (i: number) => void;
  onToggleChecked?: (id: string) => void;
  onTogglePos?: (row: EnrichedArticleRow, next: boolean) => void;
}) {
  const validation = validationLabel(row);
  const formula = formulaCell(row);
  const posOn = row.status === 'published';
  const tariffType = row.hasPublishedFormula ? 'Formule' : 'Prix direct';
  const label = stripArchivedDisplayPrefix(row.articleLabel);

  return (
    <tr
      data-article-id={row.articleId}
      className={`acat-dense-row${selected ? ' is-selected' : ''}${focused ? ' is-focused' : ''}`}
      onClick={() => onSelect(row.articleId)}
      onMouseEnter={() => onFocusIndexChange(index)}
      title={`Modifié : ${formatRelativeDate(row.updatedAt)}`}
      tabIndex={-1}
    >
      <td className="acat-check-cell" data-priority="high" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="acat-check"
          checked={checked}
          aria-label={`Sélectionner ${label}`}
          onChange={() => onToggleChecked?.(row.articleId)}
        />
      </td>
      <td data-priority="high">
        <span className="acat-dense-art">
          <span className="acat-art-icon" aria-hidden>{row.icon}</span>
          <span className="acat-dense-art__text min-w-0">
            <span className="acat-dense-name" title={row.articleLabel}>{label}</span>
            <span className="acat-dense-ref">{row.articleId}</span>
          </span>
        </span>
      </td>
      <td className="acat-dense-muted" data-priority="medium">{row.categoryLabel}</td>
      <td data-priority="medium">
        <span className={`acat-type-badge${row.hasPublishedFormula ? ' is-formula' : ''}`}>
          {tariffType}
        </span>
      </td>
      <td className="acat-num" data-priority="high">
        {formatPrixBase(row.prixBase)}
      </td>
      <td data-priority="medium">
        <span className={`acat-formula-state is-${formula.tone}`}>{formula.text}</span>
      </td>
      <td className="acat-num acat-dense-muted" data-priority="low">
        {row._count?.materialPrices ?? 0}
      </td>
      <td className="acat-num acat-dense-muted" data-priority="low">
        {row._count?.optionGroups ?? '—'}
      </td>
      <td data-priority="high">
        <span
          className={`acat-validation-pill${validation === 'Complet' ? ' ok' : ' warn'}`}
          title={row.warnings?.map((w) => (typeof w === 'string' ? w : w.label)).join(' · ') || validation}
        >
          {validation}
        </span>
      </td>
      <td data-priority="high" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          role="switch"
          aria-checked={posOn}
          aria-label={posOn ? `Désactiver ${label} au POS` : `Activer ${label} au POS`}
          className={`acat-switch${posOn ? ' is-on' : ''}`}
          disabled={!canEdit || !onTogglePos}
          title={posOn ? 'Actif au POS — cliquer pour désactiver' : 'Inactif au POS — cliquer pour activer'}
          onClick={() => onTogglePos?.(row, !posOn)}
        >
          <span className="acat-switch__thumb" aria-hidden />
        </button>
      </td>
      <td data-priority="high" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="acat-open-btn"
          onClick={() => onSelect(row.articleId)}
        >
          Ouvrir →
        </button>
      </td>
    </tr>
  );
}

export const ArticleDenseList = memo(function ArticleDenseList({
  rows,
  selectedId,
  onSelect,
  focusedIndex,
  onFocusIndexChange,
  canEdit,
  indexOffset = 0,
  checkedIds,
  onToggleChecked,
  onToggleCheckAll,
  onTogglePos,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { windowRows, startIndex, topSpacerPx, bottomSpacerPx, virtualized } = useWindowedRows(
    rows,
    scrollRef,
  );

  const allChecked = rows.length > 0 && rows.every((r) => checkedIds?.has(r.articleId));
  const someChecked = !allChecked && rows.some((r) => checkedIds?.has(r.articleId));

  return (
    <div className="acat-dense-scroll" ref={scrollRef} aria-label="Articles & tarifs">
      <table className="acat-dense-table">
        <thead>
          <tr>
            <th className="acat-check-cell" data-priority="high">
              <input
                type="checkbox"
                className="acat-check"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked;
                }}
                aria-label="Tout sélectionner"
                onChange={(e) =>
                  onToggleCheckAll?.(rows.map((r) => r.articleId), e.target.checked)
                }
              />
            </th>
            <th data-priority="high">Article</th>
            <th data-priority="medium">Catégorie</th>
            <th data-priority="medium">Type tarif</th>
            <th className="acat-num" data-priority="high">Prix base</th>
            <th data-priority="medium">Formule</th>
            <th className="acat-num" data-priority="low">Matières</th>
            <th className="acat-num" data-priority="low">Options</th>
            <th data-priority="high">Validation</th>
            <th data-priority="high">POS</th>
            <th data-priority="high">Action</th>
          </tr>
        </thead>
        <tbody>
          {virtualized && topSpacerPx > 0 && (
            <tr aria-hidden className="acat-virtual-spacer">
              <td colSpan={11} style={{ height: topSpacerPx, padding: 0, border: 'none' }} />
            </tr>
          )}
          {windowRows.map((row, i) => {
            const index = indexOffset + startIndex + i;
            return (
              <DenseRow
                key={row.articleId}
                row={row}
                index={index}
                selected={selectedId === row.articleId}
                focused={focusedIndex === index}
                checked={Boolean(checkedIds?.has(row.articleId))}
                canEdit={canEdit}
                onSelect={onSelect}
                onFocusIndexChange={onFocusIndexChange}
                onToggleChecked={onToggleChecked}
                onTogglePos={onTogglePos}
              />
            );
          })}
          {virtualized && bottomSpacerPx > 0 && (
            <tr aria-hidden className="acat-virtual-spacer">
              <td colSpan={11} style={{ height: bottomSpacerPx, padding: 0, border: 'none' }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});
