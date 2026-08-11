'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ticket, AlertTriangle, Clock, Cpu, Laptop, Wrench } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import {
  AppPageHeader, AppEmptyState, AppListSkeleton, AppKpiCard, AppButton,
} from '@/components/ui/app-ui';

type MaintTicket = {
  id: string; numero: string; titre: string; type: string; priorite: string; statut: string;
  impactPlanning: boolean; description: string | null;
  machine: { code: string; name: string } | null;
  equipment: { code: string; name: string } | null;
  assignee: { firstName: string; lastName: string } | null;
  createdAt: string;
};

export default function MaintenanceTicketsPage() {
  const [tickets, setTickets] = useState<MaintTicket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filter) p.set('statut', filter);
    fetch(`/api/maintenance/tickets?${p}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setTickets(d.tickets); setStats(d.stats); } })
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatut = async (id: string, statut: string) => {
    const r = await fetch(`/api/maintenance/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut }),
    });
    if (r.ok) { uxToast.success(`Ticket → ${statut}`); load(); }
    else uxToast.error('Erreur');
  };

  return (
    <div className="dashboard-full space-y-5 max-w-none">
      <AppPageHeader
        title="Tickets maintenance"
        description="Pannes, interventions, diagnostics — impact planning machines"
        actions={
          <AppButton type="button" variant="outline" size="sm" onClick={() => window.location.href = '/materiels'}>
            Matériels →
          </AppButton>
        }
      />

      <div className="grid gap-3 kpi-grid">
        <AppKpiCard label="Ouverts" value={stats.ouverts ?? 0} icon={Ticket} tone="gold" />
        <AppKpiCard label="Urgents" value={stats.urgents ?? 0} icon={AlertTriangle} tone="danger" />
        <AppKpiCard label="Impact planning" value={stats.impactPlanning ?? 0} icon={Clock} tone="warning" />
      </div>

      <div className="flex flex-wrap gap-2.5">
        {['', 'Ouvert', 'En cours', 'Résolu'].map((f) => (
          <button
            key={f || 'all'}
            type="button"
            onClick={() => setFilter(f)}
            className={`orion-surface-chip ${filter === f ? 'orion-surface-chip--active' : ''}`}
          >
            {f || 'Tous'}
          </button>
        ))}
      </div>

      {loading ? <AppListSkeleton rows={4} /> : tickets.length === 0 ? (
        <AppEmptyState icon={Ticket} title="Aucun ticket" description="Signalez une panne depuis Machines ou Matériels pour créer un ticket." />
      ) : (
        <div className="maint-ticket-grid">
          {tickets.map((t) => {
            const assetName = t.machine?.name ?? t.equipment?.name ?? null;
            const AssetIcon = t.machine ? Cpu : Laptop;
            const isUrgent = /urgent/i.test(t.priorite);
            return (
              <article
                key={t.id}
                className={`maint-ticket-card${isUrgent ? ' maint-ticket-card--urgent' : ''}${t.impactPlanning ? ' maint-ticket-card--impact' : ''}`}
              >
                <div className="maint-ticket-card__top">
                  <span className="maint-ticket-card__num">{t.numero}</span>
                  <div className="maint-ticket-card__badges">
                    <span className={`maint-prio maint-prio--${isUrgent ? 'urgent' : 'normal'}`}>{t.priorite}</span>
                    <span className="maint-statut">{t.statut}</span>
                  </div>
                </div>

                <h3 className="maint-ticket-card__title">{t.titre}</h3>

                {t.impactPlanning && (
                  <p className="maint-ticket-card__impact">
                    <AlertTriangle size={12} aria-hidden />
                    Planning impacté
                  </p>
                )}

                <ul className="maint-ticket-card__meta">
                  {assetName ? (
                    <li>
                      <AssetIcon size={12} aria-hidden />
                      <span>{assetName}</span>
                    </li>
                  ) : null}
                  {t.assignee ? (
                    <li>
                      <Wrench size={12} aria-hidden />
                      <span>{t.assignee.firstName} {t.assignee.lastName}</span>
                    </li>
                  ) : null}
                </ul>

                {(t.statut === 'Ouvert' || t.statut === 'En cours') && (
                  <div className="maint-ticket-card__actions">
                    {t.statut === 'Ouvert' && (
                      <AppButton type="button" size="sm" className="w-full" onClick={() => updateStatut(t.id, 'En cours')}>
                        Prendre en charge
                      </AppButton>
                    )}
                    {t.statut === 'En cours' && (
                      <AppButton type="button" size="sm" variant="outline" className="w-full" onClick={() => updateStatut(t.id, 'Résolu')}>
                        Résoudre
                      </AppButton>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
