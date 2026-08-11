'use client';

import type { CSSProperties } from 'react';
import { printZoneStyle } from '@/lib/pos-preview/texture-utils';

type Props = {
  children: React.ReactNode;
  uploadedDesign?: string | null;
  className?: string;
  style?: CSSProperties;
};

/** Calque texture / design client — object-fit contain */
export function TextureLayer({ children, uploadedDesign, className = '', style }: Props) {
  return (
    <div className={`relative ${className}`} style={style}>
      {children}
      {uploadedDesign && (
        <div
          className="absolute inset-0 pointer-events-none opacity-0"
          aria-hidden
          style={printZoneStyle(uploadedDesign)}
        />
      )}
    </div>
  );
}

export function MaterialLayer({ gloss = 0.15 }: { gloss?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none rounded-lg"
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,${gloss}) 0%, transparent 50%)`,
      }}
    />
  );
}

export function FinishLayer({ active }: { active?: boolean }) {
  if (!active) return null;
  return (
    <div
      className="absolute inset-0 pointer-events-none finish-gloss-highlight rounded-lg"
      aria-hidden
    />
  );
}
