'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  BOTTOM_STACK_PRIORITY,
  LayoutInsetsProvider,
  useLayoutInsets,
} from '@/components/layout/layout-insets-provider';

export type BottomLayerId = keyof typeof BOTTOM_STACK_PRIORITY;

type LayerState = Partial<Record<BottomLayerId, number>>;

type BottomStackCtx = {
  layers: LayerState;
  /** Hauteur réservée (px) pour une couche ; 0 = absente */
  setLayerHeight: (id: BottomLayerId, heightPx: number) => void;
  /** Offset bas total (somme non chevauchante ordonnée) */
  totalBottom: number;
  /** Offset pour positionner une couche au-dessus des priorités plus basses */
  offsetAbove: (id: BottomLayerId) => number;
};

const Ctx = createContext<BottomStackCtx | null>(null);

const ORDER: BottomLayerId[] = [
  'mobileNav',
  'ticker',
  'fabTalk',
  'toast',
  'posSummary',
  'stickyAction',
  'keyboard',
];

function computeTotal(layers: LayerState): number {
  return ORDER.reduce((sum, id) => sum + (layers[id] ?? 0), 0);
}

function computeOffsetAbove(layers: LayerState, id: BottomLayerId): number {
  const prio = BOTTOM_STACK_PRIORITY[id];
  return ORDER.filter((lid) => BOTTOM_STACK_PRIORITY[lid] < prio).reduce(
    (sum, lid) => sum + (layers[lid] ?? 0),
    0,
  );
}

/**
 * Empilement bas unique — réserve offsets + expose tokens via LayoutInsetsProvider.
 * Une seule CTA primaire visuelle au même endroit (doc collisions).
 */
export function BottomActionStackProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: LayerState;
}) {
  const [layers, setLayers] = useState<LayerState>(initial ?? {});

  const setLayerHeight = useCallback((id: BottomLayerId, heightPx: number) => {
    setLayers((prev) => {
      const next = Math.max(0, Math.round(heightPx));
      if ((prev[id] ?? 0) === next) return prev;
      return { ...prev, [id]: next };
    });
  }, []);

  const totalBottom = useMemo(() => computeTotal(layers), [layers]);

  const value = useMemo<BottomStackCtx>(
    () => ({
      layers,
      setLayerHeight,
      totalBottom,
      offsetAbove: (id) => computeOffsetAbove(layers, id),
    }),
    [layers, setLayerHeight, totalBottom],
  );

  return (
    <Ctx.Provider value={value}>
      <LayoutInsetsProvider bottom={totalBottom}>{children}</LayoutInsetsProvider>
    </Ctx.Provider>
  );
}

export function useBottomActionStack() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useBottomActionStack requires BottomActionStackProvider');
  }
  return ctx;
}

export function useBottomActionStackOptional() {
  return useContext(Ctx);
}

/** Re-export insets pour consommateurs */
export { useLayoutInsets, BOTTOM_STACK_PRIORITY };

/** Pure helpers for unit tests */
export const bottomStackMath = { computeTotal, computeOffsetAbove, ORDER };
