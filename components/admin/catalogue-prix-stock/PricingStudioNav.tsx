'use client';

import { useRef, type ReactNode } from 'react';
import {
  AlertTriangle,
  Calculator,
  Cpu,
  GitBranch,
  LayoutDashboard,
  SlidersHorizontal,
  Tags,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sous-navigation Studio Prix — sections historiques masquées (refonte 3 piliers).
 * Articles & paliers : PillTabs Tarifs | Paliers dans le workspace.
 * Formules & moteurs : domaine `calculs` dédié.
 */
export type PricingStudioSectionId =
  | 'articles'
  | 'overview'
  | 'engines'
  | 'formulas'
  | 'tiers'
  | 'dependencies'
  | 'anomalies'
  | 'simulation'
  | 'versions';

export type PricingStudioVisibleSectionId = Exclude<
  PricingStudioSectionId,
  'overview' | 'anomalies' | 'simulation' | 'versions'
>;

type PricingStudioSectionDef = {
  id: PricingStudioSectionId;
  label: string;
  hubTab: string;
  icon: LucideIcon;
  eyebrow: string;
  description: string;
  hidden?: boolean;
};

export const PRICING_STUDIO_SECTIONS: PricingStudioSectionDef[] = [
  {
    id: 'articles',
    label: 'Tarifs par article',
    hubTab: 'articles',
    icon: Tags,
    eyebrow: 'Entrée opérationnelle',
    description: 'Prix directs, prix calculés, validation et disponibilité POS par article.',
    hidden: true,
  },
  {
    id: 'overview',
    label: 'Vue d’ensemble',
    hubTab: 'overview',
    icon: LayoutDashboard,
    eyebrow: 'Pilotage tarifaire',
    description: 'Moteurs actifs, couverture par famille, qualité tarifaire et priorités.',
    hidden: true,
  },
  {
    id: 'engines',
    label: 'Moteurs',
    hubTab: 'engines',
    icon: Cpu,
    eyebrow: 'Logique par famille',
    description: 'Alias → domaine Formules & moteurs.',
    hidden: true,
  },
  {
    id: 'formulas',
    label: 'Formules & règles',
    hubTab: 'regles',
    icon: Calculator,
    eyebrow: 'Constructeur no-code',
    description: 'Alias → domaine Formules & moteurs.',
    hidden: true,
  },
  {
    id: 'tiers',
    label: 'Paliers & ajustements',
    hubTab: 'paliers',
    icon: SlidersHorizontal,
    eyebrow: 'Quantités & remises',
    description: 'Alias → Paliers de remise sous Articles.',
    hidden: true,
  },
  {
    id: 'dependencies',
    label: 'Options & dépendances',
    hubTab: 'dependencies',
    icon: GitBranch,
    eyebrow: 'Compatibilités SI / ALORS',
    description: 'Alias → fiche article.',
    hidden: true,
  },
  {
    id: 'anomalies',
    label: 'Anomalies',
    hubTab: 'anomalies',
    icon: AlertTriangle,
    eyebrow: 'Centre de contrôle',
    description: 'Écarts Admin ↔ POS, formules cassées et actions correctives.',
    hidden: true,
  },
];

/** Vide après refonte — la nav Domaines porte les 3 piliers. */
export const PRICING_STUDIO_SECTIONS_VISIBLE = PRICING_STUDIO_SECTIONS.filter(
  (s): s is PricingStudioSectionDef & { id: PricingStudioVisibleSectionId } =>
    !s.hidden &&
    s.id !== 'overview' &&
    s.id !== 'anomalies' &&
    s.id !== 'simulation' &&
    s.id !== 'versions',
);

export function resolvePricingStudioSection(
  tab: string | null | undefined,
): PricingStudioVisibleSectionId {
  const t = (tab ?? '').toLowerCase();
  if (t === 'overview' || t === 'vue' || t === 'sante') return 'articles';
  if (
    t === 'engines'
    || t === 'moteurs'
    || t === 'isf'
    || t === 'flyers'
    || t === 'carterie'
    || t === 'publications'
    || t === 'grand-format'
    || t === 'avd'
    || t === 'finitions'
  ) {
    return 'engines';
  }
  if (t === 'formulas' || t === 'regles' || t === 'formule') return 'formulas';
  if (t === 'articles' || t === 'catalogue' || t === 'categories' || t === 'chips') return 'articles';
  if (t === 'tiers' || t === 'paliers') return 'tiers';
  if (t === 'dependencies' || t === 'options') return 'dependencies';
  if (t === 'simulation' || t === 'sim' || t === 'simulateur') return 'articles';
  if (t === 'versions' || t === 'version') return 'articles';
  if (t === 'anomalies') return 'articles';
  return 'articles';
}

type Props = {
  active: PricingStudioSectionId;
  onChange: (id: PricingStudioVisibleSectionId) => void;
  onBackToDomains?: () => void;
  anomalyCount?: number | null;
  hideIntro?: boolean;
  belowTabs?: ReactNode;
  className?: string;
};

/** Conservé pour deep-links / tests — rendu vide si aucune section visible. */
export function PricingStudioNav({
  active,
  onChange,
  onBackToDomains,
  anomalyCount: _anomalyCount,
  hideIntro,
  belowTabs,
  className,
}: Props) {
  void _anomalyCount;
  const listRef = useRef<HTMLDivElement | null>(null);
  if (PRICING_STUDIO_SECTIONS_VISIBLE.length === 0) {
    return belowTabs ? <div className={className}>{belowTabs}</div> : null;
  }

  const activeVisible = resolvePricingStudioSection(active);
  const activeMeta =
    PRICING_STUDIO_SECTIONS_VISIBLE.find((s) => s.id === activeVisible) ??
    PRICING_STUDIO_SECTIONS_VISIBLE[0]!;
  const ActiveIcon = activeMeta.icon;
  const showIntro = !hideIntro && activeVisible !== 'articles';

  const focusTab = (index: number) => {
    const tabs = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    if (!tabs || tabs.length === 0) return;
    const next = (index + tabs.length) % tabs.length;
    tabs[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(PRICING_STUDIO_SECTIONS_VISIBLE.length - 1);
    }
  };

  return (
    <div className={cn('cps-pricing-studio-head space-y-2', className)}>
      {onBackToDomains ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onBackToDomains}
            className="shrink-0 text-xs font-semibold text-[var(--cps-muted,#64748b)] underline-offset-2 hover:text-[var(--cps-title,#0f172a)] hover:underline"
          >
            ← Tous les domaines
          </button>
        </div>
      ) : null}
      <nav
        ref={listRef}
        className="cps-pricing-studio-nav cps-no-scrollbar"
        aria-label="Sections Studio Prix & Calculs"
        role="tablist"
      >
        {PRICING_STUDIO_SECTIONS_VISIBLE.map((s, index) => {
          const isActive = activeVisible === s.id;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn('cps-pricing-tab', isActive && 'is-active')}
              onClick={() => onChange(s.id)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{s.label}</span>
            </button>
          );
        })}
      </nav>
      {belowTabs}
      {showIntro ? (
        <div className="cps-pricing-view-intro" aria-live="polite">
          <span className="cps-pricing-view-intro__icon">
            <ActiveIcon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="cps-pricing-view-intro__eyebrow">{activeMeta.eyebrow}</p>
            <p className="cps-pricing-view-intro__description">{activeMeta.description}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
