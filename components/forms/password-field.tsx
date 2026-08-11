'use client';

import { useId, useState, type ReactNode, type KeyboardEvent } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PasswordFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  loading?: boolean;
  minLength?: number;
  required?: boolean;
  error?: string | null;
  hint?: string;
  labelAction?: ReactNode;
  className?: string;
};

/** Champ mot de passe avec label séparé, lien optionnel, œil afficher/masquer et états focus/erreur. */
export function PasswordField({
  id: idProp,
  label = 'Mot de passe',
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  disabled = false,
  loading = false,
  minLength,
  required,
  error,
  hint,
  labelAction,
  className,
}: PasswordFieldProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const [showPw, setShowPw] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const onKeyEvent = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="w-full">
        <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-muted-foreground shrink-0"
          >
            {label}
            {required ? <span className="sr-only"> (obligatoire)</span> : null}
          </label>
          {labelAction ? (
            <div className="flex shrink-0 sm:justify-end">{labelAction}</div>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <Input
          id={inputId}
          type={showPw ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          disabled={disabled || loading}
          variant={error ? 'error' : 'default'}
          className="pl-10 pr-10 focus-visible:ring-2 focus-visible:ring-primary/30"
          onKeyDown={onKeyEvent}
          onKeyUp={onKeyEvent}
          aria-invalid={!!error}
          aria-describedby={[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        />
        <Lock size={14} className="absolute left-3 top-3 text-muted-foreground pointer-events-none" aria-hidden />
        <button
          type="button"
          tabIndex={0}
          onClick={() => setShowPw((v) => !v)}
          disabled={disabled || loading}
          className="absolute right-3 top-2.5 p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded disabled:opacity-50"
          aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={showPw}
        >
          {showPw ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>

      {capsLock ? (
        <p className="text-[10px] text-amber-600 dark:text-amber-400" role="status">
          Verrouillage majuscules activé
        </p>
      ) : null}

      {hint && !error ? (
        <p id={hintId} className="text-[10px] text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
