'use client';

import { useEffect, useState } from 'react';
import {
  BP,
  modeFromWidth,
  RESPONSIVE_MEDIA,
  type ResponsiveMode,
} from '@/lib/responsive/breakpoints';
import type { InputMode, Orientation } from '@/lib/responsive/types';

export type ResponsiveState = {
  mode: ResponsiveMode;
  width: number;
  input: InputMode;
  orientation: Orientation;
  /** true après premier matchMedia (évite flash SSR) */
  ready: boolean;
};

const SSR_DEFAULT: ResponsiveState = {
  mode: 'desktop',
  width: BP.xl,
  input: 'fine-pointer',
  orientation: 'landscape',
  ready: false,
};

function readState(): ResponsiveState {
  const width = window.innerWidth;
  const coarse = window.matchMedia(RESPONSIVE_MEDIA.coarsePointer).matches;
  const fine = window.matchMedia(RESPONSIVE_MEDIA.finePointer).matches;
  let input: InputMode = 'mixed';
  if (coarse && !fine) input = 'touch';
  else if (fine && !coarse) input = 'fine-pointer';
  return {
    mode: modeFromWidth(width),
    width,
    input,
    orientation: window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape',
    ready: true,
  };
}

/**
 * Hook viewport — n’utilise que les constantes BP.
 * Ne pilote jamais permissions / données métier.
 */
export function useResponsiveMode(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(SSR_DEFAULT);

  useEffect(() => {
    const update = () => setState(readState());
    update();
    const mqPhone = window.matchMedia(RESPONSIVE_MEDIA.phoneMax);
    const mqTablet = window.matchMedia(RESPONSIVE_MEDIA.tablet);
    const mqDesktop = window.matchMedia(RESPONSIVE_MEDIA.desktop);
    const mqCoarse = window.matchMedia(RESPONSIVE_MEDIA.coarsePointer);
    mqPhone.addEventListener('change', update);
    mqTablet.addEventListener('change', update);
    mqDesktop.addEventListener('change', update);
    mqCoarse.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mqPhone.removeEventListener('change', update);
      mqTablet.removeEventListener('change', update);
      mqDesktop.removeEventListener('change', update);
      mqCoarse.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return state;
}
