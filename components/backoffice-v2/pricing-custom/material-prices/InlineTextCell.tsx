'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';

type Props = {
  value: string;
  onSave: (v: string) => Promise<void>;
  canEdit: boolean;
  placeholder?: string;
  className?: string;
  validate?: (v: string) => string | null;
};

export function InlineTextCell({
  value,
  onSave,
  canEdit,
  placeholder = 'Saisir…',
  className = '',
  validate,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<'idle' | 'saving' | 'err'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = () => {
    setDraft(value);
    setEditing(false);
    setStatus('idle');
  };

  const save = async () => {
    const next = draft.trim();
    if (next === value.trim()) {
      setEditing(false);
      return;
    }
    const err = validate?.(next);
    if (err) {
      uxToast.error(err);
      setStatus('err');
      return;
    }
    setStatus('saving');
    try {
      await onSave(next);
      setEditing(false);
      setStatus('idle');
      uxToast.success('Enregistré');
    } catch (e) {
      setStatus('err');
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  if (editing) {
    return (
      <div className="mp-inline-edit" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="mp-inline-input mp-inline-input-wide"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={() => void save()}
        />
        <button type="button" className="mp-inline-btn" onClick={() => void save()} aria-label="OK">
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
      className={`mp-text-cell ${canEdit ? 'mp-text-editable' : ''} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        if (canEdit) setEditing(true);
      }}
      disabled={!canEdit}
      title={canEdit ? (value || 'Cliquer pour modifier') : value || placeholder}
    >
      {value || <span className="mp-muted">{placeholder}</span>}
    </button>
  );
}
