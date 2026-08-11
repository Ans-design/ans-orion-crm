'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, CheckCircle, AlertTriangle } from 'lucide-react';
import { AppPageHeader, AppKpiCard, AppEmptyState, AppListSkeleton } from '@/components/ui/app-ui';
import { QualiteChecklistForm } from '@/components/production/qualite-checklist-form';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';
import { ANS, ANS_KPI_COLORS } from '@/lib/ans-colors';
import { unwrapListItems } from '@/lib/api-client';

type Cmd = { id: string; numero: string; article: string; statut: string; avancement: number; client: { name: string } | null };

export default function QualitePageWrapper() {
  return (
    <Suspense fallback={<AppListSkeleton rows={4} />}>
      <QualitePage />
    </Suspense>
  );
}

function QualitePage() {
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [commandes, setCommandes] = useState<Cmd[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    /** Source canonique : dossiers GPAO à l’étape Contrôle qualité (Lot E2). */
    const fetches: Promise<unknown>[] = [
      fetch('/api/production/dossiers?etape=Contr%C3%B4le%20qualit%C3%A9&pageSize=40').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/commandes?statut=Suspendu&paginated=1&limit=10').then((r) => (r.ok ? r.json() : null)),
    ];
    if (commandeId) {
      fetches.push(fetch(`/api/commandes/${commandeId}`).then((r) => (r.ok ? r.json() : null)));
    }
    Promise.all(fetches)
      .then((results) => {
        const dossiersBody = results[0] as { items?: Array<{ commande?: Cmd | null; statutGlobal?: string }> } | null;
        const fromDossiers: Cmd[] = (dossiersBody?.items ?? [])
          .map((d) => d.commande)
          .filter((c): c is Cmd => Boolean(c?.id))
          .map((c) => ({
            ...c,
            statut: c.statut || 'En finition',
            avancement: c.avancement ?? 0,
            client: c.client ?? null,
          }));
        const suspendus = unwrapListItems<Cmd>(results[1]);
        const deep = (commandeId ? results[2] : null) as Cmd | null;
        const items: Cmd[] = [...fromDossiers, ...suspendus];
        if (deep?.id && !items.some((c) => c.id === deep.id)) {
          items.unshift(deep);
        }
        const unique = items.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
        setCommandes(unique);
        setExpandedId((prev) => commandeId ?? prev ?? unique[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, [commandeId]);

  useEffect(() => { load(); }, [load]);

  const enControle = commandes.filter((c) => c.statut === 'En finition' || c.statut === 'Prête').length;

  return (
    <div className="dashboard-full space-y-5 max-w-none">
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      <FlowPageBanner
        entity="production"
        status="En finition"
        entityId={commandeId ?? undefined}
        impactedModules={['GPAO', 'Livraisons', 'Commandes']}
      />

      <AppPageHeader
        title="Contrôle qualité"
        description="Checklist complète — conformité BAT, finition, emballage avant livraison"
      />

      <div className="grid gap-3 kpi-grid">
        <AppKpiCard label="Lots en contrôle" value={enControle} icon={ClipboardCheck} color="#FF174D" />
        <AppKpiCard label="À valider" value={commandes.filter((c) => c.statut === 'Prête').length} icon={CheckCircle} color={ANS_KPI_COLORS.success} />
        <AppKpiCard label="Suspendus / NC" value={commandes.filter((c) => c.statut === 'Suspendu').length} icon={AlertTriangle} color={ANS.red} />
      </div>

      {loading ? <AppListSkeleton rows={4} /> : (
        <div className="space-y-3">
          {commandes.length === 0 ? (
            <AppEmptyState
              icon={ClipboardCheck}
              title="Aucun lot en contrôle qualité"
              description="Les commandes en finition ou prêtes à livrer apparaîtront ici pour validation checklist."
              action={
                <a href="/production" className="btn btn-out btn-sm">Voir la production</a>
              }
            />
          ) : commandes.map((c) => (
            <div key={c.id}>
              {expandedId === c.id ? (
                <div className="space-y-2">
                  <Link href={`/commandes/${c.id}`} className="text-[10px] text-[var(--ans-cyan)] hover:underline inline-block">
                    Fiche 360° — {c.numero} →
                  </Link>
                  <QualiteChecklistForm commande={c} onDone={load} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setExpandedId(c.id)}
                  className="dashboard-chart-card !p-4 w-full text-left hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm">{c.numero}</span>
                    <span className="badge badge-b text-[9px]">{c.statut}</span>
                  </div>
                  <p className="text-sm mt-1">{c.article}</p>
                  <p className="text-xs text-muted-foreground">{c.client?.name ?? '—'} · Cliquer pour ouvrir la checklist</p>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
