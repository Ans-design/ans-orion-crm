'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uxToast } from '@/lib/ux/feedback';
import {
  deriveMaterialTableFields,
  type CharacteristicType,
} from '@/lib/backoffice/material-table-fields';
import type { MaterialPriceUnifiedRow } from '../pricing-custom/material-prices/types';

type Props = {
  row: MaterialPriceUnifiedRow;
  canEdit: boolean;
  onSave: (value: string, charType?: CharacteristicType) => Promise<void>;
};

const TYPE_OPTIONS: { id: CharacteristicType; label: string }[] = [
  { id: 'grammage', label: 'Grammage' },
  { id: 'epaisseur', label: 'Épaisseur' },
  { id: 'laize', label: 'Laize' },
  { id: 'format', label: 'Format' },
  { id: 'taille', label: 'Taille' },
  { id: 'face', label: 'Face' },
  { id: 'finition', label: 'Finition' },
  { id: 'couleur', label: 'Couleur' },
  { id: 'autre', label: 'Autre' },
];

export function MasterDataCharacteristicCell({ row, canEdit, onSave }: Props) {
  const fields = deriveMaterialTableFields(row);
  const c = fields.mainCharacteristic;
  const charType: CharacteristicType = c?.type ?? 'grammage';
  const displayValue = c?.displayValue ?? '';

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftType, setDraftType] = useState<CharacteristicType>(charType);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const start = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    setDraft(displayValue);
    setDraftType(charType);
    setEditing(true);
    setStatus('idle');
  };

  const commit = async () => {
    const next = draft.trim();
    if (next === displayValue && draftType === charType) {
      setEditing(false);
      setStatus('idle');
      return;
    }
    if (!next && !displayValue) {
      setEditing(false);
      return;
    }

    setStatus('saving');
    try {
      await onSave(next, draftType);
      setStatus('saved');
      setEditing(false);
      uxToast.success('Caractéristique enregistrée');
      window.setTimeout(() => setStatus('idle'), 1400);
    } catch {
      setStatus('error');
      uxToast.error('Enregistrement impossible');
    }
  };

  if (editing) {
    return (
      <span
        className={cn('orion-master-char-cell', c?.isInconsistent && 'is-inconsistent')}
        onClick={(e) => e.stopPropagation()}
      >
        <select
          className="orion-master-char-type-select"
          value={draftType}
          onChange={(e) => setDraftType(e.target.value as CharacteristicType)}
          aria-label="Type caractéristique"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="text"
          className="orion-master-char-input"
          value={draft}
          placeholder={draftType === 'epaisseur' ? 'ex. 3mm' : draftType === 'format' ? 'ex. A4' : 'ex. 250g'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commit();
            if (e.key === 'Escape') {
              setEditing(false);
              setStatus('idle');
            }
          }}
          onBlur={() => void commit()}
        />
      </span>
    );
  }

  if (!c) {
    if (!canEdit) return <span className="orion-master-muted">Non renseigné</span>;
    return (
      <button
        type="button"
        className="orion-master-char-cell is-editable-empty"
        onClick={start}
        title="Cliquer pour saisir une caractéristique"
      >
        <span className="orion-master-char-type">Caractéristique</span>
        <span className="orion-master-char-value orion-master-muted">+ Ajouter</span>
      </button>
    );
  }

  return (
    <span
      className={cn('orion-master-char-cell', c.isInconsistent && 'is-inconsistent')}
      title={c.isInconsistent ? `${c.display} — unité incohérente` : c.display}
    >
      <button
        type="button"
        className={cn('orion-master-char-type', canEdit && 'is-editable')}
        onClick={start}
        disabled={!canEdit}
      >
        {c.typeLabel}
      </button>
      <button
        type="button"
        className={cn(
          'orion-master-char-value is-editable',
          status === 'saving' && 'is-saving',
          status === 'saved' && 'is-saved',
          status === 'error' && 'is-error',
        )}
        onClick={start}
        disabled={!canEdit || status === 'saving'}
        title={canEdit ? 'Cliquer pour modifier' : undefined}
      >
        {status === 'saving' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin inline" />
        ) : status === 'saved' ? (
          <>
            {c.displayValue}
            <Check className="h-3 w-3 text-emerald-400 inline ml-1" />
          </>
        ) : (
          c.displayValue
        )}
      </button>
    </span>
  );
}
