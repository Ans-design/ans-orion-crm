'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { formatPriceAr } from '@/lib/data/catalogue';
import type { TierMode, TierSimulationLine, TierTableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.types';
import { chainDiscountTierMins } from '@/lib/pricing/validate-discount-tiers';
import { OptionsToggleCell } from '../options/OptionsToggleCell';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export type TierDraftRow = {
  id?: string;
  minQty: number;
  maxQty: number | null;
  unitPrice: number | null;
  discountPercent: number;
  active: boolean;
};

type Props = {
  rows: TierDraftRow[];
  tierMode: TierMode;
  saleUnit: string;
  prixBase?: number | null;
  simulations: TierSimulationLine[];
  canEdit: boolean;
  onRowsChange: (rows: TierDraftRow[]) => void;
};

type FieldDraft = { index: number; text: string };

function rowsSignature(rows: TierDraftRow[]): string {
  return rows
    .map((r) =>
      [r.id ?? '', r.minQty, r.maxQty ?? '', r.unitPrice ?? '', r.discountPercent, r.active ? 1 : 0].join(':'),
    )
    .join('|');
}

function displayUnitPrice(row: TierDraftRow, prixBase: number | null | undefined): number | null {
  if (row.unitPrice != null && Number.isFinite(row.unitPrice)) return row.unitPrice;
  if (prixBase != null && prixBase > 0) {
    const pct = Number(row.discountPercent) || 0;
    return Math.round(prixBase * (1 - pct / 100));
  }
  return null;
}

/**
 * Table paliers — état local pendant l’édition pour éviter le clignotement
 * (pas de remount parent / pas de Number input / clés stables).
 */
export function ArticleTierTable({
  rows,
  tierMode,
  saleUnit,
  prixBase,
  simulations,
  canEdit,
  onRowsChange,
}: Props) {
  const reactId = useId();
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const [localRows, setLocalRows] = useState<TierDraftRow[]>(() => chainDiscountTierMins(rows));
  const [maxDraft, setMaxDraft] = useState<FieldDraft | null>(null);
  const [pctDraft, setPctDraft] = useState<FieldDraft | null>(null);
  const [priceDraft, setPriceDraft] = useState<FieldDraft | null>(null);
  const editingRef = useRef(false);
  const lastSyncedSig = useRef(rowsSignature(rows));
  const stableKeysRef = useRef<string[]>([]);

  const unit = saleUnit || 'pcs';
  const showUnitPriceCol = tierMode !== 'percent';

  // Sync props → local seulement hors édition et si contenu vraiment différent
  useEffect(() => {
    const sig = rowsSignature(rows);
    if (editingRef.current) return;
    if (sig === lastSyncedSig.current) return;
    lastSyncedSig.current = sig;
    setLocalRows(chainDiscountTierMins(rows));
  }, [rows]);

  const rowKeys = useMemo(() => {
    const keys = stableKeysRef.current;
    while (keys.length < localRows.length) {
      keys.push(`${reactId}-r${keys.length}`);
    }
    if (keys.length > localRows.length) keys.length = localRows.length;
    return keys.slice(0, localRows.length);
  }, [localRows.length, reactId]);

  const pushParent = (next: TierDraftRow[], protectMaxIndex?: number) => {
    const chained = chainDiscountTierMins(next, { protectMaxIndex });
    lastSyncedSig.current = rowsSignature(chained);
    setLocalRows(chained);
    onRowsChange(chained);
  };

  const beginEdit = () => {
    editingRef.current = true;
  };

  const endEdit = () => {
    editingRef.current = false;
  };

  const updateRow = (index: number, patch: Partial<TierDraftRow>) => {
    const next = [...localRows];
    next[index] = { ...next[index]!, ...patch };
    pushParent(next, patch.maxQty !== undefined ? index : undefined);
  };

  const applyDiscountPercent = (index: number, pct: number) => {
    const patch: Partial<TierDraftRow> = { discountPercent: pct };
    if (prixBase != null && prixBase > 0) {
      patch.unitPrice = Math.round(prixBase * (1 - pct / 100));
    }
    updateRow(index, patch);
  };

  const removeRow = (index: number) => {
    pushParent(localRows.filter((_, i) => i !== index));
    setPendingDeleteIndex(null);
  };

  const commitMaxDraft = (index: number, text: string) => {
    const raw = text.trim();
    const maxQty = raw === '' ? null : Number(raw);
    updateRow(index, {
      maxQty: maxQty != null && Number.isFinite(maxQty) ? maxQty : null,
    });
  };

  if (!localRows.length) {
    return (
      <div className="ab2-tier-empty">
        Aucun palier — cliquez sur « Ajouter palier » pour commencer.
      </div>
    );
  }

  return (
    <>
    <div className="ab2-chips-table-wrap ab2-tier-table-wrap" data-orion-no-cv>
      <table className="ab2-tier-table">
        <thead>
          <tr>
            <th>Min {unit}</th>
            <th>Max {unit}</th>
            {showUnitPriceCol ? (
              <th className="ab2-tier-col-primary">Prix / {unit}</th>
            ) : null}
            <th className={tierMode === 'percent' ? 'ab2-tier-col-primary' : ''}>Remise %</th>
            <th>Actif</th>
            <th className="ab2-tier-col-primary">Prix unitaire</th>
            {canEdit && (
              <th className="ab2-tier-actions-cell">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {localRows.map((row, i) => {
            const minLocked = i > 0;
            const maxValue =
              maxDraft?.index === i ? maxDraft.text : (row.maxQty ?? '');
            const pctValue =
              pctDraft?.index === i
                ? pctDraft.text
                : row.discountPercent == null || Number.isNaN(Number(row.discountPercent))
                  ? ''
                  : String(row.discountPercent);
            const priceValue =
              priceDraft?.index === i ? priceDraft.text : (row.unitPrice ?? '');
            const unitPrice = displayUnitPrice(row, prixBase);
            const sim = row.id
              ? simulations.find((s) => s.tierId === row.id)
              : simulations[i];
            return (
              <tr key={rowKeys[i]} className={!row.active ? 'is-archived' : ''}>
                <td>
                  {canEdit && !minLocked ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className="ab2-tier-input"
                      value={String(row.minQty)}
                      title="Accepte les décimales (ex. 0,5 m²)"
                      onFocus={beginEdit}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                        const n = Number(raw);
                        if (raw === '' || raw === '.') {
                          updateRow(i, { minQty: 0.01 });
                          return;
                        }
                        if (Number.isFinite(n) && n > 0) {
                          updateRow(i, { minQty: n });
                        }
                      }}
                      onBlur={endEdit}
                    />
                  ) : (
                    <span
                      className="font-mono ab2-tier-min-auto"
                      title={
                        minLocked
                          ? 'Min auto = max ligne précédente + 1 (pièces) ou + 0,01 (m² / fractions)'
                          : undefined
                      }
                    >
                      {row.minQty}
                    </span>
                  )}
                </td>
                <td>
                  {canEdit ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className="ab2-tier-input"
                      value={maxValue === '' || maxValue == null ? '' : String(maxValue)}
                      placeholder="∞"
                      aria-label={`Max ${unit} palier ${i + 1}`}
                      onFocus={() => {
                        beginEdit();
                        setMaxDraft({
                          index: i,
                          text: row.maxQty == null ? '' : String(row.maxQty),
                        });
                      }}
                      onChange={(e) => {
                        const text = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                        setMaxDraft({ index: i, text });
                      }}
                      onBlur={(e) => {
                        commitMaxDraft(i, e.target.value.replace(',', '.'));
                        setMaxDraft(null);
                        endEdit();
                      }}
                    />
                  ) : (
                    <span className="font-mono">{row.maxQty ?? '∞'}</span>
                  )}
                </td>
                {showUnitPriceCol ? (
                <td>
                  {canEdit ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      className="ab2-tier-input ab2-tier-input--wide"
                      value={priceValue === '' || priceValue == null ? '' : String(priceValue)}
                      placeholder="Ar"
                      onFocus={() => {
                        beginEdit();
                        setPriceDraft({
                          index: i,
                          text: row.unitPrice == null ? '' : String(row.unitPrice),
                        });
                      }}
                      onChange={(e) => {
                        setPriceDraft({ index: i, text: e.target.value.replace(/[^\d]/g, '') });
                      }}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const n = raw === '' ? null : Number(raw);
                        updateRow(i, {
                          unitPrice: n != null && Number.isFinite(n) ? n : null,
                        });
                        setPriceDraft(null);
                        endEdit();
                      }}
                    />
                  ) : (
                    <span className="font-mono">
                      {row.unitPrice != null ? formatPriceAr(row.unitPrice) : '—'}
                    </span>
                  )}
                </td>
                ) : null}
                <td>
                  {canEdit ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className="ab2-tier-input"
                      value={pctValue === '' || pctValue == null ? '' : String(pctValue)}
                      placeholder="%"
                      title={prixBase ? `Prix base : ${prixBase} Ar — prix unitaire calculé auto` : 'Prix base non défini'}
                      onFocus={() => {
                        beginEdit();
                        setPctDraft({
                          index: i,
                          text:
                            row.discountPercent == null || Number.isNaN(Number(row.discountPercent))
                              ? ''
                              : String(row.discountPercent),
                        });
                      }}
                      onChange={(e) => {
                        setPctDraft({ index: i, text: e.target.value.replace(/[^\d.]/g, '') });
                      }}
                      onBlur={(e) => {
                        const pct = Number(e.target.value) || 0;
                        applyDiscountPercent(i, pct);
                        setPctDraft(null);
                        endEdit();
                      }}
                    />
                  ) : (
                    <span className="font-mono">
                      {row.discountPercent == null || Number.isNaN(Number(row.discountPercent))
                        ? '—'
                        : `${row.discountPercent}%`}
                    </span>
                  )}
                </td>
                <td className="text-center">
                  <OptionsToggleCell
                    label="Actif"
                    checked={row.active}
                    disabled={!canEdit}
                    tone="active"
                    onChange={(v) => updateRow(i, { active: v })}
                  />
                </td>
                <td className="ab2-tier-sim">
                  {unitPrice == null ? (
                    '—'
                  ) : (
                    <>
                      <span className="ab2-tier-sim-total">{formatPriceAr(unitPrice)}</span>
                      <span className="ab2-tier-sim-meta">
                        / {unit}
                        {sim?.sampleQty != null && !maxDraft && !pctDraft
                          ? ` · ex. ${formatPriceAr(unitPrice * sim.sampleQty)} pour ${sim.sampleQty}`
                          : ''}
                      </span>
                    </>
                  )}
                </td>
                {canEdit && (
                  <td className="ab2-tier-actions-cell">
                    <button
                      type="button"
                      className="ab2-icon-btn ab2-icon-btn--muted"
                      onClick={() => setPendingDeleteIndex(i)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {canEdit && localRows.length > 1 ? (
        <p className="ab2-tier-chain-hint">
          Min à partir de la 2ᵉ ligne = max de la ligne précédente + 1 (enchaînement auto). Max pièce : saisie libre sur toutes les lignes.
        </p>
      ) : null}
    </div>
    <ConfirmDialog
      open={pendingDeleteIndex != null}
      onOpenChange={(open) => { if (!open) setPendingDeleteIndex(null); }}
      title="Confirmer la suppression"
      description="Supprimer ce palier ? Cette action sera enregistrée à la prochaine sauvegarde."
      confirmLabel="Supprimer"
      variant="destructive"
      onConfirm={() => {
        if (pendingDeleteIndex != null) removeRow(pendingDeleteIndex);
      }}
    />
    </>
  );
}

export function tiersToDraft(rows: TierTableRow[]): TierDraftRow[] {
  return chainDiscountTierMins(
    rows.map((r) => ({
      id: r.id,
      minQty: r.minQty,
      maxQty: r.maxQty,
      unitPrice: r.unitPrice,
      discountPercent: r.discountPercent,
      active: r.active,
    })),
  );
}
