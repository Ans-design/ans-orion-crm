'use client';

import {
  Boxes,
  Cpu,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  Scissors,
  AlertTriangle,
  History,
  Tags,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type CatalogStudioId =
  | 'cockpit'
  | 'articles'
  | 'matieres'
  | 'prix'
  | 'calculs'
  | 'finitions'
  | 'excel'
  | 'anomalies'
  | 'historique';

/**
 * Domaines visibles (refonte 3 piliers) :
 * Matières · Articles & tarifs · Formules & moteurs.
 * Studios cachés = alias / deep-links (zéro suppression route).
 */
export const CATALOG_STUDIOS: {
  id: CatalogStudioId;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
  description: string;
  /** Masqué de la nav (alias / deep-links conservés). */
  hidden?: boolean;
}[] = [
  {
    id: 'cockpit',
    label: 'Vue d’ensemble',
    short: 'Pilotage',
    icon: LayoutDashboard,
    description: 'Alias → sidebar Vue d’ensemble',
    hidden: true,
  },
  {
    id: 'articles',
    label: 'Produits & disponibilité',
    short: 'Produits',
    icon: Package,
    description: 'Alias → Articles & tarifs',
    hidden: true,
  },
  {
    id: 'matieres',
    label: 'Matières',
    short: 'Matières',
    icon: Boxes,
    description: 'PCB, PCM, Glossy, texturé, vinyle/bâche m² — pas de roll-up/goodies',
  },
  {
    id: 'prix',
    label: 'Articles & tarifs',
    short: 'Articles',
    icon: Tags,
    description: 'Alias → Formules & moteurs (paliers)',
    /** Masqué — paliers déplacés dans Formules & moteurs (zéro suppression route). */
    hidden: true,
  },
  {
    id: 'calculs',
    label: 'Formules & moteurs',
    short: 'Calculs',
    icon: Cpu,
    description: 'Moteurs, paliers de remise et constructeur de formules',
  },
  {
    id: 'finitions',
    label: 'Finitions & règles',
    short: 'Finitions',
    icon: Scissors,
    description: 'Alias → Articles & tarifs',
    hidden: true,
  },
  {
    id: 'excel',
    label: 'Données & contrôle',
    short: 'Données',
    icon: FileSpreadsheet,
    description: 'Alias → Matières (Import / Export en en-tête)',
    /** Masqué — deep-links redirigés vers matières. */
    hidden: true,
  },
  {
    id: 'anomalies',
    label: 'Diagnostics',
    short: 'Alertes',
    icon: AlertTriangle,
    description: 'Alias → Matières',
    hidden: true,
  },
  {
    id: 'historique',
    label: 'Historique',
    short: 'Audit',
    icon: History,
    description: 'Alias → Matières',
    hidden: true,
  },
];

/** Domaines visibles dans la carte DOMAINES. */
export const CATALOG_STUDIOS_VISIBLE = CATALOG_STUDIOS.filter((s) => !s.hidden);

export function studioToDefaultTab(studio: CatalogStudioId): string {
  switch (studio) {
    case 'cockpit':
      return 'vue';
    case 'articles':
      return 'articles';
    case 'matieres':
      return 'matieres';
    case 'prix':
      return 'articles';
    case 'calculs':
      return 'engines';
    case 'finitions':
      return 'chips';
    case 'excel':
      return 'matieres';
    case 'anomalies':
      return 'matieres';
    case 'historique':
      return 'matieres';
  }
}

export function tabToStudio(tab: string): CatalogStudioId {
  if (tab === 'vue') return 'cockpit';
  if (tab === 'articles' || tab === 'catalogue' || tab === 'categories') {
    return 'calculs';
  }
  if (tab === 'paliers' || tab === 'tiers') return 'calculs';
  if (
    tab === 'engines'
    || tab === 'formulas'
    || tab === 'regles'
    || tab === 'overview'
  ) {
    return 'calculs';
  }
  if (
    tab === 'isf'
    || tab === 'flyers'
    || tab === 'carterie'
    || tab === 'publications'
    || tab === 'grand-format'
    || tab === 'avd'
  ) {
    return 'calculs';
  }
  if (tab === 'chips' || tab === 'finitions' || tab === 'dependencies') return 'calculs';
  if (tab === 'simulation' || tab === 'versions') return 'calculs';
  if (tab === 'matieres' || tab === 'prix-contexte' || tab === 'stock') return 'matieres';
  if (tab === 'historique' || tab === 'excel' || tab === 'corbeille' || tab === 'anomalies') {
    return 'matieres';
  }
  return 'matieres';
}

  /** Alias studios → domaine visible (excel / historique / anomalies → matières). */
export function canonicalizeStudio(studio: CatalogStudioId | string): CatalogStudioId {
  if (studio === 'anomalies' || studio === 'historique' || studio === 'excel') {
    return 'matieres';
  }
  /** Articles & tarifs masqué → Formules & moteurs (paliers + moteurs). */
  if (studio === 'articles' || studio === 'finitions' || studio === 'prix') return 'calculs';
  if (
    studio === 'engines'
    || studio === 'formulas'
    || studio === 'calculs'
  ) {
    return 'calculs';
  }
  if (studio === 'cockpit' || studio === 'matieres') {
    return studio;
  }
  return 'matieres';
}

type Props = {
  value: CatalogStudioId;
  onChange: (id: CatalogStudioId) => void;
  className?: string;
};

export function CatalogStudioNav({ value, onChange, className }: Props) {
  const visualActive: CatalogStudioId = canonicalizeStudio(value);

  return (
    <nav className={cn('cps-studio-nav', className)} aria-label="Studios Catalogue Prix Stock">
      <p className="cps-studio-nav__eyebrow" id="cps-studio-nav-label">
        Domaines
      </p>
      {CATALOG_STUDIOS_VISIBLE.map((s) => {
        const Icon = s.icon;
        const active = visualActive === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn('cps-studio-nav__item', active && 'is-active')}
            aria-current={active ? 'page' : undefined}
            title={`${s.label} — ${s.description}`}
          >
            <span className="cps-studio-nav__icon-wrap" aria-hidden>
              <Icon className="cps-studio-nav__icon" />
            </span>
            <span className="cps-studio-nav__text">
              <span className="cps-studio-nav__label">{s.label}</span>
              <span className="cps-studio-nav__desc">{s.description}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

