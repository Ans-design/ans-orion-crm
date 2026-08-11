'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  value: string | number;
  type?: 'text' | 'number';
  canEdit?: boolean;
  className?: string;
  displayClassName?: string;
  formatDisplay?: (v: string | number) => string;
  onSave: (next: string | number) => void | Promise<void>;
  /** `click` = un clic ouvre l’édition (tableaux densés) ; défaut double-clic. */
  activateOn?: 'dblclick' | 'click';
};

/** Double-clic (ou clic) → édition ; Entrée = sauver ; Échap = annuler. */
export function InlineEditableCell({
  value,
  type = 'text',
  canEdit = true,
  className,
  displayClassName,
  formatDisplay,
  onSave,
  activateOn = 'dblclick',
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value ?? ''));
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = async () => {
    if (busy) return;
    const next = type === 'number' ? Number(draft) : draft;
    if (String(next) === String(value)) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(String(value ?? ''));
      setEditing(false);
    }
  };

  if (!canEdit) {
    return (
      <span className={displayClassName}>
        {formatDisplay ? formatDisplay(value) : String(value ?? '—')}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        className={cn('cps-input inline-edit-input py-1 text-xs font-mono', className)}
        value={draft}
        disabled={busy}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={onKeyDown}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-[7px] px-1.5 py-1 text-left hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:ring-1 hover:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)]',
        displayClassName,
      )}
      title={activateOn === 'click' ? 'Cliquer pour modifier' : 'Double-clic pour modifier'}
      onClick={(e) => {
        e.stopPropagation();
        if (activateOn === 'click') setEditing(true);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (activateOn === 'dblclick') setEditing(true);
      }}
    >
      {formatDisplay ? formatDisplay(value) : String(value ?? '—')}
    </button>
  );
}
