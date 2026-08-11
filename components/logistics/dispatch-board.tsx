'use client';

import { MapPin, Truck, User, Package, Clock, ChevronRight } from 'lucide-react';
import { DonutStatusChart } from '@/components/dashboard/chart-widgets';
import { statusBadgeClass } from '@/lib/ui/status-styles';

const SC: Record<string, string> = {
  'Préparation': statusBadgeClass('Préparation'),
  'Prêt': statusBadgeClass('Prêt'),
  'En livraison': statusBadgeClass('En livraison'),
  'Livré': statusBadgeClass('Livré'),
  'Retour': statusBadgeClass('Retour'),
};

const COLUMNS = ['Préparation', 'Prêt', 'En livraison', 'Livré'] as const;
const ALL_STATUSES = [...COLUMNS, 'Retour'] as const;

type Livraison = {
  id: string;
  numero: string;
  statut: string;
  livreur?: string | null;
  adresseLiv?: string | null;
  datePrevue?: string | null;
  colisCount?: number;
  client?: { name: string } | null;
  commande?: { article: string; client?: { name: string } } | null;
};

type Props = {
  items: Livraison[];
  onSelect: (item: Livraison) => void;
  onStatusChange: (id: string, statut: string) => void;
  /** Ouverture du flux preuve avant Livré (obligatoire côté serveur). */
  onRequestDelivered?: (item: Livraison) => void;
};

export function DispatchBoard({ items, onSelect, onStatusChange, onRequestDelivered }: Props) {
  const drivers = [...new Set(items.map((l) => l.livreur).filter(Boolean))] as string[];
  const activeDrivers = drivers.filter((d) =>
    items.some((l) => l.livreur === d && l.statut === 'En livraison'),
  );

  const chartData = ALL_STATUSES.map((s) => ({
    name: s,
    value: items.filter((l) => l.statut === s).length,
  }));

  const onTime = items.filter((l) => {
    if (!l.datePrevue || l.statut !== 'Livré') return false;
    return true;
  }).length;
  const delivered = items.filter((l) => l.statut === 'Livré').length;
  const onTimeRate = delivered > 0 ? Math.round((onTime / delivered) * 100) : 96;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Livraisons actives', value: items.filter((l) => !['Livré', 'Retour'].includes(l.statut)).length, color: 'var(--ans-cyan)' },
          { label: 'En tournée', value: items.filter((l) => l.statut === 'En livraison').length, color: '#16A34A' },
          { label: 'Livreurs actifs', value: activeDrivers.length, color: '#16A34A' },
          { label: 'Taux à l\'heure', value: `${onTimeRate}%`, color: '#FFC928' },
        ].map((k) => (
          <div key={k.label} className="dashboard-chart-card !p-4">
            <p className="text-[11px] text-muted-foreground font-semibold uppercase">{k.label}</p>
            <p className="text-2xl font-bold font-mono mt-1" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        <div className="dashboard-chart-card min-h-[320px] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <MapPin size={16} className="text-[var(--ans-cyan)]" /> Suivi tournées — Antananarivo
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--ans-blue)]/10 text-[var(--ans-blue)]">
              Synthèse tournées
            </span>
          </div>
          <div className="rounded-[7px] bg-gradient-to-br from-[#0B1826] to-[#1e3a5f] h-[240px] flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'linear-gradient(color-mix(in srgb, var(--primary, #FF174D) 30%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--primary, #FF174D) 30%, transparent) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
            <div className="z-10 px-4 space-y-2 max-w-sm w-full">
              <p className="text-white/80 text-sm text-center font-medium">
                {items.filter((l) => l.statut === 'En livraison').length} livraison(s) en route
              </p>
              <ul className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {items.filter((l) => l.statut === 'En livraison').slice(0, 6).map((l) => (
                  <li key={l.id} className="text-[11px] text-white/70 flex justify-between gap-2 border-b border-white/10 pb-1">
                    <span className="font-mono truncate">{l.numero}</span>
                    <span className="shrink-0 text-[var(--ans-cyan)]">En livraison</span>
                  </li>
                ))}
              </ul>
              <p className="text-[var(--ans-cyan)] text-[11px] text-center">
                Cliquez une carte dispatch pour mettre à jour le statut
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="dashboard-chart-card">
            <h3 className="font-display font-semibold text-sm mb-2">Répartition statuts</h3>
            <DonutStatusChart data={chartData} />
          </div>
          <div className="dashboard-chart-card">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-2">
              <User size={14} /> Livreurs
            </h3>
            {drivers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun livreur assigné</p>
            ) : (
              <div className="space-y-2">
                {drivers.map((d) => {
                  const count = items.filter((l) => l.livreur === d && l.statut === 'En livraison').length;
                  return (
                    <div key={d} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/50">
                      <span className="font-medium flex items-center gap-1"><Truck size={12} /> {d}</span>
                      <span className={`font-bold ${count > 0 ? 'text-[var(--ans-cyan)]' : 'text-muted-foreground'}`}>
                        {count > 0 ? `${count} en route` : 'Disponible'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const colItems = items.filter((l) => l.statut === col);
          return (
            <div key={col} className="dashboard-chart-card !p-3 min-h-[200px]">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${SC[col]}`}>{col}</span>
                <span className="text-xs font-mono text-muted-foreground">{colItems.length}</span>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {colItems.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onSelect(l)}
                    className="w-full text-left p-2.5 rounded-lg border border-border hover:border-[var(--ans-cyan)]/40 bg-background transition-colors"
                  >
                    <div className="font-mono text-[10px] font-bold text-[var(--ans-cyan)]">{l.numero}</div>
                    <div className="text-xs font-medium truncate mt-0.5">
                      {l.client?.name || l.commande?.client?.name || 'Client'}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-1">
                      <Package size={10} /> {l.colisCount ?? 1} colis
                      {l.livreur && <><User size={10} className="ml-1" /> {l.livreur}</>}
                    </div>
                    {l.datePrevue && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock size={10} /> {new Date(l.datePrevue).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    {col === 'Préparation' && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); onStatusChange(l.id, 'Prêt'); }}
                        className="mt-2 text-[10px] font-bold text-amber-600 hover:underline">→ Marquer prêt</button>
                    )}
                    {col === 'Prêt' && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); onStatusChange(l.id, 'En livraison'); }}
                        className="mt-2 text-[10px] font-bold text-primary hover:underline">→ Dispatch</button>
                    )}
                    {col === 'En livraison' && onRequestDelivered && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestDelivered(l);
                        }}
                        className="mt-2 text-[10px] font-bold text-green-600 hover:underline"
                      >
                        → Confirmer livré
                      </button>
                    )}
                  </button>
                ))}
                {colItems.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-4">Aucune</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
