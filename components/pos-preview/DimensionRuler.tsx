'use client';

import { getRulerTicks } from '@/lib/pos-preview/ratio-utils';

type Props = {
  widthMm: number;
  heightMm: number;
  orientation: 'portrait' | 'landscape' | 'square';
  surfaceM2?: number;
};

/** Règles graduées horizontale / verticale */
export function DimensionRuler({ widthMm, heightMm, orientation, surfaceM2 }: Props) {
  const hTicks = getRulerTicks(widthMm, 4);
  const vTicks = getRulerTicks(heightMm, 4);
  const isLandscape = orientation === 'landscape';

  return (
    <div className="space-y-1.5 text-[9px] font-mono text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="text-[#FF174D]/90 w-8 shrink-0">L</span>
        <div className="relative flex-1 h-3 border-b border-border/60">
          {hTicks.map((t) => (
            <span
              key={`h-${t.label}`}
              className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${t.position * 100}%` }}
            >
              <span className="w-px h-1.5 bg-border" />
              <span className="mt-0.5 whitespace-nowrap">{t.label}</span>
            </span>
          ))}
        </div>
      </div>
      {!isLandscape && (
        <div className="flex items-center gap-2">
          <span className="text-[#FF174D]/90 w-8 shrink-0">H</span>
          <div className="relative flex-1 h-3 border-b border-border/60">
            {vTicks.map((t) => (
              <span
                key={`v-${t.label}`}
                className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${t.position * 100}%` }}
              >
                <span className="w-px h-1.5 bg-border" />
                <span className="mt-0.5 whitespace-nowrap">{t.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {surfaceM2 != null && surfaceM2 > 0 && (
        <p className="text-[10px] text-[#FF174D]/80">
          Surface ≈ {surfaceM2.toFixed(2)} m²
        </p>
      )}
    </div>
  );
}
