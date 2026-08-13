'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Palette,
  FileCheck,
  ClipboardList,
  Users,
  ArrowRight,
  ListTodo,
  FileImage,
  FileWarning,
} from 'lucide-react';
import { useCockpitStats } from '@/lib/hooks/use-cockpit-kpis';
import { CockpitErrorBanner } from '@/components/workspace/cockpit-error-banner';
import { PosteTachesBoard } from '@/components/workspace/poste-taches-board';
import '@/styles/workspace-studio.css';

export default function StudioWorkspacePage() {
  const router = useRouter();
  const { kpis, sync, error, reload } = useCockpitStats('designer');
  const studio = sync.studio as
    | {
        enCours?: number;
        fichiersManquants?: number;
        batEnAttente?: number;
        corrections?: number;
      }
    | undefined;

  const kpiItems = [
    {
      label: 'Tâches graphisme',
      value: kpis.tachesOuvertes || 0,
      href: '/equipe/taches?type=graphisme',
      Icon: ListTodo,
    },
    {
      label: 'Briefs en cours',
      value: studio?.enCours ?? 0,
      href: '/studio?tab=briefs',
      Icon: FileImage,
    },
    {
      label: 'Fichiers manquants',
      value: studio?.fichiersManquants ?? 0,
      href: '/studio?tab=briefs&statut=En attente fichiers',
      Icon: FileWarning,
    },
    {
      label: 'BAT en attente',
      value: studio?.batEnAttente ?? kpis.batEnAttente ?? 0,
      href: '/studio?tab=briefs&statut=BAT envoyé',
      Icon: FileCheck,
    },
    {
      label: 'Corrections urgentes',
      value: studio?.corrections ?? 0,
      href: '/studio?tab=briefs&statut=Correction client',
      Icon: Palette,
    },
    {
      label: 'Commandes actives',
      value: kpis.cmdActives || 0,
      href: '/commandes',
      Icon: ClipboardList,
    },
  ];

  const navItems = [
    {
      label: 'Studio graphique',
      href: '/studio',
      Icon: FileImage,
      desc: 'Briefs, fichiers & prépresse — hub unifié',
    },
    {
      label: 'Mes tâches studio',
      href: '/equipe/taches?type=graphisme',
      Icon: ListTodo,
      desc: 'BAT et préparation fichiers',
    },
    {
      label: 'Bon à tirer',
      href: '/bat',
      Icon: FileCheck,
      desc: 'Valider et envoyer les BAT',
    },
    {
      label: 'Conception graphique',
      href: '/pos/conception',
      Icon: Palette,
      desc: 'Créations et devis design',
    },
    {
      label: 'Fiches clients',
      href: '/clients',
      Icon: Users,
      desc: 'Chartes et historique',
    },
  ];

  return (
    <div className="ws-studio">
      <header className="ws-studio__head">
        <div className="min-w-0">
          <p className="ws-studio__eyebrow">Mon espace</p>
          <h1>
            <Palette size={18} strokeWidth={2.2} aria-hidden />
            Mon studio
          </h1>
          <p>Graphisme · briefs, BAT, fichiers et tâches du jour</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/bat" className="ws-studio__link">
            <FileCheck size={14} aria-hidden />
            BAT
          </Link>
          <Link href="/studio" className="ws-studio__link is-primary">
            <FileImage size={14} aria-hidden />
            Studio
          </Link>
        </div>
      </header>

      {error ? <CockpitErrorBanner onRetry={reload} /> : null}

      <PosteTachesBoard type="graphisme" title="Mes tâches du jour (planifiées)" />

      <section className="ws-studio__kpis" aria-label="Indicateurs studio">
        {kpiItems.map(({ label, value, href, Icon }) => (
          <button
            key={label}
            type="button"
            className="ws-studio__kpi"
            onClick={() => router.push(href)}
          >
            <span className="ws-studio__kpi-ico" aria-hidden>
              <Icon size={14} strokeWidth={2.2} />
            </span>
            <span>
              <small>{label}</small>
              <strong>{Number(value).toLocaleString('fr-FR')}</strong>
            </span>
          </button>
        ))}
      </section>

      <section className="ws-studio__nav" aria-label="Raccourcis studio">
        {navItems.map(({ label, href, Icon, desc }) => (
          <button
            key={href}
            type="button"
            className="ws-studio__nav-card"
            onClick={() => router.push(href)}
          >
            <span className="ws-studio__nav-ico" aria-hidden>
              <Icon size={15} strokeWidth={2.2} />
            </span>
            <strong>{label}</strong>
            <small>{desc}</small>
            <span className="ws-studio__nav-open">
              Ouvrir <ArrowRight size={11} aria-hidden />
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}
