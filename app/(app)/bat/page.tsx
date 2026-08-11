'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileCheck, CheckCircle, XCircle, Send, Clock, ClipboardList, RefreshCw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import {
  AppEmptyState, AppListSkeleton, AppButton, AppKpiCard,
  AppResponsiveKpiGrid, AppStickyActionBar, EntityListPageShell,
} from '@/components/ui/app-ui';
import Link from 'next/link';
import { OrionErrorBoundary } from '@/components/shared/orion-error-boundary';
import { useOrionDrawer } from '@/components/orion/orion-drawer-provider';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';
import { batStatutLabel, isBatPending } from '@/lib/constants/file-assets';
import { statusBadgeClass } from '@/lib/ui/status-styles';
import { ANS } from '@/lib/ans-colors';

type Proof = {
  id: string; numero: string; statut: string; locked?: boolean; notes: string | null;
  createdAt: string; sentAt: string | null; validatedAt: string | null;
  client?: { name: string; code: string } | null;
  commande?: { numero: string; article: string } | null;
  versions?: { versionLabel: string; statut: string; notes: string | null }[];
};

const STATUT_STYLE: Record<string, string> = {
  'En attente fichier': 'bg-gray-500/10 text-gray-600',
  'En attente': statusBadgeClass('En attente'),
  'En attente validation client': statusBadgeClass('En attente'),
  'Envoyé': statusBadgeClass('Envoyé'),
  'Correction demandée': 'bg-orange-500/10 text-orange-600',
  'Validé': statusBadgeClass('Accepté'),
  'Verrouillé': 'bg-green-500/10 text-green-700',
  'Refusé': statusBadgeClass('Refusé'),
};

export default function BatPageWrapper() {
  return (
    <Suspense fallback={<AppListSkeleton rows={5} />}>
      <BatPage />
    </Suspense>
  );
}

function BatPage() {
  const searchParams = useSearchParams();
  const { openDrawer } = useOrionDrawer();
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, NonNullable<Proof['versions']>>>({});

  const loadVersions = async (proofId: string) => {
    if (versions[proofId]) return;
    const r = await fetch(`/api/proofs/${proofId}/versions`);
    if (r.ok) {
      const d = await r.json();
      setVersions((v) => ({ ...v, [proofId]: d.versions }));
    }
  };

  const toggleExpand = (proofId: string) => {
    if (expanded === proofId) setExpanded(null);
    else { setExpanded(proofId); void loadVersions(proofId); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const p = new URLSearchParams();
      if (filter) p.set('statut', filter);
      if (commandeId) p.set('commande', commandeId);
      const r = await fetch(`/api/proofs?${p}`, { credentials: 'include', cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        setProofs(d.proofs);
        setPending(d.pending);
      } else {
        setLoadError(true);
        uxToast.error('Impossible de charger les BAT');
      }
    } catch {
      setLoadError(true);
      uxToast.error('Erreur chargement BAT');
    } finally {
      setLoading(false);
    }
  }, [filter, commandeId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) openDrawer('bat', id);
  }, [searchParams, openDrawer]);

  const updateStatut = async (id: string, statut: string) => {
    const r = await fetch(`/api/proofs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut }),
    });
    if (r.ok) { uxToast.success(`BAT — ${statut}`); load(); }
    else uxToast.error('Erreur mise à jour');
  };

  return (
    <EntityListPageShell
      title="Bon à tirer (BAT)"
      description="Validation client avant production — workflow conception → BAT → impression"
      icon={FileCheck}
      actions={
          <div className="hidden xl:flex flex-wrap gap-2">
            <AppButton type="button" size="sm" variant="outline" onClick={() => load()}>
              <RefreshCw size={14} className="mr-1" /> Actualiser
            </AppButton>
            <Link
              href="/commandes"
              className="inline-flex items-center justify-center min-h-[36px] rounded-[7px] border border-border bg-background px-3 text-sm font-semibold"
            >
              Commandes
            </Link>
          </div>
      }
    >      <FlowPageBanner
        entity="bat"
        status={pending > 0 ? 'BAT requis' : 'BAT validé'}
        entityId={commandeId ?? undefined}
        impactedModules={['Studio', 'Commandes', 'Production']}
      />
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}

      <AppResponsiveKpiGrid columns={4} phoneMax={3}>
        <AppKpiCard label="BAT total" value={proofs.length} icon={FileCheck} color={ANS.red} />
        <AppKpiCard label="En attente" value={pending} icon={Clock} color={ANS.yellow} />
        <AppKpiCard label="Validés" value={proofs.filter((p) => p.statut === 'Validé' || p.locked).length} icon={CheckCircle} color="#10B981" />
        <AppKpiCard label="Refusés" value={proofs.filter((p) => p.statut === 'Refusé').length} icon={XCircle} color="#EF4444" />
      </AppResponsiveKpiGrid>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-card border border-border rounded-[7px] px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="En attente fichier">En attente fichier</option>
          <option value="En attente">En attente validation</option>
          <option value="Envoyé">Envoyé</option>
          <option value="Correction demandée">Correction demandée</option>
          <option value="Validé">Validé</option>
          <option value="Verrouillé">Verrouillé</option>
          <option value="Refusé">Refusé</option>
        </select>
      </div>

      <OrionErrorBoundary zone="bat">
      {loading ? (
        <AppListSkeleton rows={5} />
      ) : loadError ? (
        <AppEmptyState
          icon={FileCheck}
          title="Chargement impossible"
          description="Vérifiez votre connexion et réessayez."
          action={<AppButton type="button" size="sm" onClick={() => load()}>Réessayer</AppButton>}
        />
      ) : proofs.length === 0 ? (
        <AppEmptyState
          icon={FileCheck}
          title="Aucun BAT enregistré"
          description="Créez un BAT depuis une commande en production ou via le module conception."
        />
      ) : (
        <div className="space-y-3">
          {proofs.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-[7px] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                type="button"
                onClick={() => openDrawer('bat', p.id)}
                className="flex-1 min-w-0 text-left hover:opacity-90 transition-opacity"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-sm">{p.numero}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUT_STYLE[p.statut] || ''}`}>
                    {batStatutLabel(p.statut, p.locked)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {p.client?.name || '—'} {p.commande ? `· ${p.commande.numero} — ${p.commande.article}` : ''}
                </p>
                {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
                {expanded === p.id && versions[p.id] && (
                  <div className="mt-2 pl-3 space-y-1">
                    {versions[p.id].map((v) => (
                      <p key={v.versionLabel} className="text-[10px] text-muted-foreground">
                        <span className="font-mono font-bold text-foreground">{v.versionLabel}</span> — {v.statut}
                        {v.notes ? ` · ${v.notes}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </button>
              <div className="flex flex-wrap gap-2">
                <AppButton size="sm" variant="ghost" onClick={() => toggleExpand(p.id)} className="text-xs">
                  {expanded === p.id ? 'Masquer versions' : 'Versions BAT'}
                </AppButton>
                {['En attente', 'En attente fichier', 'En attente validation client'].includes(p.statut) && !p.locked && (
                  <AppButton size="sm" variant="outline" onClick={() => updateStatut(p.id, 'Envoyé')} className="gap-1">
                    <Send size={14} /> Envoyer
                  </AppButton>
                )}
                {isBatPending(p.statut) && !p.locked && (
                  <>
                    <AppButton size="sm" onClick={() => updateStatut(p.id, 'Validé')} className="gap-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle size={14} /> Valider
                    </AppButton>
                    <AppButton size="sm" variant="outline" onClick={() => updateStatut(p.id, 'Correction demandée')} className="gap-1">
                      Correction
                    </AppButton>
                    <AppButton size="sm" variant="destructive" onClick={() => updateStatut(p.id, 'Refusé')} className="gap-1">
                      <XCircle size={14} /> Refuser
                    </AppButton>
                  </>
                )}
                {p.locked && (
                  <span className="text-[10px] text-muted-foreground px-2">Verrouillé</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </OrionErrorBoundary>
      <AppStickyActionBar>
        <AppButton type="button" onClick={() => load()}>
          <RefreshCw size={16} className="mr-1.5" /> Actualiser
        </AppButton>
        <Link
          href="/commandes"
          className="inline-flex flex-1 items-center justify-center gap-1.5 min-h-[44px] rounded-[7px] border border-border bg-background px-3 text-sm font-semibold"
        >
          <ClipboardList size={16} /> Commandes
        </Link>
      </AppStickyActionBar>
    </EntityListPageShell>
  );
}
