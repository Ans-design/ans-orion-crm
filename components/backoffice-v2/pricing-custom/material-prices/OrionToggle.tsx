'use client';

import { AppToggle, type AppToggleTone } from '@/components/ui/app-toggle';

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
  variant?: AppToggleTone;
  loading?: boolean;
};

/** @deprecated Préférer AppToggle — alias conservé pour compatibilité. */
export function OrionToggle({ checked, onChange, disabled, label, variant = 'active', loading }: Props) {
  return (
    <AppToggle
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      loading={loading}
      tone={variant}
      label={label}
    />
  );
}
