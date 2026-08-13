'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  FileText,
  ClipboardList,
  Users,
  Printer,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Store,
  BarChart3,
} from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import { useCockpitStats } from '@/lib/hooks/use-cockpit-kpis';
import { CockpitErrorBanner } from '@/components/workspace/cockpit-error-banner';
import { PosteTachesBoard } from '@/components/workspace/poste-taches-board';
import { WorkspaceFilteredViewBanner } from '@/components/workspace/workspace-filtered-view-banner';
import { unwrapApiData } from '@/lib/api-client';
import { AppStickyActionBar, AppButton } from '@/components/ui/app-ui';
import '@/styles/workspace-commercial.css';

type SalesReport = {
  caEncaisse: number;
  commandesCount: number;
  devisCount: number;
  tauxConversionDevis: number;
  paiementsByMode: Record<string, number>;
  ventesDirectesMois?: number;
};

function fmtKpi(value: number, format?: 'price' | 'pct') {
  if (format === 'price') return formatPrice(value);
  if (format === 'pct') return `${value} %`;
  return Number(value || 0).toLocaleString('fr-FR');
}

export default function CommercialWorkspacePage() {
  const router = useRouter();
  const { kpis, alertes, error, reload } = useCockpitStats('commercial');
  const [sales, setSales] = useState<SalesReport | null>(null);

  useEffect(() => {
    fetch('/api/reports?period=month')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!body) {
          setSales(null);
          return;
        }
        setSales(unwrapApiData<SalesReport>(body));
      })
      .catch(() => setSales(null));
  }, []);

  const paiementsModes = sales?.paiementsByMode
    ? Object.entries(sales.paiementsByMode).sort((a, b) => b[1] - a[1])
    : [];

  const kpiItems = [
    {
      label: 'Devis en attente',
      value: kpis.devisEnAttente || 0,
      href: '/devis',
      Icon: FileText,
    },
    {
      label: 'Commandes actives',
      value: kpis.cmdActives || 0,
      href: '/commandes',
      Icon: ClipboardList,
    },
    {
      label: 'Clients actifs',
      value: kpis.clients || 0,
      href: '/clients',
      Icon: Users,
    },
    {
      label: 'CA semaine',
      value: kpis.caWeek || 0,
      href: '/rapports',
      Icon: TrendingUp,
      format: 'price' as const,
    },
    {
      label: 'CA mois',
      value: sales?.caEncaisse || 0,
      href: '/rapports',
      Icon: BarChart3,
      format: 'price' as const,
    },
    {
      label: 'Taux conversion',
      value: sales?.tauxConversionDevis || 0,
      href: '/devis',
      Icon: TrendingUp,
      format: 'pct' as const,
    },
  ];

  const actions = [
    { label: 'Caisse vente directe', desc: 'POS & encaissement', href: '/pos', Icon: Store },
    { label: 'Nouveau devis', desc: 'Depuis le panier', href: '/panier', Icon: FileText },
    { label: 'Ouvrir POS', desc: 'Catalogue articles', href: '/pos', Icon: Printer },
    { label: 'Nouveau client', desc: 'CRM', href: '/clients?action=new', Icon: Users },
  ];

  return (
    <div className="ws-vente">
      <header className="ws-vente__head">
        <div className="min-w-0">
          <p className="ws-vente__eyebrow">Mon espace</p>
          <h1>
            <Briefcase size={18} strokeWidth={2.2} aria-hidden />
            Mon espace vente
          </h1>
          <p>Pilotage commercial · devis, commandes, CA et actions du jour</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/devis" className="ws-vente__link">
            <FileText size={14} aria-hidden />
            Devis
          </Link>
          <Link href="/pos" className="ws-vente__link is-primary">
            <Printer size={14} aria-hidden />
            POS
          </Link>
        </div>
      </header>

      <WorkspaceFilteredViewBanner moduleLabel="Commercial (Devis / Commandes / Clients)" href="/commandes" />

      {error ? <CockpitErrorBanner onRetry={reload} /> : null}

      <PosteTachesBoard type="commercial" title="Mes tâches commerciales du jour" />

      <section className="ws-vente__kpis" aria-label="Indicateurs vente">
        {kpiItems.map(({ label, value, href, Icon, format }) => (
          <button
            key={label}
            type="button"
            className="ws-vente__kpi"
            onClick={() => router.push(href)}
          >
            <span className="ws-vente__kpi-ico" aria-hidden>
              <Icon size={14} strokeWidth={2.2} />
            </span>
            <span>
              <small>{label}</small>
              <strong title={fmtKpi(value, format)}>{fmtKpi(value, format)}</strong>
            </span>
          </button>
        ))}
      </section>

      <div className="ws-vente__mid">
        <section className="ws-vente__card" aria-label="Statistiques vente">
          <div className="ws-vente__card-head">
            <h2>
              <BarChart3 size={15} aria-hidden />
              Statistiques vente (mois)
            </h2>
          </div>
          <div className="ws-vente__card-body">
            <dl className="ws-vente__stats">
              <div className="ws-vente__stat">
                <dt>Commandes</dt>
                <dd>{sales?.commandesCount ?? '—'}</dd>
              </div>
              <div className="ws-vente__stat">
                <dt>Devis émis</dt>
                <dd>{sales?.devisCount ?? '—'}</dd>
              </div>
              <div className="ws-vente__stat">
                <dt>CA encaissé</dt>
                <dd className="is-accent">
                  {sales ? formatPrice(sales.caEncaisse) : '—'}
                </dd>
              </div>
              <div className="ws-vente__stat">
                <dt>Conversion devis</dt>
                <dd>{sales?.tauxConversionDevis ?? 0}%</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="ws-vente__card" aria-label="Modes de paiement">
          <div className="ws-vente__card-head">
            <h2>
              <Banknote size={15} aria-hidden />
              Modes de paiement
            </h2>
          </div>
          <div className="ws-vente__card-body">
            {paiementsModes.length === 0 ? (
              <div className="ws-vente__empty">
                <b>Aucun paiement</b>
                Pas d&apos;encaissement enregistré ce mois.
              </div>
            ) : (
              <ul className="ws-vente__pay-list">
                {paiementsModes.map(([mode, amt]) => (
                  <li key={mode}>
                    <span>{mode}</span>
                    <strong>{formatPrice(amt)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="ws-vente__actions" aria-label="Actions rapides">
        {actions.map(({ label, desc, href, Icon }) => (
          <button
            key={label}
            type="button"
            className="ws-vente__action"
            onClick={() => router.push(href)}
          >
            <span className="ws-vente__action-ico" aria-hidden>
              <Icon size={14} strokeWidth={2.2} />
            </span>
            <span>
              <strong>{label}</strong>
              <small>{desc}</small>
            </span>
            <ArrowRight size={14} aria-hidden />
          </button>
        ))}
      </section>

      {alertes.length > 0 ? (
        <section className="ws-vente__alerts" aria-label="Alertes commerciales">
          <p className="ws-vente__alerts-label">Alertes commerciales</p>
          {alertes.slice(0, 4).map((a) => (
            <button
              key={a.label}
              type="button"
              className="ws-vente__alert"
              onClick={() => router.push(a.href)}
            >
              <AlertTriangle size={14} aria-hidden />
              {a.label}
            </button>
          ))}
        </section>
      ) : null}

      <section className="ws-vente__flow" aria-label="Flux vente">
        <span className="ws-vente__flow-ico" aria-hidden>
          <Briefcase size={16} strokeWidth={2.2} />
        </span>
        <div>
          <strong>Flux vente intégré</strong>
          <small>
            Lead → devis/POS → commande → production → livraison → facture → paiement
          </small>
        </div>
        <button
          type="button"
          className="ws-vente__link is-primary"
          onClick={() => router.push('/clients')}
        >
          CRM clients
        </button>
      </section>

      <AppStickyActionBar>
        <AppButton type="button" onClick={() => router.push('/pos')}>
          <Printer size={16} className="mr-1.5" /> POS
        </AppButton>
        <AppButton type="button" variant="outline" onClick={() => router.push('/devis')}>
          <FileText size={16} className="mr-1.5" /> Devis
        </AppButton>
      </AppStickyActionBar>
    </div>
  );
}
