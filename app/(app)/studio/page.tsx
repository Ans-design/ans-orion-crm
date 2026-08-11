'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Palette, FileImage, FolderOpen, ScanEye, FileCheck, ArrowRight } from 'lucide-react';
import { AppPageHeader, AppRouteLoading } from '@/components/ui/app-ui';
import { StudioBriefsPanel } from '@/components/studio/studio-briefs-panel';
import { StudioFichiersPanel } from '@/components/studio/studio-fichiers-panel';
import { StudioPrepressePanel } from '@/components/studio/studio-prepresse-panel';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';

const TABS = [
  { id: 'briefs', label: 'Briefs clients', icon: FileImage },
  { id: 'fichiers', label: 'Fichiers', icon: FolderOpen },
  { id: 'prepresse', label: 'Prépresse', icon: ScanEye },
] as const;

type StudioTab = (typeof TABS)[number]['id'];

function isStudioTab(v: string | null): v is StudioTab {
  return TABS.some((t) => t.id === v);
}

export default function StudioPageWrapper() {
  return (
    <Suspense fallback={<AppRouteLoading message="Chargement studio…" hint="Briefs, fichiers sources et prépresse" />}>
      <StudioHubPage />
    </Suspense>
  );
}

function StudioHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const rawTab = searchParams.get('tab');
  const tab: StudioTab = isStudioTab(rawTab) ? rawTab : 'briefs';
  const statut = searchParams.get('statut');

  const [stats, setStats] = useState<{ enCours?: number; fichiersManquants?: number; batEnAttente?: number; corrections?: number } | null>(null);

  const loadStats = useCallback(() => {
    fetch('/api/studio/briefs?stats=1')
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => { console.warn('[studio] fetch secondary failed'); });
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const setTab = (next: StudioTab) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', next);
    if (next !== 'briefs') p.delete('statut');
    router.replace(`/studio?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="dashboard-full max-w-6xl mx-auto space-y-5 pb-8">
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      <AppPageHeader
        icon={Palette}
        title="Studio graphique"
        description="Briefs, fichiers sources, contrôle prépresse et BAT — espace unifié"
        actions={(
          <>
            <Link href="/bat" className="text-xs px-3 py-2 rounded-[7px] border border-border hover:bg-muted flex items-center gap-1.5">
              <FileCheck size={14} /> Bon à tirer <ArrowRight size={12} />
            </Link>
            <Link href="/pos/conception" className="text-xs px-3 py-2 rounded-[7px] bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1.5">
              Conception POS <ArrowRight size={12} />
            </Link>
          </>
        )}
      />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[
            { label: 'En cours', value: stats.enCours ?? 0 },
            { label: 'Fichiers manquants', value: stats.fichiersManquants ?? 0, warn: (stats.fichiersManquants ?? 0) > 0 },
            { label: 'BAT en attente', value: stats.batEnAttente ?? 0 },
            { label: 'Corrections', value: stats.corrections ?? 0, warn: (stats.corrections ?? 0) > 0 },
          ].map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={() => {
                setTab('briefs');
                if (k.label === 'Fichiers manquants') router.replace('/studio?tab=briefs&statut=En attente fichiers');
                else if (k.label === 'BAT en attente') router.replace('/studio?tab=briefs&statut=BAT envoyé');
                else if (k.label === 'Corrections') router.replace('/studio?tab=briefs&statut=Correction client');
              }}
              className={`rounded-lg border px-3 py-2 text-left hover:bg-muted/50 ${k.warn ? 'border-orange-400/50 bg-orange-500/5' : 'border-border bg-card'}`}
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{k.label}</p>
              <p className="text-lg font-bold">{k.value}</p>
            </button>
          ))}
        </div>
      )}

      <div className="orion-segmented w-full sm:w-auto flex flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[320px]">
        {tab === 'briefs' && <StudioBriefsPanel initialStatut={statut} commandeId={commandeId} />}
        {tab === 'fichiers' && <StudioFichiersPanel commandeId={commandeId} />}
        {tab === 'prepresse' && <StudioPrepressePanel commandeId={commandeId} />}
      </div>
    </div>
  );
}
