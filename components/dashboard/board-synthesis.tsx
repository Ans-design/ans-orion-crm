'use client';

import {
  Users, Factory, Package, Truck, Receipt, Cpu, Palette, Megaphone, Settings2, ClipboardList, FileText, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/data/catalogue';
import { ANS } from '@/lib/ans-colors';
import { readHonestKpi } from '@/lib/dashboard/honest-kpi';

type ModuleCard = {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  color: string;
  kpi: string;
  value: string | number;
  status: 'ok' | 'warn' | 'alert';
};

type Props = {
  kpis: Record<string, number | null | undefined>;
  /** true si le payload dashboard est indisponible (erreur totale). */
  unavailable?: boolean;
};

function fmtKpi(
  source: { kpis: Record<string, number | null | undefined>; unavailable: boolean },
  key: string,
  asPrice = false,
): string | number {
  const n = readHonestKpi(source, key);
  if (n == null) return 'Indisponible';
  return asPrice ? formatPrice(n) : n;
}

/** Indisponible ≠ 0 : ne jamais traiter null comme seuil d’alerte. */
function statusWhen(
  value: number | null,
  pred: (v: number) => boolean,
  whenTrue: 'warn' | 'alert',
): 'ok' | 'warn' | 'alert' {
  if (value == null) return 'ok';
  return pred(value) ? whenTrue : 'ok';
}

export function BoardSynthesis({ kpis, unavailable = false }: Props) {
  const router = useRouter();
  const source = { kpis, unavailable };

  const n = (key: string) => readHonestKpi(source, key);

  const modules: ModuleCard[] = [
    { id: 'crm', title: 'Ventes & CRM', href: '/clients', icon: Users, color: ANS.red, kpi: 'Clients actifs', value: fmtKpi(source, 'clients'), status: 'ok' },
    { id: 'devis', title: 'Devis', href: '/devis', icon: FileText, color: ANS.red, kpi: 'En attente', value: fmtKpi(source, 'devisEnAttente'), status: statusWhen(n('devisEnAttente'), (v) => v > 5, 'warn') },
    { id: 'cmd', title: 'Commandes', href: '/commandes', icon: ClipboardList, color: '#16A34A', kpi: 'Actives', value: fmtKpi(source, 'cmdActives'), status: statusWhen(n('cmdRetard'), (v) => v > 0, 'alert') },
    { id: 'prod', title: 'Production GPAO', href: '/production', icon: Factory, color: ANS.orange, kpi: 'En cours', value: fmtKpi(source, 'enProduction'), status: statusWhen(n('dossiersBloques'), (v) => v > 0, 'alert') },
    { id: 'studio', title: 'Studio / BAT', href: '/bat', icon: Palette, color: '#7C3AED', kpi: 'BAT attente', value: fmtKpi(source, 'batEnAttente'), status: statusWhen(n('batEnAttente'), (v) => v > 0, 'warn') },
    { id: 'machines', title: 'Machines', href: '/machines', icon: Cpu, color: ANS.redDark, kpi: 'Hors service', value: fmtKpi(source, 'machinesDown'), status: statusWhen(n('machinesDown'), (v) => v > 0, 'alert') },
    { id: 'stock', title: 'Stock', href: '/stock', icon: Package, color: ANS.yellow, kpi: 'Alertes', value: fmtKpi(source, 'stockCritique'), status: statusWhen(n('stockCritique'), (v) => v > 0, 'warn') },
    { id: 'log', title: 'Logistique', href: '/livraisons', icon: Truck, color: '#FF3366', kpi: 'En cours', value: fmtKpi(source, 'livraisonsEnCours'), status: 'ok' },
    { id: 'finance', title: 'Finance', href: '/factures', icon: Receipt, color: '#16A34A', kpi: 'Impayés', value: fmtKpi(source, 'facturesImpayees', true), status: statusWhen(n('facturesImpayees'), (v) => v > 0, 'warn') },
    { id: 'caisse', title: 'Caisse', href: '/caisse', icon: Wallet, color: ANS.orange, kpi: 'Encaissements jour', value: fmtKpi(source, 'paiementsRecusJour', true), status: 'ok' },
    {
      id: 'rh',
      title: 'RH',
      href: '/rh/employes',
      icon: Users,
      color: ANS.red,
      kpi: 'Présents',
      value:
        n('rhPresents') == null && n('rhActifs') == null
          ? 'Indisponible'
          : `${n('rhPresents') ?? '—'}/${n('rhActifs') ?? '—'}`,
      status: statusWhen(n('rhRetards'), (v) => v > 0, 'warn'),
    },
    { id: 'cm', title: 'Community Mgmt', href: '/cm/campagnes', icon: Megaphone, color: '#DB2777', kpi: 'Campagnes actives', value: fmtKpi(source, 'cmCampagnesActives'), status: statusWhen(n('cmCampagnesActives'), (v) => v === 0, 'warn') },
    { id: 'admin', title: 'Administration', href: '/administration/vue-ensemble', icon: Settings2, color: '#64748B', kpi: 'Config', value: 'OK', status: 'ok' },
  ];

  const statusDot = { ok: '#16A34A', warn: '#FFC928', alert: '#F20A3A' };

  return (
    <div className="dashboard-module-grid">
      {modules.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => router.push(m.href)}
          className="dashboard-chart-card text-left transition-all hover:-translate-y-0.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div
              className="w-10 h-10 rounded-[7px] flex items-center justify-center"
              style={{ background: `color-mix(in srgb, ${m.color} 15%, transparent)` }}
            >
              <m.icon size={20} style={{ color: m.color }} />
            </div>
            <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: statusDot[m.status] }} title={m.status} />
          </div>
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">{m.title}</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{m.kpi}</p>
          <p className="font-mono font-bold text-lg mt-2 text-[var(--text-primary)]">{m.value}</p>
          <p className="text-[10px] text-[var(--brand-primary)] mt-2 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            Ouvrir le module →
          </p>
        </button>
      ))}
    </div>
  );
}
