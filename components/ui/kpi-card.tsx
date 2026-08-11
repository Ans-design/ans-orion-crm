'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KpiTone } from '@/lib/design/kpi-tones';
import { KPI_TONES } from '@/lib/design/kpi-tones';
import { formatPrice } from '@/lib/data/catalogue';
import { formatNumberFr } from '@/lib/format/french-typography';
import { ANS } from '@/lib/ans-colors';

type Props = {
  label: string;
  /** null = donnée non calculée / indisponible (jamais afficher comme 0). */
  value: number | null;
  icon: LucideIcon;
  color?: string;
  tone?: KpiTone;
  href?: string;
  format?: 'price' | 'number';
  onClick?: () => void;
  delay?: number;
  className?: string;
  hint?: string;
  emptyHint?: string;
  /** Force l’état Indisponible (erreur API, lite incomplet). */
  unavailable?: boolean;
  unavailableLabel?: string;
};

const KPI_ICON_TONE: Record<string, string> = {
  [ANS.red]: 'orion-kpi-icon--brand',
  [ANS.redDark]: 'orion-kpi-icon--brand',
  [ANS.orange]: 'orion-kpi-icon--gold',
  [ANS.yellow]: 'orion-kpi-icon--gold',
  [ANS.legacyYellow]: 'orion-kpi-icon--gold',
  /* legacy hex keys kept for callers — resolve to ANS.red brand tone */
  '#E6003C': 'orion-kpi-icon--brand',
  '#BE123C': 'orion-kpi-icon--brand',
  '#3B82F6': 'orion-kpi-icon--info',
  '#2563EB': 'orion-kpi-icon--info',
  '#10B981': 'orion-kpi-icon--success',
  '#F97316': 'orion-kpi-icon--gold',
  '#06B6D4': 'orion-kpi-icon--info',
  '#EF4444': 'orion-kpi-icon--danger',
  '#6366F1': 'orion-kpi-icon--brand',
  '#00D9FF': 'orion-kpi-icon--brand',
  '#0F172A': 'orion-kpi-icon--neutral',
  '#FF006E': 'orion-kpi-icon--brand',
  '#FFD60A': 'orion-kpi-icon--gold',
  '#64748B': 'orion-kpi-icon--neutral',
  '#334155': 'orion-kpi-icon--neutral',
};

function iconToneClass(color: string, tone?: KpiTone) {
  if (tone === 'success') return 'orion-kpi-icon--success';
  if (tone === 'gold' || tone === 'warning') return 'orion-kpi-icon--gold';
  if (tone === 'info') return 'orion-kpi-icon--info';
  if (tone === 'danger') return 'orion-kpi-icon--danger';
  if (tone === 'neutral') return 'orion-kpi-icon--neutral';
  if (tone === 'brand' || tone === 'pink') return 'orion-kpi-icon--brand';
  return KPI_ICON_TONE[color] ?? 'orion-kpi-icon--brand';
}

/** Résout var(--token) / fallback hex → ton sémantique (évite tout en brand). */
function resolveCssVarTone(color: string): string | null {
  const lower = color.toLowerCase();
  if (lower.includes('danger') || lower.includes('dc2626') || lower.includes('ef4444')) {
    return KPI_TONES.danger;
  }
  if (lower.includes('success') || lower.includes('16a34a') || lower.includes('10b981')) {
    return KPI_TONES.success;
  }
  if (
    lower.includes('amber')
    || lower.includes('gold')
    || lower.includes('f59e0b')
    || lower.includes('facc15')
    || lower.includes('warning')
  ) {
    return KPI_TONES.gold;
  }
  if (lower.includes('muted') || lower.includes('64748b') || lower.includes('0f172a') || lower.includes('title')) {
    return KPI_TONES.neutral;
  }
  if (lower.includes('primary') || lower.includes('ff174d') || lower.includes('ans')) {
    return KPI_TONES.brand;
  }
  const fallback = color.match(/#([0-9a-fA-F]{6})\s*\)?\s*$/);
  if (fallback) return `#${fallback[1]}`;
  return null;
}

function resolveColor(color?: string, tone?: KpiTone) {
  if (tone) return KPI_TONES[tone];
  if (!color) return KPI_TONES.brand;
  if (KPI_ICON_TONE[color] || Object.values(KPI_TONES).includes(color as never)) return color;
  return resolveCssVarTone(color) ?? color;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  tone,
  href,
  format = 'number',
  onClick,
  delay = 0,
  className = '',
  hint,
  emptyHint,
  unavailable = false,
  unavailableLabel = 'Indisponible',
}: Props) {
  const resolvedColor = resolveColor(color, tone);
  const isUnavailable = unavailable || value == null || Number.isNaN(value);
  const numeric = isUnavailable ? null : value;
  const isEmpty = !isUnavailable && numeric === 0;
  const formatted = isUnavailable
    ? unavailableLabel
    : format === 'price'
      ? formatPrice(numeric!)
      : formatNumberFr(numeric!);
  const showHintSuffix = hint && !isEmpty && !isUnavailable && format === 'number';

  const body = (
    <div className="orion-kpi-saas__inner">
      <div className="orion-kpi-saas__copy min-w-0 flex-1">
        <p className="orion-kpi-saas__label">{label}</p>
        <h3
          className={cn('orion-kpi-saas__value', isUnavailable && 'orion-kpi-saas__value--unavailable')}
          aria-live={isUnavailable ? 'polite' : undefined}
        >
          {formatted}{showHintSuffix ? hint : ''}
        </h3>
        {isUnavailable ? (
          <p className="orion-kpi-saas__hint truncate">Donnée non calculée</p>
        ) : isEmpty && emptyHint ? (
          <p className="orion-kpi-saas__hint truncate">{emptyHint}</p>
        ) : null}
      </div>
      <div className={`orion-kpi-icon ${iconToneClass(resolvedColor, tone)}`} aria-hidden>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
    </div>
  );

  const toneTint = (() => {
    if (tone === 'success') return 'orion-kpi-tint-success';
    if (tone === 'gold' || tone === 'warning') return 'orion-kpi-tint-gold';
    if (tone === 'info') return 'orion-kpi-tint-info';
    if (tone === 'danger') return 'orion-kpi-tint-danger';
    if (tone === 'neutral') return 'orion-kpi-tint-neutral';
    if (tone === 'brand' || tone === 'pink') return 'orion-kpi-tint-brand';
    if (resolvedColor === KPI_TONES.success || resolvedColor === '#10B981') return 'orion-kpi-tint-success';
    if (
      resolvedColor === KPI_TONES.gold
      || resolvedColor === KPI_TONES.warning
      || resolvedColor === '#F97316'
      || resolvedColor === '#FFD60A'
      || resolvedColor === ANS.yellow
      || resolvedColor === ANS.orange
    ) {
      return 'orion-kpi-tint-gold';
    }
    if (resolvedColor === KPI_TONES.info || resolvedColor === '#3B82F6' || resolvedColor === '#06B6D4' || resolvedColor === '#2563EB') {
      return 'orion-kpi-tint-info';
    }
    if (resolvedColor === KPI_TONES.danger || resolvedColor === '#EF4444') return 'orion-kpi-tint-danger';
    if (
      resolvedColor === KPI_TONES.neutral
      || resolvedColor === '#0F172A'
      || resolvedColor === '#64748B'
      || resolvedColor === '#334155'
    ) {
      return 'orion-kpi-tint-neutral';
    }
    return 'orion-kpi-tint-brand';
  })();

  const classes = cn(
    'orion-card orion-ds-metric orion-kpi-saas',
    toneTint,
    (href || onClick) && 'orion-ux-press cursor-pointer',
    !(href || onClick) && 'orion-ux-fade-in',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ans-pink-500)] focus-visible:ring-offset-2',
    className,
  );

  if (href || onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.22 }}
        className={classes}
      >
        {body}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22 }}
      className={classes}
    >
      {body}
    </motion.div>
  );
}

export function ActivityTile({
  icon: Icon,
  value,
  label,
  color,
  tone,
  onClick,
  format = 'number',
  compact = false,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  color?: string;
  tone?: KpiTone;
  onClick?: () => void;
  format?: 'price' | 'number';
  compact?: boolean;
}) {
  const resolvedColor = resolveColor(color, tone);
  const display = format === 'price' ? formatPrice(value) : formatNumberFr(value);
  const useCompact = compact;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'cockpit-quick-card orion-kpi-tile w-full h-full active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ans-pink-500)] focus-visible:ring-offset-2',
        !onClick && 'cursor-default',
        !useCompact && 'min-h-[112px] p-4 gap-3',
      )}
    >
      <div className={cn('orion-kpi-tile-icon orion-kpi-icon', iconToneClass(resolvedColor, tone))}>
        <Icon size={useCompact ? 16 : 18} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn('orion-kpi-tile-value truncate', !useCompact && 'text-base')}>
          {display}
        </div>
        <div className="orion-kpi-tile-label truncate">{label}</div>
      </div>
    </button>
  );
}
