'use client';

import { Switch } from '@/components/ui/switch';

/** Toggle ON/OFF admin — vert à droite quand actif */
export function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="data-[state=checked]:bg-emerald-600"
      />
    </label>
  );
}
