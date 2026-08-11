'use client';

import { AppToggle, type AppToggleTone } from '@/components/ui/app-toggle';

export type OptionsToggleTone = AppToggleTone;

type Props = {
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  tone?: OptionsToggleTone;
  label: string;
  onChange: (checked: boolean) => void;
};

/** Cellule tableau — délègue à AppToggle. */
export function OptionsToggleCell({
  checked,
  disabled,
  loading,
  tone = 'active',
  label,
  onChange,
}: Props) {
  return (
    <AppToggle
      checked={checked}
      disabled={disabled}
      loading={loading}
      tone={tone}
      label={label}
      onChange={onChange}
    />
  );
}
