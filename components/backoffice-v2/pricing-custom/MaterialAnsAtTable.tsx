'use client';

/**
 * Tableau Matières — même design carte que Prix articles (ans-at).
 * Conserve les handlers métier (prix, fiche, actions).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ansAtInitials,
  ansAtToneFor,
} from '@/components/admin/catalogue-prix-stock/AnsArticlesChrome';
import {
  deriveMaterialTableFields,
} from '@/lib/backoffice/material-table-fields';
import {
  computePrintPriceFromParts,
  resolveBlankSellPrice,
  resolveMarginGainAr,
  resolvePrintConsumablesCost,
  resolvePrintPrice,
} from '@/lib/backoffice/material-price-semantics';
import {
  deriveMaterialMasterExtensions,
  resolveStockAlertLevel,
} from '@/lib/backoffice/material-master-row';
import { MasterDataPriceCell } from '../ui/MasterDataPriceCell';
import { MaterialPriceRowActions } from './material-prices/MaterialPriceRowActions';
import type { MaterialPriceUnifiedRow } from './material-prices/types';
import '@/components/admin/catalogue-prix-stock/ans-articles-table.css';

type UnifiedRow = MaterialPriceUnifiedRow;

const PAGE_SIZE = 80;

type Props = {
  rows: UnifiedRow[];
  canEdit: boolean;
  pendingIds: Set<string>;
  onPatchRow: (row: UnifiedRow, patch: Record<string, unknown>) => Promise<void>;
  onPatchPrice: (
    row: UnifiedRow,
    field: 'basePrintPrice' | 'purchasePrice' | 'blankSellPrice' | 'maxPrice',
    value: number | null,
  ) => Promise<void>;
  onChanged: () => void;
  onQuickEdit: (row: UnifiedRow) => void;
  onViewDetails: (row: UnifiedRow) => void;
};

function stockStatus(row: UnifiedRow) {
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

  if (qty == null) {
    return {
      cls: '',
      label: row.stockItemId ? 'Stock lié' : 'Sur commande',
      detail: row.stockItemId ? 'Qté indisponible' : 'Non suivi',
      qty: null as number | null,
    };
  }
  if (level === 'critical' || level === 'negative' || qty <= 0) {
    return { cls: 'is-low', label: qty <= 0 ? 'Rupture' : 'Stock critique', detail: `${qty} en stock`, qty };
  }
  if (level === 'warn') {
    return { cls: 'is-low', label: 'Stock faible', detail: `${qty} en stock`, qty };
  }
  return { cls: 'is-available', label: 'Disponible', detail: `${qty} en stock`, qty };
}

export function MaterialAnsAtTable({
  rows,
  canEdit,
  pendingIds,
  onPatchRow,
  onPatchPrice,
  onChanged,
  onQuickEdit,
  onViewDetails,
}: Props) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);

  useEffect(() => {
    setPage(0);
  }, [rows.length]);

  const slice = useMemo(
    () => rows.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE),
    [rows, pageSafe],
  );

  return (
    <div className="ans-at ans-at--embedded">
      <section className="ans-at__catalogue">
        <div className="ans-at__table-wrap">
          <table className="ans-at__table">
            <thead>
              <tr>
                <th>Matière</th>
                <th>Configuration</th>
                <th className="is-price">
                  Tarification
                  <small className="ml-2 font-semibold normal-case tracking-normal text-[#a8b0bf] dark:text-slate-500">
                    · 3 prix
                  </small>
                </th>
                <th>Disponibilité</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pa-empty">
                    Aucune matière trouvée — ajustez les filtres ou importez un Excel.
                  </td>
                </tr>
              ) : (
                slice.map((row) => {
                  const fields = deriveMaterialTableFields(row);
                  const displayName =
                    fields.materialName === 'À compléter' ? 'Sans nom' : fields.materialName;
                  const ref =
                    fields.primaryReference && fields.primaryReference !== '—'
                      ? fields.primaryReference
                      : row.materialKey?.trim() || row.id.slice(0, 12);
                  const tone = ansAtToneFor(String(row.family || displayName));
                  const blank = resolveBlankSellPrice(row);
                  const marginGain = resolveMarginGainAr(row);
                  const printed = resolvePrintPrice(row);
                  const consumables = resolvePrintConsumablesCost(row);
                  const stock = stockStatus(row);
                  const charLabel = fields.mainCharacteristic?.typeLabel;
                  const charValue = fields.mainCharacteristic?.displayValue;
                  const unit = (row.unitDisplay || row.unit || '').trim();
                  const featureTags = [
                    charLabel && charValue ? `${charLabel} ${charValue}` : charValue || charLabel || null,
                    unit || null,
                  ].filter(Boolean) as string[];

                  return (
                    <tr
                      key={row.id}
                      className={`ans-at__row${pendingIds.has(row.id) ? ' is-dirty' : ''}`}
                      onClick={() => onViewDetails(row)}
                    >
                      <td>
                        <div className="ans-at__identity">
                          <span className={`ans-at__mono ${tone}`}>
                            {ansAtInitials(displayName)}
                          </span>
                          <span className="ans-at__identity-copy">
                            <strong title={displayName}>{displayName}</strong>
                            <small>{ref}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="ans-at__config">
                          <div className="ans-at__config-top">
                            <span className={`ans-at__family-pill ${tone}`}>
                              {String(fields.family === '—' ? row.family || 'autre' : fields.family).replace(
                                /_/g,
                                ' ',
                              )}
                            </span>
                            {charLabel ? (
                              <span className="ans-at__type">{charLabel}</span>
                            ) : null}
                          </div>
                          {charValue ? (
                            <p className="m-0 truncate text-[11px] font-semibold text-[var(--ans-at-ink,#354057)]">
                              {charValue}
                              {unit ? ` · ${unit}` : ''}
                            </p>
                          ) : null}
                          {featureTags.length > 0 ? (
                            <div className="ans-at__features">
                              {featureTags.slice(0, 3).map((t) => (
                                <span key={`${row.id}-${t}`}>{t}</span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="ans-at__pricing">
                          <div className={blank == null ? 'is-muted' : undefined}>
                            <span>Prix matière</span>
                            <MasterDataPriceCell
                              value={blank}
                              canEdit={canEdit}
                              className="ans-at-price-cell"
                              onSave={async (v) => {
                                if (v != null && v < 0) throw new Error('Prix matière doit être ≥ 0');
                                const gain = resolveMarginGainAr(row) ?? 0;
                                const cons = resolvePrintConsumablesCost(row);
                                const nextPrint =
                                  v != null
                                    ? computePrintPriceFromParts(v, gain, cons)
                                    : resolvePrintPrice(row);
                                await onPatchRow(row, {
                                  blankSellPrice: v,
                                  maxPrice: v,
                                  ...(nextPrint != null ? { basePrintPrice: nextPrint } : {}),
                                });
                              }}
                            />
                          </div>
                          <div className={marginGain == null ? 'is-muted' : undefined}>
                            <span>Marge</span>
                            <MasterDataPriceCell
                              value={marginGain}
                              canEdit={canEdit}
                              className="ans-at-price-cell"
                              onSave={async (v) => {
                                if (v != null && v < 0) throw new Error('Marge de gain doit être ≥ 0');
                                const b = resolveBlankSellPrice(row) ?? 0;
                                const cons = resolvePrintConsumablesCost(row);
                                await onPatchRow(row, {
                                  basePrintPrice: computePrintPriceFromParts(b, v ?? 0, cons),
                                });
                              }}
                            />
                            {consumables > 0 ? (
                              <em className="ans-at__pricing-hint">
                                +{consumables.toLocaleString('fr-FR')} Ar cons.
                              </em>
                            ) : null}
                          </div>
                          <div className="is-total">
                            <span>Prix imprimé</span>
                            <MasterDataPriceCell
                              value={printed}
                              canEdit={canEdit}
                              className="ans-at-price-cell"
                              onSave={async (v) => {
                                if (v != null && v < 0) throw new Error('Prix imprimé doit être ≥ 0');
                                await onPatchPrice(row, 'basePrintPrice', v);
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="ans-at__stock">
                          <span className={`ans-at__status ${stock.cls}`}>
                            <i aria-hidden />
                            {stock.label}
                          </span>
                          <small>
                            <b>{stock.qty ?? '—'}</b> · {stock.detail}
                          </small>
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <MaterialPriceRowActions
                          row={row}
                          canEdit={canEdit}
                          onChanged={onChanged}
                          onQuickEdit={onQuickEdit}
                          onViewDetails={onViewDetails}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <footer className="ans-at__footer">
          <div>
            <strong>{rows.length.toLocaleString('fr-FR')}</strong> matière
            {rows.length > 1 ? 's' : ''}
            {pageCount > 1 ? (
              <>
                {' · '}
                page {pageSafe + 1}/{pageCount}
              </>
            ) : null}
          </div>
          {pageCount > 1 ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="ans-at__tool"
                disabled={pageSafe <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Précédent
              </button>
              <button
                type="button"
                className="ans-at__tool"
                disabled={pageSafe >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Suivant
              </button>
            </div>
          ) : (
            <div />
          )}
        </footer>
      </section>
    </div>
  );
}
