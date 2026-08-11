'use client';

import { Users, Star, Plus, MessageSquareWarning, Building2 } from 'lucide-react';
import { AppKpiCard } from '@/components/ui/app-ui';

export type ClientsKpiStats = {
  actifs: number;
  vip: number;
  nouveauxMois: number;
  reclamations: number;
  total: number;
};

/** Bandeau KPI liste clients — extrait du monolithe clients-page (CRM-01 incrémental). */
export function ClientsKpiStrip({ stats }: { stats: ClientsKpiStats }) {
  return (
    <>
      <AppKpiCard label="Clients actifs" value={stats.actifs} icon={Users} tone="success" delay={0} />
      <AppKpiCard label="Clients fidèles" value={stats.vip} icon={Star} tone="gold" delay={0.05} />
      <AppKpiCard label="Nouveaux / mois" value={stats.nouveauxMois} icon={Plus} tone="info" delay={0.1} />
      <AppKpiCard label="Réclamations ouvertes" value={stats.reclamations} icon={MessageSquareWarning} tone="warning" delay={0.15} />
      <AppKpiCard label="Total clients" value={stats.total} icon={Building2} tone="brand" delay={0.2} />
    </>
  );
}
