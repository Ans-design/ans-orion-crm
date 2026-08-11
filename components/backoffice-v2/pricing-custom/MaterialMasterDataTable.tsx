'use client';



import { useEffect, useMemo, useState, Fragment } from 'react';

import {

  deriveMaterialGroupKey,

  flattenMasterDataGroups,

  groupMasterDataRows,

} from '@/lib/backoffice/master-data-grouping';

import {

  deriveMaterialTableFields,

  formatGroupSubtitle,

  decodeSecondaryCharacteristic,

  encodeSecondaryCharacteristic,

  type CharacteristicType,

} from '@/lib/backoffice/material-table-fields';

import { sortMaterialRows } from '@/lib/backoffice/material-row-sort';

import type { MaterialPriceUnifiedRow } from './material-prices/types';

import {

  MasterDataVirtualTable,

  MASTER_DATA_MATERIAL_COLUMNS,

  type MasterDataColumn,

} from '../ui/MasterDataVirtualTable';

import {
  filterColumnsByBreakpoint,
  materialGridStyle,
  MATERIAL_MASTER_COLUMN_GROUPS,
  type MaterialMasterColumnGroup,
} from '@/lib/backoffice/material-table-columns';
import {
  deriveMaterialMasterExtensions,
  resolveStockAlertLevel,
  resolveStockGaugePct,
} from '@/lib/backoffice/material-master-row';
import { cn } from '@/lib/utils';

import { MasterDataPriceCell } from '../ui/MasterDataPriceCell';
import {
  computePrintPriceFromParts,
  resolveBlankSellPrice,
  resolveMarginGainAr,
  resolvePrintConsumablesCost,
  resolvePrintPrice,
} from '@/lib/backoffice/material-price-semantics';

import { MaterialPriceRowActions } from './material-prices/MaterialPriceRowActions';

import { MasterDataCharacteristicCell } from '../ui/MasterDataCharacteristicCell';

import { InlineTextCell } from './material-prices/InlineTextCell';

import { MaterialStatusBadge } from './material-prices/MaterialTableCells';



type UnifiedRow = MaterialPriceUnifiedRow;



const PRICE_UNITS = ['feuille', 'm2', 'cm2', 'pièce', 'pcs', 'plaque', 'rouleau', 'mètre linéaire', 'kg', 'lot'];

const CHAR_TYPE_OPTIONS: { id: CharacteristicType; label: string }[] = [
  { id: 'grammage', label: 'Grammage' },
  { id: 'epaisseur', label: 'Épaisseur' },
  { id: 'laize', label: 'Laize' },
  { id: 'format', label: 'Format' },
  { id: 'taille', label: 'Taille' },
  { id: 'finition', label: 'Finition' },
  { id: 'face', label: 'Face' },
  { id: 'couleur', label: 'Couleur' },
  { id: 'autre', label: 'Autre' },
];



type Props = {

  rows: UnifiedRow[];

  columns?: MasterDataColumn[];

  canEdit: boolean;

  pendingIds: Set<string>;

  grouped?: boolean;

  onPatchRow: (row: UnifiedRow, patch: Record<string, unknown>) => Promise<void>;

  onPatchPrice: (row: UnifiedRow, field: 'basePrintPrice' | 'purchasePrice' | 'blankSellPrice' | 'maxPrice', value: number | null) => Promise<void>;

  onPatchCharacteristic: (row: UnifiedRow, value: string, charType?: CharacteristicType) => Promise<void>;

  onPatchSecondaryCharacteristic?: (
    row: UnifiedRow,
    value: string,
    charType: CharacteristicType,
  ) => Promise<void>;

  onViewUsage: (row: UnifiedRow) => void;

  onLinkStock: (row: UnifiedRow) => void;

  onChanged: () => void;

  onQuickEdit: (row: UnifiedRow) => void;

  onViewDetails: (row: UnifiedRow) => void;

  footer?: React.ReactNode;

  /** Table maîtresse : toutes les colonnes visibles (pas de masquage responsive). */
  disableResponsiveColumns?: boolean;

  /** En-tête groupé (Identification · Spécifications · Prix · Stock · Gestion). */
  columnGroups?: MaterialMasterColumnGroup[];

};



export function MaterialMasterDataTable({

  rows,

  columns = MASTER_DATA_MATERIAL_COLUMNS,

  canEdit,

  pendingIds,

  grouped = false,

  onPatchRow,

  onPatchPrice,

  onPatchCharacteristic,

  onPatchSecondaryCharacteristic,

  onViewUsage,

  onLinkStock,

  onChanged,

  onQuickEdit,

  onViewDetails,

  footer,

  disableResponsiveColumns = false,

  columnGroups = MATERIAL_MASTER_COLUMN_GROUPS,

}: Props) {

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const [breakpoint, setBreakpoint] = useState<'lg' | 'md' | 'sm'>('lg');

  useEffect(() => {
    const mqMd = window.matchMedia('(max-width: 1023px)');
    const mqSm = window.matchMedia('(max-width: 767px)');
    const update = () => {
      setBreakpoint(mqSm.matches ? 'sm' : mqMd.matches ? 'md' : 'lg');
    };
    update();
    mqMd.addEventListener('change', update);
    mqSm.addEventListener('change', update);
    return () => {
      mqMd.removeEventListener('change', update);
      mqSm.removeEventListener('change', update);
    };
  }, []);

  const visibleColumns = useMemo(
    () => (disableResponsiveColumns ? columns : filterColumnsByBreakpoint(columns, breakpoint)),
    [columns, breakpoint, disableResponsiveColumns],
  );

  const visibleGroups = useMemo(() => {
    if (!disableResponsiveColumns || !columnGroups?.length) return undefined;
    /** Vue compacte (≤ 10 cols) : en-têtes plats comme la capture, sans groupes. */
    if (visibleColumns.length <= 10) return undefined;
    const visibleIds = new Set(visibleColumns.map((c) => c.id));
    return columnGroups
      .map((g) => ({
        ...g,
        columnIds: g.columnIds.filter((id) => visibleIds.has(id)),
      }))
      .filter((g) => g.columnIds.length > 0);
  }, [columnGroups, visibleColumns, disableResponsiveColumns]);

  const columnById = useMemo(() => new Map(visibleColumns.map((c) => [c.id, c])), [visibleColumns]);

  const cellClass = (colId: string, extra?: string) => {
    const col = columnById.get(colId);
    return cn(
      'orion-master-data-cell',
      extra,
      col?.stickyLeft && 'is-sticky-left',
      col?.stickyLeftIndex === 2 && 'is-sticky-left-2',
      col?.stickyRight && 'is-sticky-right',
      col?.stickyRightIndex === 2 && 'is-sticky-right-2',
      col?.align === 'right' && 'is-numeric',
      col?.align === 'center' && 'is-center',
    );
  };

  const flatItems = useMemo(() => {

    if (!grouped) {

      const sorted = sortMaterialRows(rows, 'logical');

      return sorted.map((row, index) => ({

        kind: 'row' as const,

        key: `row-${row.id}`,

        row,

        groupKey: deriveMaterialGroupKey(row),

        indexInGroup: index,

      }));

    }

    const groups = groupMasterDataRows(rows);

    return flattenMasterDataGroups(groups);

  }, [rows, grouped]);



  useEffect(() => {

    const ids = new Set(rows.map((r) => r.id));

    setSelectedRowId((prev) => (prev && ids.has(prev) ? prev : null));

  }, [rows]);



  const selectedGroupKey = useMemo(() => {

    if (!selectedRowId) return null;

    const row = rows.find((r) => r.id === selectedRowId);

    return row ? deriveMaterialGroupKey(row) : null;

  }, [selectedRowId, rows]);



  const handleRowSelect = (row: UnifiedRow) => {
    setSelectedRowId(row.id);
  };

  const handleRowOpen = (row: UnifiedRow) => {
    setSelectedRowId(row.id);
    onViewDetails(row);
  };



  const renderCell = (colId: string, row: UnifiedRow) => {

    const editable = canEdit;

    const fields = deriveMaterialTableFields(row);

    const priceUnit = (row.unit || row.unitDisplay || '').trim();



    switch (colId) {

      case 'material': {
        const displayName =
          fields.materialName === 'À compléter' ? 'Sans nom' : fields.materialName;
        const ref =
          fields.primaryReference && fields.primaryReference !== '—'
            ? fields.primaryReference
            : (row.materialKey?.trim() || null);
        const familyHint = `${row.family || ''} ${displayName}`.toLowerCase();
        const swatchKind = /encre|ink|toner/.test(familyHint)
          ? 'ink'
          : /plaque|plate/.test(familyHint)
            ? 'plate'
            : /film|pellicul|finition|vernis|reliure|spirale/.test(familyHint)
              ? 'finish'
              : 'paper';
        const swatchSource = ref || displayName;
        const swatchLabel = (String(swatchSource).split(/[-_:/]/)[0] || 'MAT').slice(0, 4).toUpperCase();
        return (
          <div
            className="orion-master-data-cell is-sticky-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="cps-mat-fiche-trigger orion-mat-identity"
              onClick={() => onViewDetails(row)}
              title="Ouvrir la fiche matière"
            >
              <span className={`orion-mat-swatch is-${swatchKind}`} aria-hidden>
                {swatchLabel}
              </span>
              <span className="orion-mat-identity__text">
                <span className="cps-mat-fiche-trigger__name">{displayName}</span>
                {ref ? (
                  <span className="orion-mat-identity__meta">{ref}</span>
                ) : null}
              </span>
            </button>
          </div>
        );
      }

      case 'charType': {
        const charType: CharacteristicType = fields.mainCharacteristic?.type ?? 'grammage';
        return (
          <div className="orion-master-data-cell" onClick={(e) => e.stopPropagation()}>
            {editable ? (
              <select
                className="orion-master-unit-select"
                value={charType}
                aria-label="Type caractéristique"
                onChange={(e) => {
                  const nextType = e.target.value as CharacteristicType;
                  const val = fields.mainCharacteristic?.displayValue ?? '';
                  void onPatchCharacteristic(row, val, nextType);
                }}
              >
                {CHAR_TYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            ) : (
              <span className="orion-admin-table-ellipsis">{fields.mainCharacteristic?.typeLabel ?? '—'}</span>
            )}
          </div>
        );
      }

      case 'charValue':
        return (
          <div className="orion-master-data-cell" onClick={(e) => e.stopPropagation()}>
            <InlineTextCell
              value={fields.mainCharacteristic?.displayValue ?? ''}
              canEdit={editable}
              placeholder="Valeur"
              onSave={(v) => onPatchCharacteristic(row, v, fields.mainCharacteristic?.type ?? 'grammage')}
            />
          </div>
        );

      case 'charType2': {
        const secondary = decodeSecondaryCharacteristic(row.anomalyNotes);
        const charType2: CharacteristicType = secondary?.type ?? 'laize';
        return (
          <div className="orion-master-data-cell" onClick={(e) => e.stopPropagation()}>
            {editable ? (
              <select
                className="orion-master-unit-select"
                value={charType2}
                aria-label="2e caractéristique"
                onChange={(e) => {
                  const nextType = e.target.value as CharacteristicType;
                  const val = secondary?.value ?? '';
                  void (onPatchSecondaryCharacteristic ?? ((r, v, t) =>
                    onPatchRow(r, { anomalyNotes: encodeSecondaryCharacteristic(t, v, r.anomalyNotes) })
                  ))(row, val, nextType);
                }}
              >
                {CHAR_TYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            ) : (
              <span className="orion-admin-table-ellipsis">
                {CHAR_TYPE_OPTIONS.find((o) => o.id === charType2)?.label ?? '—'}
              </span>
            )}
          </div>
        );
      }

      case 'charValue2': {
        const secondary = decodeSecondaryCharacteristic(row.anomalyNotes);
        return (
          <div className="orion-master-data-cell" onClick={(e) => e.stopPropagation()}>
            <InlineTextCell
              value={secondary?.value ?? ''}
              canEdit={editable}
              placeholder="ex. 160 cm"
              onSave={async (v) => {
                const patcher =
                  onPatchSecondaryCharacteristic
                  ?? (async (r, val, t) => {
                    await onPatchRow(r, {
                      anomalyNotes: encodeSecondaryCharacteristic(t, val, r.anomalyNotes),
                    });
                  });
                await patcher(row, v, secondary?.type ?? 'laize');
              }}
            />
          </div>
        );
      }

      case 'characteristic':

        return (

          <div className="orion-master-data-cell" onClick={(e) => e.stopPropagation()}>

            <MasterDataCharacteristicCell

              row={row}

              canEdit={editable}

              onSave={(value, charType) => onPatchCharacteristic(row, value, charType)}

            />

          </div>

        );

      case 'refPrimary': {
        const refDisplay =
          fields.primaryReference && fields.primaryReference !== '—'
            ? fields.primaryReference
            : row.materialKey;
        return (
          <div className={cellClass('refPrimary')} onClick={(e) => e.stopPropagation()}>
            <InlineTextCell
              value={refDisplay}
              canEdit={editable}
              placeholder="Réf. principale"
              onSave={(v) => onPatchRow(row, { materialKey: v.trim().toLowerCase() })}
            />
          </div>
        );
      }

      case 'family':

        return (

          <div className="orion-master-data-cell" onClick={(e) => e.stopPropagation()}>

            <InlineTextCell

              value={fields.family === '—' ? '' : fields.family}

              canEdit={editable}

              placeholder="Famille"

              onSave={(v) => onPatchRow(row, { family: v || 'Autre' })}

            />

          </div>

        );

      case 'purchase':
        return (
          <div className="orion-master-data-cell is-numeric" onClick={(e) => e.stopPropagation()}>
            <MasterDataPriceCell
              value={row.purchasePrice}
              canEdit={editable}
              onSave={async (v) => {
                if (v != null && v < 0) throw new Error('Coût achat doit être ≥ 0');
                await onPatchPrice(row, 'purchasePrice', v);
              }}
            />
          </div>
        );

      case 'blank':
        return (
          <div
            className="orion-master-data-cell is-numeric"
            onClick={(e) => e.stopPropagation()}
            title="Prix matière (support vierge)"
          >
            <MasterDataPriceCell
              value={resolveBlankSellPrice(row)}
              canEdit={editable}
              onSave={async (v) => {
                if (v != null && v < 0) throw new Error('Prix matière doit être ≥ 0');
                const marginGain = resolveMarginGainAr(row) ?? 0;
                const consumables = resolvePrintConsumablesCost(row);
                const nextPrint =
                  v != null
                    ? computePrintPriceFromParts(v, marginGain, consumables)
                    : resolvePrintPrice(row);
                await onPatchRow(row, {
                  blankSellPrice: v,
                  maxPrice: v,
                  ...(nextPrint != null ? { basePrintPrice: nextPrint } : {}),
                });
              }}
            />
          </div>
        );

      case 'marginGain': {
        const marginGain = resolveMarginGainAr(row);
        const consumables = resolvePrintConsumablesCost(row);
        return (
          <div
            className="orion-master-data-cell is-numeric"
            onClick={(e) => e.stopPropagation()}
            title={`Marge de gain (Ar). Prix imprimé = matière + marge + consommables (${consumables.toLocaleString('fr-FR')} Ar auto)`}
          >
            <MasterDataPriceCell
              value={marginGain}
              canEdit={editable}
              onSave={async (v) => {
                if (v != null && v < 0) throw new Error('Marge de gain doit être ≥ 0');
                const blank = resolveBlankSellPrice(row) ?? 0;
                const lockedConsumables = resolvePrintConsumablesCost(row);
                await onPatchRow(row, {
                  basePrintPrice: computePrintPriceFromParts(blank, v ?? 0, lockedConsumables),
                });
              }}
            />
            {consumables > 0 ? (
              <span
                className="mt-0.5 block text-[10px] font-medium tabular-nums text-[var(--text-muted)]"
                title="Consommables calculés automatiquement"
              >
                + consommables {consumables.toLocaleString('fr-FR')} Ar
              </span>
            ) : null}
          </div>
        );
      }

      case 'price': {
        const cost = row.purchasePrice;
        const sell = resolvePrintPrice(row);
        const partsBlank = resolveBlankSellPrice(row);
        const partsMargin = resolveMarginGainAr(row);
        const partsConsumables = resolvePrintConsumablesCost(row);
        const marginPct =
          cost != null && sell != null && sell > 0
            ? Math.round(((sell - cost) / sell) * 1000) / 10
            : null;
        const suggested =
          cost != null && cost > 0 && row.marginTarget != null && row.marginTarget > 0 && row.marginTarget < 100
            ? Math.round(cost / (1 - row.marginTarget / 100))
            : null;
        return (
          <div
            className="orion-master-data-cell is-numeric"
            onClick={(e) => e.stopPropagation()}
            title={
              partsBlank != null || partsMargin != null
                ? `Base catalogue commercial = matière (${(partsBlank ?? 0).toLocaleString('fr-FR')}) + marge (${(partsMargin ?? 0).toLocaleString('fr-FR')}) + consommables (${partsConsumables.toLocaleString('fr-FR')})`
                : 'Prix de base catalogue articles (commercial)'
            }
          >
            <MasterDataPriceCell
              value={sell}
              canEdit={editable}
              onSave={async (v) => {
                if (v != null && v < 0) throw new Error('Prix imprimé doit être ≥ 0');
                await onPatchPrice(row, 'basePrintPrice', v);
              }}
            />
            {marginPct != null ? (
              <span
                className={`mt-0.5 block text-[10px] font-semibold tabular-nums ${
                  row.marginMin != null && marginPct < row.marginMin
                    ? 'text-red-600'
                    : 'text-emerald-700'
                }`}
                title={
                  suggested != null
                    ? `Prix conseillé (marge cible) : ${suggested.toLocaleString('fr-FR')} Ar`
                    : 'Marge réelle = (vente − coût) / vente'
                }
              >
                Marge {marginPct} %
                {suggested != null ? ` · conseillé ${suggested.toLocaleString('fr-FR')}` : ''}
              </span>
            ) : null}
          </div>
        );
      }

      case 'stock': {
        const ext = deriveMaterialMasterExtensions(row);
        const qty =
          ext.stockDisponible
          ?? row.stockDisponible
          ?? row.stockAvailable
          ?? (row.stockPhysical != null
            ? Math.max(0, Number(row.stockPhysical) - Number(row.stockReserved ?? 0))
            : null);
        const threshold =
          row.stockThreshold != null && Number(row.stockThreshold) > 0
            ? Number(row.stockThreshold)
            : null;
        const level = resolveStockAlertLevel(qty, threshold);
        const pct = resolveStockGaugePct(qty, threshold);
        const unit = (row.unitDisplay || row.unit || '').trim();
        const qtyLabel =
          qty != null
            ? qty.toLocaleString('fr-FR')
            : row.stockDisplay?.trim() || '—';
        const barClass =
          level === 'ok'
            ? 'is-ok'
            : level === 'warn'
              ? 'is-low'
              : level === 'critical' || level === 'negative'
                ? 'is-out'
                : 'is-missing';
        const statusHint =
          level === 'ok'
            ? 'Stock confortable'
            : level === 'warn'
              ? 'Proche du minimum'
              : level === 'critical' || level === 'negative'
                ? qty != null && qty <= 0
                  ? 'Rupture'
                  : 'Sous le stock minimum'
                : row.stockItemId
                  ? 'Stock lié — quantité indisponible'
                  : 'Non lié au stock';
        return (
          <div
            className={cellClass('stock')}
            onClick={(e) => e.stopPropagation()}
            title={
              [
                statusHint,
                qty != null ? `Dispo : ${qtyLabel}${unit ? ` ${unit}` : ''}` : null,
                threshold != null
                  ? `Mini requis : ${threshold.toLocaleString('fr-FR')}${unit ? ` ${unit}` : ''}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')
            }
          >
            <div className={`orion-mat-stock orion-mat-stock--gauge ${barClass}`}>
              <div
                className={`orion-mat-stock-bar ${barClass}`}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={`Niveau de stock ${statusHint}`}
              >
                <i style={{ width: `${pct}%` }} />
              </div>
              <div className="orion-mat-stock-meta">
                <strong className="orion-mat-stock-qty">{qtyLabel}</strong>
                {qty != null && unit ? (
                  <span className="orion-mat-stock-unit">{unit}</span>
                ) : null}
              </div>
            </div>
          </div>
        );
      }

      case 'status':
        return (
          <div className={cellClass('status')} onClick={(e) => e.stopPropagation()}>
            <MaterialStatusBadge row={row} />
          </div>
        );

      case 'priceUnit':

        return (

          <div className="orion-master-data-cell" onClick={(e) => e.stopPropagation()}>

            {editable ? (

              <select

                className="orion-master-unit-select"

                value={priceUnit}

                aria-label="Unité de prix"

                onChange={(e) => {

                  const v = e.target.value;

                  void onPatchRow(row, { saleUnit: v, unitDisplay: v });

                }}

              >

                <option value="">Unité…</option>

                {PRICE_UNITS.map((u) => (

                  <option key={u} value={u}>{u}</option>

                ))}

                {priceUnit && !PRICE_UNITS.includes(priceUnit) ? (

                  <option value={priceUnit}>{priceUnit}</option>

                ) : null}

              </select>

            ) : (

              <span className="orion-admin-table-ellipsis orion-master-muted">{priceUnit || 'Unité…'}</span>

            )}

          </div>

        );

      case 'otherDetails':

        return (

          <div className="orion-master-data-cell" onClick={(e) => e.stopPropagation()}>

            <InlineTextCell

              value={(row.anomalyNotes ?? '').trim()}

              canEdit={editable}

              placeholder="Détails autres"

              onSave={(v) => onPatchRow(row, { anomalyNotes: v || null })}

            />

          </div>

        );

      case 'actions':

        return (

          <div className={cellClass('actions')} onClick={(e) => e.stopPropagation()}>

            <MaterialPriceRowActions

              row={row}

              canEdit={canEdit}

              onChanged={onChanged}

              onQuickEdit={onQuickEdit}

              onViewDetails={onViewDetails}

              onViewUsage={onViewUsage}

              onLinkStock={onLinkStock}

            />

          </div>

        );

      case 'format':
        return (
          <div className="orion-master-data-cell">
            {row.formatLabel || row.format || '—'}
          </div>
        );
      case 'grammage':
        return <div className="orion-master-data-cell">{row.grammage || '—'}</div>;
      case 'thickness':
        return <div className="orion-master-data-cell">{row.thickness || '—'}</div>;
      case 'laize':
        return (
          <div className={cellClass('laize')}>
            {row.laize ?? deriveMaterialMasterExtensions(row).laize ?? '—'}
          </div>
        );
      case 'size':
        return (
          <div className={cellClass('size')}>
            {row.size ?? deriveMaterialMasterExtensions(row).size ?? '—'}
          </div>
        );
      case 'color':
        return (
          <div className={cellClass('color')}>
            {row.color ?? deriveMaterialMasterExtensions(row).color ?? '—'}
          </div>
        );
      case 'threshold': {
        const t = row.stockThreshold;
        return (
          <div className="orion-master-data-cell is-numeric">
            {t != null ? t.toLocaleString('fr-FR') : '—'}
          </div>
        );
      }
      case 'alerts': {
        const messages: string[] = [];
        if (row.stockStatus === 'rupture' || row.stockStatus === 'critique') {
          messages.push('Alerte stock');
        }
        if (row.basePrintPrice == null && resolveBlankSellPrice(row) == null) {
          messages.push('Prix manquant');
        }
        if ((row.anomaliesCount ?? 0) > 0) {
          messages.push(`${row.anomaliesCount} anomalie${row.anomaliesCount > 1 ? 's' : ''}`);
        }
        const label = messages.length > 0 ? messages.join(' · ') : '—';
        return (
          <div className={cellClass('alerts')} title={row.anomalies?.join(' · ') || undefined}>
            {label}
          </div>
        );
      }
      case 'stockPhysical': {
        const q = row.stockPhysical;
        return (
          <div className="orion-master-data-cell is-numeric">
            {q != null ? q.toLocaleString('fr-FR') : '—'}
          </div>
        );
      }
      case 'stockReserved': {
        const q = row.stockReserved;
        return (
          <div className="orion-master-data-cell is-numeric">
            {q != null ? q.toLocaleString('fr-FR') : '—'}
          </div>
        );
      }
      case 'supplier':
        return (
          <div className="orion-master-data-cell">
            {row.stockSupplier || '—'}
          </div>
        );
      case 'lastPurchasePrice': {
        const p = row.lastPurchasePrice;
        return (
          <div className="orion-master-data-cell is-numeric">
            {p != null ? `${Math.round(p).toLocaleString('fr-FR')} Ar` : '—'}
          </div>
        );
      }
      case 'lastPurchaseDate': {
        const d = row.lastPurchaseDate;
        return <div className="orion-master-data-cell">{d ? new Date(d).toLocaleDateString('fr-FR') : '—'}</div>;
      }
      case 'location': {
        const loc = row.location ?? deriveMaterialMasterExtensions(row).location;
        return (
          <div className={cellClass('location')} title={loc ?? undefined}>
            {loc ?? '—'}
          </div>
        );
      }
      case 'updatedAt': {
        const d = (row as { updatedAt?: string | Date | null }).updatedAt;
        return (
          <div className="orion-master-data-cell">
            {d ? new Date(d).toLocaleDateString('fr-FR') : '—'}
          </div>
        );
      }
      case 'author':
        return (
          <div className="orion-master-data-cell">
            {(row as { updatedBy?: string | null }).updatedBy
              || (row as { author?: string | null }).author
              || '—'}
          </div>
        );
      case 'contextPrices': {
        const summary =
          row.contextPricesSummary ?? deriveMaterialMasterExtensions(row).contextPricesSummary;
        return (
          <div className={cn(cellClass('contextPrices'), 'orion-master-muted')}>
            {summary ? (
              <button
                type="button"
                className="text-left underline-offset-2 hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(row);
                }}
              >
                {summary}
              </button>
            ) : (
              '—'
            )}
          </div>
        );
      }

      default:

        return null;

    }

  };



  const gridStyle = useMemo(() => materialGridStyle(visibleColumns), [visibleColumns]);



  return (

    <MasterDataVirtualTable<UnifiedRow>

      items={flatItems}

      columns={visibleColumns}

      columnGroups={visibleGroups}

      gridClassName="orion-master-data-cols-materials is-master-table"

      gridStyle={gridStyle}

      selectedRowId={selectedRowId}
      onRowSelect={handleRowSelect}
      onRowOpen={handleRowOpen}
      activeGroupKey={selectedGroupKey}

      getRowGroupKey={deriveMaterialGroupKey}

      footer={footer ?? (
        <span>
          {rows.length.toLocaleString('fr-FR')} matière{rows.length > 1 ? 's' : ''} affichée
          {rows.length > 1 ? 's' : ''}
        </span>
      )}

      getRowClassName={(row) => {

        const classes: string[] = [];

        if (pendingIds.has(row.id)) classes.push('is-dirty');

        if (deriveMaterialTableFields(row).isIncompleteName) classes.push('is-incomplete-material');

        return classes.join(' ') || undefined;

      }}

      renderGroup={(item) => (

        <span className="orion-master-data-group-compact">

          <strong>{item.label.toUpperCase()}</strong>

          <span className="orion-master-data-group-sep" aria-hidden>·</span>

          <span className="orion-master-data-group-count">

            {formatGroupSubtitle(item.count)}

          </span>

        </span>

      )}

      renderRow={(item) => {

        const row = item.row;

        return (

          <>

            {visibleColumns.map((col) => (

              <Fragment key={col.id}>{renderCell(col.id, row)}</Fragment>

            ))}

          </>

        );

      }}

      emptyMessage="Aucune matière — ajustez les filtres ou synchronisez le catalogue."

    />

  );

}


