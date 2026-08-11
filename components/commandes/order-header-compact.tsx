'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { formatPriceAr, formatPercentFr, FR_NBSP } from '@/lib/format/french-typography';
import { CommandeQrBadge } from '@/components/commandes/commande-qr-badge';
import type { NextAction } from '@/lib/flow/next-action';
import { ORION_BADGE } from '@/lib/design/spacing-system';

type Props = {
  commandeId: string;
  numero: string;
  statut: string;
  priorite: string;
  avancement: number;
  article: string;
  lignesCount: number;
  reste: number;
  dateCmd: string;
  dateLiv: string | null;
  client: { id: string; name: string; code?: string } | null;
  nextAction?: NextAction | null;
  onBack: () => void;
};

function StatutBadge({ statut }: { statut: string }) {
  const urgent = statut === 'Suspendu' || statut === 'En attente stock';
  return (
    <span className={`${ORION_BADGE.md} ${
      urgent ? 'bg-amber-500/15 text-amber-600' : 'bg-[var(--ans-red-500)]/12 text-[var(--ans-red-500)]'
    }`}>
      {statut}
    </span>
  );
}

export function OrderHeaderCompact({
  commandeId, numero, statut, priorite, avancement, article, lignesCount,
  reste, dateCmd, dateLiv, client, onBack,
}: Props) {
  const articleSummary = lignesCount > 1
    ? `${article.replace(/^Fiche 360° — /, '')} + ${lignesCount - 1} autre${lignesCount > 2 ? 's' : ''}`
    : article.replace(/^Fiche 360° — /, '');

  return (
    <header className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onBack} className="inline-flex items-center justify-center h-8 w-8 rounded-[7px] hover:bg-[var(--orion-surface-soft)] text-[var(--text-muted)] xl:hidden" aria-label="Retour">
            <ArrowLeft size={16} strokeWidth={1.75} />
          </button>
          <h1 className="orion-text-code-md text-xl md:text-2xl">
            <span className="text-muted-foreground font-sans text-sm font-semibold tracking-normal mr-1.5">Dossier</span>
            {numero}
          </h1>
          <StatutBadge statut={statut} />
          {priorite !== 'Normal' && (
            <span className={`${ORION_BADGE.sm} ${
              priorite === 'Urgente' ? 'bg-red-500/15 text-red-500' : 'bg-orange-500/15 text-orange-500'
            }`}>{priorite}</span>
          )}
        </div>

        {client && (
          <p className="text-sm font-semibold truncate">
            Client{FR_NBSP}:{' '}
            <Link href={`/clients/${client.id}`} className="text-primary hover:underline">{client.name}</Link>
          </p>
        )}

        <p className="text-sm text-muted-foreground truncate">Articles{FR_NBSP}: {articleSummary}</p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs leading-4 text-muted-foreground tabular-nums">
          <span>Créée {new Date(dateCmd).toLocaleDateString('fr-FR')}</span>
          <span>Livraison {dateLiv ? new Date(dateLiv).toLocaleDateString('fr-FR') : '—'}</span>
          <span>Avancement {formatPercentFr(avancement)}</span>
        </div>
      </div>

      <div className="flex xl:flex-col items-center xl:items-end gap-3 shrink-0">
        <CommandeQrBadge commandeId={commandeId} numero={numero} variant="card" />
        <div className="text-right space-y-2 flex-1 xl:flex-none min-w-0">
          <p className={`orion-text-amount text-sm ${reste > 0 ? 'text-[var(--ans-orange-500)]' : 'text-emerald-600'}`}>
            Reste {formatPriceAr(reste)}
          </p>
          {/* Prochaine action : uniquement via FlowPageBanner (évite le triplon header + banner + synthèse) */}
          <button type="button" onClick={onBack} className="hidden xl:block text-sm text-muted-foreground hover:text-foreground">
            ← Liste commandes
          </button>
        </div>
      </div>
    </header>
  );
}
