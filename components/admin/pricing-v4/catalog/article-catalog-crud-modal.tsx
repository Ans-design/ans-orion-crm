'use client';

import { useEffect, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import type { CalculationType } from '@/lib/pricing/config-to-dynamic-pricing';
import { AppButton } from '@/components/ui/app-ui';

export type ArticleCrudForm = {
  articleId: string;
  articleLabel: string;
  family: string;
  calculationType: CalculationType;
  saleUnit: string;
  prixBase: number | null;
  status: string;
};

const FAMILY_OPTIONS = [
  { value: 'grand_format', label: 'Grand format' },
  { value: 'imprimerie', label: 'Imprimerie' },
  { value: 'textile', label: 'Textile' },
  { value: 'goodies', label: 'Goodies' },
  { value: 'evenementiel', label: 'Événementiel' },
  { value: 'autre', label: 'Autre' },
];

const CALC_OPTIONS: { value: CalculationType; label: string }[] = [
  { value: 'piece', label: 'À la pièce' },
  { value: 'm2', label: 'Au m²' },
  { value: 'cm2', label: 'Au cm²' },
  { value: 'laize', label: 'Laize' },
  { value: 'developpe', label: 'Développé' },
  { value: 'formula', label: 'Formule' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Actif' },
  { value: 'archived', label: 'Archivé' },
];

const EMPTY_FORM: ArticleCrudForm = {
  articleId: '',
  articleLabel: '',
  family: 'autre',
  calculationType: 'piece',
  saleUnit: 'pièce',
  prixBase: null,
  status: 'draft',
};

type Props = {
  mode: 'create' | 'edit' | null;
  initial?: Partial<ArticleCrudForm> | null;
  onClose: () => void;
  onSaved: (articleId: string) => void;
};

export function ArticleCatalogCrudModal({ mode, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ArticleCrudForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!mode) return;
    setForm({
      ...EMPTY_FORM,
      ...initial,
      articleId: initial?.articleId ?? '',
      articleLabel: initial?.articleLabel ?? '',
      family: initial?.family ?? 'autre',
      calculationType: (initial?.calculationType as CalculationType) ?? 'piece',
      saleUnit: initial?.saleUnit ?? 'pièce',
      prixBase: initial?.prixBase ?? null,
      status: initial?.status ?? 'draft',
    });
  }, [mode, initial]);

  if (!mode) return null;

  const isCreate = mode === 'create';

  const save = async () => {
    const articleId = form.articleId.trim();
    if (isCreate && !articleId) {
      uxToast.error('Identifiant article requis');
      return;
    }
    if (!form.articleLabel.trim()) {
      uxToast.error('Libellé requis');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        articleLabel: form.articleLabel.trim(),
        family: form.family,
        calculationType: form.calculationType,
        saleUnit: form.saleUnit.trim() || 'pièce',
        prixBase: form.prixBase,
        status: form.status,
        ...(isCreate ? { articleId } : {}),
      };

      const url = isCreate
        ? '/api/backoffice/articles'
        : `/api/backoffice/articles/${encodeURIComponent(articleId)}`;
      const r = await fetch(url, {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok) {
        uxToast.success(isCreate ? 'Article créé' : 'Article mis à jour');
        onSaved(articleId);
        onClose();
      } else {
        uxToast.error(getApiErrorMessage(d, 'Enregistrement impossible'), 'Enregistrement impossible');
      }
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSaving(false);
  };

  return (
    <div
      className="modal-blocking-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="acat-crud-title"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="modal-blocking-card acat-crud-card" onClick={(e) => e.stopPropagation()}>
        <div className="acat-crud-head">
          <h3 id="acat-crud-title">{isCreate ? 'Nouvel article' : 'Modifier la fiche article'}</h3>
          <p>
            {isCreate
              ? 'Crée un profil tarifaire backoffice (brouillon par défaut).'
              : 'Met à jour les métadonnées catalogue de l’article.'}
          </p>
        </div>

        <div className="acat-crud-form">
          <label className="acat-crud-field">
            <span>Identifiant</span>
            <input
              type="text"
              className="fc"
              value={form.articleId}
              onChange={(e) => setForm({ ...form, articleId: e.target.value })}
              disabled={!isCreate || saving}
              placeholder="ex. imp-flyer-a5"
              autoFocus={isCreate}
            />
          </label>

          <label className="acat-crud-field">
            <span>Libellé</span>
            <input
              type="text"
              className="fc"
              value={form.articleLabel}
              onChange={(e) => setForm({ ...form, articleLabel: e.target.value })}
              disabled={saving}
              placeholder="Nom affiché POS / backoffice"
            />
          </label>

          <div className="acat-crud-row">
            <label className="acat-crud-field">
              <span>Famille</span>
              <select
                className="fc"
                value={form.family}
                onChange={(e) => setForm({ ...form, family: e.target.value })}
                disabled={saving}
              >
                {FAMILY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="acat-crud-field">
              <span>Calcul</span>
              <select
                className="fc"
                value={form.calculationType}
                onChange={(e) => setForm({ ...form, calculationType: e.target.value as CalculationType })}
                disabled={saving}
              >
                {CALC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="acat-crud-row">
            <label className="acat-crud-field">
              <span>Unité de vente</span>
              <input
                type="text"
                className="fc"
                value={form.saleUnit}
                onChange={(e) => setForm({ ...form, saleUnit: e.target.value })}
                disabled={saving}
              />
            </label>

            <label className="acat-crud-field">
              <span>Prix base (Ar)</span>
              <input
                type="number"
                className="fc"
                value={form.prixBase ?? ''}
                onChange={(e) => setForm({
                  ...form,
                  prixBase: e.target.value === '' ? null : Number(e.target.value),
                })}
                disabled={saving}
                min={0}
              />
            </label>
          </div>

          <label className="acat-crud-field">
            <span>Statut catalogue</span>
            <select
              className="fc"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              disabled={saving}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal-blocking-footer acat-crud-footer">
          <AppButton
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            Annuler
          </AppButton>
          <AppButton
            type="button"
            variant="default"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Enregistrement…' : isCreate ? 'Créer' : 'Enregistrer'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
