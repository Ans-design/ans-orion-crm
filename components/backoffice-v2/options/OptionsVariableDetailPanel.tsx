'use client';

/** @deprecated Édition inline dans ChipsDataTable — panneau conservé, non monté. */
import { useEffect, useState } from 'react';

import type { ChipTableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';

import { OptionsToggleCell } from './OptionsToggleCell';

import { OptionsSourceBadge } from './OptionsSourceBadge';

import { OptionsEmptyState } from './OptionsEmptyState';

import { uxToast } from '@/lib/ux/feedback';
import { AppButton } from '@/components/ui/app-ui';



type Props = {

  row: ChipTableRow | null;

  canEdit: boolean;

  onSaved: () => void;

  onClose: () => void;

  onSelectFirst?: () => void;

};



export function OptionsVariableDetailPanel({ row, canEdit, onSaved, onClose, onSelectFirst }: Props) {

  const [draft, setDraft] = useState({

    visiblePos: false,

    impactsPrice: false,

    impactsStock: false,

    impactsProduction: false,

    isInformational: false,

    active: true,

    archived: false,

    label: '',

  });

  const [saving, setSaving] = useState(false);



  useEffect(() => {

    if (!row) return;

    setDraft({

      visiblePos: row.visiblePos,

      impactsPrice: row.impactsPrice,

      impactsStock: row.impactsStock,

      impactsProduction: row.impactsProduction,

      isInformational: row.isInformational,

      active: row.active && !row.archived,

      archived: row.archived,

      label: row.label,

    });

  }, [row]);



  if (!row) {

    return (

      <aside className="ab2-options-detail">

        <OptionsEmptyState

          title="Aucune variable sélectionnée"

          description="Sélectionnez une variable pour consulter ou modifier ses réglages."

          actions={onSelectFirst && (

            <AppButton type="button" variant="ghost" className="text-xs" onClick={onSelectFirst}>

              Voir la première variable

            </AppButton>

          )}

        />

      </aside>

    );

  }



  const setPrice = (v: boolean) => {

    setDraft((d) => ({

      ...d,

      impactsPrice: v,

      isInformational: v ? false : d.isInformational,

    }));

  };



  const setIndicative = (v: boolean) => {

    setDraft((d) => ({

      ...d,

      isInformational: v,

      impactsPrice: v ? false : d.impactsPrice,

    }));

  };



  const save = async () => {

    if (!canEdit) return;

    setSaving(true);

    try {

      const body: Record<string, boolean | string> = {

        visiblePos: draft.visiblePos,

        impactsStock: draft.impactsStock,

        impactsProduction: draft.impactsProduction,

        isInformational: draft.isInformational,

        impactsPrice: draft.isInformational ? false : draft.impactsPrice,

        active: draft.archived ? false : draft.active,

        label: draft.label,

      };

      const r = await fetch(`/api/admin-backoffice/options/chips/${row.groupId}`, {

        method: 'PATCH',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(body),

      });

      const d = await r.json();

      if (r.ok && d.ok) {

        uxToast.success('Variable enregistrée');

        onSaved();

      } else uxToast.error(d.error?.message ?? 'Erreur');

    } catch {

      uxToast.error('Erreur réseau');

    }

    setSaving(false);

  };



  return (

    <aside className="ab2-options-detail">

      <div className="ab2-options-detail-head">

        <h4>Détail variable</h4>

        <AppButton type="button" variant="ghost" className="text-xs" onClick={onClose}>Fermer</AppButton>

      </div>



      <div className="ab2-detail-meta-grid">

        <div><span>Article</span><strong>{row.articleLabel}</strong></div>

        <div><span>Bloc</span><strong>{row.blockKey}</strong></div>

        <div><span>Champ</span><code>{row.fieldKey}</code></div>

        <div><span>Source</span><OptionsSourceBadge source={row.source} /></div>

      </div>



      <label className="ab2-detail-field">

        <span>Libellé</span>

        <input

          className="ab2-input w-full"

          value={draft.label}

          disabled={!canEdit}

          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}

        />

      </label>



      <div className="ab2-detail-toggles">

        <div className="ab2-detail-toggle-row">

          <span>Actif</span>

          <OptionsToggleCell label="Actif" checked={draft.active} disabled={!canEdit || draft.archived} tone="active" onChange={(v) => setDraft((d) => ({ ...d, active: v }))} />

        </div>

        <div className="ab2-detail-toggle-row">

          <span>Actif catalogue</span>

          <OptionsToggleCell label="Actif catalogue" checked={draft.visiblePos} disabled={!canEdit} tone="pos" onChange={(v) => setDraft((d) => ({ ...d, visiblePos: v }))} />

        </div>

        <div className="ab2-detail-toggle-row">

          <span>Impact prix</span>

          <OptionsToggleCell label="Impact prix" checked={draft.impactsPrice} disabled={!canEdit} tone="price" onChange={setPrice} />

        </div>

        <div className="ab2-detail-toggle-row">

          <span>Indicatif</span>

          <OptionsToggleCell label="Indicatif" checked={draft.isInformational} disabled={!canEdit || draft.impactsPrice} tone="indicative" onChange={setIndicative} />

        </div>

        <div className="ab2-detail-toggle-row">

          <span>Impact stock</span>

          <OptionsToggleCell label="Impact stock" checked={draft.impactsStock} disabled={!canEdit} tone="stock" onChange={(v) => setDraft((d) => ({ ...d, impactsStock: v }))} />

        </div>

        <div className="ab2-detail-toggle-row">

          <span>Impact prod</span>

          <OptionsToggleCell label="Impact prod" checked={draft.impactsProduction} disabled={!canEdit} tone="prod" onChange={(v) => setDraft((d) => ({ ...d, impactsProduction: v }))} />

        </div>

        <div className="ab2-detail-toggle-row">

          <span>Archivé</span>

          <OptionsToggleCell label="Archivé" checked={draft.archived} disabled={!canEdit} tone="archived" onChange={(v) => setDraft((d) => ({ ...d, archived: v, active: v ? false : d.active }))} />

        </div>

      </div>



      <p className="ab2-detail-hint">

        Indicatif et impact prix sont exclusifs. Les changements non publiés restent en backoffice jusqu&apos;à publication POS.

      </p>



      {canEdit && (

        <AppButton type="button" variant="default" className="w-full mt-4" disabled={saving} onClick={save}>

          {saving ? 'Enregistrement…' : 'Enregistrer'}

        </AppButton>

      )}

    </aside>

  );

}

