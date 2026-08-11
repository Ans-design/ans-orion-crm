'use client';

import type { MaterialVisualStyle } from '@/lib/pos-preview/preview-types';

type Props = { material: MaterialVisualStyle };

export function MaterialBadge({ material }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-muted/60 border border-border/50 text-muted-foreground"
      title={`Matière : ${material.label}`}
    >
      <span
        className="w-2 h-2 rounded-full border border-white/20"
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,${material.gloss}) 0%, rgba(180,180,180,0.4) 100%)`,
          opacity: material.opacity,
        }}
      />
      {material.label}
    </span>
  );
}
