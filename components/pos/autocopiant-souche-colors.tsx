'use client';

import { Check } from 'lucide-react';
import {
  AUTOCOPIANT_SOUCHES_COLOR_OPTIONS,
  buildAutocopiantSouchePreview,
  formatAutocopiantColorProgress,
} from '@/lib/pos/autocopiant-policy';
import { POS_CHIP_SIZE, posChipClassName } from '@/lib/pos/chip-ui';

const COLOR_CHIP_STYLE: Record<string, string> = {
  Blanc: 'border-white/40 text-white/80',
  Jaune: 'border-[#FACC15]/60 text-[#FACC15]',
  Rose: 'border-[#F472B6]/60 text-[#F472B6]',
  Vert: 'border-[#4ADE80]/60 text-[#4ADE80]',
  Bleu: 'border-[#60A5FA]/60 text-[#60A5FA]',
  Autres: 'border-[#FACC15]/50 text-[#FACC15] border-dashed',
};

type Props = {
  selected: string[];
  maxColors: number;
  onChange: (next: string[]) => void;
  compact?: boolean;
};

export function AutocopiantSoucheColors({ selected, maxColors, onChange, compact = false }: Props) {
  const chipSize = compact ? POS_CHIP_SIZE.compact : POS_CHIP_SIZE.default;
  const preview = buildAutocopiantSouchePreview(selected, maxColors);

  const toggle = (color: string) => {
    if (selected.includes(color)) {
      onChange(selected.filter((c) => c !== color));
      return;
    }
    if (selected.length >= maxColors) return;
    onChange([...selected, color]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-bold text-muted-foreground">Couleurs des souches</label>
        <span className="text-[9px] font-mono text-primary shrink-0">
          {formatAutocopiantColorProgress(selected, maxColors)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <span
          className={`${chipSize} ${posChipClassName({ selected: false, disabled: true, greyed: true })} ${COLOR_CHIP_STYLE.Blanc}`}
          title="1ère souche toujours blanche"
        >
          Blanc
        </span>
        {AUTOCOPIANT_SOUCHES_COLOR_OPTIONS.map((color) => {
          const isSel = selected.includes(color);
          const atMax = selected.length >= maxColors && !isSel;
          return (
            <button
              key={color}
              type="button"
              disabled={atMax}
              aria-pressed={isSel}
              onClick={() => toggle(color)}
              className={`${chipSize} ${posChipClassName({ selected: isSel, disabled: atMax, greyed: atMax })} ${COLOR_CHIP_STYLE[color] ?? ''}`}
            >
              {isSel && <Check size={10} className="inline mr-1" />}
              {color}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {preview.slice(1).map((color, idx) => (
          <div
            key={`souche-${idx + 2}`}
            className="min-w-[88px] rounded-lg border border-dashed border-[#00B4D8]/40 bg-[#00B4D8]/5 px-2 py-1.5 text-center"
          >
            <p className="text-[8px] font-bold text-[#00B4D8]/80 uppercase tracking-wide">Souche {idx + 2}</p>
            <p className="text-[10px] font-semibold text-foreground mt-0.5">{color}</p>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-muted-foreground flex items-start gap-1">
        <span aria-hidden>ℹ</span>
        <span>La 1ère souche est toujours blanche — les suivantes selon choix</span>
      </p>
    </div>
  );
}
