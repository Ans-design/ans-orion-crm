'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  aggregateMaterialGroups,
  formatPriceSummary,
  formatVariantSummary,
  type MaterialGroupSummary,
} from '@/lib/backoffice/material-group-aggregate';
import type { CharacteristicType } from '@/lib/backoffice/material-table-fields';
import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';
import { MaterialMasterDataTable } from '@/components/backoffice-v2/pricing-custom/MaterialMasterDataTable';
import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';
import { materialColumnsWithHidden } from '@/lib/backoffice/material-table-columns';
import { AdminTableBadge } from '@/components/backoffice-v2/ui/AdminTablePrimitives';

type Props = {
  rows: MaterialPriceUnifiedRow[];
  canEdit: boolean;
  pendingIds: Set<string>;
  onPatchRow: (row: MaterialPriceUnifiedRow, patch: Record<string, unknown>) => Promise<void>;
  onPatchPrice: (row: MaterialPriceUnifiedRow, field: 'basePrintPrice' | 'purchasePrice' | 'blankSellPrice' | 'maxPrice', value: number | null) => Promise<void>;
  onPatchCharacteristic: (row: MaterialPriceUnifiedRow, value: string, charType?: CharacteristicType) => Promise<void>;
  onViewUsage: (row: MaterialPriceUnifiedRow) => void;
  onLinkStock: (row: MaterialPriceUnifiedRow) => void;
  onChanged: () => void;
  onQuickEdit: (row: MaterialPriceUnifiedRow) => void;
  onViewDetails: (row: MaterialPriceUnifiedRow) => void;
};

export function MaterialsBaseOverviewTable({
  rows,
  canEdit,
  pendingIds,
  onPatchRow,
  onPatchPrice,
  onPatchCharacteristic,
  onViewUsage,
  onLinkStock,
  onChanged,
  onQuickEdit,
  onViewDetails,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const groups = useMemo(() => aggregateMaterialGroups(rows), [rows]);
  const tableColumns = useMemo(() => materialColumnsWithHidden([]), []);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="orion-materials-overview rounded-lg border border-white/10 bg-[#0c1018]/80 overflow-hidden">
      <div className="grid grid-cols-[32px_minmax(140px,1.2fr)_minmax(100px,0.8fr)_minmax(160px,1.4fr)_minmax(100px,0.7fr)_minmax(80px,0.6fr)_minmax(72px,0.5fr)_minmax(72px,0.5fr)_minmax(72px,0.5fr)_minmax(56px,0.4fr)_40px] gap-2 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground border-b border-white/10">
        <span />
        <span>Matière</span>
        <span>Famille</span>
        <span>Déclinaisons</span>
        <span>Prix</span>
        <span>Stock</span>
        <span>POS</span>
        <span>Statut</span>
        <span>Alertes</span>
        <span>Anom.</span>
        <span />
      </div>

      {groups.map((group) => (
        <GroupBlock
          key={group.groupKey}
          group={group}
          isOpen={expanded.has(group.groupKey)}
          onToggle={() => toggleExpand(group.groupKey)}
          canEdit={canEdit}
          pendingIds={pendingIds}
          tableColumns={tableColumns}
          onPatchRow={onPatchRow}
          onPatchPrice={onPatchPrice}
          onPatchCharacteristic={onPatchCharacteristic}
          onViewUsage={onViewUsage}
          onLinkStock={onLinkStock}
          onChanged={onChanged}
          onQuickEdit={onQuickEdit}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}

function GroupBlock({
  group,
  isOpen,
  onToggle,
  canEdit,
  pendingIds,
  tableColumns,
  onPatchRow,
  onPatchPrice,
  onPatchCharacteristic,
  onViewUsage,
  onLinkStock,
  onChanged,
  onQuickEdit,
  onViewDetails,
}: {
  group: MaterialGroupSummary;
  isOpen: boolean;
  onToggle: () => void;
  canEdit: boolean;
  pendingIds: Set<string>;
  tableColumns: ReturnType<typeof materialColumnsWithHidden>;
  onPatchRow: Props['onPatchRow'];
  onPatchPrice: Props['onPatchPrice'];
  onPatchCharacteristic: Props['onPatchCharacteristic'];
  onViewUsage: Props['onViewUsage'];
  onLinkStock: Props['onLinkStock'];
  onChanged: Props['onChanged'];
  onQuickEdit: Props['onQuickEdit'];
  onViewDetails: Props['onViewDetails'];
}) {
  const stockLabel =
    group.stockLinkedCount === 0
      ? 'Non lié'
      : group.stockLinkedCount === group.variantCount
        ? 'Lié'
        : `${group.stockLinkedCount}/${group.variantCount}`;

  return (
    <Fragment>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full grid grid-cols-[32px_minmax(140px,1.2fr)_minmax(100px,0.8fr)_minmax(160px,1.4fr)_minmax(100px,0.7fr)_minmax(80px,0.6fr)_minmax(72px,0.5fr)_minmax(72px,0.5fr)_minmax(72px,0.5fr)_minmax(56px,0.4fr)_40px] gap-2 px-3 py-2.5 text-sm text-left hover:bg-white/[0.04] transition-colors items-center',
          isOpen && 'bg-white/[0.03]',
        )}
      >
        <span className="flex justify-center text-muted-foreground">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <span className="font-medium truncate">{group.label}</span>
        <span className="text-muted-foreground truncate text-xs">{group.family}</span>
        <span className="text-xs text-muted-foreground truncate" title={group.variantLabels.join(', ')}>
          {formatVariantSummary(group.variantLabels)}
        </span>
        <span className="text-xs">{formatPriceSummary(group.priceCount, group.missingPriceCount)}</span>
        <span className="text-xs">{stockLabel}</span>
        <span className="text-xs">{group.posVisibleCount > 0 ? 'ON' : 'OFF'}</span>
        <GroupStatusBadge status={group.status} />
        <span className="text-xs">{group.alertCount > 0 ? `⚠ ${group.alertCount}` : '—'}</span>
        <span className="text-xs">{group.anomalyCount > 0 ? `⚠ ${group.anomalyCount}` : '—'}</span>
        <span className="flex justify-center text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-white/5 bg-black/20 px-2 pb-2">
          <MaterialMasterDataTable
            rows={group.rows}
            columns={tableColumns}
            canEdit={canEdit}
            pendingIds={pendingIds}
            onPatchRow={onPatchRow}
            onPatchPrice={onPatchPrice}
            onPatchCharacteristic={onPatchCharacteristic}
            onViewUsage={onViewUsage}
            onLinkStock={onLinkStock}
            onChanged={onChanged}
            onQuickEdit={onQuickEdit}
            onViewDetails={onViewDetails}
          />
        </div>
      )}
    </Fragment>
  );
}

function GroupStatusBadge({ status }: { status: MaterialGroupSummary['status'] }) {
  if (status === 'published') return <AdminTableBadge kind="published" label={adminStatusLabel('published')} />;
  if (status === 'mixed') return <AdminTableBadge kind="draft" label="Mixte" />;
  if (status === 'review') return <AdminTableBadge kind="draft" label="À vérifier" />;
  return <AdminTableBadge kind="draft" label={adminStatusLabel('draft')} />;
}
