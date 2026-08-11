'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import type { MasterDataFlatItem } from '@/lib/backoffice/master-data-grouping';
import './master-data.css';

export type MasterDataColumn = {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  stickyRight?: boolean;
  stickyLeft?: boolean;
  /** Offset multi-colonnes fixes à gauche (1 = première, 2 = deuxième…). */
  stickyLeftIndex?: number;
  /** Offset multi-colonnes fixes à droite (1 = dernière, 2 = avant-dernière…). */
  stickyRightIndex?: number;
  priority?: 'high' | 'medium' | 'low';
  sortable?: boolean;
};

export type MasterDataColumnGroup = {
  id: string;
  label: string;
  columnIds: string[];
};

/** Colonnes grille matières unifiée (Ultra-Prompt). */
export const MASTER_DATA_MATERIAL_COLUMNS: MasterDataColumn[] = [
  { id: 'material', label: 'Matière', priority: 'high', stickyLeft: true },
  { id: 'charType', label: 'Type', priority: 'high' },
  { id: 'charValue', label: 'Valeur', priority: 'high' },
  { id: 'charType2', label: 'Type secondaire', priority: 'high' },
  { id: 'charValue2', label: 'Valeur secondaire', priority: 'high' },
  { id: 'refPrimary', label: 'Référence', priority: 'high' },
  { id: 'blank', label: 'Prix matière vierge', align: 'right', priority: 'high' },
  { id: 'marginGain', label: 'Marge de gain', align: 'right', priority: 'high' },
  { id: 'price', label: 'Prix imprimé', align: 'right', priority: 'high' },
  { id: 'stock', label: 'Stock', align: 'right', priority: 'high' },
  { id: 'threshold', label: 'Seuil d’alerte', align: 'right', priority: 'high' },
  { id: 'alerts', label: 'Alertes', priority: 'high' },
  { id: 'family', label: 'Famille', priority: 'medium' },
  { id: 'format', label: 'Format', priority: 'low' },
  { id: 'grammage', label: 'Grammage', priority: 'low' },
  { id: 'thickness', label: 'Épaisseur', priority: 'low' },
  { id: 'laize', label: 'Laize', priority: 'low' },
  { id: 'size', label: 'Taille', priority: 'low' },
  { id: 'color', label: 'Couleur', priority: 'low' },
  { id: 'priceUnit', label: 'Unité', priority: 'medium' },
  { id: 'purchase', label: 'Coût d’achat', align: 'right', priority: 'medium' },
  { id: 'contextPrices', label: 'Prix contextuel', priority: 'low' },
  { id: 'stockPhysical', label: 'Stock physique', align: 'right', priority: 'medium' },
  { id: 'stockReserved', label: 'Stock réservé', align: 'right', priority: 'medium' },
  { id: 'supplier', label: 'Fournisseur', priority: 'medium' },
  { id: 'lastPurchasePrice', label: 'Dernier prix d’achat', align: 'right', priority: 'low' },
  { id: 'lastPurchaseDate', label: 'Date du dernier prix', priority: 'low' },
  { id: 'location', label: 'Emplacement', priority: 'low' },
  { id: 'updatedAt', label: 'Dernière modification', priority: 'low' },
  { id: 'author', label: 'Auteur', priority: 'low' },
  { id: 'status', label: 'Statut', priority: 'medium' },
  { id: 'actions', label: 'Actions', align: 'center', stickyRight: true, priority: 'high' },
];

/** @deprecated Utiliser MASTER_DATA_MATERIAL_COLUMNS */
export const MASTER_DATA_ESSENTIAL_COLUMNS = MASTER_DATA_MATERIAL_COLUMNS;

type Props<T extends { id: string }> = {
  items: MasterDataFlatItem<T>[];
  columns: MasterDataColumn[];
  /** En-tête groupé sur deux niveaux (même table unique). */
  columnGroups?: MasterDataColumnGroup[];
  gridClassName?: string;
  gridStyle?: CSSProperties;
  selectedRowId?: string | null;
  onRowSelect?: (row: T) => void;
  /** Double-clic / Entrée : ouvrir la fiche (sans bloquer la sélection simple). */
  onRowOpen?: (row: T) => void;
  activeGroupKey?: string | null;
  getRowGroupKey?: (row: T) => string;
  /** @deprecated Ne plus utiliser — provoque un re-render / clignotement au survol. */
  onRowHover?: (row: T | null, groupKey: string | null) => void;
  footer?: ReactNode;
  getRowClassName?: (row: T) => string | undefined;
  renderGroup?: (item: Extract<MasterDataFlatItem<T>, { kind: 'group' }>) => ReactNode;
  renderRow: (item: Extract<MasterDataFlatItem<T>, { kind: 'row' }>) => ReactNode;
  emptyMessage?: string;
  /** Hauteur ligne (px) — doit matcher le CSS (défaut 60). */
  rowHeight?: number;
};

type VirtualRange = { start: number; end: number };

export function MasterDataVirtualTable<T extends { id: string }>({
  items,
  columns,
  columnGroups,
  gridClassName,
  gridStyle,
  selectedRowId,
  onRowSelect,
  onRowOpen,
  activeGroupKey,
  getRowGroupKey,
  footer,
  getRowClassName,
  renderGroup,
  renderRow,
  emptyMessage = 'Aucune donnée',
  rowHeight = 60,
}: Props<T>) {
  const dataRows = useMemo(() => items.filter((i) => i.kind === 'row'), [items]);
  const canVirtualize = items.length > 60 && items.every((item) => item.kind === 'row');
  const overscan = 12;

  const scrollRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<VirtualRange>({ start: 0, end: Math.min(items.length, 40) });
  const rafRef = useRef<number | null>(null);
  const [range, setRange] = useState<VirtualRange>(rangeRef.current);

  useEffect(() => {
    if (!canVirtualize) {
      const full = { start: 0, end: items.length };
      rangeRef.current = full;
      setRange(full);
      return;
    }

    const el = scrollRef.current;
    if (!el) return;

    const compute = (): VirtualRange => {
      const clientHeight = el.clientHeight || 560;
      const start = Math.max(0, Math.floor(el.scrollTop / rowHeight) - overscan);
      const visibleCount = Math.ceil(clientHeight / rowHeight) + overscan * 2;
      return { start, end: Math.min(items.length, start + visibleCount) };
    };

    const applyIfChanged = () => {
      const next = compute();
      const prev = rangeRef.current;
      if (next.start === prev.start && next.end === prev.end) return;
      rangeRef.current = next;
      setRange(next);
    };

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        applyIfChanged();
      });
    };

    applyIfChanged();
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => applyIfChanged())
      : null;
    ro?.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [canVirtualize, items.length, rowHeight, overscan]);

  const visibleItems = canVirtualize ? items.slice(range.start, range.end) : items;
  const totalHeight = canVirtualize ? items.length * rowHeight : undefined;
  const offsetY = canVirtualize ? range.start * rowHeight : 0;

  const headerCellClass = (col: MasterDataColumn) =>
    cn(
      'orion-master-data-header-cell',
      col.align === 'right' && 'is-numeric',
      col.align === 'center' && 'is-center',
      col.stickyRight && 'is-sticky-right',
      col.stickyLeft && 'is-sticky-left',
      col.stickyLeftIndex === 2 && 'is-sticky-left-2',
      col.stickyRightIndex === 2 && 'is-sticky-right-2',
    );

  return (
    <div
      className={cn(
        'orion-master-data-root orion-materials-unified-grid',
        canVirtualize && 'is-virtualized',
        columnGroups?.length && 'has-grouped-header',
      )}
      data-rendered-rows={visibleItems.length}
      data-total-rows={dataRows.length}
      style={canVirtualize ? ({ ['--master-row-h' as string]: `${rowHeight}px` } as CSSProperties) : undefined}
    >
      <div className="orion-master-data-card">
        <div ref={scrollRef} className="orion-master-data-scroll">
          {columnGroups && columnGroups.length > 0 ? (
            <div
              className={cn('orion-master-data-header-group-row', gridClassName)}
              style={gridStyle}
              role="row"
            >
              {columnGroups.map((group) => (
                <div
                  key={group.id}
                  className={cn('orion-master-data-header-group-cell', `is-group-${group.id}`)}
                  style={{ gridColumn: `span ${group.columnIds.length}` }}
                  role="columnheader"
                  title={group.label}
                >
                  <span>{group.label}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div
            className={cn('orion-master-data-header', gridClassName)}
            style={gridStyle}
            role="row"
          >
            {columns.map((col) => (
              <div
                key={col.id}
                className={headerCellClass(col)}
                role="columnheader"
                title={col.label}
                tabIndex={0}
              >
                <span className="orion-master-data-header-label">{col.label}</span>
              </div>
            ))}
          </div>

          <div className="orion-master-data-body" role="rowgroup">
            {items.length === 0 ? (
              <div className="orion-master-data-empty">{emptyMessage}</div>
            ) : (
              <>
                {canVirtualize && offsetY > 0 ? (
                  <div
                    className="orion-master-data-spacer"
                    aria-hidden
                    style={{ height: offsetY }}
                  />
                ) : null}
                {visibleItems.map((item) => {
                  if (item.kind === 'group') {
                    return (
                      <div
                        key={item.key}
                        className={cn('orion-master-data-row is-group', gridClassName)}
                        style={gridStyle}
                        role="row"
                      >
                        <div
                          className="orion-master-data-cell orion-master-data-group-label"
                          style={{ gridColumn: `1 / -1` }}
                        >
                          {renderGroup ? renderGroup(item) : (
                            <span className="orion-master-data-group-compact">
                              <strong>{item.label}</strong>
                              <span className="orion-master-data-group-count">{item.count}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const row = item.row;
                  const groupKey = getRowGroupKey?.(row) ?? item.groupKey;
                  const selected = selectedRowId === row.id;
                  const groupActive = activeGroupKey != null && activeGroupKey === groupKey;
                  const zebra = item.indexInGroup % 2 === 1;
                  const rowStyle = canVirtualize
                    ? { ...gridStyle, height: rowHeight, minHeight: rowHeight, maxHeight: rowHeight }
                    : gridStyle;

                  return (
                    <div
                      key={item.key}
                      className={cn(
                        'orion-master-data-row is-data',
                        gridClassName,
                        zebra && 'is-zebra',
                        selected && 'is-selected',
                        groupActive && 'is-group-active',
                        getRowClassName?.(row),
                      )}
                      style={rowStyle}
                      role="row"
                      tabIndex={0}
                      onClick={() => onRowSelect?.(row)}
                      onDoubleClick={() => onRowOpen?.(row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          (onRowOpen ?? onRowSelect)?.(row);
                        } else if (e.key === ' ') {
                          e.preventDefault();
                          onRowSelect?.(row);
                        }
                      }}
                    >
                      {renderRow(item)}
                    </div>
                  );
                })}
                {canVirtualize && totalHeight != null && totalHeight - offsetY - visibleItems.length * rowHeight > 0 ? (
                  <div
                    className="orion-master-data-spacer"
                    aria-hidden
                    style={{
                      height: Math.max(0, totalHeight - offsetY - visibleItems.length * rowHeight),
                    }}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>

        {footer ? (
          <div className="orion-master-data-footer">
            {footer}
            {dataRows.length > 0 ? (
              <span className="sr-only">{dataRows.length} lignes</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
