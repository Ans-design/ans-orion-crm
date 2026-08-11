'use client';

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react';

export type LayoutInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** CSS vars sync */
  css: {
    '--orion-inset-top': string;
    '--orion-inset-bottom': string;
    '--orion-inset-left': string;
    '--orion-inset-right': string;
  };
};

const DEFAULT: LayoutInsets = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  css: {
    '--orion-inset-top': '0px',
    '--orion-inset-bottom': '0px',
    '--orion-inset-left': '0px',
    '--orion-inset-right': '0px',
  },
};

const Ctx = createContext<LayoutInsets>(DEFAULT);

/** Priorité unique des barres basses (V15) — plus bas = plus près du bas d’écran. */
export const BOTTOM_STACK_PRIORITY = {
  mobileNav: 10,
  ticker: 20,
  fabTalk: 40,
  toast: 50,
  posSummary: 70,
  stickyAction: 80,
  keyboard: 100,
} as const;

export function LayoutInsetsProvider({
  children,
  bottom = 0,
  top = 0,
  left = 0,
  right = 0,
}: {
  children: ReactNode;
  bottom?: number;
  top?: number;
  left?: number;
  right?: number;
}) {
  const value = useMemo<LayoutInsets>(() => {
    return {
      top,
      bottom,
      left,
      right,
      css: {
        '--orion-inset-top': `${top}px`,
        '--orion-inset-bottom': `${bottom}px`,
        '--orion-inset-left': `${left}px`,
        '--orion-inset-right': `${right}px`,
      },
    };
  }, [top, bottom, left, right]);

  return (
    <Ctx.Provider value={value}>
      <div style={value.css as CSSProperties} className="min-h-0 flex-1 flex flex-col">
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useLayoutInsets() {
  return useContext(Ctx);
}
