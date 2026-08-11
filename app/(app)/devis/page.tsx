'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText, Plus, Eye, Clock, CheckCircle2, XCircle, Send,
  ArrowLeft, User, Trash2, ChevronDown, Download, Mail, History, ExternalLink, List, LayoutList,
} from 'lucide-react';
import { formatPrice, CAT_LABELS } from '@/lib/data/catalogue';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData, unwrapPaginated, getApiErrorMessage } from '@/lib/api-client';
import { parseDevisNotes } from '@/lib/devis-meta';
import { getCartItemConfigSummary, formatCartConfigSummaryLines } from '@/lib/cart-config-display';
import { readPricingSnapshotFromConfig } from '@/lib/pricing/pricing-snapshot-meta';
import { OrionPageHeader, OrionEmptyState, OrionConfirmDialog, OrionColumnTable, OrionStatusBadge } from '@/components/orion';
import {
  AppListSkeleton, AppButton, AppKpiCard, AppListPagination,
  AppModuleShell, AppModuleToolbar, AppResponsiveKpiGrid, AppStickyActionBar,
  AppDataListRow, AppTableRowActions, AppViewToggle, EntityDataToolbar,
} from '@/components/ui/app-ui';
import { useEntityDataIo } from '@/lib/hooks/use-entity-data-io';
import { ADMIN_UI } from '@/lib/administration/admin-ui-vocab';
import { DevisValidationPanel } from '@/components/devis/devis-validation-panel';
import { DevisSendEmailModal } from '@/components/devis/devis-send-email-modal';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';
import { useResponsiveMode } from '@/lib/responsive/use-responsive-mode';
import { prefersCardList } from '@/lib/responsive/layout-registry';
import { VirtualizedList } from '@/components/ui/virtualized-list';
import { getNextAction } from '@/lib/flow/next-action';
import { statusBadgeClass, ACTION_INFO_CLASS } from '@/lib/ui/status-styles';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';
import { emitOrionLive, liveFetch } from '@/lib/live/orion-live';

type DevisData = {
  id: string; numero: string; clientId: string | null;
  sousTotal: number; remise: number; totalHT: number; totalTTC: number;
  statut: string; notes: string | null; validUntil: string | null;
  acceptedAt: string | null; createdAt: string;
  daysOpen?: number;
  isStagnant?: boolean;
  expiresSoon?: boolean;
  daysUntilExpiry?: number | null;
  client: {
    id: string; name: string; code: string; email?: string | null;
    tel?: string | null; whatsapp?: string | null; nif?: string | null;
    adresse?: string | null; ville?: string | null; charte?: string | null;
    commercialName?: string | null; canalVente?: string | null; canalDecouverte?: string | null;
    statNumber?: string | null; statut?: string | null;
  } | null;
  lignes: LigneData[];
  _count?: { commandes: number };
  commandes?: { id: string; numero: string; statut: string }[];
};

type LigneData = {
  id: string; articleId: string; articleLabel: string; category: string;
  configSnapshot: any; quantity: number; unite: string;
  prixUnitaireAuto: number; prixUnitaireForce: number | null;
  totalForce: number | null; totalLigne: number;
  pricingMode: string; priceReason: string | null; remarks: string | null;
};

const getStatutStyle = (s: string) => statusBadgeClass(s);

const getStatutIcon = (s: string) => {
  const m: Record<string, any> = { 'Accepté': CheckCircle2, 'En attente': Clock, 'Envoyé': Send, 'Refusé': XCircle };
  return m[s] || FileText;
};

const STATUTS_FLOW = ['Brouillon', 'Envoyé', 'En attente', 'Accepté', 'Refusé'];
const STATUS_FILTERS = ['tous', 'Brouillon', 'Envoyé', 'En attente', 'Accepté', 'Refusé', 'Expiré'] as const;

function formatRelanceHint(devis: Pick<DevisData, 'daysOpen' | 'daysUntilExpiry' | 'isStagnant' | 'expiresSoon'>) {
  if (devis.isStagnant) {
    return `À relancer • ${devis.daysOpen ?? 0} j sans décision`;
  }
  if (devis.expiresSoon && typeof devis.daysUntilExpiry === 'number') {
    return devis.daysUntilExpiry === 0
      ? 'Expire aujourd’hui'
      : `Expire dans ${devis.daysUntilExpiry} j`;
  }
  return null;
}

export default function DevisPageWrapper() {
  return (
    <Suspense fallback={<AppListSkeleton rows={6} />}>
      <DevisPage />
    </Suspense>
  );
}

function DevisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { info: commandeInfo } = useCommandeDeepLink();
  const liveTick = useOrionLiveRevision(['devis', 'commandes', 'clients']);
  const [devisList, setDevisList] = useState<DevisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('tous');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showStagnants, setShowStagnants] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const { fileRef, exportExcel, triggerImport, onImportFile } = useEntityDataIo('devis');
  const [selectedDevis, setSelectedDevis] = useState<DevisData | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [versions, setVersions] = useState<{ id: string; action: string; userName: string | null; createdAt: string; summary: string }[]>([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailAutoLaunch, setEmailAutoLaunch] = useState(false);
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total: 0, enAttente: 0, stagnants: 0, expirantBientot: 0, acceptes: 0, montantTotal: 0 });
  const [listViewMode, setListViewMode] = useState<'list' | 'table'>('list');
  const { mode, ready } = useResponsiveMode();

  useEffect(() => {
    if (!ready) return;
    if (prefersCardList('/devis', mode) && listViewMode === 'table') {
      setListViewMode('list');
    }
  }, [ready, mode, listViewMode]);

  const fetchDevis = useCallback(async () => {
    void liveTick;
    setLoading(true);
    try {
      const p = new URLSearchParams({
        search: debouncedSearch,
        paginated: '1',
        page: String(page),
        pageSize: '50',
        sort: sortBy,
      });
      if (statusFilter !== 'tous') p.set('statut', statusFilter);
      if (showStagnants) p.set('stagnant', '1');
      if (showTrash) p.set('archived', '1');
      const res = await fetch(`/api/devis?${p}`);
      if (res.ok) {
        const pageData = unwrapPaginated<DevisData>(await res.json(), 50);
        setDevisList(pageData.items);
        setTotalPages(pageData.totalPages);
        setTotalItems(pageData.total);
      }
    } catch { uxToast.error('Erreur chargement devis'); }
    setLoading(false);
  }, [debouncedSearch, statusFilter, page, sortBy, showStagnants, showTrash, liveTick]);

  useEffect(() => { fetchDevis(); }, [fetchDevis]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, sortBy, showStagnants, showTrash]);
  const refreshSummary = useCallback(() => {
    fetch('/api/devis?summary=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSummary(d))
      .catch(() => {
        console.warn('[devis] résumé indisponible');
      });
  }, []);
  useEffect(() => {
    refreshSummary();
  }, [refreshSummary, liveTick]);
  useEffect(() => {
    const s = searchParams.get('statut');
    setStatusFilter(s && STATUS_FILTERS.includes(s as (typeof STATUS_FILTERS)[number]) ? s : 'tous');
    setShowStagnants(searchParams.get('stagnant') === '1');
  }, [searchParams]);

  useEffect(() => {
    const id = searchParams.get('id') ?? searchParams.get('highlight');
    if (id) fetchDevisDetail(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- open once from deep link
  }, [searchParams]);

  const fetchDevisDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/devis/${id}`);
      if (res.ok) setSelectedDevis(unwrapApiData(await res.json()));
      const vRes = await fetch(`/api/devis/${id}/versions`);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVersions(vData.versions ?? []);
      }
    } catch { uxToast.error('Erreur chargement détail'); }
  };

  const openEmailModal = (auto = false) => {
    setEmailAutoLaunch(auto);
    setEmailModalOpen(true);
  };

  const handleSendEmailClick = (email?: string | null) => {
    openEmailModal(Boolean(email?.trim()));
  };

  const requestDeleteDevis = (devis: DevisData) => {
    if (devis.statut === 'Accepté' || (devis.commandes?.length ?? 0) > 0 || (devis._count?.commandes ?? 0) > 0) {
      setDeleteBlockedReason('Ce devis est lié à une commande validée et ne peut pas être mis en corbeille.');
      setDeleteTarget(devis.id);
      return;
    }
    setDeleteBlockedReason(null);
    setDeleteTarget(devis.id);
  };

  const restoreDevis = async (id: string) => {
    try {
      const res = await liveFetch(`/api/devis/${id}/restore`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(data, 'Restauration impossible'));
        return;
      }
      uxToast.success(ADMIN_UI.restore);
      emitOrionLive('devis', { entityId: id, source: 'restore' });
      fetchDevis();
    } catch {
      uxToast.error('Erreur réseau');
    }
  };

  const updateStatus = async (id: string, statut: string) => {
    try {
      const res = await liveFetch(`/api/devis/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });
      if (res.ok) {
        uxToast.success(`Statut mis à jour : ${statut}`);
        emitOrionLive('devis', { entityId: id, source: 'updateStatus' });
        fetchDevis();
        refreshSummary();
        if (selectedDevis?.id === id) fetchDevisDetail(id);
      }
    } catch { uxToast.error('Erreur mise à jour'); }
    setStatusMenuId(null);
  };

  const deleteDevis = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleting(true);
    try {
      const res = await liveFetch(`/api/devis/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        uxToast.error(getApiErrorMessage(data, 'Suppression impossible'), 'Suppression impossible');
        return;
      }
      uxToast.success('Devis mis en corbeille');
      emitOrionLive('devis', { entityId: id, source: 'delete' });
      setDeleteTarget(null);
      if (selectedDevis?.id === id) setSelectedDevis(null);
      fetchDevis();
      refreshSummary();
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setDeleting(false);
    }
  };

  const stats = summary;

  // Detail view
  if (selectedDevis) {
    const d = selectedDevis;
    const { meta, userNotes } = parseDevisNotes(d.notes);
    const canValidate = d.statut !== 'Accepté' && d.statut !== 'Refusé' && d.statut !== 'Expiré' && (d.commandes?.length ?? 0) === 0;
    const deleteBlocked = d.statut === 'Accepté' || (d.commandes?.length ?? 0) > 0;
    const relanceHint = formatRelanceHint(d);
    return (
      <>
      <div className="space-y-4">
        {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
        <FlowPageBanner
          entity="devis"
          status={d.statut}
          entityId={d.id}
          impactedModules={['CRM', 'POS', 'Commandes', 'Finance']}
          nextAction={getNextAction({ entity: 'devis', status: d.statut, entityId: d.id })}
        />
        <button onClick={() => { setSelectedDevis(null); router.replace('/devis'); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Retour à la liste
        </button>

        {searchParams.get('highlight') === d.id && (
          <div className="px-4 py-3 rounded-[7px] border border-[var(--orion-yellow)]/40 bg-[var(--orion-yellow)]/10 text-sm">
            Devis créé depuis le panier — renseignez la logistique et le paiement, puis validez la commande.
          </div>
        )}
        {relanceHint && (
          <div className={`px-4 py-3 rounded-[7px] border text-sm ${d.isStagnant ? 'border-amber-500/35 bg-amber-500/10 text-amber-100' : 'border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary,#FF174D)]'}`}>
            {relanceHint}. Action commerciale recommandée: recontacter le client et confirmer le prochain jalon.
          </div>
        )}

        <div className="orion-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="orion-ref-muted text-lg">{d.numero}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getStatutStyle(d.statut)}`}>{d.statut}</span>
              </div>
              {d.client && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm">{d.client.name} <span className="text-muted-foreground font-mono">({d.client.code})</span></span>
                  <button type="button" onClick={() => router.push(`/clients/${d.client!.id}`)} className="text-[10px] px-2 py-0.5 rounded-[7px] bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1">
                    <User size={10} /> Fiche client
                  </button>
                </div>
              )}
              {(d.commandes?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {d.commandes!.map((cmd) => (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => router.push(`/commandes/${cmd.id}`)}
                      className="text-xs px-2.5 py-1 rounded-[7px] border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Commande {cmd.numero}
                    </button>
                  ))}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">Créé le {new Date(d.createdAt).toLocaleDateString('fr-FR')}{d.validUntil && ` • Valide jusqu'au ${new Date(d.validUntil).toLocaleDateString('fr-FR')}`}</div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <AppButton variant="outline" size="sm" asChild>
                <a href={`/api/devis/${d.id}/pdf?doc=proforma&format=pdf`} target="_blank" rel="noopener noreferrer" className="bg-[#7b1fa2]/10 text-[#7b1fa2] border-[#7b1fa2]/30 hover:bg-[#7b1fa2]/20">
                  <Download size={14} /> Proforma
                </a>
              </AppButton>
              <AppButton type="button" variant="outline" size="sm" onClick={() => handleSendEmailClick(d.client?.email)} className={ACTION_INFO_CLASS}>
                <Mail size={14} /> Envoyer par email
              </AppButton>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => requestDeleteDevis(d)}
                title={deleteBlocked ? 'Devis validé — suppression impossible' : 'Supprimer le devis'}
                className="text-red-600 border-red-500/30 hover:bg-red-500/10"
              >
                <Trash2 size={14} /> Supprimer
              </AppButton>
            </div>
          </div>
        </div>

        <DevisValidationPanel
          devisId={d.id}
          clientId={d.clientId}
          client={d.client}
          totalTTC={d.totalTTC}
          initialMeta={meta}
          userNotes={userNotes}
          clientEmail={d.client?.email}
          canValidate={canValidate}
          onSaved={() => { fetchDevisDetail(d.id); fetchDevis(); refreshSummary(); }}
        />
        {userNotes && (
          <div className="bg-card border border-border rounded-[7px] p-4 text-sm text-muted-foreground italic">{userNotes}</div>
        )}

        {versions.length > 0 && (
          <div className="bg-card border border-border rounded-[7px] p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <History size={16} className="text-muted-foreground" /> Historique des versions
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {versions.map((v) => (
                <div key={v.id} className="flex items-start justify-between gap-3 text-xs border-b border-border/50 pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{v.summary}</p>
                    <p className="text-muted-foreground mt-0.5">{v.userName || 'Système'} · {new Date(v.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-accent">{v.action.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lines table */}
        <div className="bg-card border border-border rounded-[7px] overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Lignes du devis ({d.lignes.length})</h3>
          </div>
          <div className="divide-y divide-border">
            {d.lignes.map((l, i) => {
              const cs = (l.configSnapshot ?? {}) as Record<string, unknown>;
              const pricingSnap = readPricingSnapshotFromConfig(cs);
              const configSummary = getCartItemConfigSummary(cs, l.articleId, l.quantity);
              const configLine = formatCartConfigSummaryLines(configSummary);
              return (
                <div key={l.id} className="px-4 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[11px] font-mono font-bold text-[#FF174D] w-5 shrink-0">{i + 1}</span>
                        <span className="font-semibold text-sm">{l.articleLabel}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {CAT_LABELS[l.category] ?? l.category}
                        </span>
                      </div>
                      {configLine ? (
                        <p className="text-xs text-muted-foreground italic mt-1.5 pl-7 leading-relaxed">
                          {configLine}
                        </p>
                      ) : null}
                      {pricingSnap && (
                        <p className="text-[10px] text-muted-foreground mt-1 pl-7">
                          {pricingSnap.formulaVersion != null && (
                            <span className="mr-2">Formule v{pricingSnap.formulaVersion}</span>
                          )}
                          {pricingSnap.appliedTier && (
                            <span className="inline-flex items-center gap-1 rounded border border-[#10B981]/30 bg-[#10B981]/10 px-1.5 py-0.5 text-[#10B981]">
                              Palier {pricingSnap.appliedTier.label} · {formatPrice(pricingSnap.appliedTier.unitPrice)} Ar/u
                            </span>
                          )}
                        </p>
                      )}
                      {l.remarks && (
                        <p className="text-xs text-muted-foreground italic mt-1 pl-7">{l.remarks}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-sm text-primary">{formatPrice(l.totalLigne)} Ar</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {l.quantity} {l.unite} × {formatPrice(l.prixUnitaireForce ?? l.prixUnitaireAuto)} Ar
                      </p>
                      {l.pricingMode !== 'auto' && (
                        <p className="text-[10px] text-[var(--primary,#FF174D)] mt-0.5">Prix forcé</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Totals */}
          <div className="p-4 border-t border-border bg-accent/30">
            <div className="flex justify-end">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-sm"><span>Sous-total</span><span className="font-mono">{formatPrice(d.sousTotal)} Ar</span></div>
                {d.remise > 0 && <div className="flex justify-between text-sm text-[var(--primary,#FF174D)]"><span>Remise ({d.remise}%)</span><span className="font-mono">-{formatPrice(Math.round(d.sousTotal * d.remise / 100))} Ar</span></div>}
                <div className="flex justify-between text-sm font-semibold"><span>Total HT</span><span className="font-mono">{formatPrice(d.totalHT)} Ar</span></div>
                <div className="flex justify-between text-sm font-bold text-primary pt-1 border-t border-border"><span>Total TTC</span><span className="font-mono">{formatPrice(d.totalTTC)} Ar</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <DevisSendEmailModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        devisId={d.id}
        devisNumero={d.numero}
        totalTTC={d.totalTTC}
        clientName={d.client?.name ?? 'Client'}
        clientEmail={d.client?.email}
        clientWhatsapp={d.client?.whatsapp}
        clientTel={d.client?.tel}
        autoLaunch={emailAutoLaunch}
        onSent={() => { fetchDevisDetail(d.id); fetchDevis(); refreshSummary(); }}
      />
      <OrionConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteBlockedReason(null); } }}
        title="Mettre à la corbeille"
        description={deleteBlockedReason || 'Ce devis sera retiré de la liste active. Vous pourrez le restaurer depuis la corbeille.'}
        confirmLabel={deleteBlockedReason ? 'Compris' : deleting ? 'Archivage…' : 'Mettre à la corbeille'}
        onConfirm={deleteBlockedReason ? () => { setDeleteTarget(null); setDeleteBlockedReason(null); } : deleteDevis}
      />
      </>
    );
  }

  return (
    <AppModuleShell className="devis-page">
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      <OrionPageHeader
        title="Devis & Proformas"
        kicker="Commercial"
        description="Suivi commercial — devis, relances et conversion"
        compact
        icon={FileText}
        syncStatus={loading ? 'queued' : 'synced'}
        syncAsOf={loading ? null : new Date().toISOString()}
        actions={
          <AppButton type="button" className="hidden md:inline-flex" onClick={() => router.push('/panier')}>
            <Plus size={16} strokeWidth={1.75} /> Créer depuis le panier
          </AppButton>
        }
      />

      <AppResponsiveKpiGrid columns={6} phoneMax={3}>
        <AppKpiCard
          label="Total devis"
          value={stats.total}
          icon={FileText}
          tone="brand"
          delay={0}
          onClick={() => { setStatusFilter('tous'); setShowStagnants(false); }}
          className={!showStagnants && statusFilter === 'tous' ? 'is-active-filter' : ''}
        />
        <AppKpiCard
          label="En attente"
          value={stats.enAttente}
          icon={Clock}
          tone="gold"
          delay={0.05}
          onClick={() => { setStatusFilter('En attente'); setShowStagnants(false); }}
          className={statusFilter === 'En attente' && !showStagnants ? 'is-active-filter' : ''}
        />
        <AppKpiCard
          label="À relancer"
          value={stats.stagnants}
          icon={History}
          tone="warning"
          delay={0.1}
          onClick={() => { setShowStagnants(true); setStatusFilter('tous'); }}
          className={showStagnants ? 'is-active-filter' : ''}
        />
        <AppKpiCard
          label="Expiration proche"
          value={stats.expirantBientot}
          icon={Clock}
          tone="danger"
          delay={0.15}
        />
        <AppKpiCard
          label="Acceptés"
          value={stats.acceptes}
          icon={CheckCircle2}
          tone="success"
          delay={0.2}
          onClick={() => { setStatusFilter('Accepté'); setShowStagnants(false); }}
          className={statusFilter === 'Accepté' && !showStagnants ? 'is-active-filter' : ''}
        />
        <AppKpiCard
          label="CA accepté"
          value={stats.montantTotal}
          icon={Send}
          tone="info"
          format="price"
          delay={0.25}
        />
      </AppResponsiveKpiGrid>

      <AppModuleToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Rechercher par client, n° devis, article…' }}
        filters={(
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="orion-filter-select shrink-0"
              aria-label="Filtrer par statut"
            >
              <option value="tous">Tous les statuts</option>
              <option value="Brouillon">Brouillon</option>
              <option value="Envoyé">Envoyé</option>
              <option value="En attente">En attente</option>
              <option value="Accepté">Accepté</option>
              <option value="Refusé">Refusé</option>
              <option value="Expiré">Expiré</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="orion-filter-select shrink-0"
              aria-label="Trier les devis"
            >
              <option value="date_desc">Trier : plus récents</option>
              <option value="date_asc">Date croissante</option>
              <option value="client_az">Client A-Z</option>
              <option value="client_za">Client Z-A</option>
              <option value="montant_desc">Montant décroissant</option>
            </select>
            <button
              type="button"
              onClick={() => setShowStagnants((current) => !current)}
              className={`devis-filter-stagnant ${showStagnants ? 'is-on' : ''}`}
            >
              {showStagnants ? 'Vue : stagnants' : 'Filtrer : stagnants'}
            </button>
            <EntityDataToolbar
              trash={showTrash}
              onTrashChange={setShowTrash}
              onExport={() => void exportExcel(showTrash)}
              onImport={triggerImport}
              canImport={!showTrash}
              importLabel={ADMIN_UI.import}
              exportLabel={ADMIN_UI.export}
              trashLabel={ADMIN_UI.trash}
              activeLabel={ADMIN_UI.activeList}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                void onImportFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </div>
        )}
        viewToggle={(
          <AppViewToggle
            value={listViewMode}
            onChange={setListViewMode}
            options={[
              { id: 'list', label: 'Liste', icon: List },
              { id: 'table', label: 'Tableau', icon: LayoutList },
            ]}
          />
        )}
      />

      {(showStagnants || stats.stagnants > 0 || stats.expirantBientot > 0) && (
        <div className="devis-insight" role="status">
          <span className="devis-insight__dot" aria-hidden />
          <span>
            <strong>Suivi commercial</strong>
            {' — '}
            {showStagnants
              ? 'affichage ciblé sur les devis à relancer.'
              : `${stats.stagnants} devis stagnants à relancer et ${stats.expirantBientot} proches de l’expiration.`}
          </span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <AppListSkeleton rows={6} />
      ) : devisList.length === 0 ? (
        <OrionEmptyState
          icon={FileText}
          title={showStagnants ? 'Aucun devis stagnant' : 'Aucun devis'}
          description={showStagnants ? 'Aucun devis en attente de relance pour le moment.' : 'Composez un panier depuis le catalogue POS, puis créez votre premier devis.'}
          action={
            <AppButton type="button" onClick={() => router.push('/panier')}>
              Ouvrir le panier
            </AppButton>
          }
        />
      ) : listViewMode === 'table' ? (
        <>
          <OrionColumnTable
            data={devisList}
            rowKey={(d) => d.id}
            enableSorting
            virtualizeThreshold={50}
            onRowClick={(d) => fetchDevisDetail(d.id)}
            columns={[
              {
                id: 'numero',
                accessorKey: 'numero',
                enableSorting: true,
                header: 'N° devis',
                cell: (d) => <span className="orion-ref-muted font-mono">{d.numero}</span>,
              },
              {
                id: 'client',
                accessorFn: (d) => d.client?.name ?? '',
                enableSorting: true,
                header: 'Client',
                cell: (d) => d.client?.name || 'Client non assigné',
              },
              {
                id: 'statut',
                accessorKey: 'statut',
                enableSorting: true,
                header: 'Statut',
                cell: (d) => (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <OrionStatusBadge statut={d.statut} />
                    {d.isStagnant && (
                      <span className="devis-stagnant-chip">
                        À relancer
                      </span>
                    )}
                    {!d.isStagnant && d.expiresSoon && (
                      <span className="devis-stagnant-chip" style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)', color: 'var(--brand-primary)' }}>
                        Expire bientôt
                      </span>
                    )}
                  </div>
                ),
              },
              {
                id: 'lignes',
                accessorFn: (d) => d.lignes.length,
                header: 'Articles',
                className: 'text-center',
                headerClassName: 'text-center',
                cell: (d) => d.lignes.length,
              },
              {
                id: 'totalHT',
                accessorKey: 'totalHT',
                enableSorting: true,
                header: 'Total HT',
                headerClassName: 'text-right',
                className: 'text-right font-mono orion-amount',
                cell: (d) => `${formatPrice(d.totalHT)} Ar`,
              },
              {
                id: 'createdAt',
                accessorKey: 'createdAt',
                enableSorting: true,
                header: 'Date',
                cell: (d) => (
                  <div>
                    <div>{new Date(d.createdAt).toLocaleDateString('fr-FR')}</div>
                    {formatRelanceHint(d) && (
                      <div className="text-[10px] text-muted-foreground">{formatRelanceHint(d)}</div>
                    )}
                  </div>
                ),
              },
              {
                id: 'actions',
                header: 'Actions',
                headerClassName: 'text-right',
                className: 'text-right',
                cell: (d) => (
                  <div onClick={(e) => e.stopPropagation()}>
                    <AppTableRowActions
                      actions={[
                        { id: 'view', label: 'Voir détail', icon: <Eye size={16} strokeWidth={1.75} />, onClick: () => fetchDevisDetail(d.id) },
                        ...(showTrash
                          ? [{ id: 'restore', label: ADMIN_UI.restore, icon: <History size={16} strokeWidth={1.75} />, onClick: () => void restoreDevis(d.id) }]
                          : [{ id: 'delete', label: 'Corbeille', icon: <Trash2 size={16} strokeWidth={1.75} />, onClick: () => requestDeleteDevis(d), variant: 'danger' as const }]),
                      ]}
                    />
                  </div>
                ),
              },
            ]}
          />
          <AppListPagination page={page} totalPages={totalPages} total={totalItems} onPageChange={setPage} />
        </>
      ) : (
        <>
        <div className="devis-list-stack">
        <VirtualizedList
          items={devisList}
          rowKey={(devis) => devis.id}
          rowHeight={96}
          threshold={50}
          renderRow={(devis) => {
            const StatutIcon = getStatutIcon(devis.statut);
            return (
              <div className="relative">
              <AppDataListRow
                onClick={() => fetchDevisDetail(devis.id)}
                icon={<FileText size={18} strokeWidth={1.75} />}
                title={(
                  <>
                    <span className="orion-ref-muted">{devis.numero}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getStatutStyle(devis.statut)}`}>
                      <StatutIcon size={10} />{devis.statut}
                    </span>
                    {devis.isStagnant && (
                      <span className="devis-stagnant-chip">
                        À relancer
                      </span>
                    )}
                    {!devis.isStagnant && devis.expiresSoon && (
                      <span className="devis-stagnant-chip" style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)', color: 'var(--brand-primary)' }}>
                        Expire bientôt
                      </span>
                    )}
                    {(devis._count?.commandes ?? 0) > 0 && (
                      <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                        {devis._count?.commandes} cmd(s)
                      </span>
                    )}
                  </>
                )}
                subtitle={(
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{devis.client?.name || 'Client non assigné'}</span>
                    {devis.client && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/clients/${devis.client!.id}`); }}
                        className="text-[10px] px-1.5 py-0.5 rounded-[7px] bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        Fiche
                      </button>
                    )}
                  </div>
                )}
                meta={(
                  <>
                    {devis.lignes.length} article{devis.lignes.length > 1 ? 's' : ''} • {new Date(devis.createdAt).toLocaleDateString('fr-FR')}
                    {formatRelanceHint(devis) ? <span className="block mt-0.5">{formatRelanceHint(devis)}</span> : null}
                    {(() => {
                      const { meta } = parseDevisNotes(devis.notes);
                      return meta?.modePaiement ? (
                        <span className="block mt-0.5">Paiement: {meta.modePaiement}{meta.modePaiement === 'Avance' && meta.avancePct ? ` ${meta.avancePct}%` : ''} • {meta.canalPaiement}</span>
                      ) : null;
                    })()}
                  </>
                )}
                trailing={(
                  <>
                    <div className="orion-amount">{formatPrice(devis.totalHT)} Ar</div>
                    {devis.remise > 0 && <div className="text-[10px] text-[var(--ans-pink-500)]">-{devis.remise}% remise</div>}
                  </>
                )}
                actions={(
                  <AppTableRowActions
                    actions={[
                      { id: 'view', label: 'Voir détail', icon: <Eye size={16} strokeWidth={1.75} />, onClick: () => fetchDevisDetail(devis.id) },
                      { id: 'delete', label: 'Supprimer', icon: <Trash2 size={16} strokeWidth={1.75} />, onClick: () => requestDeleteDevis(devis), variant: 'danger' },
                      ...(devis.statut !== 'Accepté' && devis.statut !== 'Refusé' ? [{
                        id: 'status',
                        label: 'Changer statut',
                        icon: <ChevronDown size={16} strokeWidth={1.75} />,
                        onClick: () => setStatusMenuId(statusMenuId === devis.id ? null : devis.id),
                      }] : []),
                    ]}
                  />
                )}
              />
              {statusMenuId === devis.id && (
                <div className="absolute right-3 top-full mt-1 z-20 bg-[var(--bg-card)] rounded-[7px] shadow-xl py-1 min-w-[140px] border-0">
                  {STATUTS_FLOW.filter((s) => s !== devis.statut && s !== 'Accepté').map((s) => (
                    <button key={s} type="button" onClick={() => updateStatus(devis.id, s)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors">{s}</button>
                  ))}
                </div>
              )}
              </div>
            );
          }}
        />
        </div>
        <AppListPagination page={page} totalPages={totalPages} total={totalItems} onPageChange={setPage} />
        </>
      )}
      <OrionConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteBlockedReason(null); } }}
        title="Mettre à la corbeille"
        description={deleteBlockedReason || 'Ce devis sera retiré de la liste active. Vous pourrez le restaurer depuis la corbeille.'}
        confirmLabel={deleteBlockedReason ? 'Compris' : deleting ? 'Archivage…' : 'Mettre à la corbeille'}
        onConfirm={deleteBlockedReason ? () => { setDeleteTarget(null); setDeleteBlockedReason(null); } : deleteDevis}
      />
      <AppStickyActionBar>
        <AppButton type="button" onClick={() => router.push('/panier')}>
          <Plus size={16} className="mr-1.5" /> Nouveau devis
        </AppButton>
      </AppStickyActionBar>
    </AppModuleShell>
  );
}
