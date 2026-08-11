'use client';

import { ClipboardList, CircleDollarSign, ListChecks, Truck, ReceiptText, Factory } from 'lucide-react';
import { ActivityTile } from '@/components/ui/kpi-card';
import { KpiGrid } from '@/components/ui/kpi-grid';
import { ANS_KPI_COLORS } from '@/lib/ans-colors';
import {
  livraisonStatusLabel,
  factureStatusLabel,
} from '@/lib/commande/order-status-labels';

type Props = {
  total: number;
  reste: number;
  avancement: number;
  tachesOuvertes: number;
  livraisons: number;
  factures: number;
  statut: string;
  onTab: (tab: string) => void;
};

const TONE_CLASS = {
  muted: 'text-muted-foreground bg-muted/30',
  warn: 'text-amber-700 bg-amber-500/10',
  ok: 'text-emerald-700 bg-emerald-500/10',
};

function StatusChip({ label, tone, icon: Icon, onClick }: {
  label: string;
  tone: 'muted' | 'warn' | 'ok';
  icon: typeof Truck;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cockpit-quick-card orion-kpi-tile active:scale-[0.98] ${TONE_CLASS[tone]}`}
    >
      <div className="orion-kpi-tile-icon bg-background/50">
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="orion-kpi-tile-value truncate">{label}</div>
        <div className="orion-kpi-tile-label truncate">Voir détail →</div>
      </div>
    </button>
  );
}

/** KPI commande — grille gap-4, tuiles h-96px homogènes */
export function OrderKpiGrid({
  total, reste, avancement, tachesOuvertes, livraisons, factures, statut, onTab,
}: Props) {
  const liv = livraisonStatusLabel(livraisons, statut);
  const fac = factureStatusLabel(factures, statut, reste);

  return (
    <KpiGrid columns={6} variant="strip">
      <ActivityTile label="Total TTC" value={total} format="price" icon={ClipboardList} tone="brand" compact />
      <ActivityTile label="Reste à payer" value={reste} format="price" icon={CircleDollarSign} tone="warning" compact onClick={() => onTab('Finance')} />
      <ActivityTile label={`Avancement ${avancement}%`} value={avancement} icon={Factory} color={ANS_KPI_COLORS.tech} compact onClick={() => onTab('Production')} />
      <ActivityTile label="Tâches ouvertes" value={tachesOuvertes} icon={ListChecks} tone="neutral" compact onClick={() => onTab('Production')} />
      <StatusChip label={liv.label} tone={liv.tone} icon={Truck} onClick={() => onTab('Logistique')} />
      <StatusChip label={fac.label} tone={fac.tone} icon={ReceiptText} onClick={() => onTab('Finance')} />
    </KpiGrid>
  );
}
