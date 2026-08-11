'use client';

/**
 * Fiche matière unifiée — consultation / modification / création.
 * Remplace MaterialQuickEditModal + MaterialPriceEditDrawer + create dialog
 * pour une seule expérience claire (cobalt SaaS).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Layers,
  Link2,
  Loader2,
  Pencil,
  Package,
} from 'lucide-react';
import { OrionPanelDrawer } from '@/components/ui/orion-panel-drawer';
import {
  buildCatalogLabel,
  characteristicToStorage,
  deriveMaterialTableFields,
  type CharacteristicType,
} from '@/lib/backoffice/material-table-fields';
import { OrionToggle } from './OrionToggle';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppButton } from '@/components/ui/app-ui';
import { resolveStockAlertLevel } from '@/lib/backoffice/material-master-row';
import type { MaterialPriceUnifiedRow } from './types';
import './material-sheet.css';

export type MaterialSheetMode = 'view' | 'edit' | 'create';

type UnifiedRow = MaterialPriceUnifiedRow;

type Props = {
  open: boolean;
  mode: MaterialSheetMode;
  row: UnifiedRow | null;
  canEdit: boolean;
  onClose: () => void;
  /** Appelé après enregistrement — reçoit la ligne à jour pour sync UI. */
  onSaved: (updated?: UnifiedRow) => void;
  onModeChange?: (mode: MaterialSheetMode) => void;
  onLinkStock?: (row: UnifiedRow) => void;
  /** Après création réussie — permet de rester sur la fiche en consultation. */
  onCreatedRow?: (row: UnifiedRow) => void;
};

const FAMILIES = ['Grand format', 'Petit format', 'Carte', 'Textile', 'Autre'];
const CHAR_TYPES: { id: CharacteristicType; label: string }[] = [
  { id: 'grammage', label: 'Grammage' },
  { id: 'epaisseur', label: 'Épaisseur' },
  { id: 'laize', label: 'Laize' },
  { id: 'format', label: 'Format' },
  { id: 'taille', label: 'Taille' },
  { id: 'face', label: 'Face' },
  { id: 'finition', label: 'Finition' },
  { id: 'autre', label: 'Autre' },
];

type FormState = Record<string, string | boolean | number | null>;

function emptyCreateForm(): FormState {
  return {
    label: '',
    family: 'Petit format',
    charType: 'grammage',
    charValue: '',
    unit: 'g',
    materialKey: '',
    grammage: '',
    thickness: '',
    formatStandard: '',
    face: '',
    unitDisplay: '',
    unitStandard: '',
    conversionFactor: '',
    purchasePrice: '',
    basePrintPrice: '',
    maxPrice: '',
    targetMargin: '',
    minMargin: '',
    active: true,
    visiblePos: true,
    impactsPrice: true,
    impactsStock: true,
    publicationStatus: 'draft',
  };
}

function formFromRow(row: UnifiedRow): FormState {
  return {
    label: row.name,
    family: normalizeFamily(row.family),
    charType: 'grammage',
    charValue: row.grammage || row.thickness || '',
    unit: 'g',
    materialKey: row.materialKey ?? '',
    grammage: row.grammage ?? '',
    thickness: row.thickness ?? '',
    formatStandard: row.formatLabel ?? row.format ?? '',
    face: row.face ?? '',
    unitDisplay: row.unitDisplay ?? row.unit ?? '',
    unitStandard: row.unitStandard ?? '',
    conversionFactor: row.conversionFactor ?? '',
    purchasePrice: row.purchasePrice ?? '',
    basePrintPrice: row.basePrintPrice ?? '',
    maxPrice: row.maxPrice ?? '',
    targetMargin: row.marginTarget ?? '',
    minMargin: row.marginMin ?? '',
    active: row.active,
    visiblePos: row.visiblePOS,
    impactsPrice: row.impactsPrice,
    impactsStock: row.impactsStock,
    publicationStatus: row.publicationStatus,
  };
}

function normalizeFamily(raw: string | null | undefined): string {
  const value = String(raw ?? '').trim();
  if (!value) return 'Petit format';
  const hit = FAMILIES.find((f) => f.toLocaleLowerCase('fr') === value.toLocaleLowerCase('fr'));
  if (hit) return hit;
  const lower = value.toLocaleLowerCase('fr');
  if (lower.includes('grand')) return 'Grand format';
  if (lower.includes('petit')) return 'Petit format';
  if (lower.includes('carte')) return 'Carte';
  if (lower.includes('textile')) return 'Textile';
  return 'Autre';
}

function numOrNull(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mergeApiMaterialIntoRow(
  prev: UnifiedRow | null,
  api: Record<string, unknown>,
): UnifiedRow {
  const id = String(api.id ?? prev?.id ?? '');
  const base = prev ?? ({
    id,
    articleId: null,
    articleName: null,
    formatLabel: null,
    face: null,
    basePrintingPriceId: null,
    rowKind: 'material',
    anomalies: [],
    anomaliesCount: 0,
    linkedArticlesCount: 0,
    excelRowId: null,
    commercialUsage: 'to_verify',
    archived: false,
    source: 'manual-create',
    name: '',
    family: 'Petit format',
    grammage: null,
    thickness: null,
    format: null,
    unit: null,
    unitDisplay: null,
    unitStandard: null,
    conversionFactor: null,
    stockItemId: null,
    stockAvailable: null,
    stockThreshold: null,
    purchasePrice: null,
    blankSellPrice: null,
    basePrintPrice: null,
    maxPrice: null,
    marginTarget: null,
    marginMin: null,
    active: true,
    visiblePOS: true,
    impactsPrice: true,
    impactsStock: true,
    materialKey: '',
    publicationStatus: 'draft',
  } as UnifiedRow);

  return {
    ...base,
    id,
    name: String(api.label ?? base.name ?? ''),
    family: normalizeFamily(api.family != null ? String(api.family) : base.family),
    materialKey: String(api.materialKey ?? base.materialKey ?? ''),
    grammage: api.grammage != null ? String(api.grammage) : base.grammage ?? null,
    thickness: api.thickness != null ? String(api.thickness) : base.thickness ?? null,
    format: api.formatStandard != null ? String(api.formatStandard) : base.format ?? null,
    formatLabel: api.formatStandard != null ? String(api.formatStandard) : base.formatLabel ?? null,
    unit: api.saleUnit != null ? String(api.saleUnit) : base.unit ?? null,
    unitDisplay: api.unitDisplay != null ? String(api.unitDisplay) : base.unitDisplay ?? null,
    unitStandard: api.unitStandard != null ? String(api.unitStandard) : base.unitStandard ?? null,
    conversionFactor: numOrNull(api.conversionFactor) ?? base.conversionFactor ?? null,
    purchasePrice: numOrNull(api.purchasePrice) ?? base.purchasePrice ?? null,
    basePrintPrice: numOrNull(api.basePrintPrice) ?? base.basePrintPrice ?? null,
    maxPrice: numOrNull(api.maxPrice) ?? base.maxPrice ?? null,
    blankSellPrice: numOrNull(api.blankSellPrice) ?? base.blankSellPrice ?? null,
    marginTarget: numOrNull(api.targetMargin) ?? base.marginTarget ?? null,
    marginMin: numOrNull(api.minMargin) ?? base.marginMin ?? null,
    active: api.active != null ? Boolean(api.active) : base.active,
    visiblePOS: api.visiblePos != null ? Boolean(api.visiblePos) : base.visiblePOS,
    impactsPrice: api.impactsPrice != null ? Boolean(api.impactsPrice) : base.impactsPrice,
    impactsStock: api.impactsStock != null ? Boolean(api.impactsStock) : base.impactsStock,
    publicationStatus: String(api.publicationStatus ?? base.publicationStatus ?? 'draft'),
    stockItemId: api.stockItemId != null ? String(api.stockItemId) : base.stockItemId ?? null,
  };
}

function Section({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'warn' | 'danger';
}) {
  return (
    <section className={`orion-mat-sheet-section${tone ? ` is-${tone}` : ''}`}>
      <h3 className="orion-mat-sheet-section-title">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  hint,
  error,
  span2,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string | null;
  span2?: boolean;
}) {
  return (
    <label className={`orion-mat-sheet-field${span2 ? ' is-span-2' : ''}${error ? ' has-error' : ''}`}>
      <span className="orion-mat-sheet-label">{label}</span>
      {children}
      {error ? <span className="orion-mat-sheet-error" role="alert">{error}</span> : null}
      {!error && hint ? <span className="orion-mat-sheet-hint">{hint}</span> : null}
    </label>
  );
}

function ReadValue({ value }: { value: string | number | null | undefined }) {
  const text = value == null || String(value).trim() === '' ? null : String(value);
  return (
    <span className={`orion-mat-sheet-read${text ? '' : ' is-empty'}`}>
      {text ?? 'Non renseigné'}
    </span>
  );
}

function formatAr(v: string | number | null | undefined): string {
  if (v === '' || v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('fr-FR')} Ar`;
}

export function MaterialSheet({
  open,
  mode,
  row,
  canEdit,
  onClose,
  onSaved,
  onModeChange,
  onLinkStock,
  onCreatedRow,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyCreateForm);
  const [initialForm, setInitialForm] = useState<FormState>(emptyCreateForm);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [usageLoading, setUsageLoading] = useState(false);
  const [usage, setUsage] = useState<{
    linkedArticles?: Array<{ id: string; name: string }>;
    stockItem?: { label: string; quantity: number; unit: string } | null;
  } | null>(null);

  const isCreate = mode === 'create';
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const editable = (isEdit || isCreate) && canEdit;
  const rowId = row?.id ?? null;
  const formHydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      formHydratedFor.current = null;
      return;
    }
    // Réhydrate seulement à l'ouverture / changement de matière — pas à chaque
    // nouveau référentiel `row` (sinon saisie interrompue / valeur écrasée).
    const hydrateKey = isCreate ? '__create__' : rowId ?? '__missing__';
    if (formHydratedFor.current === hydrateKey) return;
    formHydratedFor.current = hydrateKey;

    if (isCreate) {
      const next = emptyCreateForm();
      setForm(next);
      setInitialForm(next);
      setUsage(null);
      setTouched({});
      setDiscardOpen(false);
      return;
    }
    if (!row) return;
    const next = formFromRow(row);
    setForm(next);
    setInitialForm(next);
    setTouched({});
    setDiscardOpen(false);
  }, [open, rowId, isCreate, row]);

  useEffect(() => {
    if (!open || isCreate || !rowId) {
      setUsage(null);
      return;
    }
    let cancelled = false;
    setUsageLoading(true);
    void fetch(`/api/admin-backoffice/pricing/base-materials/${rowId}/usage`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        setUsage(r.ok && d.ok ? d.data : null);
      })
      .catch(() => {
        if (!cancelled) setUsage(null);
      })
      .finally(() => {
        if (!cancelled) setUsageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, rowId, isCreate]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
  );

  const fields = row ? deriveMaterialTableFields(row) : null;
  const isPrintOnly = Boolean(row?.id.startsWith('print-'));
  const set = (k: string, v: string | boolean | number | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const labelError =
    touched.label && !String(form.label ?? '').trim() ? 'Le nom de la matière est obligatoire.' : null;
  const createValueError =
    isCreate && touched.charValue && !String(form.charValue ?? '').trim()
      ? 'La valeur caractéristique est obligatoire.'
      : null;
  const convFactor = form.conversionFactor === '' ? null : Number(form.conversionFactor);
  const convInvalid =
    form.conversionFactor !== ''
    && (convFactor == null || !Number.isFinite(convFactor) || convFactor <= 0);
  const convError =
    touched.conversionFactor && convInvalid
      ? 'Le facteur doit être un nombre strictement positif.'
      : null;

  const canSubmit =
    editable
    && !saving
    && !isPrintOnly
    && Boolean(String(form.label ?? '').trim())
    && (!isCreate || Boolean(String(form.charValue ?? '').trim()))
    && !convInvalid;

  const requestClose = useCallback(() => {
    if (dirty && editable && !saving) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }, [dirty, editable, saving, onClose]);

  const stockLevel = row
    ? resolveStockAlertLevel(row.stockAvailable ?? row.stockDisponible ?? null, row.stockThreshold)
    : null;
  const stockBadge =
    stockLevel === 'ok'
      ? { label: 'Disponible', cls: 'is-ok' }
      : stockLevel === 'warn'
        ? { label: 'Faible', cls: 'is-low' }
        : stockLevel === 'critical' || stockLevel === 'negative'
          ? { label: 'Rupture', cls: 'is-out' }
          : row?.stockItemId
            ? { label: 'Stock lié', cls: 'is-muted' }
            : null;

  const linkedCount = usage?.linkedArticles?.length || row?.linkedArticlesCount || 0;

  const marginPreview = useMemo(() => {
    const cost = Number(form.purchasePrice);
    const sell = Number(form.basePrintPrice);
    if (!Number.isFinite(cost) || !Number.isFinite(sell) || sell <= 0) return null;
    const margin = ((sell - cost) / sell) * 100;
    const min = Number(form.minMargin);
    const alert = Number.isFinite(min) && margin < min;
    return { margin, alert };
  }, [form.purchasePrice, form.basePrintPrice, form.minMargin]);

  const convExample =
    form.unitDisplay && form.unitStandard && form.conversionFactor && !convError
      ? `1 ${form.unitDisplay} = ${form.conversionFactor} ${form.unitStandard}`
      : null;

  const saveEdit = async (publish = false) => {
    if (!row || !canEdit || isPrintOnly) return;
    setTouched((t) => ({ ...t, label: true, conversionFactor: true }));
    if (!canSubmit) return;
    setSaving(true);
    try {
      const body = {
        basePrintingPriceId: row.basePrintingPriceId,
        label: String(form.label ?? '').trim(),
        family: normalizeFamily(String(form.family ?? '')),
        materialKey: String(form.materialKey ?? '').trim() || undefined,
        grammage: (form.grammage as string) || null,
        thickness: (form.thickness as string) || null,
        formatStandard: (form.formatStandard as string) || null,
        face: (form.face as string) || null,
        unitDisplay: (form.unitDisplay as string) || null,
        unitStandard: (form.unitStandard as string) || null,
        saleUnit: (form.unitDisplay as string) || (form.unitStandard as string) || null,
        conversionFactor: form.conversionFactor === '' ? null : Number(form.conversionFactor),
        purchasePrice: form.purchasePrice === '' ? null : Number(form.purchasePrice),
        basePrintPrice: form.basePrintPrice === '' ? null : Number(form.basePrintPrice),
        maxPrice: form.maxPrice === '' ? null : Number(form.maxPrice),
        targetMargin: form.targetMargin === '' ? null : Number(form.targetMargin),
        minMargin: form.minMargin === '' ? null : Number(form.minMargin),
        active: form.active as boolean,
        visiblePos: form.visiblePos as boolean,
        impactsPrice: form.impactsPrice as boolean,
        impactsStock: form.impactsStock as boolean,
      };
      const r = await fetch(`/api/admin-backoffice/pricing/base-material-prices/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(getApiErrorMessage(d, 'Erreur'));
      let nextRow = mergeApiMaterialIntoRow(row, (d.data ?? {}) as Record<string, unknown>);
      if (publish) {
        const pr = await fetch(`/api/admin-backoffice/pricing/base-material-prices/${row.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ basePrintingPriceId: row.basePrintingPriceId }),
        });
        const pd = await pr.json().catch(() => ({}));
        if (!pr.ok || !pd.ok) {
          throw new Error(getApiErrorMessage(pd, 'Brouillon enregistré mais publication échouée'));
        }
        nextRow = { ...nextRow, publicationStatus: 'published' };
        uxToast.success('Matière enregistrée et publiée — sync catalogue / POS');
      } else {
        uxToast.success('Brouillon enregistré');
      }
      const syncedForm = formFromRow(nextRow);
      setForm(syncedForm);
      setInitialForm(syncedForm);
      onSaved(nextRow);
      onModeChange?.('view');
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const saveCreate = async (publish = false) => {
    setTouched({ label: true, charValue: true, conversionFactor: true });
    if (!String(form.label ?? '').trim() || !String(form.charValue ?? '').trim()) {
      uxToast.error('Nom et valeur caractéristique sont requis');
      return;
    }
    if (convInvalid) {
      uxToast.error('Facteur de conversion invalide');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const unit = String(form.unit ?? '—');
      const charValue = String(form.charValue ?? '').trim();
      const charType = (form.charType as CharacteristicType) || 'grammage';
      const valueWithUnit =
        charValue.includes(unit.replace('—', '')) || unit === '—'
          ? charValue
          : `${charValue}${unit === '—' ? '' : unit}`;
      const { grammage, thickness } = characteristicToStorage(charType, valueWithUnit);
      const catalogLabel = buildCatalogLabel(String(form.label).trim(), charType, valueWithUnit);
      const priceRaw = String(form.basePrintPrice ?? '').trim();
      const parsedPrice = priceRaw === '' ? null : Number(priceRaw.replace(/\s/g, '').replace(',', '.'));
      if (parsedPrice != null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
        throw new Error('Prix de base invalide');
      }
      const r = await fetch('/api/admin-backoffice/pricing/base-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialKey:
            String(form.materialKey ?? '').trim()
            || String(form.label).trim().toLowerCase().replace(/\s+/g, '-'),
          label: catalogLabel,
          family: normalizeFamily(String(form.family ?? '')),
          grammage: grammage || (form.grammage as string) || null,
          thickness: thickness || (form.thickness as string) || null,
          formatStandard: (form.formatStandard as string) || null,
          unitDisplay: (form.unitDisplay as string) || null,
          unitStandard: (form.unitStandard as string) || null,
          conversionFactor: form.conversionFactor === '' ? null : Number(form.conversionFactor),
          purchasePrice: form.purchasePrice === '' ? null : Number(form.purchasePrice),
          basePrintPrice: parsedPrice,
          maxPrice: form.maxPrice === '' ? null : Number(form.maxPrice),
          targetMargin: form.targetMargin === '' ? null : Number(form.targetMargin),
          minMargin: form.minMargin === '' ? null : Number(form.minMargin),
          visiblePos: Boolean(form.visiblePos),
          active: Boolean(form.active),
          impactsPrice: Boolean(form.impactsPrice),
          impactsStock: Boolean(form.impactsStock),
          publicationStatus: publish ? 'published' : (form.publicationStatus as string) || 'draft',
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        throw new Error(typeof d.error === 'object' ? d.error?.message : d.error ?? 'Erreur création');
      }
      if (publish && d.data?.id) {
        await fetch(`/api/admin-backoffice/pricing/base-material-prices/${d.data.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).catch(() => null);
      }
      uxToast.success(publish ? 'Matière créée et publiée — sync catalogue / POS' : 'Matière créée (brouillon)');
      const created = mergeApiMaterialIntoRow(null, (d.data ?? {}) as Record<string, unknown>);
      onSaved(created);
      if (created.id) {
        onCreatedRow?.(created);
        onModeChange?.('view');
      } else {
        onClose();
      }
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const title = isCreate
    ? 'Nouvelle matière'
    : row?.name || fields?.materialName || 'Fiche matière';

  const subtitle = isCreate
    ? 'Ajoutez une matière et définissez ses caractéristiques, sa conversion et sa tarification.'
    : fields?.primaryReference && fields.primaryReference !== '—'
      ? fields.primaryReference
      : fields?.mainCharacteristic?.display ?? '';

  if (!open) return null;
  if (!isCreate && !row) return null;

  const headerContent = (
    <div className="orion-mat-sheet-heading">
      <span className="orion-mat-sheet-icon" aria-hidden>
        <Layers className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="orion-mat-sheet-title-row">
          <h2 className="orion-mat-sheet-title">{title}</h2>
          {!isCreate && row ? (
            <span
              className={`orion-mat-sheet-badge ${
                row.publicationStatus === 'published' ? 'is-ok' : 'is-muted'
              }`}
            >
              {adminStatusLabel(row.publicationStatus)}
            </span>
          ) : null}
        </div>
        <p className="orion-mat-sheet-subtitle">{subtitle}</p>
        {!isCreate && row ? (
          <div className="orion-mat-sheet-chips">
            {row.family ? <span className="orion-mat-sheet-chip">{row.family}</span> : null}
            {stockBadge ? (
              <span className={`orion-mat-sheet-chip ${stockBadge.cls}`}>{stockBadge.label}</span>
            ) : null}
            {linkedCount > 0 ? (
              <span className="orion-mat-sheet-chip is-info">
                Utilisée dans {linkedCount} produit{linkedCount > 1 ? 's' : ''} POS
              </span>
            ) : null}
            {form.basePrintPrice !== '' && form.basePrintPrice != null ? (
              <span className="orion-mat-sheet-chip">
                Base {formatAr(form.basePrintPrice as string | number)}
              </span>
            ) : null}
            {row.anomaliesCount > 0
              ? row.anomalies.map((a) => (
                  <span key={a} className="orion-mat-sheet-chip is-anomaly" title={a}>
                    <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                    {a}
                  </span>
                ))
              : null}
          </div>
        ) : null}
      </div>
      {isView && canEdit && !isPrintOnly ? (
        <AppButton
          type="button"
          variant="outline"
          className="orion-mat-sheet-edit-btn"
          onClick={() => onModeChange?.('edit')}
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </AppButton>
      ) : null}
    </div>
  );

  const footer = isView ? (
    <>
      <button type="button" className="orion-mat-sheet-btn is-ghost" onClick={onClose}>
        Fermer
      </button>
      {canEdit && !isPrintOnly ? (
        <button
          type="button"
          className="orion-mat-sheet-btn is-primary"
          onClick={() => onModeChange?.('edit')}
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </button>
      ) : null}
    </>
  ) : (
    <>
      <button
        type="button"
        className="orion-mat-sheet-btn is-ghost"
        onClick={requestClose}
        disabled={saving}
      >
        Annuler
      </button>
      <div className="orion-mat-sheet-footer-right">
        <button
          type="button"
          className="orion-mat-sheet-btn is-secondary"
          disabled={!canSubmit}
          onClick={() => void (isCreate ? saveCreate(false) : saveEdit(false))}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          Enregistrer comme brouillon
        </button>
        <button
          type="button"
          className="orion-mat-sheet-btn is-primary"
          disabled={!canSubmit}
          onClick={() => void (isCreate ? saveCreate(true) : saveEdit(true))}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          Enregistrer et publier
        </button>
      </div>
    </>
  );

  const input = (
    key: string,
    opts?: { type?: string; mono?: boolean; placeholder?: string },
  ) =>
    editable ? (
      <input
        className={`orion-mat-sheet-input${opts?.mono ? ' is-mono' : ''}`}
        type={opts?.type ?? 'text'}
        value={form[key] == null ? '' : String(form[key])}
        placeholder={opts?.placeholder}
        disabled={saving || isPrintOnly}
        onBlur={() => setTouched((t) => ({ ...t, [key]: true }))}
        onChange={(e) => set(key, e.target.value)}
      />
    ) : (
      <ReadValue value={form[key] as string | number | null} />
    );

  return (
    <>
      <OrionPanelDrawer
        open={open}
        onClose={requestClose}
        title={title}
        subtitle={subtitle}
        widthClass="max-w-[min(calc(100vw-2rem),1120px)]"
        variant="sheet"
        headerContent={headerContent}
        footer={footer}
      >
        {isPrintOnly ? (
          <p className="orion-mat-sheet-warn">
            Ligne issue du prix article uniquement — créez ou liez une matière catalogue pour
            l’édition complète.
          </p>
        ) : null}

        <Section title="Identification">
          <div className="orion-mat-sheet-grid">
            <Field label="Matière *" error={labelError}>
              {input('label', { placeholder: 'Glossy, Bristol, Acrylic…' })}
            </Field>
            <Field label="Famille *">
              {editable ? (
                <select
                  className="orion-mat-sheet-input"
                  value={normalizeFamily(String(form.family ?? ''))}
                  disabled={saving || isPrintOnly}
                  onChange={(e) => set('family', e.target.value)}
                >
                  {FAMILIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              ) : (
                <ReadValue value={form.family as string} />
              )}
            </Field>
            <Field
              label="Référence principale"
              hint={isCreate ? 'Auto si vide' : 'Clé technique unique'}
            >
              {editable ? (
                input('materialKey', { mono: true, placeholder: isCreate ? 'Auto si vide' : 'ex. acrylic-3mm' })
              ) : (
                <ReadValue value={fields?.primaryReference ?? form.materialKey as string} />
              )}
            </Field>
            <Field label="Référence secondaire">
              <ReadValue value={fields?.secondaryReference} />
            </Field>
            {!isCreate ? (
              <Field label="Statut de publication">
                <ReadValue value={adminStatusLabel(String(form.publicationStatus ?? 'draft'))} />
              </Field>
            ) : (
              <Field label="Statut">
                <select
                  className="orion-mat-sheet-input"
                  value={String(form.publicationStatus ?? 'draft')}
                  onChange={(e) => set('publicationStatus', e.target.value)}
                  disabled={saving}
                >
                  <option value="draft">{adminStatusLabel('draft')}</option>
                  <option value="published">{adminStatusLabel('published')}</option>
                </select>
              </Field>
            )}
          </div>
        </Section>

        <Section title="Caractéristiques techniques">
          <div className="orion-mat-sheet-grid">
            {isCreate ? (
              <>
                <Field label="Type de caractéristique *">
                  <select
                    className="orion-mat-sheet-input"
                    value={String(form.charType ?? 'grammage')}
                    onChange={(e) => set('charType', e.target.value)}
                    disabled={saving}
                  >
                    {CHAR_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Valeur *" error={createValueError}>
                  {input('charValue', { placeholder: '120, 3, A4…' })}
                </Field>
                <Field label="Unité">
                  <select
                    className="orion-mat-sheet-input"
                    value={String(form.unit ?? 'g')}
                    onChange={(e) => set('unit', e.target.value)}
                    disabled={saving}
                  >
                    {['g', 'g/m²', 'mm', 'cm', 'm', 'pcs', '—'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}
            <Field label="Grammage">{input('grammage')}</Field>
            <Field label="Épaisseur">{input('thickness')}</Field>
            <Field label="Format">{input('formatStandard')}</Field>
            <Field label="Face">{input('face')}</Field>
            <Field label="Unité">{input('unitDisplay')}</Field>
          </div>
        </Section>

        <Section title="Conversion des unités">
          <div className="orion-mat-sheet-grid">
            <Field label="Unité d’achat">{input('unitDisplay')}</Field>
            <Field label="Unité standard">{input('unitStandard')}</Field>
            <Field label="Facteur de conversion" error={convError}>
              {input('conversionFactor', { type: 'number', placeholder: 'Ex. 2.9768' })}
            </Field>
          </div>
          {convExample ? <p className="orion-mat-sheet-conv">{convExample}</p> : null}
        </Section>

        <Section title="Tarification">
          <div className="orion-mat-sheet-grid">
            <Field label="Prix d’achat (Ar)">{input('purchasePrice', { type: 'number' })}</Field>
            <Field label="Prix matière vierge (Ar)">{input('basePrintPrice', { type: 'number' })}</Field>
            <Field label="Prix max (Ar)">{input('maxPrice', { type: 'number' })}</Field>
            <Field label="Marge cible %">{input('targetMargin', { type: 'number' })}</Field>
            <Field label="Marge min %">{input('minMargin', { type: 'number' })}</Field>
            <Field label="Devise"><ReadValue value="Ar (MGA)" /></Field>
          </div>
          {marginPreview ? (
            <p className={`orion-mat-sheet-margin${marginPreview.alert ? ' is-alert' : ''}`}>
              Marge estimée : {marginPreview.margin.toFixed(1)} %
              {marginPreview.alert ? ' — sous la marge minimale' : ''}
            </p>
          ) : null}
        </Section>

        <Section title="Stock et disponibilité">
          {row?.stockItemId || usage?.stockItem ? (
            <div className="orion-mat-sheet-stock-card">
              <Package className="h-4 w-4" aria-hidden />
              <div>
                <strong>{usage?.stockItem?.label || row?.stockSku || 'Article lié'}</strong>
                <p>
                  {row?.stockDisplay
                    || (usage?.stockItem
                      ? `${usage.stockItem.quantity} ${usage.stockItem.unit}`
                      : 'Stock lié')}
                </p>
              </div>
            </div>
          ) : (
            <div className="orion-mat-sheet-empty">
              <p>Aucun article de stock n’est actuellement lié à cette matière.</p>
              {row && canEdit && onLinkStock ? (
                <button
                  type="button"
                  className="orion-mat-sheet-btn is-secondary"
                  onClick={() => onLinkStock(row)}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Lier un article de stock
                </button>
              ) : null}
            </div>
          )}
        </Section>

        {!isCreate ? (
          <Section title="Usages produits et POS">
            {usageLoading ? (
              <p className="orion-mat-sheet-hint">Chargement des liaisons…</p>
            ) : linkedCount > 0 && usage?.linkedArticles?.length ? (
              <ul className="orion-mat-sheet-usage-list">
                {usage.linkedArticles.map((a) => (
                  <li key={a.id}>
                    <a
                      href={`/administration/catalogue-prix-stock?studio=prix&tab=articles&q=${encodeURIComponent(a.name)}`}
                    >
                      {a.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="orion-mat-sheet-hint">
                {linkedCount > 0
                  ? `${linkedCount} article(s) recensés — ouvrez Studio Prix pour vérifier.`
                  : 'Aucun article lié pour le moment.'}
              </p>
            )}
            <div className="orion-mat-sheet-pos-row">
              <div>
                <strong>Disponible POS</strong>
                <p>Sélectionnable depuis le point de vente.</p>
              </div>
              <OrionToggle
                variant="pos"
                checked={!!form.visiblePos}
                onChange={(v) => set('visiblePos', v)}
                disabled={!editable || isPrintOnly}
                label="Disponible dans le point de vente"
              />
            </div>
            {editable ? (
              <div className="orion-mat-sheet-toggles">
                <div className="orion-mat-sheet-toggle-row">
                  <span>Actif</span>
                  <OrionToggle
                    variant="active"
                    checked={!!form.active}
                    onChange={(v) => set('active', v)}
                    disabled={isPrintOnly}
                  />
                </div>
                <div className="orion-mat-sheet-toggle-row">
                  <span>Impact prix</span>
                  <OrionToggle
                    variant="price"
                    checked={!!form.impactsPrice}
                    onChange={(v) => set('impactsPrice', v)}
                    disabled={isPrintOnly}
                  />
                </div>
                <div className="orion-mat-sheet-toggle-row">
                  <span>Impact stock</span>
                  <OrionToggle
                    variant="stock"
                    checked={!!form.impactsStock}
                    onChange={(v) => set('impactsStock', v)}
                    disabled={isPrintOnly}
                  />
                </div>
              </div>
            ) : null}
          </Section>
        ) : (
          <Section title="Disponibilité POS">
            <div className="orion-mat-sheet-pos-row">
              <div>
                <strong>Disponible POS</strong>
                <p>Sélectionnable depuis le point de vente.</p>
              </div>
              <OrionToggle
                variant="pos"
                checked={!!form.visiblePos}
                onChange={(v) => set('visiblePos', v)}
                label="Disponible dans le point de vente"
              />
            </div>
          </Section>
        )}
      </OrionPanelDrawer>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Abandonner les modifications ?"
        description="Les changements non enregistrés de cette matière seront perdus."
        confirmLabel="Abandonner"
        cancelLabel="Continuer l’édition"
        variant="destructive"
        onConfirm={() => {
          setDiscardOpen(false);
          onClose();
        }}
      />
    </>
  );
}
