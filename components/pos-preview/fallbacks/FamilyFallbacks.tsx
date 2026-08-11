'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { FallbackRenderProps } from '@/lib/pos-preview/product-preview.types';

function Shell({
  children,
  w,
  h,
  label,
}: {
  children: ReactNode;
  w: number;
  h: number;
  label?: string;
}) {
  return (
    <svg width={w} height={h} viewBox="0 0 200 200" aria-hidden className="drop-shadow-md">
      {label && (
        <text x="100" y="12" textAnchor="middle" fontSize="7" fill="#64748b" fontWeight="600">
          {label.toUpperCase()}
        </text>
      )}
      {children}
      <ellipse cx="100" cy="188" rx="55" ry="6" fill="rgba(0,0,0,0.1)" />
    </svg>
  );
}

function PrintZone({
  x,
  y,
  w,
  h,
  uploadedDesign,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  uploadedDesign?: string | null;
}) {
  if (uploadedDesign) {
    return (
      <image href={uploadedDesign} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
    );
  }
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={2}
      fill="rgba(0,217,255,0.06)"
      stroke="rgba(0,217,255,0.25)"
      strokeWidth="0.8"
      strokeDasharray="3 2"
    />
  );
}

export function PaperFallback({ width, height, orientation, productName, uploadedDesign }: FallbackRenderProps) {
  const rot = orientation === 'landscape';
  const pw = rot ? 120 : 85;
  const ph = rot ? 85 : 120;
  return (
    <Shell w={width} h={height} label={productName}>
      <rect
        x={100 - pw / 2}
        y={55}
        width={pw}
        height={ph}
        rx={3}
        fill="#fafafa"
        stroke="#cbd5e1"
        strokeWidth="1"
        transform={rot ? `rotate(-6 ${100} ${55 + ph / 2})` : undefined}
      />
      <PrintZone x={100 - pw / 2 + 8} y={65} w={pw - 16} h={ph - 20} uploadedDesign={uploadedDesign} />
    </Shell>
  );
}

export function BookletFallback({ width, height, productName, uploadedDesign }: FallbackRenderProps) {
  return (
    <Shell w={width} h={height} label={productName}>
      <rect x="58" y="48" width="72" height="98" rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
      <rect x="52" y="52" width="72" height="98" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" opacity="0.9" />
      <rect x="46" y="56" width="72" height="98" rx="2" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.6" opacity="0.7" />
      <PrintZone x={54} y={62} w={56} h={72} uploadedDesign={uploadedDesign} />
      <rect x="124" y="48" width="6" height="98" fill="#e2e8f0" />
    </Shell>
  );
}

export function BindingFallback({ width, height, productName }: FallbackRenderProps) {
  return (
    <Shell w={width} h={height} label={productName}>
      <rect x="55" y="50" width="90" height="95" rx="2" fill="#fff" stroke="#cbd5e1" />
      <line x1="72" y1="50" x2="72" y2="145" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2 2" />
      <circle cx="72" cy="70" r="8" fill="none" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="72" cy="100" r="8" fill="none" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="72" cy="130" r="8" fill="none" stroke="#64748b" strokeWidth="1.5" />
    </Shell>
  );
}

export function FlexibleLargeFormatFallback({
  width,
  height,
  orientation,
  productName,
  uploadedDesign,
}: FallbackRenderProps) {
  const tall = orientation === 'portrait';
  const pw = tall ? 70 : 130;
  const ph = tall ? 120 : 55;
  return (
    <Shell w={width} h={height} label={productName}>
      <path
        d={`M${100 - pw / 2} ${60} L${100 + pw / 2 - 8} ${60} L${100 + pw / 2} ${60 + ph} L${100 - pw / 2 + 8} ${60 + ph} Z`}
        fill="#f1f5f9"
        stroke="#94a3b8"
        strokeWidth="1"
      />
      <path
        d={`M${100 + pw / 2 - 8} ${60} Q${100 + pw / 2 + 4} ${68} ${100 + pw / 2 - 4} ${76}`}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1"
      />
      <PrintZone
        x={100 - pw / 2 + 10}
        y={68}
        w={pw - 24}
        h={ph - 20}
        uploadedDesign={uploadedDesign}
      />
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={i}
          cx={100 - pw / 2 + 6 + i * (pw / 3)}
          cy={60 + ph + 4}
          r="2.5"
          fill="#64748b"
        />
      ))}
    </Shell>
  );
}

export function RigidPanelFallback({ width, height, productName, uploadedDesign }: FallbackRenderProps) {
  return (
    <Shell w={width} h={height} label={productName}>
      <rect x="50" y="45" width="100" height="75" rx="2" fill="#f8fafc" stroke="#64748b" strokeWidth="1.2" />
      <rect x="148" y="45" width="8" height="75" fill="#cbd5e1" />
      <PrintZone x={58} y={52} w={84} h={58} uploadedDesign={uploadedDesign} />
      <rect x="52" y="48" width="40" height="30" fill="white" opacity="0.35" rx="1" />
    </Shell>
  );
}

export function VerticalDisplayFallback({ width, height, productName, uploadedDesign }: FallbackRenderProps) {
  return (
    <Shell w={width} h={height} label={productName}>
      <rect x="78" y="130" width="44" height="10" rx="2" fill="#64748b" />
      <rect x="96" y="50" width="8" height="82" fill="#94a3b8" />
      <path
        d="M62 58 Q100 52 138 58 L134 125 Q100 130 66 125 Z"
        fill="#e2e8f0"
        stroke="#64748b"
        strokeWidth="1"
      />
      <PrintZone x={72} y={65} w={56} h={52} uploadedDesign={uploadedDesign} />
    </Shell>
  );
}

export function TextileFallback({ width, height, productName, uploadedDesign }: FallbackRenderProps) {
  return (
    <Shell w={width} h={height} label={productName}>
      <path
        d="M70 55 L55 75 L62 145 L138 145 L145 75 L130 55 Q100 65 70 55"
        fill="#f1f5f9"
        stroke="#94a3b8"
        strokeWidth="1"
      />
      <path d="M55 75 L70 90 L130 90 L145 75" fill="none" stroke="#cbd5e1" />
      <PrintZone x={78} y={88} w={44} h={40} uploadedDesign={uploadedDesign} />
    </Shell>
  );
}

export function ObjectFallback({
  width,
  height,
  productName,
  mockupKey = 'generic',
  uploadedDesign,
}: FallbackRenderProps) {
  if (mockupKey === 'mug' || mockupKey === 'cup') {
    return (
      <Shell w={width} h={height} label={productName}>
        <path
          d="M58 75 Q58 58 88 58 L112 58 Q142 58 142 75 L142 135 Q142 152 112 152 L88 152 Q58 152 58 135 Z"
          fill="#fafafa"
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <path
          d="M142 82 Q168 78 168 108 Q168 138 142 134"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="8"
        />
        <PrintZone x={68} y={78} w={58} h={48} uploadedDesign={uploadedDesign} />
      </Shell>
    );
  }
  if (mockupKey === 'bottle') {
    return (
      <Shell w={width} h={height} label={productName}>
        <rect x="88" y="52" width="24" height="18" rx="4" fill="#94a3b8" />
        <path d="M82 70 L82 145 Q100 152 118 145 L118 70 Z" fill="#e2e8f0" stroke="#64748b" />
        <PrintZone x={86} y={88} w={28} h={48} uploadedDesign={uploadedDesign} />
      </Shell>
    );
  }
  if (mockupKey === 'pen') {
    return (
      <Shell w={width} h={height} label={productName}>
        <rect x="45" y="95" width="110" height="12" rx="6" fill="#f1f5f9" stroke="#94a3b8" />
        <polygon points="155,95 168,101 155,107" fill="#64748b" />
      </Shell>
    );
  }
  if (mockupKey === 'box') {
    return (
      <Shell w={width} h={height} label={productName}>
        <path d="M55 95 L100 75 L145 95 L145 140 L100 160 L55 140 Z" fill="#fef3c7" stroke="#d97706" />
        <path d="M55 95 L100 115 L145 95" fill="none" stroke="#d97706" strokeWidth="0.8" />
        <PrintZone x={72} y={100} w={56} h={32} uploadedDesign={uploadedDesign} />
      </Shell>
    );
  }
  return (
    <Shell w={width} h={height} label={productName}>
      <rect x="70" y="70" width="60" height="60" rx="8" fill="#f8fafc" stroke="#94a3b8" />
      <PrintZone x={78} y={78} w={44} h={44} uploadedDesign={uploadedDesign} />
    </Shell>
  );
}

export function GraphicServiceFallback({ width, height, productName }: FallbackRenderProps) {
  return (
    <Shell w={width} h={height} label={productName}>
      <circle cx="100" cy="95" r="35" fill="none" stroke="#FF174D" strokeWidth="2" opacity="0.5" />
      <path d="M75 110 Q100 75 125 110" fill="none" stroke="#FF174D" strokeWidth="2" opacity="0.6" />
      <rect x="82" y="118" width="36" height="4" rx="2" fill="#cbd5e1" />
      <rect x="88" y="126" width="24" height="3" rx="1.5" fill="#e2e8f0" />
    </Shell>
  );
}

export function renderFamilyFallback(
  component: string,
  props: FallbackRenderProps,
): ReactNode {
  switch (component) {
    case 'PaperFallback':
      return <PaperFallback {...props} />;
    case 'BookletFallback':
      return <BookletFallback {...props} />;
    case 'BindingFallback':
      return <BindingFallback {...props} />;
    case 'FlexibleLargeFormatFallback':
      return <FlexibleLargeFormatFallback {...props} />;
    case 'RigidPanelFallback':
      return <RigidPanelFallback {...props} />;
    case 'VerticalDisplayFallback':
      return <VerticalDisplayFallback {...props} />;
    case 'TextileFallback':
      return <TextileFallback {...props} />;
    case 'ObjectFallback':
      return <ObjectFallback {...props} />;
    case 'GraphicServiceFallback':
      return <GraphicServiceFallback {...props} />;
    default:
      return <PaperFallback {...props} />;
  }
}
