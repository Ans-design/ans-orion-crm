'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  FileText,
  Factory,
  Truck,
  Receipt,
  Users,
  Settings,
  MessageSquare,
  Package,
} from 'lucide-react';
import { AppPageHeader } from '@/components/ui/app-ui';

type AideSection = {
  title: string;
  icon: typeof FileText;
  tone: 'brand' | 'warning' | 'info' | 'success' | 'neutral';
  links: { href: string; label: string }[];
};

export default function AidePage() {
  const [catalogueCount, setCatalogueCount] = useState<number | null>(null);
  const [catalogueError, setCatalogueError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/pos/catalogue?count=1')
      .then(async (r) => {
        if (!r.ok) throw new Error('catalogue');
        const body = await r.json();
        const n = Number(body?.count ?? body?.data?.count ?? body?.total ?? NaN);
        if (!cancelled) {
          if (Number.isFinite(n)) setCatalogueCount(n);
          else setCatalogueError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setCatalogueError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const catalogueLabel = catalogueError
    ? 'Catalogue POS — compteur indisponible'
    : catalogueCount == null
      ? 'Catalogue POS — …'
      : `Catalogue POS — ${catalogueCount} articles`;

  const SECTIONS: AideSection[] = [
    {
      title: 'Ventes & POS',
      icon: FileText,
      tone: 'brand',
      links: [
        { href: '/pos', label: catalogueLabel },
        { href: '/panier', label: 'Panier et création devis' },
        { href: '/devis', label: 'Suivi des devis' },
        { href: '/commandes', label: 'Commandes' },
      ],
    },
    {
      title: 'Production & BAT',
      icon: Factory,
      tone: 'warning',
      links: [
        { href: '/bat', label: 'Bon à tirer (BAT)' },
        { href: '/production', label: 'Kanban atelier' },
        { href: '/production/dossiers', label: 'Dossiers GPAO' },
        { href: '/production/qualite', label: 'Contrôle qualité' },
      ],
    },
    {
      title: 'Stock & Achats',
      icon: Package,
      tone: 'info',
      links: [
        { href: '/stock', label: 'Stock matières' },
        { href: '/achats', label: 'Commandes fournisseurs' },
        { href: '/production/dechets', label: 'Plan matière · pertes' },
      ],
    },
    {
      title: 'Logistique & Finance',
      icon: Truck,
      tone: 'success',
      links: [
        { href: '/livraisons', label: 'Livraisons' },
        { href: '/factures', label: 'Facturation' },
        { href: '/paiements', label: 'Paiements et caisse' },
      ],
    },
    {
      title: 'RH & Communication',
      icon: Users,
      tone: 'info',
      links: [
        { href: '/rh/employes', label: 'Employés' },
        { href: '/messagerie', label: 'ANS Talk' },
        { href: '/equipe/suggestions', label: 'Suggestions & idées' },
        { href: '/rapports', label: 'Rapports' },
      ],
    },
    {
      title: 'Administration',
      icon: Settings,
      tone: 'neutral',
      links: [
        { href: '/administration', label: 'Backoffice' },
        { href: '/dashboard', label: 'Cockpit direction' },
        { href: '/aide', label: 'Cette page' },
      ],
    },
  ];

  return (
    <div className="orion-dense-page dashboard-full">
      <AppPageHeader
        title="Aide ANS ORION"
        description="Parcours rapides vers les modules métier"
        icon={HelpCircle}
      />

      {catalogueError && (
        <p
          className="text-xs px-3 py-2 rounded-[7px] m-0"
          style={{
            background: 'color-mix(in srgb, #f59e0b 12%, transparent)',
            color: '#b45309',
            border: 'none',
          }}
        >
          Compteur catalogue indisponible — le POS reste accessible via le lien ci-dessous.
        </p>
      )}

      <div className="orion-dense-grid">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.title} className="orion-dense-card">
              <div className="orion-dense-card__head">
                <span className="orion-dense-card__icon" data-tone={section.tone} aria-hidden>
                  <Icon size={15} strokeWidth={2} />
                </span>
                <h2 className="orion-dense-card__title">{section.title}</h2>
              </div>
              <ul className="orion-dense-card__links">
                {section.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5 m-0">
        <Receipt size={12} />
        Facturation et paiements suivent le dossier commande.
        <Link href="/messagerie" className="text-primary font-semibold inline-flex items-center gap-1 ml-1">
          <MessageSquare size={11} /> ANS Talk
        </Link>
      </p>
    </div>
  );
}
