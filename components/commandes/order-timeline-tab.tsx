'use client';

import {
  ClipboardList, CreditCard, FileCheck, Factory, Truck, ReceiptText, History, Package, FileImage,
} from 'lucide-react';
import { getIconSize } from '@/lib/icons/icon-sizes';
import { cn } from '@/lib/utils';

type Event = { type: string; label: string; date: string; detail: string };

const ICONS: Record<string, typeof History> = {
  commande: ClipboardList,
  paiement: CreditCard,
  bat: FileCheck,
  production: Factory,
  production_ordre: Factory,
  livraison: Truck,
  facture: ReceiptText,
  stock: Package,
  fichier: FileImage,
  talk_fichier: FileImage,
  audit: History,
};

/** Teintes douces par type — alignées ORION, pas de violet générique. */
const TONE: Record<string, { chip: string; icon: string; bar: string }> = {
  commande: {
    chip: 'bg-[#f4f7fb] border-[#e2e8f2] dark:bg-muted/30 dark:border-border',
    icon: 'bg-[#dbe7ff] text-[#2f6fed]',
    bar: 'bg-[#3b72f2]',
  },
  paiement: {
    chip: 'bg-[#f3faf6] border-[#d7eee3] dark:bg-muted/30 dark:border-border',
    icon: 'bg-[#d4f0e2] text-[#158664]',
    bar: 'bg-[#21a879]',
  },
  facture: {
    chip: 'bg-[#fff6f8] border-[#f5d5de] dark:bg-muted/30 dark:border-border',
    icon: 'bg-[#ffe0e8] text-[#e31855]',
    bar: 'bg-[#f7255b]',
  },
  livraison: {
    chip: 'bg-[#fff9f2] border-[#f0e0c8] dark:bg-muted/30 dark:border-border',
    icon: 'bg-[#ffe8cc] text-[#c47a12]',
    bar: 'bg-[#e09a16]',
  },
  production: {
    chip: 'bg-[#f5f7fa] border-[#dde3ec] dark:bg-muted/30 dark:border-border',
    icon: 'bg-[#e4e9f2] text-[#47536b]',
    bar: 'bg-[#64748b]',
  },
  production_ordre: {
    chip: 'bg-[#f5f7fa] border-[#dde3ec] dark:bg-muted/30 dark:border-border',
    icon: 'bg-[#e4e9f2] text-[#47536b]',
    bar: 'bg-[#64748b]',
  },
  bat: {
    chip: 'bg-[#f7f4ff] border-[#e4dcf8] dark:bg-muted/30 dark:border-border',
    icon: 'bg-[#ebe4ff] text-[#6b4fd6]',
    bar: 'bg-[#7a55ef]',
  },
  stock: {
    chip: 'bg-[#f3faf8] border-[#d5ebe4] dark:bg-muted/30 dark:border-border',
    icon: 'bg-[#d9f1ea] text-[#0f766e]',
    bar: 'bg-[#14a978]',
  },
  fichier: {
    chip: 'bg-[#f8fafc] border-[#e2e8f0] dark:bg-muted/30 dark:border-border',
    icon: 'bg-[#e8eef5] text-[#55657a]',
    bar: 'bg-[#71809a]',
  },
  talk_fichier: {
    chip: 'bg-[#f8fafc] border-[#e2e8f0] dark:bg-muted/30 dark:border-border',
    icon: 'bg-[#e8eef5] text-[#55657a]',
    bar: 'bg-[#71809a]',
  },
  audit: {
    chip: 'bg-[#f8fafc] border-[#e2e8f0] dark:bg-muted/30 dark:border-border',
    icon: 'bg-[#e8eef5] text-[#55657a]',
    bar: 'bg-[#71809a]',
  },
};

const DEFAULT_TONE = TONE.audit!;

type Props = { events: Event[] };

/** Timeline = événements passés uniquement (pas d'étapes futures du stepper). */
export function OrderTimelineTab({ events }: Props) {
  const now = Date.now();
  const past = events.filter((e) => new Date(e.date).getTime() <= now);
  if (past.length === 0) {
    return (
      <div className="rounded-[7px] border border-[#e7ebf3] bg-gradient-to-b from-white to-[#f7f9fc] p-6 text-center dark:border-border dark:from-card dark:to-card">
        <History size={getIconSize('empty')} strokeWidth={1.5} className="mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm font-medium">Historique en cours</p>
        <p className="text-xs text-muted-foreground mt-1">Les événements apparaîtront au fil du suivi commande.</p>
      </div>
    );
  }

  return (
    <section className="rounded-[7px] border border-[#e7ebf3] bg-gradient-to-b from-white via-[#fbfcfe] to-[#f4f7fb] p-3.5 dark:border-border dark:from-card dark:via-card dark:to-card">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="m-0 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#71809a]">
          <History size={14} strokeWidth={1.75} aria-hidden />
          Historique
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-[#e9efff] px-1.5 text-[10px] font-bold tabular-nums text-[#3769db] dark:bg-primary/15 dark:text-primary">
            {past.length}
          </span>
        </h3>
      </header>

      {/* 5 colonnes égales · wrap automatique */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {past.map((ev, i) => {
          const Icon = ICONS[ev.type] ?? History;
          const tone = TONE[ev.type] ?? DEFAULT_TONE;
          const d = new Date(ev.date);
          const dateLabel = Number.isFinite(d.getTime())
            ? `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : '—';

          return (
            <article
              key={`${ev.type}-${ev.date}-${i}`}
              className={cn(
                'relative flex min-h-[88px] min-w-0 flex-col gap-1.5 overflow-hidden rounded-[7px] border px-2.5 pb-2 pt-2.5',
                'shadow-[0_1px_0_rgba(23,32,51,0.03)]',
                tone.chip,
              )}
            >
              <i className={cn('absolute left-0 top-0 h-full w-[3px]', tone.bar)} aria-hidden />
              <div className="flex items-start gap-2 pl-1">
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px]',
                    tone.icon,
                  )}
                  aria-hidden
                >
                  <Icon size={12} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 line-clamp-2 text-[11px] font-bold leading-snug text-[#182238] dark:text-foreground">
                    {ev.label}
                  </p>
                  <p className="m-0 mt-0.5 font-mono text-[9px] tabular-nums text-[#8a97aa]">
                    {dateLabel}
                  </p>
                </div>
              </div>
              {ev.detail ? (
                <p className="m-0 line-clamp-2 pl-1 text-[10px] leading-snug text-[#65758d] dark:text-muted-foreground">
                  {ev.detail}
                </p>
              ) : (
                <p className="m-0 min-h-[1.25rem] pl-1" aria-hidden />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
