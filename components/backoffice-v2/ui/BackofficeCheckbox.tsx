type Props = {
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
};

export function BackofficeCheckbox({ checked, disabled, onChange, label }: Props) {
  return (
    <label className={`ab2-checkbox${disabled ? ' is-disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="ab2-checkbox-box" aria-hidden />
      {label && <span className="ab2-checkbox-label">{label}</span>}
    </label>
  );
}
