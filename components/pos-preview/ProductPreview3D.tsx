'use client';

import type { ProductPreviewRegistryEntry } from '@/lib/pos-preview/product-preview.types';

type Props = {
  entry: ProductPreviewRegistryEntry;
  width: number;
  height: number;
  fallback: React.ReactNode;
};

/**
 * Pseudo-3D CSS avancé — remplace Three.js tant que GLB optimisés ne sont pas fournis.
 */
export function ProductPreview3D({ entry, width, height, fallback }: Props) {
  if (entry.previewMode !== 'interactive-3d') {
    return <>{fallback}</>;
  }

  const key = entry.mockupKey ?? entry.productId;
  const isRollup = key === 'rollup' || entry.productId === 'plv-rollup';
  const isMug = key === 'mug' || entry.productId === 'gd-mug';
  const isBox = key === 'box' || entry.productId === 'pkg-boite';
  const isFlag = entry.productId === 'plv-oriflamme' || entry.productId === 'evt-fanion';

  return (
    <div
      className="relative mx-auto"
      style={{
        width,
        height: height + (isRollup ? 24 : 0),
        perspective: '820px',
      }}
    >
      <div
        className="absolute inset-0 flex items-end justify-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {isRollup && (
          <>
            <div
              className="absolute bottom-0 w-[78%] h-3 rounded-b-md bg-gradient-to-b from-zinc-400 to-zinc-600 shadow-lg"
              style={{ transform: 'rotateX(12deg)' }}
            />
            <div
              className="relative rounded-sm border border-white/20 bg-gradient-to-br from-slate-100 to-slate-300 shadow-2xl"
              style={{
                width: width * 0.72,
                height: height * 0.88,
                transform: 'rotateY(-8deg) rotateX(4deg)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
              }}
            >
              <div className="absolute inset-2 rounded-sm bg-gradient-to-br from-[#FF174D]/15 to-transparent" />
            </div>
          </>
        )}
        {isMug && (
          <div
            className="relative rounded-b-2xl border border-white/30 bg-gradient-to-br from-slate-50 to-slate-200"
            style={{
              width: width * 0.55,
              height: height * 0.75,
              transform: 'rotateY(-18deg)',
              boxShadow: '12px 20px 40px rgba(0,0,0,0.28)',
            }}
          >
            <div
              className="absolute -right-[18%] top-[18%] w-[28%] h-[45%] rounded-full border-[10px] border-slate-200/90"
              style={{ transform: 'rotateY(40deg)' }}
            />
          </div>
        )}
        {isBox && (
          <div
            className="relative bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/80"
            style={{
              width: width * 0.65,
              height: height * 0.55,
              transform: 'rotateX(18deg) rotateY(-22deg)',
              boxShadow: '16px 28px 36px rgba(0,0,0,0.25)',
            }}
          >
            <div
              className="absolute -top-[12%] left-0 right-0 h-[24%] bg-gradient-to-b from-amber-100/90 to-amber-200/60 origin-bottom"
              style={{ transform: 'rotateX(-55deg)' }}
            />
          </div>
        )}
        {isFlag && (
          <div
            className="relative"
            style={{ transform: 'rotateY(-6deg)' }}
          >
            <div className="w-2 h-[85%] bg-zinc-500 mx-auto rounded-sm" />
            <div
              className="absolute top-[8%] left-[50%] bg-gradient-to-br from-red-500/80 to-red-700/80 rounded-sm shadow-lg"
              style={{ width: width * 0.55, height: height * 0.7, transform: 'skewY(-4deg)' }}
            />
          </div>
        )}
        {!isRollup && !isMug && !isBox && !isFlag && fallback}
      </div>
    </div>
  );
}
