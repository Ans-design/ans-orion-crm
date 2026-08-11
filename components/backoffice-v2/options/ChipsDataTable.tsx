import type { ChipTableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';
import { cn } from '@/lib/utils';
import { BackofficeBadge } from '../ui/BackofficeBadge';
import { ChipsTableColgroup } from './ChipsTableColgroup';
import { OptionsSourceBadge } from './OptionsSourceBadge';
import { OptionsToggleCell } from './OptionsToggleCell';
import { AdminRowActions, AdminActionsColumnHeader } from '@/components/admin/AdminRowActions';

export type ChipsTableViewMode = 'essential' | 'advanced';

type Props = {
  rows: ChipTableRow[];
  canEdit: boolean;
  showArticleColumn?: boolean;
  viewMode?: ChipsTableViewMode;
  togglingKey?: string | null;
  onToggle?: (row: ChipTableRow, field: keyof ChipTableRow, value: boolean) => void;
  onEdit?: (row: ChipTableRow) => void;
  onDuplicate?: (row: ChipTableRow) => void;
  onArchive?: (row: ChipTableRow) => void;
};

function toggleKey(row: ChipTableRow, field: string) {
  return `${row.id}:${field}`;
}

/** Colonne Utilisation métier — remplace les toggles POS / Indicatif isolés. */
export function optionUsageLabel(row: ChipTableRow): string {
  const price = row.impactsPrice;
  const stock = row.impactsStock;
  const prod = row.impactsProduction;
  if (price && stock && prod) return 'Prix + Stock + Production';
  if (price && stock) return 'Prix + Stock';
  if (price && prod) return 'Prix + Production';
  if (stock && prod) return 'Stock + Production';
  if (price) return 'Calcul du prix';
  if (stock) return 'Consommation de stock';
  if (prod) return 'Instruction de production';
  return '—';
}

export function ChipsDataTable({
  rows,
  canEdit,
  showArticleColumn = true,
  viewMode = 'essential',
  togglingKey,
  onToggle,
  onEdit,
  onDuplicate,
  onArchive,
}: Props) {
  if (rows.length === 0) {
    return <div className="ab2-empty">Aucune option / finition pour ces filtres.</div>;
  }

  const tableClass = cn(
    'ab2-chips-table',
    'orion-admin-table',
    'ab2-chips-table--no-pos',
    showArticleColumn ? 'ab2-chips-table--with-article' : 'ab2-chips-table--article-view',
    viewMode === 'essential' && 'ab2-chips-table--essential',
  );

  const disabled = !canEdit;

  return (
    <div className="orion-admin-table-card">
      <div className="orion-admin-table-scroll">
        <table className={tableClass}>
          <ChipsTableColgroup showArticleColumn={showArticleColumn} viewMode={viewMode} />
          <thead>
            <tr>
              {showArticleColumn && <th className="col-article" data-col="article">Article</th>}
              <th className="col-bloc" data-col="bloc">Type</th>
              <th className="col-champ" data-col="champ">Référence</th>
              <th className="col-label" data-col="label">Libellé</th>
              <th className="col-usage" data-col="usage">Utilisation</th>
              <th className="col-toggle" data-col="active" title="Actif / Archivé">
                <span className="ab2-th-toggle-label">État</span>
              </th>
              {viewMode === 'advanced' ? (
                <>
                  <th className="col-toggle" data-col="price" title="Impact prix">Prix</th>
                  <th className="col-toggle" data-col="stock" title="Impact stock">Stock</th>
                  <th className="col-toggle" data-col="prod" title="Impact production">Prod</th>
                </>
              ) : null}
              <th className="col-source" data-col="source">Source</th>
              <AdminActionsColumnHeader />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.archived ? 'is-archived' : ''}>
                {showArticleColumn && (
                  <td className="col-article" data-col="article">
                    <div className="ab2-cell-label" title={row.articleLabel}>{row.articleLabel}</div>
                    <div className="ab2-cell-meta">{row.articleId}</div>
                  </td>
                )}
                <td className="col-bloc" data-col="bloc">
                  <BackofficeBadge label={row.blockKey} blockKey={row.blockKey} tone="block" />
                </td>
                <td className="col-champ" data-col="champ">
                  <code className="ab2-cell-field-key" title={row.fieldKey}>{row.fieldKey}</code>
                </td>
                <td className="col-label" data-col="label">
                  <div className="ab2-cell-label" title={row.label}>{row.label}</div>
                </td>
                <td className="col-usage" data-col="usage">
                  <span className="ab2-usage-pill" title={optionUsageLabel(row)}>
                    {optionUsageLabel(row)}
                  </span>
                </td>
                <td className="col-toggle" data-col="active">
                  <OptionsToggleCell
                    label={`Actif — ${row.label}`}
                    checked={row.active && !row.archived}
                    disabled={disabled}
                    loading={togglingKey === toggleKey(row, 'active')}
                    tone="active"
                    onChange={(v) => onToggle?.(row, 'active', v)}
                  />
                </td>
                {viewMode === 'advanced' ? (
                  <>
                    <td className="col-toggle" data-col="price">
                      <OptionsToggleCell
                        label={`Impact prix — ${row.label}`}
                        checked={row.impactsPrice}
                        disabled={disabled}
                        loading={togglingKey === toggleKey(row, 'impactsPrice')}
                        tone="price"
                        onChange={(v) => onToggle?.(row, 'impactsPrice', v)}
                      />
                    </td>
                    <td className="col-toggle" data-col="stock">
                      <OptionsToggleCell
                        label={`Impact stock — ${row.label}`}
                        checked={row.impactsStock}
                        disabled={disabled}
                        loading={togglingKey === toggleKey(row, 'impactsStock')}
                        tone="stock"
                        onChange={(v) => onToggle?.(row, 'impactsStock', v)}
                      />
                    </td>
                    <td className="col-toggle" data-col="prod">
                      <OptionsToggleCell
                        label={`Impact production — ${row.label}`}
                        checked={row.impactsProduction}
                        disabled={disabled}
                        loading={togglingKey === toggleKey(row, 'impactsProduction')}
                        tone="prod"
                        onChange={(v) => onToggle?.(row, 'impactsProduction', v)}
                      />
                    </td>
                  </>
                ) : null}
                <td className="col-source" data-col="source">
                  <OptionsSourceBadge source={row.source} />
                </td>
                <td className="col-actions">
                  <AdminRowActions
                    itemLabel={row.label}
                    canEdit={canEdit}
                    onEdit={onEdit ? () => onEdit(row) : undefined}
                    onDuplicate={onDuplicate ? () => onDuplicate(row) : undefined}
                    onDelete={onArchive ? () => onArchive(row) : undefined}
                    deleteTitle="Mettre à la corbeille"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
