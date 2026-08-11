'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  value: number | null | undefined;
  onSave: (v: number | null) => Promise<void>;
  canEdit: boolean;
  min?: number;
  className?: string;
};

function formatAr(n: number | null | undefined, canEdit: boolean) {
  if (n == null || Number.isNaN(n)) return canEdit ? 'Saisir prix' : '—';
  return `${Math.round(n).toLocaleString('fr-FR')} Ar`;
}

export function MasterDataPriceCell({ value, onSave, canEdit, min = 0, className }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const start = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    setDraft(value != null ? String(value) : '');
    setEditing(true);
    setStatus('idle');
  };

  const commit = async () => {
    const n = draft.trim() === '' ? null : Number(draft.replace(/\s/g, ''));
    if (n != null && (Number.isNaN(n) || n < min)) {
      setStatus('error');
      return;
    }
    if (n === value || (n == null && value == null)) {
      setEditing(false);
      setStatus('idle');
      return;
    }

    setStatus('saving');
    try {
      await onSave(n);
      setStatus('saved');
      setEditing(false);
      window.setTimeout(() => setStatus('idle'), 1400);
    } catch {
      setStatus('error');
    }
  };

  if (editing) {
    return (
      <div
        className={cn('orion-master-price is-editing', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          className="orion-master-price-input"
          value={draft}
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
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'orion-master-price',
        canEdit && 'is-editable',
        (value == null || Number.isNaN(value)) && canEdit && 'is-empty',
        status === 'saving' && 'is-saving',
        status === 'saved' && 'is-saved',
        status === 'error' && 'is-error',
        className,
      )}
      onClick={start}
      disabled={!canEdit}
      title={canEdit ? 'Cliquer pour modifier' : undefined}
    >
      {status === 'saving' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin inline" />
      ) : status === 'saved' ? (
        <>
          {formatAr(value, canEdit)}
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        </>
      ) : (
        formatAr(value, canEdit)
      )}
    </button>
  );
}
