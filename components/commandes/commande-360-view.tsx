'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData } from '@/lib/api-client';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';
import {
  Factory, Package, AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Download,
} from 'lucide-react';
import { AppModuleShell, AppButton } from '@/components/ui/app-ui';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { CommandeQrBadge } from '@/components/commandes/commande-qr-badge';
import { OrderProductionStepper } from '@/components/commandes/order-production-stepper';
import { OrderLogisticsTab } from '@/components/commandes/order-logistics-tab';
import { OrderFinanceTab } from '@/components/commandes/order-finance-tab';
import { OrderTimelineTab } from '@/components/commandes/order-timeline-tab';
import { CommandeFichiersBatPanel } from '@/components/commandes/commande-fichiers-bat-panel';
import { CommandeDossierExtraPanels } from '@/components/commandes/commande-dossier-panels';
import { CommandeBlocagePanel } from '@/components/commandes/commande-blocage-panel';
import { CommandeProofPhotosPanel } from '@/components/commandes/commande-proof-photos-panel';
import { CommandeSnapshotSections } from '@/components/commandes/commande-snapshot-sections';
import { CommandeLifeRail } from '@/components/commandes/commande-life-rail';
import { formatPrice } from '@/lib/format/french-typography';
import type { OrderAcceptSnapshot } from '@/lib/commande/order-snapshot';
import type { NextAction } from '@/lib/flow/next-action';
import {
  getLifeRailStep,
  isLifeRailStepUnlocked,
  resolveLifeRailStepId,
  type CommandeLifeRailStepId,
} from '@/lib/commande/commande-life-rail';
import { emitCommercialJourney } from '@/lib/commercial/commercial-journey-store';
import { syncCommandeOpsJourney } from '@/lib/commande/commande-ops-journey-store';
import { CommandeFinalizePanel } from '@/components/commandes/commande-finalize-panel';
import {
  canFinalizeCommandeRetourClient,
  isCommandeLivreeLabel,
  toCommandeStatutLabel,
} from '@/lib/data/commande-statut-display';
import { OrionPriorityBadge, OrionStatusBadge } from '@/components/orion';

type Overview = {
  commande: Record<string, unknown> & {
    id: string; numero: string; article: string; statut: string; avancement: number;
    total: number; acompte: number; reste: number; priorite: string; operateur: string | null;
    machine: string | null; dateCmd: string; dateLiv: string | null; note: string | null;
    client: { id: string; name: string; code: string; tel?: string; email?: string } | null;
    devis: { id: string; numero: string } | null;
    lignes: { articleLabel: string; quantity: number; configSnapshot?: unknown; articleId?: string | null; totalLigne: number }[];
    proofs: { id: string; numero: string; statut: string; locked?: boolean; versions?: { versionLabel: string; statut: string }[] }[];
    productionDossiers: { id: string; statutGlobal: string; avancement: number; etapes: { nom: string; statut: string }[] }[];
    livraisons: { id: string; numero: string; statut: string; proofPhotoUrl?: string | null; proofNote?: string | null; proofAt?: string | null }[];
    factures: { id: string; numero: string; statut: string; totalTTC: number }[];
    paiements: { id: string; mode: string; montant: number }[];
    metierTasks: { id: string; title: string; status: string; priorite: string }[];
    studioBriefs: { id: string; titre: string; statut: string }[];
  };
  fichiers: { id: string; name: string; category: string; versionLabel: string | null; statut?: string; sizeBytes?: number; mimeType?: string }[];
  talkAttachments?: { id: string; originalFileName: string; mimeType: string; sizeBytes: number; status: string; fileAssetId?: string | null }[];
  materialWastes?: { id: string; matiere: string; quantity: number; unite: string; cause: string }[];
  reclamations: { id: string; subject: string; statut: string; priorite: string }[];
  timeline: { type: string; label: string; date: string; detail: string }[];
  summary: Record<string, number>;
  workflow?: {
    snapshot: {
      currentJalon: { id: string; label: string; avancement: number };
      nextJalon: { id: string; label: string; avancement: number } | null;
      blockers: string[];
      progressPercent: number;
    };
  } | null;
  talkConversation?: { id: string; name: string } | null;
  integration?: {
    devisId: string | null;
    proofId: string | null;
    dossierId: string | null;
    livraisonId: string | null;
    factureId: string | null;
    qualiteId?: string | null;
  };
  stockReservations?: {
    id: string;
    quantity: number;
    availableQty?: number;
    unit?: string | null;
    stockItem?: {
      label: string;
      sku?: string;
      quantity?: number;
      reservedQty?: number | null;
      unit?: string | null;
    };
  }[];
  productions?: { id: string; statut: string; avancement?: number; machine?: string | null; operateur?: string | null; proofPhotoUrl?: string | null; proofNote?: string | null; proofAt?: string | null }[];
  qualiteControle?: { statut: string; checklist?: { key: string; label: string; checked: boolean }[]; commentaire?: string | null; cause?: string | null } | null;
  orderSnapshot?: OrderAcceptSnapshot | null;
  nextAction?: NextAction | null;
};

export function Commande360View({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const liveTick = useOrionLiveRevision(
    ['commandes', 'production', 'factures', 'paiements', 'stock', 'bat', 'livraisons'],
    { debounceMs: 500 },
  );
  const [data, setData] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatingFacture, setCreatingFacture] = useState(false);
  const [selectedStep, setSelectedStep] = useState<CommandeLifeRailStepId | null>(null);
  const [showMore, setShowMore] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    fetch(`/api/commandes/${id}/overview`, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) { setLoadError(true); setData(null); return; }
        setData(unwrapApiData(await r.json()));
      })
      .catch(() => { setLoadError(true); setData(null); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load, liveTick]);

  useEffect(() => {
    emitCommercialJourney('manual', {
      lastCommandeId: id,
      preferredStep: 'commandes',
    });
  }, [id]);

  const activeStep = useMemo(() => {
    if (!data) return 'creee' as CommandeLifeRailStepId;
    const c = data.commande;
    const statut = toCommandeStatutLabel(String(c.statut));
    const tasks = (c.metierTasks ?? []).map((t) => ({
      title: String(t.title ?? ''),
      status: String(t.status ?? 'À faire'),
    }));
    return resolveLifeRailStepId({
      statut,
      avancement: c.avancement,
      acompte: c.acompte,
      total: c.total,
      reste: c.reste,
      batValides: data.summary.batValides ?? 0,
      totalBat: data.summary.totalBAT ?? 0,
      hasDossierProduction: (c.productionDossiers?.length ?? 0) > 0,
      qualiteValidee: data.qualiteControle?.statut === 'OK' || data.qualiteControle?.statut === 'Valide',
      hasLivraison: (c.livraisons?.length ?? 0) > 0 && isCommandeLivreeLabel(statut),
      tasks,
    });
  }, [data]);

  /* Si l’étape active avance (tâche finie), ramener la sélection dans la zone débloquée */
  useEffect(() => {
    setSelectedStep((prev) => {
      if (!prev) return activeStep;
      if (!isLifeRailStepUnlocked(prev, activeStep)) return activeStep;
      return prev;
    });
  }, [activeStep]);

  /** Sidebar univers (Stock → Studio → Prod → …) suit le rail de vie en temps réel. */
  useEffect(() => {
    if (!data) return;
    const c = data.commande;
    const statut = toCommandeStatutLabel(String(c.statut));
    const totalBat = data.summary.totalBAT ?? 0;
    const batValides = data.summary.batValides ?? 0;
    syncCommandeOpsJourney({
      commandeId: c.id,
      numero: c.numero,
      statut,
      reste: c.reste,
      lifeRailStepId: activeStep,
      avancement: c.avancement,
      hasBatPending: totalBat > 0 && batValides < totalBat,
      hasDossierGpaO: (c.productionDossiers?.length ?? 0) > 0,
      hasLivraison: (c.livraisons?.length ?? 0) > 0,
      hasFacture: (c.factures?.length ?? 0) > 0,
      talkConversationId: data.talkConversation?.id ?? null,
      devisId: c.devis?.id ?? data.integration?.devisId ?? null,
    });
  }, [data, activeStep]);

  useEffect(() => {
    const clamp = (want: CommandeLifeRailStepId) =>
      isLifeRailStepUnlocked(want, activeStep) ? want : activeStep;
    const t = searchParams.get('tab');
    if (t === 'bat' || t === 'studio' || t === 'fichiers') {
      setSelectedStep(clamp('bat'));
      return;
    }
    if (t === 'production') {
      setSelectedStep(clamp('impression'));
      return;
    }
    if (t === 'logistique') {
      setSelectedStep(clamp('prete'));
      return;
    }
    if (t === 'finance') {
      setSelectedStep(clamp('acompte'));
      return;
    }
    setSelectedStep((prev) => {
      if (!prev) return activeStep;
      return isLifeRailStepUnlocked(prev, activeStep) ? prev : activeStep;
    });
  }, [searchParams, activeStep]);

  const panelStepRaw = selectedStep ?? activeStep;
  const panelStep = isLifeRailStepUnlocked(panelStepRaw, activeStep) ? panelStepRaw : activeStep;
  const panel = getLifeRailStep(panelStep).panel;

  const createFacture = async () => {
    setCreatingFacture(true);
    try {
      const r = await fetch(`/api/commandes/${id}/facture`, { method: 'POST' });
      const d = await r.json().catch(() => ({})) as {
        error?: string;
        message?: string;
        facture?: { id?: string; numero?: string };
        created?: boolean;
      };
      if (!r.ok) {
        uxToast.error(d.message ?? d.error, 'Création facture impossible');
        return;
      }
      const factureId = d.facture?.id;
      uxToast.success(
        d.created === false
          ? `Facture ${d.facture?.numero ?? ''} déjà existante`
          : 'Facture générée',
      );
      if (factureId) {
        // Même geste que Proforma devis : ouvrir le PDF immédiatement
        window.open(`/api/factures/${factureId}/pdf?format=pdf`, '_blank', 'noopener,noreferrer');
      }
      load();
    } finally {
      setCreatingFacture(false);
    }
  };

  if (loading) return <ListSkeleton rows={6} />;
  if (loadError) {
    return (
      <ErrorState
        title="Impossible de charger le dossier"
        message="La commande n’a pas pu être récupérée. Vérifiez la connexion puis réessayez."
        onRetry={load}
        action={
          <AppButton type="button" variant="outline" onClick={() => router.push('/commandes')}>
            ← Liste des commandes
          </AppButton>
        }
      />
    );
  }
  if (!data) {
    return (
      <AdminEmptyState
        title="Commande introuvable"
        description="Ce dossier n’existe pas ou n’est plus accessible avec votre session."
        actions={
          <AppButton type="button" variant="outline" onClick={() => router.push('/commandes')}>
            ← Liste des commandes
          </AppButton>
        }
      />
    );
  }

  const c = data.commande;
  const statutLabel = toCommandeStatutLabel(String(c.statut));
  // Retour client = commande finie (Prête / Livré) + nœud rail Prête ou Livrée uniquement
  const showFinalize =
    canFinalizeCommandeRetourClient(statutLabel)
    && (panelStep === 'prete' || panelStep === 'livree');
  const next = data.nextAction;
  const blockers = data.workflow?.snapshot?.blockers ?? [];

  return (
    <AppModuleShell className="max-w-none cmd-guided" density="compact">
      <header className="cmd-guided__header">
        <div className="cmd-guided__header-top">
          <button
            type="button"
            className="cmd-guided__back"
            onClick={() => router.push('/commandes')}
          >
            <ArrowLeft size={16} /> Liste
          </button>
          <CommandeQrBadge commandeId={id} numero={c.numero} compact />
        </div>
        <div className="cmd-guided__title-row">
          <div className="min-w-0">
            <h1 className="cmd-guided__title">{c.numero}</h1>
            <p className="cmd-guided__subtitle truncate">
              {c.client?.name ?? 'Client —'} · {c.article}
              {(c.lignes?.length ?? 0) > 1 ? ` (+${(c.lignes?.length ?? 1) - 1})` : ''}
            </p>
          </div>
          <div className="cmd-guided__badges">
            <OrionStatusBadge statut={statutLabel} />
            <OrionPriorityBadge priority={c.priorite} />
            <button
              type="button"
              disabled={creatingFacture}
              onClick={() => void createFacture()}
              title="Générer ou ouvrir la facture PDF (disponible à toutes les étapes)"
              className="cmd-guided__facture-btn inline-flex items-center gap-1.5 h-8 min-h-8 max-h-8 px-3 rounded-[7px] text-[11px] font-semibold border bg-[#7b1fa2]/10 text-[#7b1fa2] border-[#7b1fa2]/30 hover:bg-[#7b1fa2]/20 disabled:opacity-50"
            >
              <Download size={14} aria-hidden />
              {creatingFacture ? 'Génération…' : 'Générer une facture'}
            </button>
          </div>
        </div>
        <div className="cmd-guided__metrics">
          <div>
            <span className="cmd-guided__metric-label">Total</span>
            <strong>{formatPrice(c.total)}</strong>
          </div>
          <div>
            <span className="cmd-guided__metric-label">Reste</span>
            <strong style={{ color: c.reste > 0 ? 'var(--warning-text, var(--warning))' : 'var(--success-text, var(--success))' }}>
              {formatPrice(c.reste)}
            </strong>
          </div>
          <div>
            <span className="cmd-guided__metric-label">Avancement</span>
            <strong>{c.avancement}%</strong>
          </div>
        </div>
        {next?.href && (
          <div className="cmd-guided__cta-row">
            <Link href={next.href} className="cmd-guided__primary-cta">
              {next.label || 'Action suivante'}
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </header>

      <CommandeLifeRail
        activeId={activeStep}
        selectedId={panelStep}
        onSelect={setSelectedStep}
      />

      {(blockers.length > 0 || data.workflow?.snapshot) && (
        <div className={`cmd-guided__status ${blockers.length > 0 ? 'is-warn' : ''}`}>
          <div className="cmd-guided__status-row">
            <span className="cmd-guided__status-label">Maintenant</span>
            <strong>{getLifeRailStep(activeStep).label}</strong>
            {data.workflow?.snapshot.nextJalon && (
              <>
                <span className="cmd-guided__status-sep" aria-hidden>→</span>
                <span className="cmd-guided__status-next">
                  Suivant · {data.workflow.snapshot.nextJalon.label}
                </span>
              </>
            )}
          </div>
          {blockers.length > 0 && (
            <ul className="cmd-guided__status-list">
              {blockers.map((b, i) => (
                <li key={`${b}-${i}`}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section className="cmd-guided__panel" aria-label={`Panneau ${getLifeRailStep(panelStep).label}`}>
        <div className="cmd-guided__panel-head">
          <h2 className="cmd-guided__panel-title">{getLifeRailStep(panelStep).label}</h2>
          <span className="cmd-guided__panel-hint">Étape sélectionnée</span>
        </div>

        {panel === 'overview' && (
          <div className="space-y-3">
            <CommandeBlocagePanel commandeId={id} />
            <CommandeSnapshotSections
              snapshot={data.orderSnapshot ?? null}
              lignes={c.lignes ?? []}
              fallbackClient={c.client}
              compact
              variant="summary"
              reste={c.reste}
              acompte={c.acompte}
            />
            {data.reclamations.length > 0 && (
              <div className="rounded-[7px] p-3" style={{ background: 'var(--bg-chip)' }}>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                  <AlertTriangle size={13} className="text-amber-500" /> Réclamations
                </h3>
                {data.reclamations.map((r) => (
                  <div key={r.id} className="text-xs py-1.5" style={{ color: 'var(--text-muted)' }}>
                    {r.subject} · {r.statut}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {panel === 'finance' && (
          <OrderFinanceTab
            commandeId={id}
            commandeNumero={c.numero}
            snapshot={data.orderSnapshot ?? null}
            total={c.total}
            acompte={c.acompte}
            reste={c.reste}
            clientId={c.client?.id}
            clientLabel={c.client?.name}
            paiements={c.paiements}
            margeEstimee={data.summary.margeEstimee}
            margeEstimeePct={data.summary.margeEstimeePct}
            onRefresh={load}
          />
        )}

        {panel === 'bat' && (
          <div className="space-y-3">
            <CommandeFichiersBatPanel
              commandeId={id}
              clientId={c.client?.id}
              proofs={c.proofs}
              fichiers={data.fichiers}
              talkAttachments={data.talkAttachments}
              onRefresh={load}
            />
            <CommandeDossierExtraPanels
              commandeId={id}
              lignes={c.lignes}
              studioBriefs={c.studioBriefs}
              materialWastes={data.materialWastes}
              qualiteControle={data.qualiteControle}
            />
          </div>
        )}

        {panel === 'production' && (
          <div className="space-y-3">
            <OrderProductionStepper
              commandeId={id}
              avancement={c.avancement}
              workflow={data.workflow ?? null}
              hasDossier={(c.productionDossiers?.length ?? 0) > 0}
              onUpdated={load}
            />
            {panelStep === 'emballage' && (
              <div className="rounded-[7px] p-3 text-xs" style={{ background: 'var(--bg-chip-active)' }}>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-main)' }}>Emballage & preuves</p>
                <p className="mb-2" style={{ color: 'var(--text-muted)' }}>
                  Documentez l&apos;emballage puis passez à « Prête » quand le contrôle est OK.
                </p>
              </div>
            )}
            {(data.stockReservations?.length ?? 0) > 0 && (
              <div className="rounded-[7px] p-3" style={{ background: 'var(--bg-chip)' }}>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                  <Package size={13} /> Stock réservé
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.stockReservations!.map((r) => (
                    <div key={r.id} className="rounded-[7px] p-2 text-[11px]" style={{ background: 'var(--bg-card)' }}>
                      <div className="font-medium" style={{ color: 'var(--text-main)' }}>{r.stockItem?.label ?? 'Article'}</div>
                      <div className="mt-1" style={{ color: 'var(--text-muted)' }}>
                        Réservé {r.quantity} · Dispo {r.availableQty ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <CommandeProofPhotosPanel
              commandeId={id}
              productions={data.productions}
              livraisons={c.livraisons}
              onRefresh={load}
            />
            {c.productionDossiers.length > 0 && (
              <div className="rounded-[7px] p-3" style={{ background: 'var(--bg-chip)' }}>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                  <Factory size={13} /> Dossier atelier GPAO
                </h3>
                {c.productionDossiers.map((d) => (
                  <div key={d.id} className="text-xs flex justify-between items-center py-1" style={{ color: 'var(--text-main)' }}>
                    <span>{d.statutGlobal} · {d.avancement}%</span>
                    <Link
                      href={`/production/dossiers?commande=${id}`}
                      className="font-semibold hover:underline"
                      style={{ color: 'var(--primary)' }}
                    >
                      Ouvrir →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {panel === 'logistique' && (
          <div className="space-y-3">
            <OrderLogisticsTab
              commandeId={id}
              snapshot={data.orderSnapshot ?? null}
              dateLiv={c.dateLiv}
              priorite={c.priorite}
              note={c.note}
              livraisons={c.livraisons}
              clientMainAddress={data.orderSnapshot?.clientSnapshot?.clientMainAddress}
            />
            {showFinalize && (
              <CommandeFinalizePanel
                commandeId={id}
                numero={c.numero}
                clientName={c.client?.name}
                statut={statutLabel}
                onDone={load}
              />
            )}
          </div>
        )}
      </section>

      <div className="cmd-guided__more">
        <button
          type="button"
          className="cmd-guided__more-toggle"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showMore ? 'Masquer les détails' : 'Plus d’infos (timeline, liens)'}
        </button>
        {showMore && (
          <div className="cmd-guided__more-body space-y-3">
            <OrderTimelineTab events={data.timeline} />
            <div className="flex flex-wrap gap-2 text-xs">
              {data.talkConversation?.id && (
                <Link href={`/messagerie?commande=${id}`} className="text-primary font-semibold hover:underline">
                  ANS Talk →
                </Link>
              )}
              {c.devis?.id && (
                <Link href={`/devis?id=${c.devis.id}`} className="text-primary font-semibold hover:underline">
                  Devis {c.devis.numero} →
                </Link>
              )}
              <Link href={`/reclamations?commande=${id}`} className="text-primary font-semibold hover:underline">
                SAV / réclamation →
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppModuleShell>
  );
}
