'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';

type Props = {
  value: number | null | undefined;
  onSave: (v: number | null) => Promise<void>;
  canEdit: boolean;
  suffix?: string;
  min?: number;
};

function formatAr(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${Math.round(n).toLocaleString('fr-FR')} Ar`;
}

export function InlinePriceCell({ value, onSave, canEdit, suffix, min = 0 }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const start = () => {
    if (!canEdit) return;
    setDraft(value != null ? String(value) : '');
    setEditing(true);
    setStatus('idle');
  };

  const cancel = () => {
    setEditing(false);
    setStatus('idle');
  };

  const save = async () => {
    const n = draft.trim() === '' ? null : Number(draft);
    if (n != null && (Number.isNaN(n) || n < min)) {
      setStatus('err');
      return;
    }
    setStatus('saving');
    try {
      await onSave(n);
      setStatus('ok');
      setEditing(false);
      setTimeout(() => setStatus('idle'), 1200);
    } catch {
      setStatus('err');
    }
  };

  if (editing) {
    return (
      <div className="mp-inline-edit">
        <input
          ref={inputRef}
          type="number"
          min={min}
          className="mp-inline-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
            if (e.key === 'Escape') cancel();
          }}
        />
        <button type="button" className="mp-inline-btn" onClick={() => void save()} aria-label="Enregistrer">
          {status === 'saving' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </button>
        <button type="button" className="mp-inline-btn" onClick={cancel} aria-label="Annuler">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`mp-price-cell ${canEdit ? 'mp-price-editable' : ''} ${status === 'ok' ? 'mp-price-saved' : ''}`}
      onClick={start}
      disabled={!canEdit}
    >
      {formatAr(value)}
      {suffix ? <span className="text-muted-foreground text-[10px] ml-0.5">{suffix}</span> : null}
    </button>
  );
}
