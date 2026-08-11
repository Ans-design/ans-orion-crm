'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppButton } from '@/components/ui/app-ui';
import { uxToast } from '@/lib/ux/feedback';
import {
  DEFAULT_GF_ADMIN_PRICING,
  type GfAdminPricingConfig,
} from '@/lib/grand-format/gf-admin-config';

const FIELDS: Array<{ key: keyof GfAdminPricingConfig; label: string; hint: string; step?: number }> = [
  { key: 'eyeletUnitPriceAr', label: 'Œillet (Ar / pièce)', hint: 'Prix unitaire pose œillet' },
  { key: 'ourletPerMlAr', label: 'Ourlet (Ar / m)', hint: 'Périmètre 2×(L+l)' },
  { key: 'fourreauPerMlAr', label: 'Fourreau (Ar / m)', hint: 'Côté haut / bas' },
  { key: 'renfortPerMlAr', label: 'Renfort (Ar / m)', hint: 'Périmètre renforcé' },
  { key: 'raccordPerMlAr', label: 'Raccord / soudure (Ar / m)', hint: 'Assemblage multi-bandes' },
  { key: 'laizeMarginCm', label: 'Seuil laize (cm)', hint: 'Règle −30 cm', step: 1 },
  { key: 'wasteRate', label: 'Perte stock (0–1)', hint: 'Ex. 0,08 = 8 %', step: 0.01 },
];

type Props = { canEdit?: boolean };

export function GfBacheFinishingsAdminPanel({ canEdit = false }: Props) {
  const [config, setConfig] = useState<GfAdminPricingConfig>({ ...DEFAULT_GF_ADMIN_PRICING });
  const [source, setSource] = useState<'db' | 'defaults'>('defaults');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/grand-format/bache-finishings');
      const j = await r.json();
      if (r.ok && j?.data?.config) {
        setConfig({ ...DEFAULT_GF_ADMIN_PRICING, ...j.data.config });
        setSource(j.data.source === 'db' ? 'db' : 'defaults');
      }
    } catch {
      uxToast.error('Impossible de charger les tarifs bâche');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/grand-format/bache-finishings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const j = await r.json();
      if (!r.ok) {
        uxToast.error(j?.error?.message ?? 'Enregistrement impossible');
        return;
      }
      setConfig({ ...DEFAULT_GF_ADMIN_PRICING, ...j.data.config });
      setSource('db');
      uxToast.success('Tarifs bâche enregistrés — POS live mis à jour');
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!canEdit || !window.confirm('Réinitialiser aux valeurs par défaut ORION ?')) return;
    setSaving(true);
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/grand-format/bache-finishings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      const j = await r.json();
      if (!r.ok) {
        uxToast.error(j?.error?.message ?? 'Reset impossible');
        return;
      }
      setConfig({ ...DEFAULT_GF_ADMIN_PRICING, ...j.data.config });
      setSource('defaults');
      uxToast.info('Tarifs bâche réinitialisés');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ans-card-premium p-4 space-y-4 mb-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold">Finitions bâche — tarifs Admin</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Source de vérité POS (œillets + ourlet / fourreau / renfort / raccord).{' '}
            {source === 'db' ? 'Enregistré en base.' : 'Valeurs par défaut code.'}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <AppButton type="button" variant="outline" size="sm" disabled={saving || loading} onClick={() => void reset()}>
              Défauts
            </AppButton>
            <AppButton type="button" size="sm" disabled={saving || loading} onClick={() => void save()}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </AppButton>
          </div>
        )}
      </header>

      {loading ? (
        <p className="text-xs text-muted-foreground">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {f.label}
              <input
                type="number"
                min={0}
                step={f.step ?? 100}
                disabled={!canEdit}
                className="fc mt-1 text-sm font-mono"
                value={Number(config[f.key])}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    [f.key]: e.target.value === '' ? 0 : Number(e.target.value),
                  }))
                }
              />
              <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal opacity-80">
                {f.hint}
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
