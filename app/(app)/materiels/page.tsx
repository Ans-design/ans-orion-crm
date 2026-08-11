'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Laptop, Tablet, Smartphone, Bike, Wrench, KeyRound, Shield, Car, Package,
  User, MapPin, AlertTriangle,
} from 'lucide-react';
import {
  AppListSkeleton, AppKpiCard, AppButton, AppEmptyState,
  EntityModuleDataBar, EntityListPageShell,
} from '@/components/ui/app-ui';
import { unwrapApiData } from '@/lib/api-client';
import type { LucideIcon } from 'lucide-react';

const CAT_LABELS: Record<string, string> = {
  ordinateur: 'Ordinateur',
  tablette: 'Tablette',
  telephone: 'Téléphone',
  moto: 'Moto',
  kit_technicien: 'Kit technicien',
  licence: 'Licence',
  epi: 'EPI',
  vehicule: 'Véhicule',
};

const CAT_ICONS: Record<string, LucideIcon> = {
  ordinateur: Laptop,
  tablette: Tablet,
  telephone: Smartphone,
  moto: Bike,
  kit_technicien: Wrench,
  licence: KeyRound,
  epi: Shield,
  vehicule: Car,
};

const ETAT_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  affecte: 'Affecté',
  panne: 'Panne',
  maintenance: 'Maintenance',
};

type Equipment = {
  id: string;
  code: string;
  name: string;
  category: string;
  etat: string;
  poste: string | null;
  site: string;
  marque: string | null;
  employee: { matricule: string; firstName: string; lastName: string } | null;
  tickets: { id: string; numero: string; statut: string }[];
};

export default function MaterielsPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showTrash, setShowTrash] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filter) p.set('etat', filter);
    if (showTrash) p.set('archived', '1');
    fetch(`/api/materiels?${p}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const d = body ? unwrapApiData<{ items: Equipment[]; stats: Record<string, number> }>(body) : null;
        if (d) {
          setItems(d.items);
          setStats(d.stats);
        }
      })
      .finally(() => setLoading(false));
  }, [filter, showTrash]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <EntityListPageShell
      className="materiels-page"
      title="Matériels RH & IT"
      description="Parc IT / véhicules / licences — distinct des machines de production atelier"
      icon={Laptop}
      actions={
          <div className="flex flex-wrap gap-2 items-center">
            <EntityModuleDataBar entity="equipments" trash={showTrash} onTrashChange={setShowTrash} onAfterImport={load} />
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                window.location.href = '/maintenance/tickets';
              }}
            >
              <Wrench size={14} /> Tickets maintenance
            </AppButton>
          </div>
      }
    >
      <div className="grid gap-3 kpi-grid">
        <AppKpiCard label="Total parc" value={stats.total ?? 0} icon={Laptop} tone="brand" />
        <AppKpiCard label="Affectés" value={stats.affectes ?? 0} icon={User} tone="info" />
        <AppKpiCard label="Disponibles" value={stats.disponibles ?? 0} icon={Package} tone="success" />
        <AppKpiCard label="En panne" value={stats.panne ?? 0} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(['', 'disponible', 'affecte', 'panne', 'maintenance'] as const).map((f) => (
          <button
            key={f || 'all'}
            type="button"
            onClick={() => setFilter(f)}
            className={`orion-surface-chip ${filter === f ? 'orion-surface-chip--active' : ''}`}
          >
            {f ? ETAT_LABELS[f] : 'Tous'}
          </button>
        ))}
      </div>

      {loading ? (
        <AppListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <AppEmptyState
          icon={Laptop}
          title="Aucun matériel"
          description="Le parc apparaîtra ici selon le filtre sélectionné."
        />
      ) : (
        <div className="materiels-grid">
          {items.map((m) => {
            const Icon = CAT_ICONS[m.category] ?? Laptop;
            const etatCls = `materiel-etat materiel-etat--${m.etat in ETAT_LABELS ? m.etat : 'disponible'}`;
            return (
              <article key={m.id} className="materiel-card">
                <div className="materiel-card__head">
                  <div className="materiel-card__icon" aria-hidden>
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <div className="materiel-card__titles">
                    <p className="materiel-card__name">{m.name}</p>
                    <p className="materiel-card__code">{m.code}</p>
                  </div>
                  <span className={etatCls}>{ETAT_LABELS[m.etat] ?? m.etat}</span>
                </div>

                <p className="materiel-card__cat">
                  {CAT_LABELS[m.category] ?? m.category}
                  {m.marque ? ` · ${m.marque}` : ''}
                </p>

                <ul className="materiel-card__meta">
                  <li>
                    <MapPin size={12} aria-hidden />
                    <span>
                      {m.site}
                      {m.poste ? ` · ${m.poste}` : ''}
                    </span>
                  </li>
                  {m.employee ? (
                    <li>
                      <User size={12} aria-hidden />
                      <span className="is-assign">
                        {m.employee.firstName} {m.employee.lastName} ({m.employee.matricule})
                      </span>
                    </li>
                  ) : (
                    <li>
                      <User size={12} aria-hidden />
                      <span>Non affecté</span>
                    </li>
                  )}
                </ul>

                {m.tickets.length > 0 ? (
                  <span className="materiel-card__ticket">
                    <AlertTriangle size={12} aria-hidden />
                    {m.tickets.length} ticket{m.tickets.length > 1 ? 's' : ''} ouvert
                    {m.tickets.length > 1 ? 's' : ''}
                  </span>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </EntityListPageShell>
  );
}
