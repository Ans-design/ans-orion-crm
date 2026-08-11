'use client';

import type { ReactNode } from 'react';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { OrionAuthFormField } from './orion-auth-form-field';

type OrionPasswordInputProps = {
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
  shake?: boolean;
  /** Démarre avec l’aperçu visible (ex. local). */
  defaultShowPassword?: boolean;
};

/** Mot de passe auth — OrionAuthFormField + aperçu afficher/masquer. */
export function OrionPasswordInput({
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
  shake,
  defaultShowPassword = false,
}: OrionPasswordInputProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const [showPw, setShowPw] = useState(defaultShowPassword);
  const [capsLock, setCapsLock] = useState(false);

  // Local aperçu : activer quand le flag arrive après le 1er rendu (isLocalHost).
  useEffect(() => {
    if (defaultShowPassword) setShowPw(true);
  }, [defaultShowPassword]);

  const onKeyEvent = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'));
  };

  const togglePreview = () => {
    if (disabled || loading) return;
    setShowPw((v) => !v);
  };

  return (
    <OrionAuthFormField
      label={label}
      htmlFor={inputId}
      hint={!error ? hint : undefined}
      error={error ?? undefined}
      required={required}
      labelAction={labelAction}
      className={className}
      shake={shake}
    >
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
          className="pl-10 pr-12 h-11 focus-visible:ring-2 focus-visible:ring-[var(--orion-red)]"
          onKeyDown={onKeyEvent}
          onKeyUp={onKeyEvent}
          aria-invalid={!!error}
          aria-describedby={showPw ? `${inputId}-preview` : undefined}
        />
        <Lock
          size={14}
          className="absolute left-3 top-3.5 z-[1] text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <button
          type="button"
          onClick={togglePreview}
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled || loading}
          className="absolute right-2 top-1/2 z-[2] -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-[7px] text-muted-foreground hover:text-foreground hover:bg-[var(--bg-chip)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orion-red)] disabled:opacity-50"
          aria-label={showPw ? 'Masquer le mot de passe' : 'Aperçu du mot de passe'}
          title={showPw ? 'Masquer' : 'Aperçu'}
          aria-pressed={showPw}
          aria-controls={inputId}
        >
          {showPw ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
      {showPw ? (
        <p id={`${inputId}-preview`} className="text-[10px] text-[var(--login-panel-muted)]" role="status">
          Aperçu activé — le mot de passe est visible
        </p>
      ) : null}
      {capsLock ? (
        <p className="text-[10px] text-amber-600 dark:text-amber-400" role="status">
          Verrouillage majuscules activé
        </p>
      ) : null}
    </OrionAuthFormField>
  );
}
