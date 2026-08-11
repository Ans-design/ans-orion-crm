'use client';

import { Minus, Plus } from 'lucide-react';
import type { ConfigField, ProductConfig } from '@/lib/data/config-types';
import { collectCustomFormatDimensionFields } from '@/lib/pos/custom-format-dimension-schema';
import { customFieldUiCopy } from '@/lib/pos/custom-field-ui';
import { buildGeneratedFormatLabel } from '@/lib/pos/generated-format-label';

type Props = {
  productConfig: ProductConfig;
  config: Record<string, unknown>;
  updateConfig: (key: string, value: unknown) => void;
  formatFieldKey: string;
};

function DimensionStepper({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (v: number | '') => void;
}) {
  const minVal = field.min ?? 1;
  const step = 1;
  const hasValue = value !== '' && value !== undefined && value !== null;
  const numVal = hasValue
    ? typeof value === 'number'
      ? value
      : parseFloat(String(value)) || minVal
    : minVal;
  const parsed = hasValue
    ? typeof value === 'number'
      ? value
      : Number(value)
    : NaN;
  const belowMin = hasValue && Number.isFinite(parsed) && parsed < minVal;
  const unitLabel = field.suffix ? ` ${field.suffix}` : '';

  return (
    <div>
      <label className="text-[9px] text-muted-foreground block mb-1">{field.label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          tabIndex={-1}
          data-orion-stepper="1"
          onClick={() => onChange(Math.max(minVal, Math.round((numVal - step) * 100) / 100))}
          className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-accent/80 shrink-0"
          aria-label={`Diminuer ${field.label}`}
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          min={minVal}
          step={step}
          value={hasValue ? numVal : ''}
          placeholder={String(minVal)}
          aria-invalid={belowMin || undefined}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') onChange('');
            else onChange(parseFloat(raw) || 0);
          }}
          onBlur={() => {
            if (!hasValue || !Number.isFinite(parsed)) return;
            if (parsed < minVal) onChange(minVal);
          }}
          className={`flex-1 min-w-0 text-center bg-background border border-border rounded-lg py-2 font-mono font-bold text-base outline-none ${
            belowMin ? 'orion-field--warn' : ''
          }`}
        />
        {field.suffix && (
          <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">{field.suffix}</span>
        )}
        <button
          type="button"
          tabIndex={-1}
          data-orion-stepper="1"
          onClick={() => onChange(hasValue ? Math.round((numVal + step) * 100) / 100 : minVal)}
          className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-accent/80 shrink-0"
          aria-label={`Augmenter ${field.label}`}
        >
          <Plus size={14} />
        </button>
      </div>
      {belowMin && (
        <p className="orion-field-alert" role="alert">
          Minimum : {minVal}{unitLabel}
        </p>
      )}
    </div>
  );
}

export function CustomFormatDimensionsPanel({
  productConfig,
  config,
  updateConfig,
  formatFieldKey,
}: Props) {
  const dims = collectCustomFormatDimensionFields(productConfig);
  const ui = customFieldUiCopy('dimension', {
    key: formatFieldKey,
    label: 'Format',
    type: 'chips',
  });
  const generated = buildGeneratedFormatLabel(config);

  return (
    <div className="mt-3 bg-accent/50 rounded-lg p-3 border border-border space-y-3">
      <label className="text-[10px] font-bold text-[#FF174D] block">{ui.title}</label>
      <div
        className={`grid gap-3 ${
          dims.length >= 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
        }`}
      >
        {dims.map((field) => (
          <DimensionStepper
            key={field.key}
            field={field}
            value={config[field.key]}
            onChange={(v) => updateConfig(field.key, v)}
          />
        ))}
      </div>
      {generated ? (
        <p className="text-[10px] text-accent-brand font-medium">Format : {generated}</p>
      ) : null}
    </div>
  );
}
