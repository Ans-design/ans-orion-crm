'use client';

import type { ReactNode } from 'react';
import type { MockupMaterial } from '@/lib/data/article-mockup-registry';

export function uidPrefix(uid?: string) {
  return (uid ?? 'm').replace(/[^a-zA-Z0-9]/g, '');
}

/** Scène transparente — mockup centré, sans fond blanc */
export function ProductStudioStage({
  children,
  width = 320,
  height = 240,
}: {
  children: ReactNode;
  width?: number;
  height?: number;
  accent?: string;
}) {
  return (
    <div
      className="relative flex items-center justify-center mx-auto"
      style={{ width: '100%', maxWidth: width, minHeight: height }}
    >
      <div className="relative z-10 flex items-center justify-center w-full h-full py-2">
        {children}
      </div>
    </div>
  );
}

/** Dégradés & filtres SVG réutilisables par mockup */
export function MockupSvgDefs({
  uid = 'm',
  color = '#FF174D',
  material,
}: {
  uid?: string;
  color?: string;
  material?: MockupMaterial;
}) {
  const p = uidPrefix(uid);
  const body = svgBodyStops(material, color);

  return (
    <defs>
      <filter id={`${p}-ds`} x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#000" floodOpacity="0.22" />
      </filter>

      <linearGradient id={`${p}-body`} x1="0%" y1="0%" x2="100%" y2="100%">
        {body.map((s, i) => (
          <stop key={i} offset={s.offset} stopColor={s.c} stopOpacity={s.o ?? 1} />
        ))}
      </linearGradient>

      <linearGradient id={`${p}-shine`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="40%" stopColor="#ffffff" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.06" />
      </linearGradient>

      <linearGradient id={`${p}-side`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.05" />
      </linearGradient>

      <linearGradient id={`${p}-top`} x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
      </linearGradient>

      <linearGradient id={`${p}-metal`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="30%" stopColor="#cbd5e1" />
        <stop offset="60%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>

      <linearGradient id={`${p}-chrome`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="45%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#94a3b8" />
      </linearGradient>

      <linearGradient id={`${p}-pvc`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="25%" stopColor={color} stopOpacity="0.4" />
        <stop offset="60%" stopColor={color} stopOpacity="0.82" />
        <stop offset="100%" stopColor={color} stopOpacity="0.58" />
      </linearGradient>

      <linearGradient id={`${p}-paper`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor="#f8f9fa" />
        <stop offset="100%" stopColor="#e8eaed" />
      </linearGradient>

      <linearGradient id={`${p}-kraft`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d9c4a0" />
        <stop offset="100%" stopColor="#9a7348" />
      </linearGradient>

      <linearGradient id={`${p}-fabric`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="0.96" />
        <stop offset="100%" stopColor={color} stopOpacity="0.74" />
      </linearGradient>

      <linearGradient id={`${p}-ceramic`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#dde3ea" />
      </linearGradient>

      <linearGradient id={`${p}-print`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="0.18" />
        <stop offset="100%" stopColor={color} stopOpacity="0.55" />
      </linearGradient>

      <pattern id={`${p}-grain`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="#ffffff" />
        <circle cx="1" cy="1" r="0.35" fill="#000000" opacity="0.03" />
        <circle cx="3" cy="2.5" r="0.3" fill="#000000" opacity="0.025" />
      </pattern>

      <pattern id={`${p}-weave`} width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill={color} opacity="0.88" />
        <path d="M0 0 L6 6 M6 0 L0 6" stroke="#000" strokeWidth="0.35" opacity="0.07" />
      </pattern>

      <pattern id={`${p}-mesh`} width="5" height="5" patternUnits="userSpaceOnUse">
        <rect width="5" height="5" fill={color} opacity="0.72" />
        <circle cx="2.5" cy="2.5" r="0.8" fill="none" stroke="#fff" strokeWidth="0.4" opacity="0.35" />
      </pattern>
    </defs>
  );
}

function svgBodyStops(material: MockupMaterial | undefined, color: string) {
  switch (material) {
    case 'kraft':
    case 'cardboard':
      return [{ offset: '0%', c: '#d4b896' }, { offset: '100%', c: '#9a7348' }];
    case 'fabric':
      return [{ offset: '0%', c: color, o: 0.95 }, { offset: '100%', c: color, o: 0.7 }];
    case 'metal':
      return [{ offset: '0%', c: '#e2e8f0' }, { offset: '100%', c: '#64748b' }];
    case 'glass':
    case 'transparent':
      return [{ offset: '0%', c: '#ffffff', o: 0.75 }, { offset: '100%', c: '#bae6fd', o: 0.35 }];
    case 'vinyl':
      return [{ offset: '0%', c: '#ffffff' }, { offset: '100%', c: color, o: 0.45 }];
    default:
      return [{ offset: '0%', c: '#ffffff' }, { offset: '100%', c: color, o: 0.35 }];
  }
}

export function gradRef(uid: string | undefined, name: string) {
  return `url(#${uidPrefix(uid)}-${name})`;
}

/** Zone visuelle d'impression — sans traits techniques */
export function PrintZone({
  x, y, w, h, rx = 2, uid,
}: { x: number; y: number; w: number; h: number; rx?: number; uid?: string }) {
  const p = uidPrefix(uid);
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={rx}
      fill={`url(#${p}-print)`}
      opacity="0.75"
    />
  );
}

/** Ombre portée discrète sous l'objet */
export function GroundShadow({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#000000" opacity="0.14" />;
}

export { ProductStudioStage as PacdoraStage };
