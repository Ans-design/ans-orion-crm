'use client';

import {
  parseBacheFinishings,
  toggleBacheFinishing,
  type BacheFinishingsSelection,
  type BacheLinearFinishingKey,
} from '@/lib/grand-format/bache-finishings';
import { getBacheFinishingOptions } from '@/lib/grand-format/bache-rules';
import { getGfAdminPricing } from '@/lib/grand-format/gf-admin-config';

const KEYS: BacheLinearFinishingKey[] = ['ourlet', 'fourreau', 'renfort', 'raccord_soudure'];

type Props = {
  value: unknown;
  onChange: (next: BacheFinishingsSelection) => void;
  className?: string;
};

export function BacheFinishingsSelector({ value, onChange, className = '' }: Props) {
  const sel = parseBacheFinishings(
    typeof value === 'object' && value != null
      ? { bache_finitions: value }
      : { bache_finitions: value },
  );
  const options = getBacheFinishingOptions();
  const rates = getGfAdminPricing();

  const setKey = (key: BacheLinearFinishingKey, on: boolean) => {
    onChange(toggleBacheFinishing(sel, key, on));
  };

  const rateHint: Record<BacheLinearFinishingKey, number> = {
    ourlet: rates.ourletPerMlAr,
    fourreau: rates.fourreauPerMlAr,
    renfort: rates.renfortPerMlAr,
    raccord_soudure: rates.raccordPerMlAr,
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Finitions linéaires
      </p>
      <div className="flex flex-wrap gap-2">
        {KEYS.map((key) => {
          const meta = options[key];
          const on = Boolean(sel[key]);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => setKey(key, !on)}
              className={`px-2.5 py-1.5 rounded-[7px] text-[11px] font-bold border transition-colors ${
                on
                  ? 'border-[var(--orion-red,#FF174D)] bg-[color-mix(in_srgb,var(--orion-red,#FF174D)_12%,transparent)] text-[var(--orion-red,#FF174D)]'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30'
              }`}
            >
              {meta.label}
              <span className="ml-1 font-mono text-[9px] opacity-70">
                {rateHint[key].toLocaleString('fr-FR')} Ar/m
              </span>
            </button>
          );
        })}
      </div>
      {sel.fourreau && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-muted-foreground">Fourreau :</span>
          {(['top', 'bottom', 'both'] as const).map((side) => {
            const label = side === 'top' ? 'Haut' : side === 'bottom' ? 'Bas' : 'Haut+Bas';
            const active = (sel.fourreauSides ?? 'top') === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => onChange({ ...sel, fourreau: true, fourreauSides: side })}
                className={`px-2 py-1 rounded-[7px] text-[10px] font-semibold border ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      {sel.raccord_soudure && (
        <label className="block text-[10px] font-bold text-muted-foreground">
          Longueur raccord (m)
          <input
            type="number"
            min={0}
            step={0.1}
            className="fc mt-1 text-sm"
            value={sel.raccordMeters ?? ''}
            onChange={(e) =>
              onChange({
                ...sel,
                raccord_soudure: true,
                raccordMeters: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            placeholder="auto si assemblage"
          />
        </label>
      )}
    </div>
  );
}
