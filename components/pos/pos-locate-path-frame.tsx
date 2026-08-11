'use client';

import { useLayoutEffect, useRef, useState } from 'react';

const PAD = 2;
const RADIUS = 7;

/** Contour SVG rouge — 1 tour fluide autour du cadre extérieur section. */
export function PosLocatePathFrame() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const parent = svgRef.current?.parentElement;
    if (!parent) return;

    const sync = () => {
      const { width, height } = parent.getBoundingClientRect();
      setBox({
        w: Math.max(0, Math.round(width * 2) / 2),
        h: Math.max(0, Math.round(height * 2) / 2),
      });
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const w = Math.max(0, box.w - PAD * 2);
  const h = Math.max(0, box.h - PAD * 2);
  const ready = w > 8 && h > 8;
  const rx = Math.min(RADIUS, w / 2, h / 2);

  return (
    <svg
      ref={svgRef}
      className="pos-section-locate-path"
      aria-hidden
      width={box.w || '100%'}
      height={box.h || '100%'}
    >
      {ready ? (
        <>
          <rect
            className="pos-section-locate-path__glow"
            x={PAD}
            y={PAD}
            width={w}
            height={h}
            rx={rx}
            ry={rx}
            pathLength={100}
            fill="none"
          />
          <rect
            className="pos-section-locate-path__stroke"
            x={PAD}
            y={PAD}
            width={w}
            height={h}
            rx={rx}
            ry={rx}
            pathLength={100}
            fill="none"
          />
        </>
      ) : null}
    </svg>
  );
}
