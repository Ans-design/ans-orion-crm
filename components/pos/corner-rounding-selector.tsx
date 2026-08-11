'use client';

import { useCallback, useState } from 'react';
import {
  applyCornerLimitChange,
  CORNER_LABELS,
  CORNER_LIMIT_OPTIONS,
  CORNER_ORDER,
  type CornerId,
  type CornerRoundingState,
  toggleCorner,
} from '@/lib/finition/corner-rounding';

type Props = {
  value: CornerRoundingState;
  onChange: (next: CornerRoundingState) => void;
  compact?: boolean;
};

function CornerIcon({ id }: { id: CornerId }) {
  const rotate =
    id === 'top-right' ? 'rotate-90' :
    id === 'bottom-right' ? 'rotate-180' :
    id === 'bottom-left' ? 'rotate-[270deg]' : '';
  return (
    <span
      className={`inline-block w-3 h-3 border-t-2 border-l-2 border-current rounded-tl-md opacity-70 ${rotate}`}
      aria-hidden
    />
  );
}

export function CornerRoundingSelector({ value, onChange, compact = false }: Props) {
  const [limitNotice, setLimitNotice] = useState(false);

  const handleLimit = useCallback(
    (limit: number) => {
      const { state, adjusted } = applyCornerLimitChange(value, limit);
      onChange(state);
      setLimitNotice(adjusted);
      if (!adjusted) setLimitNotice(false);
    },
    [value, onChange],
  );

  const handleToggle = useCallback(
    (id: CornerId) => {
      onChange(toggleCorner(value, id));
      setLimitNotice(false);
    },
    [value, onChange],
  );

  const atLimit = value.selected.length >= value.limit;
  const complete = value.selected.length === value.limit;

  return (
    <div className={`rounded-[7px] border border-border bg-card ${compact ? 'p-3' : 'p-4'}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Coins à arrondir
          </p>
          <p className="text-[10px] text-muted-foreground/80">
            Sélectionnez les angles à traiter
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Nombre de coins à arrondir">
          {CORNER_LIMIT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleLimit(n)}
              aria-pressed={value.limit === n}
              className={`min-w-[2rem] rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                value.limit === n
                  ? 'bg-[#FF174D] text-white shadow-sm'
                  : 'border border-border bg-background text-muted-foreground hover:border-[#FF174D]/40 hover:text-[#FF174D]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {CORNER_ORDER.map((id) => {
          const isSelected = value.selected.includes(id);
          const isDisabled = !isSelected && atLimit;
          return (
            <button
              key={id}
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
              aria-label={`Coin ${CORNER_LABELS[id]}`}
              title={
                isDisabled
                  ? `Limite de ${value.limit} coins atteinte. Désélectionnez un coin pour en choisir un autre.`
                  : CORNER_LABELS[id]
              }
              onClick={() => handleToggle(id)}
              className={[
                'group relative flex h-12 items-center justify-center gap-1.5 rounded-[7px] border text-xs font-bold transition-all',
                isSelected
                  ? 'border-[#FF174D] bg-[#FF174D]/10 text-[#FF174D] shadow-[0_0_0_3px_rgba(255,23,77,0.12)]'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-[#FF174D]/40 hover:bg-[#FF174D]/5 hover:text-[#FF174D]',
                isDisabled
                  ? 'cursor-not-allowed opacity-35 grayscale pointer-events-none'
                  : 'cursor-pointer hover:-translate-y-0.5',
              ].join(' ')}
            >
              <CornerIcon id={id} />
              {CORNER_LABELS[id]}
            </button>
          );
        })}
      </div>

      <div className="mt-3 text-[10px] text-muted-foreground">
        {complete ? (
          <span className="font-semibold text-[#FF174D]">
            Limite atteinte · {value.selected.length} / {value.limit} coins sélectionnés
          </span>
        ) : value.selected.length === 0 ? (
          <span>Sélectionnez {value.limit} coin{value.limit > 1 ? 's' : ''} à arrondir</span>
        ) : (
          <span>
            Sélection : {value.selected.length} / {value.limit} coins
          </span>
        )}
        {limitNotice && (
          <p className="mt-1 text-[#F59E0B]">
            La sélection a été ajustée à {value.limit} coins.
          </p>
        )}
      </div>
    </div>
  );
}
