'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Headphones,
  Users,
  Phone,
  Calendar,
  ClipboardList,
  ArrowRight,
  UserPlus,
  FileText,
  Truck,
  MessageCircle,
} from 'lucide-react';
import { useCockpitStats } from '@/lib/hooks/use-cockpit-kpis';
import { CockpitErrorBanner } from '@/components/workspace/cockpit-error-banner';
import '@/styles/workspace-accueil.css';

type VisiteRow = { heure?: string; nom?: string; type?: string; label?: string };

const KPIS = [
  { key: 'clients' as const, label: 'Clients actifs', href: '/clients', Icon: Users },
  {
    key: 'prospects' as const,
    label: 'Prospects',
    href: '/clients?statut=Prospect',
    Icon: Users,
  },
  {
    key: 'cmdActives' as const,
    label: 'Commandes actives',
    href: '/commandes',
    Icon: ClipboardList,
  },
  {
    key: 'messagesNonLus' as const,
    label: 'Messages non lus',
    href: '/messagerie',
    Icon: Headphones,
  },
  {
    key: 'livraisonsActives' as const,
    label: 'Livraisons en cours',
    href: '/livraisons',
    Icon: Truck,
  },
];

const ACTIONS = [
  { label: 'Nouveau client / prospect', href: '/clients', Icon: UserPlus },
  { label: 'Créer un devis', href: '/devis', Icon: FileText },
  { label: 'Réception livraison', href: '/livraisons', Icon: Truck },
  { label: 'ANS Talk', href: '/messagerie', Icon: MessageCircle },
];

export default function AccueilWorkspacePage() {
  const router = useRouter();
  const { kpis, lists, error, reload } = useCockpitStats('accueil');
  const visites = (lists.visitesAccueil as VisiteRow[]) ?? [];

  return (
    <div className="ws-accueil">
      <header className="ws-accueil__head">
        <div className="min-w-0">
          <p className="ws-accueil__eyebrow">Mon espace</p>
          <h1>
            <Headphones size={18} strokeWidth={2.2} aria-hidden />
            Mon Accueil
          </h1>
          <p>Tableau de bord accueil · clients, planning et actions du jour</p>
        </div>
        <Link href="/planning" className="ws-accueil__link">
          <Calendar size={14} aria-hidden />
          Planning
        </Link>
      </header>

      {error ? <CockpitErrorBanner onRetry={reload} /> : null}

      <section className="ws-accueil__kpis" aria-label="Indicateurs">
        {KPIS.map(({ key, label, href, Icon }) => (
          <button
            key={key}
            type="button"
            className="ws-accueil__kpi"
            onClick={() => router.push(href)}
          >
            <span className="ws-accueil__kpi-ico" aria-hidden>
              <Icon size={15} strokeWidth={2.2} />
            </span>
            <span>
              <small>{label}</small>
              <strong>{Number(kpis[key] ?? 0).toLocaleString('fr-FR')}</strong>
            </span>
          </button>
        ))}
      </section>

      <div className="ws-accueil__grid">
        <section className="ws-accueil__card" aria-label="Planning accueil">
          <div className="ws-accueil__card-head">
            <h2>
              <Calendar size={15} aria-hidden />
              Planning accueil — aujourd&apos;hui
            </h2>
            <Link href="/planning" className="ws-accueil__link" style={{ height: 28, fontSize: 10 }}>
              Voir tout
            </Link>
          </div>
          <div className="ws-accueil__card-body">
            {visites.length === 0 ? (
              <div className="ws-accueil__empty">
                <b>Aucun rendez-vous</b>
                Consultez le planning ou créez une tâche d&apos;accueil.
              </div>
            ) : (
              visites.map((v, i) => (
                <div key={`${v.heure}-${i}`} className="ws-accueil__visite">
                  <time>{v.heure ?? '—'}</time>
                  <div className="min-w-0">
                    <strong>{v.nom ?? v.label ?? '—'}</strong>
                    {v.type ? <small>{v.type}</small> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="ws-accueil__card" aria-label="Actions rapides">
          <div className="ws-accueil__card-head">
            <h2>
              <Phone size={15} aria-hidden />
              Actions rapides
            </h2>
          </div>
          <div className="ws-accueil__card-body">
            <div className="ws-accueil__actions">
              {ACTIONS.map(({ label, href, Icon }) => (
                <button
                  key={href}
                  type="button"
                  className="ws-accueil__action"
                  onClick={() => router.push(href)}
                >
                  <span className="ws-accueil__action-ico" aria-hidden>
                    <Icon size={14} strokeWidth={2.2} />
                  </span>
                  <span>{label}</span>
                  <ArrowRight size={14} aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
