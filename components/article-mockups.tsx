'use client';

import type { ReactNode } from 'react';
import type { MockupKind, MockupMaterial } from '@/lib/data/article-mockup-registry';
import {
  PacdoraStage,
  MockupSvgDefs,
  gradRef,
  PrintZone,
  GroundShadow,
  uidPrefix,
} from '@/components/mockup-studio';

export type MockupProps = {
  w: number;
  h: number;
  color: string;
  material?: MockupMaterial;
  uid?: string;
};

export { PacdoraStage };

/** Wrapper SVG centré, fond transparent */
function MockupSvg({
  w,
  h,
  viewBox,
  uid,
  color,
  material,
  children,
  filter = true,
}: {
  w: number;
  h: number;
  viewBox: string;
  uid?: string;
  color?: string;
  material?: MockupMaterial;
  children: React.ReactNode;
  filter?: boolean;
}) {
  return (
    <svg
      width={w}
      height={h}
      viewBox={viewBox}
      className="mx-auto block"
      aria-hidden
      filter={filter ? gradRef(uid, 'ds') : undefined}
    >
      <MockupSvgDefs uid={uid} color={color} material={material} />
      {children}
    </svg>
  );
}

function matFill(material: MockupMaterial | undefined, color: string, fallback: string): string {
  switch (material) {
    case 'kraft': return 'linear-gradient(145deg, #c4a574 0%, #a08050 100%)';
    case 'glossy': return `linear-gradient(145deg, #ffffff 0%, ${color}33 50%, ${color}55 100%)`;
    case 'matte': return `linear-gradient(145deg, #f8f8f8 0%, ${color}22 100%)`;
    case 'fabric': return `linear-gradient(145deg, ${color}cc 0%, ${color}88 100%)`;
    case 'metal': return 'linear-gradient(145deg, #e2e8f0 0%, #94a3b8 50%, #64748b 100%)';
    case 'glass':
    case 'transparent': return 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(200,230,255,0.4) 100%)';
    case 'cardboard': return 'linear-gradient(145deg, #d4b896 0%, #b8956a 100%)';
    case 'vinyl': return `linear-gradient(145deg, #ffffff 0%, ${color}44 100%)`;
    default: return fallback || `linear-gradient(160deg, #ffffff 0%, ${color}44 100%)`;
  }
}

/** Couleur unie pour attributs SVG fill (matFill renvoie des gradients CSS) */
function svgMatColor(material: MockupMaterial | undefined, color: string, fallback: string): string {
  switch (material) {
    case 'kraft':
    case 'cardboard': return '#b8956a';
    case 'glossy':
    case 'matte':
    case 'vinyl': return '#f5f5f5';
    case 'fabric': return color;
    case 'metal': return '#94a3b8';
    case 'glass':
    case 'transparent': return '#e8f4fc';
    default: return fallback || color;
  }
}

export function BoxMockup3D({ w, h, color, material, uid, depthRatio = 0.38 }: MockupProps & { depthRatio?: number }) {
  const g = (n: string) => gradRef(uid, n);
  const faceW = 58;
  const faceH = 64;
  const depth = faceW * depthRatio * 0.55;
  return (
    <MockupSvg w={w} h={h} viewBox="0 0 120 100" uid={uid} color={color} material={material}>
      <GroundShadow cx={58} cy={94} rx={40} ry={5} />
      <path
        d={`M20 ${100 - faceH * 0.1} L20 ${100 - faceH * 0.1 - faceH} L${20 + faceW} ${100 - faceH * 0.1 - faceH} L${20 + faceW} ${100 - faceH * 0.1} Z`}
        fill={material === 'kraft' || material === 'cardboard' ? g('kraft') : g('paper')}
        stroke="#00000014"
        strokeWidth="0.6"
      />
      <PrintZone x={24} y={100 - faceH * 0.1 - faceH + 10} w={faceW - 8} h={faceH - 18} uid={uid} />
      <path
        d={`M${20 + faceW} ${100 - faceH * 0.1 - faceH} L${20 + faceW + depth} ${100 - faceH * 0.1 - faceH - depth * 0.35} L${20 + faceW + depth} ${100 - faceH * 0.1 - depth * 0.35} L${20 + faceW} ${100 - faceH * 0.1} Z`}
        fill={g('side')}
        stroke="#00000010"
        strokeWidth="0.5"
      />
      <path
        d={`M20 ${100 - faceH * 0.1 - faceH} L${20 + depth * 0.5} ${100 - faceH * 0.1 - faceH - depth * 0.35} L${20 + faceW + depth} ${100 - faceH * 0.1 - faceH - depth * 0.35} L${20 + faceW} ${100 - faceH * 0.1 - faceH} Z`}
        fill={g('top')}
        stroke="#00000008"
        strokeWidth="0.5"
      />
      <path d={`M20 ${100 - faceH * 0.1 - faceH} L${20 + faceW} ${100 - faceH * 0.1 - faceH}`} stroke="#ffffff90" strokeWidth="0.9" opacity="0.45" />
    </MockupSvg>
  );
}

export function PouchMockup({ w, h, color, material, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  const fill = material === 'kraft' ? g('kraft') : g('body');
  return (
    <svg width={w} height={h} viewBox="0 0 120 160" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material={material} />
      <GroundShadow cx={60} cy={152} rx={32} ry={5} />
      <path d="M25 45 Q60 22 95 45 L102 145 Q60 156 18 145Z" fill={fill} stroke="#00000018" strokeWidth="0.8" />
      <path d="M25 45 Q60 32 95 45 L94 58 Q60 50 26 58Z" fill="#00000014" />
      <ellipse cx="60" cy="36" rx="30" ry="7" fill="#0000000a" stroke="#00000012" strokeWidth="0.5" />
      <PrintZone x={32} y={68} w={56} h={48} uid={uid} />
      <path d="M28 48 Q60 42 92 48" fill="none" stroke="#ffffff40" strokeWidth="1" />
    </svg>
  );
}

export function PaperBagMockup({ w, h, color, material, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  const fill = material === 'kraft' ? g('kraft') : g('body');
  return (
    <svg width={w} height={h} viewBox="0 0 140 180" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material={material} />
      <GroundShadow cx={70} cy={172} rx={38} ry={5} />
      <path d="M30 55 Q70 35 110 55 L118 165 Q70 175 22 165Z" fill={fill} stroke="#00000018" strokeWidth="0.6" />
      <path d="M45 55 Q45 38 70 38 Q95 38 95 55" fill="none" stroke="#00000022" strokeWidth="2.5" />
      <PrintZone x={46} y={82} w={48} h={48} uid={uid} />
    </svg>
  );
}

export function PaperCupMockup({ w, h, color, material, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 100 140" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material={material} />
      <GroundShadow cx={50} cy={128} rx={30} ry={4} />
      <path d="M28 35 L35 120 Q50 128 65 120 L72 35 Q50 28 28 35Z" fill={g('paper')} stroke="#00000012" strokeWidth="0.5" />
      <ellipse cx="50" cy="35" rx="22" ry="6" fill="#ffffff" stroke="#00000010" strokeWidth="0.4" />
      <PrintZone x={36} y={52} w={28} h={38} uid={uid} />
      <path d="M30 40 Q50 36 70 40" fill="none" stroke="#ffffff60" strokeWidth="0.6" />
    </svg>
  );
}

export function EnvelopeMockup({ w, h, color, material, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 160 110" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material={material} />
      <GroundShadow cx={80} cy={102} rx={58} ry={4} />
      <rect x="15" y="25" width="130" height="75" rx="2" fill={g('paper')} stroke="#00000012" strokeWidth="0.5" />
      <path d="M15 25 L80 65 L145 25" fill="none" stroke="#00000012" strokeWidth="1.2" />
      <path d="M15 25 L80 55 L145 25 L145 100 L15 100Z" fill={g('side')} opacity="0.5" />
      <PrintZone x={48} y={38} w={64} h={36} uid={uid} />
    </svg>
  );
}

export function BottleMockup({ w, h, color, material, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 120 220" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material={material ?? 'metal'} />
      <GroundShadow cx={60} cy={210} rx={28} ry={5} />
      {/* Bouchon sport */}
      <rect x="48" y="8" width="24" height="14" rx="4" fill={g('metal')} />
      <rect x="52" y="4" width="16" height="8" rx="3" fill={g('chrome')} />
      {/* Col */}
      <path d="M46 22 L44 38 Q60 34 76 38 L74 22 Z" fill={g('metal')} />
      {/* Corps bouteille isotherme */}
      <path
        d="M38 38 Q38 28 60 26 Q82 28 82 38 L86 190 Q60 198 34 190 Z"
        fill={g('metal')}
        stroke="#475569"
        strokeWidth="0.8"
      />
      <path d="M42 50 Q60 46 78 50 L80 175 Q60 180 40 175 Z" fill={g('chrome')} opacity="0.35" />
      <rect x="46" y="85" width="28" height="55" rx="3" fill="#ffffff25" stroke="#ffffff40" strokeDasharray="3 2" />
    </svg>
  );
}

export function BadgeMockup({ w, h, color }: MockupProps) {
  return (
    <svg width={w} height={h} viewBox="0 0 100 130" className="drop-shadow-xl" aria-hidden>
      <rect x="20" y="15" width="60" height="75" rx="4" fill="#f8f8f8" stroke="#00000012" />
      <circle cx="50" cy="105" r="8" fill="#cbd5e1" stroke="#64748b" />
      <rect x="48" y="90" width="4" height="18" fill="#94a3b8" />
    </svg>
  );
}

export function RigidPanelMockup({ w, h, color, material, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  const isMesh = material === 'transparent';
  const fill = isMesh ? g('body') : material === 'metal' ? g('metal') : g('paper');
  return (
    <svg width={w} height={h} viewBox="0 0 120 90" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material={material} />
      <GroundShadow cx={58} cy={84} rx={42} ry={4} />
      <g transform="skewY(-3)">
        {/* Épaisseur panneau PVC / Akylux — Printoclock */}
        <rect x="18" y="22" width="78" height="52" rx="1" fill={g('side')} transform="translate(4 4)" />
        <rect x="14" y="18" width="78" height="52" rx="1" fill={fill} stroke="#00000014" strokeWidth="0.6" />
        {isMesh && (
          <rect x="14" y="18" width="78" height="52" rx="1" fill={`url(#${uid?.replace(/[^a-zA-Z0-9]/g, '') ?? 'm'}-mesh)`} opacity="0.85" />
        )}
        <PrintZone x={22} y={26} w={62} h={36} uid={uid} />
        <rect x="14" y="18" width="78" height="52" rx="1" fill={g('shine')} opacity="0.25" />
      </g>
    </svg>
  );
}

export function MeshBannerMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  const p = uid?.replace(/[^a-zA-Z0-9]/g, '') ?? 'm';
  const grommets = [
    [14, 14], [106, 14], [14, 66], [106, 66],
  ] as const;
  return (
    <svg width={w} height={h} viewBox="0 0 120 80" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="fabric" />
      <GroundShadow cx={60} cy={74} rx={48} ry={4} />
      <rect x="10" y="12" width="100" height="56" rx="2" fill={g('body')} stroke="#00000012" />
      <rect x="10" y="12" width="100" height="56" rx="2" fill={`url(#${p}-mesh)`} opacity="0.9" />
      {grommets.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="3.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.6" />
          <circle cx={cx} cy={cy} r="1.2" fill="#475569" />
        </g>
      ))}
      <PrintZone x={18} y={20} w={84} h={40} uid={uid} />
    </svg>
  );
}

export function VinylSheetMockup({ w, h, color, material }: MockupProps) {
  return (
    <div className="relative" style={{ width: w, height: h }}>
      <div
        className="absolute inset-0 rounded-sm shadow-xl border border-white/40"
        style={{
          background: matFill(material, color, '#ffffff'),
          transform: 'rotate(-3deg)',
        }}
      >
        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-black/10 to-transparent rounded-tr-sm" />
        <div className="absolute inset-3 border border-dashed border-black/15 rounded-sm" />
      </div>
    </div>
  );
}

export function BookMockup3D({ w, h, color, material, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 140 120" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material={material} />
      <GroundShadow cx={68} cy={112} rx={40} ry={4} />
      <rect x="35" y="15" width="70" height="90" rx="2" fill={g('paper')} stroke="#00000012" strokeWidth="0.5" />
      <rect x="30" y="15" width="8" height="90" rx="1" fill={g('side')} />
      <rect x="45" y="30" width="50" height="4" rx="1" fill="#00000010" />
      <PrintZone x={48} y={42} w={44} h={52} uid={uid} />
    </svg>
  );
}

export function PlayingCardsMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 120 100" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="glossy" />
      <GroundShadow cx={58} cy={92} rx={36} ry={4} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`rotate(${i * 4 - 4} 52 52)`}>
          <rect x={25 + i * 8} y={15 + i * 4} width="55" height="75" rx="4" fill={g('paper')} stroke="#00000015" strokeWidth="0.5" />
          {i === 2 && <PrintZone x={32} y={28} w={40} h={50} uid={uid} />}
        </g>
      ))}
    </svg>
  );
}

export function DisplayStandMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 120 140" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="white" />
      <GroundShadow cx={60} cy={132} rx={32} ry={4} />
      <path d="M35 120 L45 50 L75 50 L85 120Z" fill={g('metal')} opacity="0.55" />
      <rect x="40" y="25" width="40" height="30" rx="2" fill={g('paper')} stroke="#00000012" transform="rotate(-5 60 40)" />
      <PrintZone x={44} y={30} w={32} h={20} uid={uid} />
      <rect x="42" y="55" width="36" height="3" fill={g('chrome')} />
    </svg>
  );
}

export function TotemMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 80 160" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="white" />
      <GroundShadow cx={40} cy={154} rx={22} ry={4} />
      <rect x="35" y="100" width="10" height="55" fill={g('metal')} />
      <rect x="15" y="15" width="50" height="90" rx="3" fill={g('paper')} stroke="#00000012" strokeWidth="0.6" />
      <PrintZone x={22} y={28} w={36} h={64} uid={uid} />
    </svg>
  );
}

export function PhotocallMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 180 120" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="matte" />
      <GroundShadow cx={90} cy={114} rx={70} ry={5} />
      <rect x="10" y="20" width="160" height="85" rx="2" fill={g('pvc')} stroke="#00000012" strokeWidth="0.6" />
      <PrintZone x={22} y={30} w={136} h={65} uid={uid} />
      <rect x="25" y="105" width="8" height="12" fill={g('metal')} />
      <rect x="147" y="105" width="8" height="12" fill={g('metal')} />
    </svg>
  );
}

export function CalendarMockup({ w, h, color }: MockupProps) {
  return (
    <svg width={w} height={h} viewBox="0 0 110 130" className="drop-shadow-xl" aria-hidden>
      <rect x="15" y="25" width="80" height="95" rx="2" fill="#fff" stroke="#00000012" />
      <rect x="15" y="15" width="80" height="18" rx="2" fill={`${color}88`} />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3, 4, 5, 6].map((c) => (
          <rect key={`${r}-${c}`} x={20 + c * 10} y={40 + r * 12} width="8" height="8" rx="1" fill="#00000008" />
        )),
      )}
      <circle cx="25" cy="22" r="3" fill="#94a3b8" />
      <circle cx="85" cy="22" r="3" fill="#94a3b8" />
    </svg>
  );
}

export function PhotobookMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 130 100" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="glossy" />
      <GroundShadow cx={62} cy={94} rx={38} ry={4} />
      <rect x="25" y="12" width="80" height="76" rx="3" fill={g('paper')} stroke="#00000012" strokeWidth="0.5" />
      <PrintZone x={32} y={22} w={66} h={50} uid={uid} />
      <rect x="20" y="12" width="6" height="76" rx="1" fill={g('side')} />
    </svg>
  );
}

export function LanyardMockup({ w, h, color }: MockupProps) {
  return (
    <svg width={w} height={h} viewBox="0 0 60 160" className="drop-shadow-xl" aria-hidden>
      <path d="M28 5 Q30 80 28 155" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
      <rect x="12" y="120" width="36" height="28" rx="3" fill="#fff" stroke="#00000015" />
    </svg>
  );
}

export function TicketMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 140 70" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="glossy" />
      <rect x="10" y="10" width="120" height="50" rx="4" fill={g('paper')} stroke="#00000012" strokeWidth="0.5" />
      <circle cx="10" cy="35" r="6" fill="#eceef1" />
      <circle cx="130" cy="35" r="6" fill="#eceef1" />
      <line x1="70" y1="15" x2="70" y2="55" stroke="#00000010" strokeDasharray="3 3" />
      <PrintZone x={18} y={18} w={44} h={34} uid={uid} />
    </svg>
  );
}

export function BraceletMockup({ w, h, color }: MockupProps) {
  return (
    <svg width={w} height={h} viewBox="0 0 120 50" className="drop-shadow-xl" aria-hidden>
      <rect x="15" y="18" width="90" height="14" rx="7" fill={color} opacity="0.85" stroke="#00000015" />
      <rect x="40" y="20" width="40" height="10" rx="2" fill="#ffffff30" />
    </svg>
  );
}

export function KeychainMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 80 120" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="metal" />
      <GroundShadow cx={40} cy={112} rx={22} ry={3} />
      <circle cx="40" cy="25" r="14" fill="none" stroke={g('metal')} strokeWidth="4" />
      <rect x="28" y="38" width="24" height="35" rx="4" fill={g('body')} stroke="#00000015" strokeWidth="0.5" />
      <PrintZone x={30} y={44} w={20} h={22} uid={uid} />
      <circle cx="40" cy="90" r="12" fill={g('chrome')} stroke="#64748b" strokeWidth="0.5" />
    </svg>
  );
}

export function PinMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 80 80" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="metal" />
      <GroundShadow cx={40} cy={74} rx={18} ry={3} />
      <circle cx="40" cy="35" r="22" fill={g('body')} stroke="#00000015" strokeWidth="0.5" />
      <circle cx="40" cy="35" r="14" fill={g('print')} opacity="0.6" />
      <path d="M40 57 L36 75 L44 75Z" fill={g('metal')} />
    </svg>
  );
}

export function UsbMockup({ w, h }: MockupProps) {
  return (
    <svg width={w} height={h} viewBox="0 0 100 40" className="drop-shadow-xl" aria-hidden>
      <rect x="10" y="12" width="55" height="16" rx="4" fill="#334155" />
      <rect x="65" y="8" width="25" height="24" rx="2" fill="#94a3b8" stroke="#64748b" />
      <rect x="70" y="14" width="4" height="12" fill="#cbd5e1" />
      <rect x="78" y="14" width="4" height="12" fill="#cbd5e1" />
    </svg>
  );
}

export function UmbrellaMockup({ w, h, color }: MockupProps) {
  return (
    <svg width={w} height={h} viewBox="0 0 100 140" className="drop-shadow-xl" aria-hidden>
      <path d="M50 25 Q10 55 15 70 Q50 45 85 70 Q90 55 50 25Z" fill={color} opacity="0.9" stroke="#00000015" />
      <line x1="50" y1="45" x2="50" y2="130" stroke="#64748b" strokeWidth="3" />
      <path d="M42 130 Q50 138 58 130" fill="none" stroke="#64748b" strokeWidth="2" />
    </svg>
  );
}

export function LighterMockup({ w, h, color }: MockupProps) {
  return (
    <svg width={w} height={h} viewBox="0 0 50 120" className="drop-shadow-xl" aria-hidden>
      <rect x="12" y="25" width="26" height="80" rx="4" fill={color || '#ef4444'} opacity="0.9" stroke="#00000020" />
      <rect x="16" y="40" width="18" height="30" rx="2" fill="#ffffff25" />
      <rect x="18" y="8" width="14" height="20" rx="2" fill="#cbd5e1" />
    </svg>
  );
}

export function MousepadMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 140 100" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="fabric" />
      <GroundShadow cx={70} cy={92} rx={52} ry={4} />
      <rect x="15" y="20" width="110" height="65" rx="6" fill="#1e293b" stroke="#00000025" strokeWidth="0.5" />
      <rect x="15" y="20" width="110" height="65" rx="6" fill={g('fabric')} opacity="0.35" />
      <PrintZone x={30} y={35} w={50} h={35} uid={uid} />
    </svg>
  );
}

export function PhoneCaseMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 70 130" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="glossy" />
      <GroundShadow cx={35} cy={122} rx={24} ry={3} />
      <rect x="10" y="8" width="50" height="115" rx="8" fill={g('body')} stroke="#00000020" strokeWidth="0.5" />
      <rect x="10" y="8" width="50" height="115" rx="8" fill={g('shine')} opacity="0.3" />
      <PrintZone x={18} y={25} w={34} h={60} uid={uid} />
      <circle cx="35" cy="18" r="3" fill="#00000025" />
    </svg>
  );
}

export function StampMockup({ w, h, color }: MockupProps) {
  return (
    <svg width={w} height={h} viewBox="0 0 90 110" className="drop-shadow-xl" aria-hidden>
      <rect x="20" y="15" width="50" height="35" rx="3" fill={`${color}cc`} stroke="#00000015" />
      <rect x="25" y="50" width="40" height="45" rx="2" fill="#334155" />
      <rect x="30" y="55" width="30" height="8" rx="1" fill="#64748b" />
    </svg>
  );
}

export function FlyerMockup({ w, h, color, landscape, uid }: MockupProps & { landscape?: boolean }) {
  const g = (n: string) => gradRef(uid, n);
  const p = uid?.replace(/[^a-zA-Z0-9]/g, '') ?? 'm';
  const rot = landscape ? -88 : -6;
  const isBookmark = uid?.includes('marquepage');
  const vb = isBookmark ? '0 0 60 140' : '0 0 100 130';
  return (
    <svg width={w} height={h} viewBox={vb} aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="matte" />
      <g transform={`rotate(${rot} ${isBookmark ? 30 : 50} ${isBookmark ? 70 : 65})`}>
        <GroundShadow cx={isBookmark ? 30 : 50} cy={isBookmark ? 128 : 118} rx={isBookmark ? 14 : 32} ry={4} />
        {isBookmark ? (
          <>
            <rect x="22" y="12" width="16" height="110" rx="2" fill={g('paper')} stroke="#00000012" strokeWidth="0.6" />
            <rect x="22" y="12" width="16" height="110" rx="2" fill={`url(#${p}-shine)`} opacity="0.4" />
            <circle cx="30" cy="22" r="3" fill={g('metal')} />
            <PrintZone x={24} y={32} w={12} h={78} uid={uid} />
          </>
        ) : (
          <>
            <path d="M18 20 L78 18 L80 104 Q80 108 76 108 L16 106 Q12 106 12 102 Z" fill={g('paper')} stroke="#00000012" strokeWidth="0.6" />
            <path d="M76 18 L80 104" stroke="#00000008" strokeWidth="0.5" />
            <path d="M12 20 Q14 18 18 20" fill={`url(#${p}-shine)`} opacity="0.35" />
            <rect x="22" y="28" width="36" height="4" rx="1" fill="#00000014" />
            <rect x="22" y="36" width="48" height="2" rx="0.5" fill="#0000000a" />
            <rect x="22" y="41" width="42" height="2" rx="0.5" fill="#00000008" />
            <PrintZone x={22} y={52} w={48} h={44} uid={uid} />
            <path d="M78 18 L82 14 L82 18 Z" fill="#f8fafc" stroke="#00000010" />
          </>
        )}
      </g>
    </svg>
  );
}

export function PosterMockup({ w, h, color, landscape, uid }: MockupProps & { landscape?: boolean }) {
  const g = (n: string) => gradRef(uid, n);
  const p = uid?.replace(/[^a-zA-Z0-9]/g, '') ?? 'm';
  const rot = landscape ? -90 : 0;
  return (
    <svg width={w} height={h} viewBox="0 0 110 150" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="glossy" />
      <rect x="8" y="8" width="94" height="134" rx="2" fill="#e2e8f0" opacity="0.35" />
      <g transform={`rotate(${rot} 55 75)`}>
        <GroundShadow cx={55} cy={138} rx={38} ry={5} />
        <rect x="22" y="14" width="66" height="112" rx="1" fill="#cbd5e1" opacity="0.5" />
        <rect x="20" y="12" width="66" height="112" rx="1" fill={g('paper')} stroke="#00000015" strokeWidth="0.7" />
        <rect x="20" y="12" width="66" height="112" rx="1" fill={`url(#${p}-shine)`} opacity="0.45" />
        <circle cx="26" cy="18" r="2.5" fill={g('metal')} />
        <circle cx="80" cy="18" r="2.5" fill={g('metal')} />
        <rect x="28" y="24" width="32" height="5" rx="1" fill="#00000016" />
        <PrintZone x={28} y={36} w={50} h={72} uid={uid} />
        <rect x="28" y="114" width="40" height="2" rx="0.5" fill="#00000010" />
      </g>
    </svg>
  );
}

export function InvitationMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  const p = uid?.replace(/[^a-zA-Z0-9]/g, '') ?? 'm';
  return (
    <svg width={w} height={h} viewBox="0 0 120 100" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="glossy" />
      <GroundShadow cx={60} cy={92} rx={42} ry={4} />
      <g transform="rotate(-4 60 50)">
        <path d="M18 38 L102 38 L102 78 Q102 82 98 82 L22 82 Q18 82 18 78 Z" fill={g('paper')} stroke="#00000012" strokeWidth="0.6" opacity="0.85" />
        <path d="M18 38 L60 58 L102 38" fill="none" stroke="#00000015" strokeWidth="0.6" />
        <rect x="32" y="22" width="56" height="38" rx="3" fill="#fff" stroke="#00000012" strokeWidth="0.6" transform="rotate(6 60 41)" />
        <rect x="32" y="22" width="56" height="38" rx="3" fill={`url(#${p}-shine)`} opacity="0.5" transform="rotate(6 60 41)" />
        <PrintZone x={38} y={28} w={44} h={26} uid={uid} />
        <rect x="40" y="58" width="24" height="2" rx="0.5" fill={g('print')} opacity="0.6" transform="rotate(6 52 59)" />
      </g>
    </svg>
  );
}

export function DepliantMockup({ w, h, color, uid, foldType = 'tri' }: MockupProps & { foldType?: 'bi' | 'tri' }) {
  const g = (n: string) => gradRef(uid, n);
  const isBi = foldType === 'bi';
  return (
    <svg width={w} height={h} viewBox="0 0 130 100" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="matte" />
      <GroundShadow cx={65} cy={92} rx={48} ry={4} />
      <g transform="rotate(-2 65 45)">
        {isBi ? (
          <>
            <path d="M18 18 L65 18 L65 78 L18 78 Z" fill={g('paper')} stroke="#00000012" strokeWidth="0.6" />
            <path d="M65 18 L112 18 L112 78 L65 78 Z" fill={g('paper')} stroke="#00000010" strokeWidth="0.5" opacity="0.9" />
            <line x1="65" y1="18" x2="65" y2="78" stroke="#00000015" strokeWidth="0.6" />
            <PrintZone x={72} y={26} w={32} h={46} uid={uid} />
            <rect x="24" y="26" width="32" height="3" rx="0.5" fill="#00000010" />
          </>
        ) : (
          <>
            <path d="M12 18 L42 18 L42 78 L12 78 Z" fill={g('paper')} stroke="#00000010" strokeWidth="0.5" opacity="0.9" />
            <path d="M42 18 L88 18 L88 78 L42 78 Z" fill={g('paper')} stroke="#00000012" strokeWidth="0.6" />
            <path d="M88 18 L118 18 L118 78 L88 78 Z" fill={g('paper')} stroke="#00000010" strokeWidth="0.5" opacity="0.85" />
            <line x1="42" y1="18" x2="42" y2="78" stroke="#00000012" strokeWidth="0.5" />
            <line x1="88" y1="18" x2="88" y2="78" stroke="#00000012" strokeWidth="0.5" />
            <PrintZone x={48} y={26} w={34} h={46} uid={uid} />
            <rect x="18" y="26" width="18" height="3" rx="0.5" fill="#00000010" />
            <rect x="94" y="26" width="18" height="3" rx="0.5" fill="#00000010" />
          </>
        )}
      </g>
    </svg>
  );
}

export function LetterheadMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 90 120" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="white" />
      <GroundShadow cx={45} cy={112} rx={32} ry={4} />
      <rect x="14" y="10" width="62" height="96" rx="1.5" fill={g('paper')} stroke="#00000012" strokeWidth="0.6" />
      <rect x="14" y="10" width="62" height="18" rx="1.5" fill={g('print')} opacity="0.85" />
      <rect x="20" y="16" width="20" height="6" rx="1" fill="#ffffff55" />
      <rect x="20" y="36" width="34" height="2" rx="0.5" fill="#00000012" />
      <rect x="20" y="42" width="50" height="1.5" rx="0.5" fill="#00000008" />
      <rect x="20" y="47" width="48" height="1.5" rx="0.5" fill="#00000008" />
      <rect x="20" y="52" width="46" height="1.5" rx="0.5" fill="#00000008" />
      <rect x="20" y="57" width="44" height="1.5" rx="0.5" fill="#00000006" />
      <rect x="20" y="62" width="42" height="1.5" rx="0.5" fill="#00000006" />
    </svg>
  );
}

export function PhotoPrintMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 110 100" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="glossy" />
      <GroundShadow cx={55} cy={92} rx={40} ry={4} />
      <g transform="rotate(-3 55 48)">
        <rect x="16" y="14" width="78" height="62" rx="1" fill="#fff" stroke="#00000010" strokeWidth="0.6" />
        <rect x="22" y="20" width="66" height="50" rx="0.5" fill={g('print')} opacity="0.75" />
        <PrintZone x={26} y={24} w={58} h={42} uid={uid} />
        <circle cx="72" cy="32" r="6" fill="#ffffff40" />
        <path d="M26 58 L42 44 L58 52 L72 38 L84 48" stroke="#ffffff50" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function MenuMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 120 90" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="glossy" />
      <GroundShadow cx={60} cy={82} rx={44} ry={4} />
      <g transform="rotate(-5 60 42)">
        <path d="M14 16 L58 16 L58 68 L14 68 Z" fill={g('paper')} stroke="#00000012" strokeWidth="0.6" opacity="0.92" />
        <path d="M58 16 L58 68 L102 68 L102 16 Q80 42 58 16 Z" fill={g('paper')} stroke="#00000010" strokeWidth="0.5" />
        <line x1="58" y1="16" x2="58" y2="68" stroke="#00000015" strokeWidth="0.6" />
        <rect x="20" y="22" width="28" height="4" rx="1" fill={g('print')} opacity="0.7" />
        <rect x="20" y="30" width="32" height="1.5" rx="0.5" fill="#00000010" />
        <rect x="20" y="34" width="30" height="1.5" rx="0.5" fill="#00000008" />
        <PrintZone x={66} y={24} w={28} h={36} uid={uid} />
      </g>
    </svg>
  );
}

export function ConceptionMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 140 120" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="white" />
      <GroundShadow cx={70} cy={112} rx={40} ry={4} />
      <rect x="18" y="22" width="72" height="52" rx="4" fill="#1e293b" stroke="#00000020" strokeWidth="0.6" />
      <rect x="24" y="28" width="60" height="40" rx="2" fill="#0f172a" />
      <rect x="30" y="34" width="24" height="3" rx="1" fill={g('print')} opacity="0.9" />
      <rect x="30" y="40" width="40" height="2" rx="0.5" fill="#ffffff20" />
      <rect x="30" y="45" width="36" height="2" rx="0.5" fill="#ffffff15" />
      <circle cx="72" cy="52" r="10" fill={g('print')} opacity="0.5" />
      <path d="M98 38 L118 28 L118 48 L98 58 Z" fill={g('paper')} stroke="#00000012" strokeWidth="0.6" transform="rotate(8 108 43)" />
      <path d="M88 68 L108 58" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="88" cy="68" r="4" fill={color} />
      <rect x="96" y="72" width="32" height="24" rx="3" fill={g('paper')} stroke="#00000010" strokeWidth="0.5" />
      <path d="M100 78 L120 78 M100 84 L115 84 M100 90 L118 90" stroke="#00000012" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function GiletMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 200 240" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="fabric" />
      <GroundShadow cx={100} cy={228} rx={46} ry={6} />
      <path d="M78 48 L78 210 L122 210 L122 48 L100 72Z" fill={g('fabric')} stroke="#00000015" strokeWidth="0.6" />
      <path d="M58 82 L78 62 L122 62 L142 82 L142 128 L58 128Z" fill={g('fabric')} opacity="0.9" />
      <path d="M88 48 L112 48 L112 210 L88 210Z" fill="#00000008" />
      <rect x="72" y="138" width="56" height="44" rx="3" fill="#ffffff18" stroke="#ffffff35" strokeWidth="0.8" strokeDasharray="4 2" />
      <PrintZone x={76} y={144} w={48} h={32} uid={uid} />
    </svg>
  );
}

export function BobMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 200 180" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="fabric" />
      <GroundShadow cx={100} cy={168} rx={58} ry={6} />
      <ellipse cx="100" cy="72" rx="42" ry="38" fill={g('fabric')} stroke="#00000012" strokeWidth="0.6" />
      <ellipse cx="100" cy="108" rx="68" ry="14" fill={g('fabric')} opacity="0.88" />
      <path d="M32 108 Q100 128 168 108 L168 118 Q100 148 32 118Z" fill={g('fabric')} opacity="0.75" />
      <PrintZone x={72} y={58} w={56} h={28} uid={uid} />
      <path d="M58 72 Q100 62 142 72" fill="none" stroke="#ffffff25" strokeWidth="1" />
    </svg>
  );
}

export function MaillotMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 200 240" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="fabric" />
      <GroundShadow cx={100} cy={228} rx={50} ry={6} />
      <path d="M76 44c0-6 8-12 24-12s24 6 24 12l26 14 10 26-16 8-4-16v96H60V76l-4 16-16-8 10-26L76 44z" fill={g('fabric')} stroke="#00000012" strokeWidth="0.6" />
      <path d="M88 32 L112 32 L112 48 L88 48Z" fill="#1a1a2e" opacity="0.35" />
      <rect x="118" y="108" width="28" height="36" rx="2" fill="#ffffff22" stroke="#ffffff40" strokeWidth="0.8" />
      <text x="132" y="132" textAnchor="middle" fill="#ffffff55" fontSize="18" fontWeight="bold">10</text>
      <PrintZone x={68} y={100} w={64} h={48} uid={uid} />
      <path d="M60 76 L40 88 M140 76 L160 88" stroke={g('fabric')} strokeWidth="8" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

export function CombinaisonMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  const fill = color.startsWith('#FF') || color === '#FF174D' ? '#e8e8e4' : color;
  return (
    <svg width={w} height={h} viewBox="0 0 400 380" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={fill} material="fabric" />
      <GroundShadow cx={200} cy={360} rx={100} ry={12} />
      <path d="M138 72 Q138 48 200 44 Q262 48 262 72 L295 95 L312 138 L278 152 L262 108 L262 330 L138 330 L138 108 L122 152 L88 138 L105 95 Z" fill={g('fabric')} stroke="#bbb" strokeWidth="0.8" />
      <path d="M138 108 L122 152 L122 185 L138 185 L155 152 L155 108 M262 108 L278 152 L278 185 L262 185 L245 152 L245 108" fill={g('fabric')} opacity="0.85" stroke="#bbb" strokeWidth="0.6" />
      <rect x="155" y="135" width="90" height="72" rx="4" fill="#fff" stroke="#bbb" strokeWidth="0.8" />
      <rect x="165" y="145" width="28" height="20" rx="2" fill="#eee" stroke="#ccc" strokeWidth="0.5" />
      <rect x="207" y="145" width="28" height="20" rx="2" fill="#eee" stroke="#ccc" strokeWidth="0.5" />
      <line x1="138" y1="210" x2="262" y2="210" stroke="#ccc" strokeWidth="0.8" />
      <path d="M155 210 L155 330 M245 210 L245 330" fill="none" stroke="#ccc" strokeWidth="0.7" />
      <PrintZone x={168} y={155} w={64} h={38} uid={uid} />
    </svg>
  );
}

export function SurvetementMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 220 240" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="fabric" />
      <GroundShadow cx={110} cy={228} rx={62} ry={6} />
      <path d="M48 52c0-10 8-16 18-16h16c10 0 18 6 18 16l20 10 8 22-12 6-4-12v72H36V82l-4 12-12-6 8-22L48 52z" fill={g('fabric')} stroke="#00000012" strokeWidth="0.6" />
      <path d="M36 82 L20 96 L28 112 L36 104" fill={g('fabric')} opacity="0.85" />
      <path d="M100 82 L116 82 L116 148 L100 148Z" fill="#00000010" />
      <PrintZone x={52} y={98} w={40} h={36} uid={uid} />
      <path d="M138 100 L138 210 L158 210 L158 100 M170 100 L170 210 L190 210 L190 100" fill={g('fabric')} opacity="0.88" stroke="#00000010" strokeWidth="0.5" />
      <line x1="138" y1="140" x2="190" y2="140" stroke="#00000010" strokeWidth="0.5" />
      <rect x="144" y="108" width="36" height="24" rx="2" fill="#ffffff18" />
    </svg>
  );
}

export function LambahoanyMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 200 220" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="fabric" />
      <GroundShadow cx={100} cy={208} rx={48} ry={5} />
      <path d="M60 40 Q100 28 140 40 L155 180 Q100 200 45 180Z" fill={g('fabric')} stroke="#00000012" strokeWidth="0.6" />
      <path d="M70 55 Q100 48 130 55" fill="none" stroke="#ffffff30" strokeWidth="1.2" />
      <path d="M55 100 Q100 92 145 100" fill="none" stroke="#00000010" strokeWidth="0.8" />
      <path d="M50 140 Q100 132 150 140" fill="none" stroke="#00000008" strokeWidth="0.6" />
      <PrintZone x={72} y={72} w={56} h={72} uid={uid} />
      <ellipse cx="100" cy="38" rx="8" ry="4" fill={g('metal')} opacity="0.6" />
    </svg>
  );
}

// ── Réutilisation des mockups textile / papier existants (améliorés) ──

export function TShirtMockup({ w, h, color, material, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  const bodyFill = material === 'fabric' ? g('fabric') : g('body');
  const weave = material === 'fabric' ? `url(#${uid?.replace(/[^a-zA-Z0-9]/g, '') ?? 'm'}-weave)` : bodyFill;
  return (
    <svg width={w} height={h} viewBox="0 0 200 240" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material={material ?? 'fabric'} />
      <GroundShadow cx={100} cy={228} rx={52} ry={6} />
      <path
        d="M78 42c0-8 6-14 14-14h16c8 0 14 6 14 14l28 14 12 28-18 8-6-18v98H52V74l-6 18-18-8 12-28L78 42z"
        fill={weave}
        stroke="#00000018"
        strokeWidth="0.8"
      />
      <ellipse cx="100" cy="38" rx="18" ry="10" fill="#1a1a2e" opacity="0.22" />
      <path d="M52 74 L28 92 L36 112 L52 102 M148 74 L172 92 L164 112 L148 102" fill={bodyFill} opacity="0.88" />
      {/* Plis tissu */}
      <path d="M68 95 Q100 88 132 95" fill="none" stroke="#00000010" strokeWidth="1.2" />
      <path d="M60 130 Q100 122 140 130" fill="none" stroke="#00000008" strokeWidth="1" />
      <PrintZone x={66} y={104} w={68} h={52} uid={uid} />
      <path d="M78 42 L122 42" stroke="#ffffff35" strokeWidth="0.8" />
    </svg>
  );
}

export function PoloMockup({ w, h, color, material, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  const bodyFill = material === 'fabric' ? g('fabric') : g('body');
  return (
    <svg width={w} height={h} viewBox="0 0 200 240" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material={material ?? 'fabric'} />
      <GroundShadow cx={100} cy={228} rx={52} ry={6} />
      <path d="M78 42c0-8 6-14 14-14h16c8 0 14 6 14 14l28 14 12 28-18 8-6-18v98H52V74l-6 18-18-8 12-28L78 42z" fill={bodyFill} stroke="#00000018" strokeWidth="0.8" />
      <path d="M88 28 L112 28 L112 52 L100 62 L88 52Z" fill="#1a1a2e" opacity="0.4" />
      <rect x="97" y="52" width="6" height="22" rx="1" fill="#ffffff40" />
      <circle cx="100" cy="58" r="1.5" fill="#ffffff60" />
      <circle cx="100" cy="66" r="1.5" fill="#ffffff60" />
      <PrintZone x={66} y={104} w={68} h={52} uid={uid} />
    </svg>
  );
}

export function SweatMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 200 240" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="fabric" />
      <GroundShadow cx={100} cy={228} rx={58} ry={6} />
      <path d="M72 48c0-10 8-18 18-18h20c10 0 18 8 18 18l32 16 14 32-20 10-8-22v96H54V84l-8 22-20-10 14-32L72 48z" fill={g('fabric')} stroke="#00000012" strokeWidth="0.6" />
      <ellipse cx="100" cy="44" rx="20" ry="12" fill="#1a1a2e" opacity="0.28" />
      <PrintZone x={68} y={116} w={64} h={40} uid={uid} />
    </svg>
  );
}

export function CapMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  const fill = color === '#FF174D' || color.startsWith('#FF') ? '#f2f2ee' : color;
  return (
    <svg width={w} height={h} viewBox="0 0 400 320" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={fill} material="fabric" />
      <GroundShadow cx={200} cy={300} rx={110} ry={12} />
      <ellipse cx="200" cy="95" rx="88" ry="22" fill={g('fabric')} stroke="#bbb" strokeWidth="0.8" />
      <path d="M112 95 Q112 38 200 28 Q288 38 288 95 L288 142 Q200 162 112 142 Z" fill={g('fabric')} stroke="#bbb" strokeWidth="0.8" />
      <path d="M112 95 L200 28 L288 95" fill="none" stroke="#ccc" strokeWidth="1.2" />
      <path d="M145 58 L200 38 L255 58" fill="none" stroke="#ccc" strokeWidth="0.9" />
      <path d="M128 78 L200 55 L272 78" fill="none" stroke="#ccc" strokeWidth="0.7" />
      <circle cx="200" cy="34" r="6" fill={g('fabric')} stroke="#bbb" strokeWidth="0.6" />
      <path d="M112 142 Q200 172 318 132 L318 152 Q200 202 98 162 L98 142 Q108 146 112 142" fill={g('fabric')} opacity="0.88" stroke="#aaa" strokeWidth="0.8" />
      <rect x="168" y="68" width="64" height="48" rx="4" fill={`url(#${uidPrefix(uid)}-print)`} opacity="0.5" stroke="#ccc" strokeDasharray="4 3" strokeWidth="0.8" />
    </svg>
  );
}

export function ToteBagMockup({ w, h, color, material, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  const fill = material === 'kraft' ? g('kraft') : g('fabric');
  return (
    <svg width={w} height={h} viewBox="0 0 200 220" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material={material} />
      <GroundShadow cx={100} cy={212} rx={48} ry={5} />
      <path d="M55 75 Q55 45 100 45 Q145 45 145 75 L155 200 Q100 215 45 200Z" fill={fill} stroke="#00000012" strokeWidth="0.5" />
      <path d="M70 75 Q70 58 100 58 Q130 58 130 75" fill="none" stroke="#00000018" strokeWidth="3.5" />
      <PrintZone x={70} y={102} w={60} h={54} uid={uid} />
    </svg>
  );
}

export function MugMockup3D({ w, h, color, material, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  const p = uid?.replace(/[^a-zA-Z0-9]/g, '') ?? 'm';
  return (
    <svg width={w} height={h} viewBox="0 0 200 200" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material={material ?? 'glossy'} />
      <GroundShadow cx={88} cy={188} rx={46} ry={6} />
      <ellipse cx="98" cy="52" rx="48" ry="7" fill="#ffffff" stroke="#00000010" strokeWidth="0.5" />
      <path
        d="M48 68 Q48 48 88 48 L108 48 Q148 48 148 68 L148 148 Q148 168 108 168 L88 168 Q48 168 48 148Z"
        fill={g('ceramic')}
        stroke="#00000012"
        strokeWidth="0.6"
      />
      <rect x="48" y="68" width="100" height="80" fill={`url(#${p}-shine)`} opacity="0.35" />
      {/* Anse 3D */}
      <path d="M148 78 Q188 74 188 108 Q188 142 148 138" fill="none" stroke={g('ceramic')} strokeWidth="11" />
      <path d="M148 78 Q188 74 188 108 Q188 142 148 138" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.35" transform="translate(-2 -1)" />
      <PrintZone x={58} y={78} w={62} h={48} uid={uid} />
      <ellipse cx="98" cy="52" rx="44" ry="4" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}

export function RollUpMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <MockupSvg w={w} h={h} viewBox="0 0 90 210" uid={uid} color={color} material="matte">
      <GroundShadow cx={45} cy={204} rx={36} ry={4} />
      <rect x="8" y="192" width="22" height="4" rx="1.5" fill={g('metal')} transform="rotate(-8 19 194)" />
      <rect x="60" y="192" width="22" height="4" rx="1.5" fill={g('metal')} transform="rotate(8 71 194)" />
      <rect x="14" y="178" width="62" height="14" rx="3" fill={g('metal')} stroke="#475569" strokeWidth="0.5" />
      <rect x="18" y="181" width="54" height="4" rx="1" fill={g('chrome')} opacity="0.7" />
      <circle cx="45" cy="185" r="2.5" fill="#334155" />
      <rect x="43" y="28" width="4" height="152" rx="1.5" fill={g('metal')} />
      <rect x="42" y="24" width="6" height="6" rx="1" fill={g('chrome')} />
      <path d="M22 32 Q45 28 68 32 L66 176 Q45 180 24 176 Z" fill={g('pvc')} stroke="#00000015" strokeWidth="0.6" />
      <path d="M24 32 Q45 30 66 32" fill="none" stroke="#ffffff55" strokeWidth="0.8" />
      <path d="M30 60 Q45 58 60 60" fill="none" stroke="#00000008" strokeWidth="0.5" />
      <path d="M28 110 Q45 108 62 110" fill="none" stroke="#00000006" strokeWidth="0.5" />
      <PrintZone x={28} y={48} w={34} h={108} uid={uid} />
      <rect x="38" y="26" width="14" height="5" rx="1" fill={g('chrome')} stroke="#64748b" strokeWidth="0.4" />
    </MockupSvg>
  );
}

export function XBannerMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 110 190" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="matte" />
      <GroundShadow cx={55} cy={184} rx={28} ry={4} />
      {/* Bâche tendue */}
      <path d="M22 12 L88 12 L82 128 L28 128 Z" fill={g('pvc')} stroke="#00000012" strokeWidth="0.6" />
      <PrintZone x={32} y={28} w={46} h={88} uid={uid} />
      {/* Structure X aluminium */}
      <path d="M28 128 L12 182" stroke={g('metal')} strokeWidth="5" strokeLinecap="round" />
      <path d="M82 128 L98 182" stroke={g('metal')} strokeWidth="5" strokeLinecap="round" />
      <line x1="55" y1="128" x2="55" y2="178" stroke={g('metal')} strokeWidth="4" />
      <circle cx="55" cy="178" r="3" fill={g('chrome')} />
    </svg>
  );
}

export function PaperMockup({ w, h, color, landscape, uid }: MockupProps & { landscape?: boolean }) {
  const g = (n: string) => gradRef(uid, n);
  const rot = landscape ? -90 : -3;
  return (
    <svg width={w} height={h} viewBox="0 0 100 130" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="glossy" />
      <g transform={`rotate(${rot} 50 65)`}>
        <GroundShadow cx={50} cy={118} rx={36} ry={4} />
        {/* Feuilles empilées — Printoclock */}
        <rect x="18" y="22" width="64" height="88" rx="1.5" fill={g('paper')} stroke="#00000010" strokeWidth="0.5" transform="translate(3 3)" opacity="0.5" />
        <rect x="16" y="20" width="64" height="88" rx="1.5" fill={g('paper')} stroke="#00000010" strokeWidth="0.5" transform="translate(1.5 1.5)" opacity="0.75" />
        <rect x="14" y="18" width="64" height="88" rx="1.5" fill={`url(#${uid ? uid.replace(/[^a-zA-Z0-9]/g, '') : 'm'}-paper)`} stroke="#00000012" strokeWidth="0.6" />
        <rect x="14" y="18" width="64" height="88" rx="1.5" fill={`url(#${uid ? uid.replace(/[^a-zA-Z0-9]/g, '') : 'm'}-grain)`} opacity="0.6" />
        {/* Contenu type flyer */}
        <rect x="20" y="26" width="28" height="3" rx="1" fill="#00000012" />
        <rect x="20" y="32" width="52" height="1.5" rx="0.5" fill="#00000008" />
        <rect x="20" y="36" width="48" height="1.5" rx="0.5" fill="#00000008" />
        <rect x="20" y="40" width="44" height="1.5" rx="0.5" fill="#00000008" />
        <PrintZone x={20} y={52} w={52} h={46} uid={uid} />
        <path d="M14 18 L78 18" stroke="#ffffff90" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

export function BusinessCardMockup({ w, h, color, uid, roundedCorners }: MockupProps & { roundedCorners?: boolean }) {
  const g = (n: string) => gradRef(uid, n);
  const rx = roundedCorners ? 8 : 3;
  const p = uid?.replace(/[^a-zA-Z0-9]/g, '') ?? 'm';
  return (
    <svg width={w} height={h} viewBox="0 0 120 80" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="glossy" />
      <GroundShadow cx={58} cy={72} rx={40} ry={4} />
      <g transform="rotate(-8 60 40)">
        <rect x="22" y="18" width="76" height="48" rx={rx} fill={g('paper')} stroke="#00000010" transform="translate(4 4)" opacity="0.45" />
        <rect x="20" y="16" width="76" height="48" rx={rx} fill={g('paper')} stroke="#00000012" strokeWidth="0.6" />
        <rect x="20" y="16" width="76" height="48" rx={rx} fill={`url(#${p}-shine)`} opacity="0.55" />
        <rect x="26" y="24" width="22" height="2.5" rx="1" fill="#00000018" />
        <rect x="26" y="30" width="34" height="1.5" rx="0.5" fill="#00000010" />
        <rect x="26" y="34" width="28" height="1.5" rx="0.5" fill="#00000008" />
        <circle cx="82" cy="38" r="10" fill={g('print')} opacity="0.7" />
      </g>
    </svg>
  );
}

export function NotebookMockup({ w, h, color }: MockupProps) {
  return (
    <div className="relative shadow-xl rounded-sm" style={{ width: w, height: h }}>
      <div className="absolute inset-0 rounded-sm border border-black/8 bg-gradient-to-b from-white to-neutral-100" />
      <div className="absolute top-2 bottom-2 left-[18%] w-px bg-red-400/60" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="absolute left-[14%] w-1.5 h-1.5 rounded-full bg-neutral-400/50" style={{ top: `${12 + i * 16}%` }} />
      ))}
      <div className="absolute top-0 bottom-0 left-0 w-[16%] rounded-l-sm" style={{ background: `linear-gradient(180deg, ${color}aa, ${color}66)` }} />
    </div>
  );
}

export function PenMockup({ w, h, color }: MockupProps) {
  return (
    <svg width={w} height={h} viewBox="0 0 200 200" className="drop-shadow-xl" aria-hidden>
      <rect x="88" y="30" width="24" height="130" rx="4" fill={color} stroke="#00000015" transform="rotate(-25 100 100)" />
      <polygon points="75,155 100,175 125,155" fill="#334155" transform="rotate(-25 100 100)" />
    </svg>
  );
}

export function CanvasMockup({ w, h, color }: MockupProps) {
  return (
    <div className="relative drop-shadow-xl" style={{ width: w, height: h }}>
      <div className="absolute inset-[6%] border-[3px] border-neutral-700 rounded-sm shadow-inner" style={{ background: `linear-gradient(135deg, ${color}22, ${color}77)` }}>
        <div className="absolute inset-2 border border-white/30" />
      </div>
    </div>
  );
}

export function ChevaletMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 140 120" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="white" />
      <GroundShadow cx={70} cy={112} rx={38} ry={4} />
      <path d="M35 110 L45 45 L95 45 L105 110Z" fill={g('metal')} opacity="0.4" />
      <rect x="42" y="20" width="56" height="40" rx="2" fill={g('paper')} stroke="#00000012" transform="rotate(-4 70 40)" />
      <PrintZone x={48} y={26} w={44} h={28} uid={uid} />
    </svg>
  );
}

export function FlagMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 80 160" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="fabric" />
      <GroundShadow cx={42} cy={154} rx={18} ry={3} />
      <rect x="38" y="10" width="4" height="145" fill={g('metal')} />
      <path d="M42 15 Q75 22 72 52 Q48 46 42 78 Q38 50 42 15Z" fill={g('fabric')} stroke="#00000015" strokeWidth="0.5" />
      <PrintZone x={48} y={24} w={22} h={44} uid={uid} />
      <ellipse cx="40" cy="12" rx="5" ry="3" fill={g('chrome')} />
    </svg>
  );
}

export function StickerMockup({ w, h, color, uid }: MockupProps) {
  const g = (n: string) => gradRef(uid, n);
  return (
    <svg width={w} height={h} viewBox="0 0 80 100" aria-hidden filter={g('ds')}>
      <MockupSvgDefs uid={uid} color={color} material="vinyl" />
      <GroundShadow cx={40} cy={92} rx={24} ry={3} />
      <rect x="15" y="10" width="50" height="70" rx="4" fill={g('paper')} stroke="#00000012" strokeWidth="0.5" />
      <PrintZone x={20} y={18} w={40} h={54} uid={uid} />
      <path d="M15 10 L65 10" stroke="#ffffff70" strokeWidth="0.6" />
      <circle cx="40" cy="88" r="6" fill={g('chrome')} />
    </svg>
  );
}

export function GenericProductMockup({ w, h, color, icon }: MockupProps & { icon?: string }) {
  return (
    <div
      className="relative rounded-[7px] flex items-center justify-center mx-auto"
      style={{ width: w, height: h, background: 'transparent' }}
    >
      <span className="text-5xl drop-shadow-md">{icon ?? '📦'}</span>
    </div>
  );
}

export type { MockupKind, MockupMaterial };
