'use client';

import { useState, useEffect, useMemo } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { Copy, Plus, Save, Trash2 } from 'lucide-react';
import { formatPriceAr } from '@/lib/data/catalogue';
import { resolveFieldPriceImpact } from '@/lib/pricing/price-impact-rules';
import { validateDiscountTiers } from '@/lib/pricing/validate-discount-tiers';

type TierRow = {
  id?: string;
  minQty: number;
  maxQty: number | null;
  unitPrice: number | null;
  discountPercent: number;
  active?: boolean;
};

function resolveTierForQty(tiers: TierRow[], qty: number): TierRow | null {
  const active = tiers.filter((t) => t.active !== false);
  return (
    active.find((t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)) ?? null
  );
}

export function InlineTierEditor({
  articleId,
  tiers,
  canEdit,
  onSaved,
  onDirtyChange,
}: {
  articleId: string;
  tiers: TierRow[];
  canEdit: boolean;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [rows, setRows] = useState<TierRow[]>(tiers);
  const [saving, setSaving] = useState(false);
  const [testQty, setTestQty] = useState(10);

  useEffect(() => { setRows(tiers); }, [tiers]);

  useEffect(() => {
    const dirty = JSON.stringify(rows) !== JSON.stringify(tiers);
    onDirtyChange?.(dirty);
  }, [rows, tiers, onDirtyChange]);

  const validationError = useMemo(() => validateDiscountTiers(rows), [rows]);
  const matched = useMemo(() => resolveTierForQty(rows, testQty), [rows, testQty]);

  const addRow = () => {
    const last = rows[rows.length - 1];
    const nextMin = last ? (last.maxQty ?? last.minQty) + 1 : 1;
    setRows([...rows, { minQty: nextMin, maxQty: null, unitPrice: null, discountPercent: 0, active: true }]);
  };

  const duplicateRow = (index: number) => {
    const src = rows[index];
    if (!src) return;
    const nextMin = (src.maxQty ?? src.minQty) + 1;
    const copy: TierRow = {
      ...src,
      id: undefined,
      minQty: nextMin,
      maxQty: src.maxQty != null ? nextMin + (src.maxQty - src.minQty) : null,
      active: true,
    };
    const next = [...rows];
    next.splice(index + 1, 0, copy);
    setRows(next);
  };

  const save = async () => {
    if (validationError) {
      uxToast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'tiers', tiers: rows }),
      });
      const d = await r.json();
      if (r.ok) {
        uxToast.success('Paliers enregistrés');
        onDirtyChange?.(false);
        onSaved();
      } else uxToast.error(getApiErrorMessage(d, 'Erreur'), 'Erreur');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSaving(false);
  };

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Aucun palier — le prix de base ou la formule s’appliquera seul. Ajoutez un palier pour la dégressivité.
        </p>
        {canEdit ? (
          <button type="button" onClick={addRow} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-[7px] bg-accent hover:bg-accent/80 min-h-9">
            <Plus size={12} /> Ajouter le premier palier
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <table className="w-full">
        <thead className="text-muted-foreground">
          <tr>
            <th className="text-left p-1">Actif</th>
            <th className="text-left p-1">Min</th>
            <th className="text-left p-1">Max</th>
            <th className="text-right p-1">PU (Ar)</th>
            <th className="text-right p-1">Remise %</th>
            {canEdit && (
              <th className="w-16">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={t.id ?? i} className="border-t border-border/50" style={{ opacity: t.active === false ? 0.5 : 1 }}>
              <td className="p-1">
                <input
                  type="checkbox"
                  checked={t.active !== false}
                  disabled={!canEdit}
                  onChange={(e) => {
                    const v = [...rows];
                    v[i] = { ...v[i], active: e.target.checked };
                    setRows(v);
                  }}
                  aria-label={`Palier ${t.minQty} actif`}
                />
              </td>
              <td className="p-1">
                {canEdit ? (
                  <input
                    type="number"
                    value={t.minQty}
                    onChange={(e) => {
                      const v = [...rows];
                      v[i] = { ...v[i], minQty: Number(e.target.value) || 1 };
                      setRows(v);
                    }}
                    className="w-16 bg-accent border border-border rounded px-1 py-0.5 font-mono text-xs"
                  />
                ) : (
                  <span className="font-mono">{t.minQty}</span>
                )}
              </td>
              <td className="p-1">
                {canEdit ? (
                  <input
                    type="number"
                    value={t.maxQty ?? ''}
                    placeholder="∞"
                    onChange={(e) => {
                      const v = [...rows];
                      const raw = e.target.value;
                      v[i] = { ...v[i], maxQty: raw === '' ? null : Number(raw) };
                      setRows(v);
                    }}
                    className="w-16 bg-accent border border-border rounded px-1 py-0.5 font-mono text-xs"
                  />
                ) : (
                  <span className="font-mono">{t.maxQty ?? '∞'}</span>
                )}
              </td>
              <td className="p-1 text-right">
                {canEdit ? (
                  <input
                    type="number"
                    value={t.unitPrice ?? ''}
                    onChange={(e) => {
                      const v = [...rows];
                      v[i] = { ...v[i], unitPrice: e.target.value === '' ? null : Number(e.target.value) };
                      setRows(v);
                    }}
                    className="w-24 bg-accent border border-border rounded px-1 py-0.5 font-mono text-xs text-right"
                  />
                ) : (
                  <span className="font-mono">{t.unitPrice != null ? formatPriceAr(t.unitPrice) : '—'}</span>
                )}
              </td>
              <td className="p-1 text-right">
                {canEdit ? (
                  <input
                    type="number"
                    value={t.discountPercent}
                    onChange={(e) => {
                      const v = [...rows];
                      v[i] = { ...v[i], discountPercent: Number(e.target.value) || 0 };
                      setRows(v);
                    }}
                    className="w-14 bg-accent border border-border rounded px-1 py-0.5 font-mono text-xs text-right"
                  />
                ) : (
                  <span className="font-mono">{t.discountPercent}%</span>
                )}
              </td>
              {canEdit && (
                <td className="p-1">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => duplicateRow(i)} className="text-muted-foreground hover:text-foreground" title="Dupliquer">
                      <Copy size={12} />
                    </button>
                    <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300" title="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center gap-3 text-xs rounded-lg border border-border px-2 py-1.5">
        <label className="inline-flex items-center gap-1">
          Tester qty
          <input
            type="number"
            min={1}
            value={testQty}
            onChange={(e) => setTestQty(Number(e.target.value) || 1)}
            className="w-16 bg-accent border border-border rounded px-1 py-0.5 font-mono"
          />
        </label>
        <span>
          {matched
            ? `→ PU ${matched.unitPrice != null ? formatPriceAr(matched.unitPrice) : '—'} · remise ${matched.discountPercent}%`
            : '→ aucun palier ne couvre cette quantité'}
        </span>
      </div>

      {validationError ? <p className="text-xs text-red-500">{validationError}</p> : null}

      {canEdit && (
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={addRow} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80">
            <Plus size={12} /> Ajouter palier
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || Boolean(validationError)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-[rgba(255,23,77,0.1)] text-[var(--accent-primary,#FF174D)] font-semibold disabled:opacity-50"
          >
            <Save size={12} /> {saving ? '…' : 'Enregistrer paliers'}
          </button>
        </div>
      )}
    </div>
  );
}

type OptionGroupRow = {
  id: string;
  fieldKey: string;
  label: string;
  impactsPrice: boolean;
  impactsStock: boolean;
  impactsProduction: boolean;
  isInformational: boolean;
  visiblePos: boolean;
  active: boolean;
  required: boolean;
  values: { id: string; label: string; priceModifier: number; forcePrice: boolean; active: boolean }[];
};

export function InlineOptionsEditor({
  articleId,
  groups,
  canEdit,
  onSaved,
}: {
  articleId: string;
  groups: OptionGroupRow[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const patchGroup = async (groupId: string, patch: Partial<Pick<OptionGroupRow, 'impactsPrice' | 'impactsStock' | 'impactsProduction' | 'isInformational' | 'visiblePos' | 'active' | 'required'>>) => {
    const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'optionGroup', groupId, ...patch }),
    });
    const d = await r.json();
    if (r.ok) {
      uxToast.success('Option mise à jour');
      onSaved();
    } else uxToast.error(getApiErrorMessage(d, 'Erreur'), 'Erreur');
  };

  const patchValue = async (groupId: string, valueId: string, priceModifier: number) => {
    const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'optionValue', groupId, valueId, priceModifier }),
    });
    const d = await r.json();
    if (r.ok) {
      uxToast.success('Prix option enregistré');
      onSaved();
    } else uxToast.error(getApiErrorMessage(d, 'Erreur'), 'Erreur');
  };

  const FLAG_LABELS: { key: keyof OptionGroupRow; label: string; color: string }[] = [
    { key: 'impactsPrice', label: 'Impacte le prix', color: 'text-[var(--accent-primary,#FF174D)]' },
    { key: 'isInformational', label: 'Descriptif', color: 'text-[var(--text-muted)]' },
    { key: 'impactsStock', label: 'Stock', color: 'text-[var(--accent-gold,#D97706)]' },
    { key: 'impactsProduction', label: 'Production', color: 'text-[var(--primary)]' },
    { key: 'visiblePos', label: 'Actif', color: '' },
    { key: 'active', label: 'Actif', color: '' },
    { key: 'required', label: 'Obligatoire', color: '' },
  ];

  return (
    <div className="max-h-80 overflow-y-auto space-y-3">
      {groups.map((g) => {
        const impact = resolveFieldPriceImpact({
          articleId,
          fieldKey: g.fieldKey,
          defaultImpactsPrice: g.impactsPrice,
          defaultIsInformational: g.isInformational,
        });
        return (
        <div key={g.id} className="p-2 bg-accent/40 rounded-lg border border-border/50">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{g.label} <span className="text-muted-foreground orion-text-code">({g.fieldKey})</span></p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              impact.badge === 'Impact prix'
                ? 'bg-[rgba(255,23,77,0.12)] text-[var(--accent-primary,#FF174D)]'
                : 'bg-[rgba(250,204,21,0.12)] text-[var(--accent-gold,#D97706)]'
            }`}>
              {impact.badge}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {FLAG_LABELS.map(({ key, label, color }) => (
              <label key={key} className={`flex items-center gap-1 text-xs ${color}`}>
                <input
                  type="checkbox"
                  checked={Boolean(g[key])}
                  disabled={!canEdit}
                  onChange={(e) => patchGroup(g.id, { [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
          {g.impactsPrice && g.values.length > 0 && (
            <div className="mt-2 space-y-1 pl-2 border-l-2 border-[rgba(255,23,77,0.3)]">
              {g.values.slice(0, 8).map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{v.label}</span>
                  {canEdit ? (
                    <input
                      type="number"
                      defaultValue={v.priceModifier}
                      onBlur={(e) => patchValue(g.id, v.id, Number(e.target.value) || 0)}
                      className="w-20 bg-background border border-border rounded px-1 py-0.5 orion-text-code text-right"
                    />
                  ) : (
                    <span className="orion-text-code">{formatPriceAr(v.priceModifier)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

export function InlineProfileEditor({
  articleId,
  profile,
  canEdit,
  onSaved,
}: {
  articleId: string;
  profile: { prixBase: number | null; prixM2: number | null; prixCm2: number | null; qtyMin: number | null; saleUnit: string };
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'profile', ...form }),
      });
      const d = await r.json();
      if (r.ok) {
        uxToast.success('Prix base enregistrés');
        onSaved();
      } else uxToast.error(getApiErrorMessage(d, 'Erreur'), 'Erreur');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSaving(false);
  };

  const fields = [
    { key: 'prixBase' as const, label: 'Prix base (Ar)' },
    { key: 'prixM2' as const, label: 'Prix m² (Ar)' },
    { key: 'prixCm2' as const, label: 'Prix cm² (Ar)' },
    { key: 'qtyMin' as const, label: 'Qty min' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground">Unité : <strong>{profile.saleUnit}</strong></p>
      <div className="grid grid-cols-2 gap-2">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <label className="orion-text-meta block mb-0.5">{label}</label>
            {canEdit ? (
              <input
                type="number"
                value={form[key] ?? ''}
                onChange={(e) => setForm({ ...form, [key]: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full bg-accent border border-border rounded px-2 py-1 font-mono text-xs"
              />
            ) : (
              <p className="font-mono font-bold">{form[key] != null ? formatPriceAr(form[key]!) : '—'}</p>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <button type="button" onClick={save} disabled={saving} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-500/10 text-green-500 font-semibold">
          <Save size={12} /> {saving ? '…' : 'Enregistrer'}
        </button>
      )}
    </div>
  );
}

export function InlineUrgencyEditor({
  articleId,
  rules,
  canEdit,
  onSaved,
}: {
  articleId: string;
  rules: { id: string; label: string; surchargePercent: number; requiresValidation: boolean; active: boolean }[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const patch = async (ruleId: string, data: Record<string, unknown>) => {
    const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'urgency', ruleId, ...data }),
    });
    const d = await r.json();
    if (r.ok) {
      uxToast.success('Urgence mise à jour');
      onSaved();
    } else uxToast.error(getApiErrorMessage(d, 'Erreur'), 'Erreur');
  };

  if (!rules.length) return <p className="text-muted-foreground">Aucune règle — sync catalogue</p>;

  return (
    <div className="space-y-2">
      {rules.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2 p-2 bg-accent/40 rounded-lg">
          <span className="font-medium min-w-[100px]">{r.label}</span>
          {canEdit ? (
            <>
              <input
                type="number"
                defaultValue={r.surchargePercent}
                onBlur={(e) => patch(r.id, { surchargePercent: Number(e.target.value) || 0 })}
                className="w-16 bg-background border border-border rounded px-1 py-0.5 font-mono text-xs"
              />
              <span className="text-muted-foreground">%</span>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  defaultChecked={r.requiresValidation}
                  onChange={(e) => patch(r.id, { requiresValidation: e.target.checked })}
                />
                Validation
              </label>
            </>
          ) : (
            <span className="font-mono">+{r.surchargePercent}% {r.requiresValidation ? '· validation' : ''}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function InlineMaterialEditor({
  articleId,
  materials,
  canEdit,
  onSaved,
}: {
  articleId: string;
  materials: { id: string; label: string | null; materialKey: string | null; prixM2: number | null; prixCm2: number | null; active: boolean }[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const patch = async (materialId: string, data: Record<string, unknown>) => {
    const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'material', materialId, ...data }),
    });
    const d = await r.json();
    if (r.ok) {
      uxToast.success('Prix matière enregistré');
      onSaved();
    } else uxToast.error(getApiErrorMessage(d, 'Erreur'), 'Erreur');
  };

  if (!materials.length) return <p className="text-muted-foreground">Aucun prix matière seedé</p>;

  return (
    <div className="space-y-2">
      {materials.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center gap-2 p-2 bg-accent/40 rounded-lg">
          <span className="min-w-[120px] truncate">{m.label || m.materialKey || 'Surface'}</span>
          {canEdit ? (
            <>
              <input
                type="number"
                placeholder="prix/m²"
                defaultValue={m.prixM2 ?? ''}
                onBlur={(e) => patch(m.id, { prixM2: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-24 bg-background border border-border rounded px-1 py-0.5 orion-text-code"
              />
              <input
                type="number"
                placeholder="prix/cm²"
                defaultValue={m.prixCm2 ?? ''}
                onBlur={(e) => patch(m.id, { prixCm2: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-24 bg-background border border-border rounded px-1 py-0.5 orion-text-code"
              />
            </>
          ) : (
            <span className="orion-text-code">
              {m.prixM2 != null ? `${formatPriceAr(m.prixM2)}/m²` : m.prixCm2 != null ? `${formatPriceAr(m.prixCm2)}/cm²` : '—'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
