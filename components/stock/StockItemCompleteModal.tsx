'use client';

import './stock-modal.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { AppFormModal } from '@/components/ui/app-ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { STOCK_CATEGORIES } from '@/lib/data/stock-categories';
import {
  STOCK_UNIT_PRESETS,
  STOCK_UNIT_DISPLAY_OPTIONS,
  conversionLabel,
} from '@/lib/data/stock-unit-presets';
import { computeMarginPct, computeNetBenefit, standardQuantity } from '@/lib/utils/stock-price';
import { getStockFormVisibility, stockCategoryLabel, stockStatusClient } from '@/lib/stock/stock-form-visibility';

export type StockCompleteFormState = {
  label: string;
  sku: string;
  skuManual: boolean;
  skuManualReason: string;
  stockCategory: string;
  family: string;
  subFamily: string;
  brand: string;
  paperType: string;
  grammage: string;
  formatLabel: string;
  color: string;
  sizeLabel: string;
  capacity: string;
  thickness: string;
  machineCompatible: string;
  supplierRef: string;
  unitPreset: string;
  unitDisplay: string;
  unit: string;
  conversionFactor: string;
  quantity: number;
  minQty: number;
  maxQty: string;
  site: string;
  location: string;
  unitCost: string;
  additionalCost: string;
  salePrice: string;
  basePrintPrice: string;
  maxPrice: string;
  discountPct: string;
  vatRate: string;
  vendableDirectement: boolean;
  linkMaterial: boolean;
  baseMaterialId: string;
  baseMaterialLabel: string;
  visiblePos: boolean;
  impactsPrice: boolean;
  impactsStock: boolean;
  usableProduction: boolean;
  linkMachine: boolean;
  supplierId: string;
  category: string;
  advancedOpen: boolean;
  dirty: boolean;
};

export const EMPTY_STOCK_COMPLETE_FORM: StockCompleteFormState = {
  label: '',
  sku: '',
  skuManual: false,
  skuManualReason: '',
  stockCategory: 'matiere_interne',
  family: 'Papier',
  subFamily: '',
  brand: '',
  paperType: '',
  grammage: '',
  formatLabel: '',
  color: '',
  sizeLabel: '',
  capacity: '',
  thickness: '',
  machineCompatible: '',
  supplierRef: '',
  unitPreset: '',
  unitDisplay: 'rame',
  unit: 'feuille',
  conversionFactor: '500',
  quantity: 0,
  minQty: 50,
  maxQty: '',
  site: 'AX0',
  location: '',
  unitCost: '',
  additionalCost: '',
  salePrice: '',
  basePrintPrice: '',
  maxPrice: '',
  discountPct: '0',
  vatRate: '20',
  vendableDirectement: false,
  linkMaterial: true,
  baseMaterialId: '',
  baseMaterialLabel: '',
  visiblePos: true,
  impactsPrice: true,
  impactsStock: true,
  usableProduction: true,
  linkMachine: false,
  supplierId: '',
  category: 'Papier',
  advancedOpen: false,
  dirty: false,
};

type SupplierOption = { id: string; name: string };

function BaseMaterialPickerField({
  valueId,
  valueLabel,
  onSelect,
}: {
  valueId: string;
  valueLabel: string;
  onSelect: (id: string, label: string) => void;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Array<{ id: string; name: string; sku?: string | null }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/admin-backoffice/pricing/base-materials?search=${encodeURIComponent(q.trim())}&activeOnly=1`, {
        signal: ac.signal,
      })
        .then(async (r) => {
          if (!r.ok) return;
          const body = await r.json();
          const items = Array.isArray(body) ? body : body?.items ?? body?.data ?? [];
          setHits(
            (items as Array<{ id: string; name?: string; label?: string; sku?: string }>).map((m) => ({
              id: m.id,
              name: m.name || m.label || m.id,
              sku: m.sku,
            })),
          );
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q]);

  return (
    <div className="stk-mt space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Matière BaseMaterial (recherche serveur)</label>
      {valueId ? (
        <div className="flex items-center justify-between gap-2 text-xs border border-border rounded-[7px] px-2 py-1.5">
          <span>{valueLabel || valueId}</span>
          <button type="button" className="text-red-600" onClick={() => onSelect('', '')}>Retirer</button>
        </div>
      ) : null}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nom / SKU matière (min. 2 car.)"
        className="w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm"
      />
      {loading && <p className="text-[10px] text-muted-foreground">Recherche…</p>}
      {hits.length > 0 && (
        <ul className="max-h-36 overflow-auto border border-border rounded-[7px] text-xs">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 hover:bg-muted"
                onClick={() => {
                  onSelect(h.id, h.sku ? `${h.name} (${h.sku})` : h.name);
                  setQ('');
                  setHits([]);
                }}
              >
                {h.name}{h.sku ? ` · ${h.sku}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: StockCompleteFormState) => Promise<void>;
  suppliers?: SupplierOption[];
};

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="stk-block">
      <div className="stk-block-head">
        <h4 className="stk-block-title">{title}</h4>
        {hint ? <p className="stk-block-hint">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="stk-field">
      <span className="stk-label">
        {label}
        {required ? <span className="stk-req">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function SwitchCard({
  title,
  desc,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`stk-switch-card ${checked ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <span className="stk-switch-card-track"><span className="stk-switch-card-thumb" /></span>
      <span className="stk-switch-card-text">
        <strong>{title}</strong>
        <small>{desc}</small>
      </span>
    </button>
  );
}

export function StockItemCompleteModal({ open, onOpenChange, onSubmit, suppliers = [] }: Props) {
  const [form, setForm] = useState<StockCompleteFormState>(EMPTY_STOCK_COMPLETE_FORM);
  const [skuLoading, setSkuLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [priceWarn, setPriceWarn] = useState(false);
  const [pendingSubmitMode, setPendingSubmitMode] = useState<'create' | 'draft' | null>(null);

  const vis = useMemo(() => getStockFormVisibility(form.stockCategory, form.family), [form.stockCategory, form.family]);

  const set = <K extends keyof StockCompleteFormState>(key: K, value: StockCompleteFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value, dirty: true }));
  };

  const costPrice =
    (form.unitCost ? Number(form.unitCost) : 0) + (form.additionalCost ? Number(form.additionalCost) : 0);
  const margin = computeMarginPct(
    form.salePrice ? Number(form.salePrice) : null,
    costPrice > 0 ? costPrice : form.unitCost ? Number(form.unitCost) : null,
  );
  const benefit = computeNetBenefit(
    form.salePrice ? Number(form.salePrice) : null,
    costPrice > 0 ? costPrice : form.unitCost ? Number(form.unitCost) : null,
  );
  const convPhrase = conversionLabel(
    form.unitDisplay || null,
    form.conversionFactor ? Number(form.conversionFactor) : null,
    form.unit || null,
  );
  const stdQty = standardQuantity(form.quantity, form.conversionFactor ? Number(form.conversionFactor) : null);
  const st = stockStatusClient(form.quantity, form.minQty);
  const stLabel = st === 'rupture' ? 'Rupture' : st === 'critique' ? 'Critique' : 'OK';

  const regenerateSku = useCallback(async () => {
    if (!form.label.trim() || form.skuManual) return;
    setSkuLoading(true);
    try {
      const r = await fetch('/api/stock/items/generate-sku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label,
          paperType: form.paperType || null,
          grammage: form.grammage || null,
          color: form.color || null,
          formatLabel: form.formatLabel || null,
          thickness: form.thickness || null,
          characteristic: form.sizeLabel || form.capacity || null,
          machineCompatible: form.machineCompatible || null,
          unitDisplay: form.unitDisplay || null,
          conversionFactor: form.conversionFactor ? Number(form.conversionFactor) : null,
        }),
      });
      const d = await r.json();
      if (r.ok && d.ok) setForm((f) => ({ ...f, sku: d.data.sku ?? d.data }));
    } finally {
      setSkuLoading(false);
    }
  }, [form]);

  useEffect(() => {
    if (!open || form.skuManual || !form.label.trim()) return;
    const t = setTimeout(() => { void regenerateSku(); }, 500);
    return () => clearTimeout(t);
  }, [
    open, form.skuManual, form.label, form.paperType, form.grammage, form.color,
    form.formatLabel, form.thickness, form.sizeLabel, form.capacity, form.machineCompatible,
    form.unitDisplay, form.conversionFactor, regenerateSku,
  ]);

  useEffect(() => {
    if (!open) setForm(EMPTY_STOCK_COMPLETE_FORM);
  }, [open]);

  useEffect(() => {
    if (form.stockCategory === 'vente_directe') {
      setForm((f) => ({ ...f, vendableDirectement: true, linkMaterial: false, visiblePos: false }));
    } else if (form.stockCategory === 'maintenance_piece') {
      setForm((f) => ({ ...f, linkMaterial: false, family: f.family || 'Maintenance', linkMachine: true }));
    } else if (form.stockCategory === 'matiere_interne') {
      setForm((f) => ({ ...f, linkMaterial: true, visiblePos: true, impactsPrice: true, impactsStock: true }));
    } else if (form.stockCategory === 'hybride') {
      setForm((f) => ({ ...f, linkMaterial: true }));
    }
  }, [form.stockCategory]);

  useEffect(() => {
    const sale = form.salePrice ? Number(form.salePrice) : null;
    setPriceWarn(sale != null && costPrice > 0 && sale < costPrice);
  }, [form.salePrice, costPrice]);

  const executeSubmit = async (mode: 'create' | 'draft') => {
    setSaving(true);
    try {
      await onSubmit({ ...form, dirty: mode === 'draft' });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (mode: 'create' | 'draft' = 'create') => {
    if (!form.label.trim()) return;
    if (form.skuManual && !form.skuManualReason.trim()) return;
    if (priceWarn && mode === 'create') {
      setPendingSubmitMode(mode);
      return;
    }
    await executeSubmit(mode);
  };

  const inputCls = 'stk-input';

  return (
    <>
    <AppFormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Nouveau stock / matière"
      description="Créez un article stock synchronisé avec achats, fournisseurs, matières & POS."
      maxWidthClass="max-w-4xl"
      className="stk-modal-body"
      footer={
        <div className="stk-footer">
          <button type="button" className="stk-btn-ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </button>
          <button type="button" className="stk-btn-secondary" onClick={() => void handleSubmit('draft')} disabled={saving || !form.label.trim()}>
            Enregistrer brouillon
          </button>
          <button
            type="button"
            className="stk-btn-primary"
            onClick={() => void handleSubmit('create')}
            disabled={saving || !form.label.trim() || (form.skuManual && !form.skuManualReason.trim())}
          >
            {saving ? 'Création…' : form.linkMaterial ? 'Créer & lier Matières DB' : 'Créer'}
          </button>
        </div>
      }
    >
      <div className="stk-form">
        <div className="stk-header-meta">
          {form.stockCategory && <span className="stk-cat-badge">{stockCategoryLabel(form.stockCategory)}</span>}
          {form.dirty && <span className="stk-draft-badge">Brouillon non enregistré</span>}
        </div>
        {/* Identification */}
        <Block title="Identification" hint="Nom, catégorie et référence auto">
          <div className="stk-grid stk-grid-2">
            <Field label="Nom article / matière" required>
              <input className={inputCls} value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Ex. Papier Offset 80g A4" />
            </Field>
            <Field label="Catégorie stock" required>
              <select className={inputCls} value={form.stockCategory} onChange={(e) => set('stockCategory', e.target.value)}>
                {STOCK_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id} title={c.description}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Famille" required>
              <input className={inputCls} value={form.family} onChange={(e) => { set('family', e.target.value); set('category', e.target.value); }} />
            </Field>
            <Field label="Sous-famille">
              <input className={inputCls} value={form.subFamily} onChange={(e) => set('subFamily', e.target.value)} />
            </Field>
          </div>

          <div className="stk-sku-row">
            <Field label="SKU généré automatiquement">
              <input
                className={`${inputCls} stk-sku-input`}
                value={form.sku}
                readOnly={!form.skuManual}
                onChange={(e) => set('sku', e.target.value.toUpperCase())}
                placeholder="Saisissez le nom pour générer…"
              />
            </Field>
            <button type="button" className="stk-btn-secondary stk-regen" onClick={() => void regenerateSku()} disabled={skuLoading || form.skuManual}>
              <RefreshCw size={14} className={skuLoading ? 'animate-spin' : ''} /> Régénérer
            </button>
          </div>
          <label className="stk-check">
            <input type="checkbox" checked={form.skuManual} onChange={(e) => set('skuManual', e.target.checked)} />
            Modification manuelle SKU (admin)
          </label>
          {form.skuManual && (
            <Field label="Justification SKU manuel" required>
              <input className={inputCls} value={form.skuManualReason} onChange={(e) => set('skuManualReason', e.target.value)} placeholder="Raison de la modification" />
            </Field>
          )}
          <Field label="Référence fournisseur">
            <input className={inputCls} value={form.supplierRef} onChange={(e) => set('supplierRef', e.target.value)} />
          </Field>
        </Block>

        {/* Caractéristiques conditionnelles */}
        {(vis.showPaperType || vis.showGrammage || vis.showFormat || vis.showColor || vis.showSize || vis.showCapacity || vis.showThickness || vis.showMachine || vis.showBrand) && (
          <Block title="Caractéristiques" hint="Affichées selon famille et catégorie">
            <div className="stk-grid stk-grid-3">
              {vis.showPaperType && (
                <Field label="Matière / support">
                  <input className={inputCls} value={form.paperType} onChange={(e) => set('paperType', e.target.value)} placeholder="Offset, Glossy…" />
                </Field>
              )}
              {vis.showGrammage && (
                <Field label="Grammage">
                  <input className={inputCls} value={form.grammage} onChange={(e) => set('grammage', e.target.value)} placeholder="80g, 300g…" />
                </Field>
              )}
              {vis.showFormat && (
                <Field label="Format / laize">
                  <input className={inputCls} value={form.formatLabel} onChange={(e) => set('formatLabel', e.target.value)} placeholder="A4, 160cm…" />
                </Field>
              )}
              {vis.showColor && (
                <Field label="Couleur">
                  <input className={inputCls} value={form.color} onChange={(e) => set('color', e.target.value)} />
                </Field>
              )}
              {vis.showSize && (
                <Field label="Taille">
                  <input className={inputCls} value={form.sizeLabel} onChange={(e) => set('sizeLabel', e.target.value)} placeholder="M, L, XL…" />
                </Field>
              )}
              {vis.showCapacity && (
                <Field label="Contenance">
                  <input className={inputCls} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="330ml…" />
                </Field>
              )}
              {vis.showThickness && (
                <Field label="Épaisseur">
                  <input className={inputCls} value={form.thickness} onChange={(e) => set('thickness', e.target.value)} />
                </Field>
              )}
              {vis.showMachine && (
                <Field label="Machine compatible">
                  <input className={inputCls} value={form.machineCompatible} onChange={(e) => set('machineCompatible', e.target.value)} placeholder="Epson L805, HP Indigo…" />
                </Field>
              )}
              {vis.showBrand && form.advancedOpen && (
                <Field label="Marque">
                  <input className={inputCls} value={form.brand} onChange={(e) => set('brand', e.target.value)} />
                </Field>
              )}
            </div>
            <button type="button" className="stk-advanced-toggle" onClick={() => set('advancedOpen', !form.advancedOpen)}>
              {form.advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {form.advancedOpen ? 'Masquer options avancées' : 'Afficher options avancées'}
            </button>
          </Block>
        )}

        {/* Unités */}
        {vis.showUnits && (
          <Block title="Unité & conversion">
            <div className="stk-grid stk-grid-2">
              <Field label="Preset conversion">
                <select
                  className={inputCls}
                  value={form.unitPreset}
                  onChange={(e) => {
                    const key = e.target.value;
                    set('unitPreset', key);
                    const preset = STOCK_UNIT_PRESETS[key];
                    if (preset) {
                      setForm((f) => ({
                        ...f,
                        unitPreset: key,
                        unitDisplay: key.startsWith('rame') ? 'rame' : key.split('_')[0],
                        unit: preset.unitStandard,
                        conversionFactor: String(preset.conversionFactor),
                        dirty: true,
                      }));
                    }
                  }}
                >
                  <option value="">Choisir un preset…</option>
                  <option value="piece">Pièce → 1 pièce</option>
                  {Object.entries(STOCK_UNIT_PRESETS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                  <option value="custom">Personnalisé</option>
                </select>
              </Field>
              <Field label="Unité d'achat / stockage" required>
                <select className={inputCls} value={form.unitDisplay} onChange={(e) => set('unitDisplay', e.target.value)}>
                  {STOCK_UNIT_DISPLAY_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Unité standard">
                <select className={inputCls} value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                  {['feuille', 'pcs', 'm', 'm²', 'litre', 'kg'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              {(form.unitPreset === 'custom' || form.advancedOpen) && (
                <Field label="Facteur conversion">
                  <input className={inputCls} type="number" min={0} value={form.conversionFactor} onChange={(e) => set('conversionFactor', e.target.value)} />
                </Field>
              )}
            </div>
            {convPhrase && <p className="stk-conv-preview">{convPhrase}</p>}
          </Block>
        )}

        {/* Stock */}
        <Block title="Stock initial">
          <div className="stk-grid stk-grid-2">
            <Field label="Quantité initiale">
              <input className={inputCls} type="number" min={0} value={form.quantity} onChange={(e) => set('quantity', Number(e.target.value))} />
            </Field>
            <Field label="Stock minimum">
              <input className={inputCls} type="number" min={0} value={form.minQty} onChange={(e) => set('minQty', Number(e.target.value))} />
            </Field>
            <Field label="Stock maximum">
              <input className={inputCls} type="number" min={0} value={form.maxQty} onChange={(e) => set('maxQty', e.target.value)} />
            </Field>
            <Field label="Site / dépôt">
              <input className={inputCls} value={form.site} onChange={(e) => set('site', e.target.value)} />
            </Field>
            <Field label="Emplacement">
              <input className={inputCls} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Allée, étagère…" />
            </Field>
          </div>
          <div className="stk-stock-summary">
            <span>Disponible : <strong>{form.quantity} {form.unitDisplay || form.unit}</strong>{stdQty != null ? ` / ${stdQty} ${form.unit}` : ''}</span>
            <span>Seuil : <strong>{form.minQty} {form.unit}</strong></span>
            <span className={`stk-stock-st ${st}`}>Statut : {stLabel}</span>
          </div>
        </Block>

        {/* Prix */}
        {vis.showPricing && (
          <Block title="Prix & marge">
            <div className="stk-grid stk-grid-3">
              <Field label="Prix achat HT">
                <input className={inputCls} type="number" min={0} value={form.unitCost} onChange={(e) => set('unitCost', e.target.value)} />
              </Field>
              <Field label="Frais / transport">
                <input className={inputCls} type="number" min={0} value={form.additionalCost} onChange={(e) => set('additionalCost', e.target.value)} />
              </Field>
              <Field label="Prix de revient">
                <input className={inputCls} readOnly value={costPrice > 0 ? costPrice : ''} />
              </Field>
              {vis.showSalePrice && (
                <Field label="Prix vente HT" required={form.vendableDirectement}>
                  <input className={`${inputCls} ${priceWarn ? 'stk-input-warn' : ''}`} type="number" min={0} value={form.salePrice} onChange={(e) => set('salePrice', e.target.value)} />
                </Field>
              )}
              <Field label="Remise %">
                <input className={inputCls} type="number" min={0} value={form.discountPct} onChange={(e) => set('discountPct', e.target.value)} />
              </Field>
              <Field label="TVA %">
                <input className={inputCls} type="number" min={0} value={form.vatRate} onChange={(e) => set('vatRate', e.target.value)} />
              </Field>
              <Field label="Marge %">
                <input className={inputCls} readOnly value={margin ?? '—'} />
              </Field>
              <Field label="Bénéfice net">
                <input className={inputCls} readOnly value={benefit ?? '—'} />
              </Field>
            </div>
            {priceWarn && (
              <p className="stk-price-alert"><AlertTriangle size={14} /> Prix vente inférieur au prix de revient</p>
            )}
            {vis.showBasePrintPrice && (
              <div className="stk-grid stk-grid-2 stk-mt">
                <Field label="Prix base impression s/finition">
                  <input className={inputCls} type="number" min={0} value={form.basePrintPrice} onChange={(e) => set('basePrintPrice', e.target.value)} />
                </Field>
                <Field label="Prix max / sécurité">
                  <input className={inputCls} type="number" min={0} value={form.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} />
                </Field>
              </div>
            )}
          </Block>
        )}

        {/* Fournisseur */}
        <Block title="Fournisseur">
          <Field label="Fournisseur principal">
            <select className={inputCls} value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)}>
              <option value="">— Sélectionner —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </Block>

        {/* Liens métier */}
        <Block title="Liaison métier">
          <div className="stk-switch-grid">
            {vis.showVendable && (
              <SwitchCard
                title="Vendable directement"
                desc="Visible en vente directe ou devis rapide"
                checked={form.vendableDirectement}
                onChange={(v) => set('vendableDirectement', v)}
              />
            )}
            {vis.showUsableProduction && (
              <SwitchCard
                title="Utilisable en production"
                desc="Consommable par commandes / GPAO"
                checked={form.usableProduction}
                onChange={(v) => set('usableProduction', v)}
              />
            )}
            {vis.showLinkMaterial && (
              <SwitchCard
                title="Lier Matières & prix de base"
                desc="Crée ou met à jour la matière POS (brouillon)"
                checked={form.linkMaterial}
                onChange={(v) => set('linkMaterial', v)}
                disabled={form.stockCategory === 'vente_directe'}
              />
            )}
            {vis.showLinkMaterial && form.linkMaterial && (
              <BaseMaterialPickerField
                valueId={form.baseMaterialId}
                valueLabel={form.baseMaterialLabel}
                onSelect={(id, label) => {
                  set('baseMaterialId', id);
                  set('baseMaterialLabel', label);
                }}
              />
            )}
            {vis.showLinkMachine && (
              <SwitchCard
                title="Lier machine / maintenance"
                desc="Utilisable dans tickets maintenance"
                checked={form.linkMachine}
                onChange={(v) => set('linkMachine', v)}
              />
            )}
          </div>
          {vis.showPosToggles && form.linkMaterial && (
            <div className="stk-pos-toggles stk-mt">
              <label className="stk-check"><input type="checkbox" checked={form.visiblePos} onChange={(e) => set('visiblePos', e.target.checked)} /> Visible POS</label>
              <label className="stk-check"><input type="checkbox" checked={form.impactsPrice} onChange={(e) => set('impactsPrice', e.target.checked)} /> Impact prix</label>
              <label className="stk-check"><input type="checkbox" checked={form.impactsStock} onChange={(e) => set('impactsStock', e.target.checked)} /> Impact stock</label>
            </div>
          )}
        </Block>
      </div>
    </AppFormModal>
    <ConfirmDialog
      open={pendingSubmitMode !== null}
      onOpenChange={(next) => {
        if (!next) setPendingSubmitMode(null);
      }}
      title="Prix vente inférieur au prix de revient"
      description="Le prix de vente est inférieur au prix de revient — confirmer la création ?"
      confirmLabel="Confirmer"
      onConfirm={() => {
        const mode = pendingSubmitMode;
        setPendingSubmitMode(null);
        if (mode) void executeSubmit(mode);
      }}
    />
    </>
  );
}
