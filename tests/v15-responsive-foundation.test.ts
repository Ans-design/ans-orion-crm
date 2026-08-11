import { describe, expect, it } from 'vitest';
import { BP, modeFromWidth, SHELL_CLASS } from '@/lib/responsive/breakpoints';
import { buildMobileBottomNav, shouldHideMobileBottomNav } from '@/lib/responsive/mobile-nav';
import { columnsForMode, cardFields } from '@/lib/responsive/column-priority';
import { resolveOverlayPresentation } from '@/lib/responsive/resolve-overlay';
import { layoutForPath, prefersCardList } from '@/lib/responsive/layout-registry';
import { bottomStackMath } from '@/components/responsive/bottom-action-stack';
import type { ColumnPriority } from '@/lib/responsive/types';

describe('V15 breakpoints', () => {
  it('maps phone / tablet / desktop', () => {
    expect(modeFromWidth(320)).toBe('phone');
    expect(modeFromWidth(767)).toBe('phone');
    expect(modeFromWidth(BP.md)).toBe('tablet');
    expect(modeFromWidth(1024)).toBe('tablet');
    expect(modeFromWidth(1279)).toBe('tablet');
    expect(modeFromWidth(BP.xl)).toBe('desktop');
  });

  it('shell classes use xl for desktop sidebar', () => {
    expect(SHELL_CLASS.desktopSidebar).toContain('xl:flex');
    expect(SHELL_CLASS.tabletRail).toContain('md:flex');
    expect(SHELL_CLASS.tabletRail).toContain('xl:hidden');
    expect(SHELL_CLASS.contentOffset).toContain('orion-sidebar-offset');
  });
});

describe('V15 mobile nav', () => {
  it('hides only outside app shell (auth/public) — permanent on pos / messagerie', () => {
    expect(shouldHideMobileBottomNav('/login')).toBe(true);
    expect(shouldHideMobileBottomNav('/register')).toBe(true);
    expect(shouldHideMobileBottomNav('/pos')).toBe(false);
    expect(shouldHideMobileBottomNav('/pos/abc')).toBe(false);
    expect(shouldHideMobileBottomNav('/messagerie')).toBe(false);
    expect(shouldHideMobileBottomNav('/dashboard')).toBe(false);
  });

  it('always includes permanent Talk slot', () => {
    const { slots } = buildMobileBottomNav('commercial');
    expect(slots.some((s) => s.id === 'talk' && s.href.includes('messagerie'))).toBe(true);
  });

  it('builds at most 4 primary slots + more list', () => {
    const { slots, more } = buildMobileBottomNav('commercial');
    expect(slots.length).toBeLessThanOrEqual(4);
    expect(slots.every((s) => s.href && s.label)).toBe(true);
    expect(Array.isArray(more)).toBe(true);
    // Tab labels stay short (no multi-word wrap risk)
    expect(slots.every((s) => s.label.length <= 10 && !/\s{2,}/.test(s.label))).toBe(true);
  });

  it('uses fixed short tab labels (never mid-word truncation of long titles)', () => {
    const { slots } = buildMobileBottomNav('commercial');
    const labels = slots.map((s) => s.label);
    expect(labels).not.toContain('Mon accueil');
    expect(labels.some((l) => l === 'Accueil' || l === 'Espace')).toBe(true);
    const action = slots.find((s) => s.id === 'action');
    if (action) {
      expect(['POS', 'Devis', 'Cmd', 'Stock', 'Livr.', 'Paie']).toContain(action.label);
    }
  });
});

describe('V15 shell metrics', () => {
  it('expose bottom-nav height aligned CSS 72px', async () => {
    const { ORION_MOBILE_BOTTOM_NAV_PX, ORION_TABLET_RAIL_PX } = await import(
      '@/lib/responsive/shell-metrics'
    );
    expect(ORION_MOBILE_BOTTOM_NAV_PX).toBe(72);
    expect(ORION_TABLET_RAIL_PX).toBe(72);
  });
});

describe('V15 focus trap module', () => {
  it('exports useFocusTrap', async () => {
    const mod = await import('@/lib/responsive/use-focus-trap');
    expect(typeof mod.useFocusTrap).toBe('function');
  });
});

const COLS: ColumnPriority[] = [
  { id: 'numero', label: 'N°', phone: 'critical', tablet: 'critical', desktop: 'critical', cardField: true },
  { id: 'client', label: 'Client', phone: 'primary', tablet: 'primary', desktop: 'primary', cardField: true },
  { id: 'statut', label: 'Statut', phone: 'primary', tablet: 'primary', desktop: 'primary', cardField: true },
  { id: 'note', label: 'Note', phone: 'detail', tablet: 'detail', desktop: 'secondary' },
  { id: 'ops', label: 'Ops', phone: 'secondary', tablet: 'secondary', desktop: 'secondary' },
];

describe('V15 column priority', () => {
  it('filters phone to critical/primary/card', () => {
    const phone = columnsForMode(COLS, 'phone');
    expect(phone.map((c) => c.id)).toEqual(['numero', 'client', 'statut']);
    expect(cardFields(COLS).length).toBeGreaterThanOrEqual(3);
  });

  it('hides detail on tablet', () => {
    expect(columnsForMode(COLS, 'tablet').some((c) => c.id === 'note')).toBe(false);
  });
});

describe('V15 AdaptiveOverlay resolver', () => {
  it('maps modes to presentations', () => {
    expect(resolveOverlayPresentation('desktop', 'form')).toBe('dialog');
    expect(resolveOverlayPresentation('tablet', 'detail')).toBe('sheet-right');
    expect(resolveOverlayPresentation('phone', 'choice')).toBe('sheet-bottom');
    expect(resolveOverlayPresentation('phone', 'form')).toBe('fullscreen');
    expect(resolveOverlayPresentation('desktop', 'finance')).toBe('alert');
  });
});

describe('V15 layout registry', () => {
  it('resolves commandes cards-phone', () => {
    expect(layoutForPath('/commandes/abc')?.template).toBe('list');
    expect(prefersCardList('/commandes', 'phone')).toBe(true);
    expect(prefersCardList('/commandes', 'desktop')).toBe(false);
    expect(prefersCardList('/clients', 'phone')).toBe(true);
  });
});

describe('V15 BottomActionStack math', () => {
  it('stacks nav then ticker then pos', () => {
    const layers = {
      mobileNav: 56,
      ticker: 40,
      posSummary: 72,
      fabTalk: 0,
      toast: 0,
      stickyAction: 0,
      keyboard: 0,
    };
    expect(bottomStackMath.computeTotal(layers)).toBe(168);
    expect(bottomStackMath.computeOffsetAbove(layers, 'ticker')).toBe(56);
    expect(bottomStackMath.computeOffsetAbove(layers, 'posSummary')).toBe(96);
  });
});
