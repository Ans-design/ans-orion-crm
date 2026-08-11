'use client';

import { cn } from '@/lib/utils';

export type AppToggleTone =
  | 'active'
  | 'pos'
  | 'price'
  | 'stock'
  | 'prod'
  | 'indicative'
  | 'archived';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: AppToggleTone;
  /** Accessibilité + tooltip */
  label?: string;
  /** Tooltip quand désactivé (permissions) */
  disabledTitle?: string;
};

/** Toggle ON/OFF unifié — actif à droite, inactif à gauche. */
export function AppToggle({
  checked,
  onChange,
  disabled,
  loading,
  tone = 'active',
  label,
  disabledTitle = 'Action non autorisée',
}: Props) {
  const title = disabled ? disabledTitle : label;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled || loading}
      className={cn(
        'ab2-toggle',
        `ab2-toggle--${tone}`,
        checked ? 'is-on' : 'is-off',
        loading && 'is-loading',
        disabled && 'is-disabled',
      )}
      onClick={() => onChange(!checked)}
    >
      <span className="ab2-toggle-track" aria-hidden>
        <span className="ab2-toggle-thumb" />
      </span>
    </button>
  );
}
