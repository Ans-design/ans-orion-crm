'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, AlertTriangle, CheckCircle2, Clock, Play, Pause,
  ArrowLeft, X, Truck, Edit3, Save, Factory, Receipt, Banknote, User, ArrowRight,
} from 'lucide-react';
import { formatPrice } from '@/lib/format/french-typography';
import { COMMANDE_STATUTS, COMMANDE_PRODUCTION_STEPS } from '@/lib/data/commande-status';
import {
  computeCommandeAvancementFromTasks,
  type CommandeTaskAvancementResult,
} from '@/lib/commande/commande-task-avancement';
import { uxToast } from '@/lib/ux/feedback';
import { EncaissementModal, type EncaissementTarget } from '@/components/encaissement-modal';
import { OrionPageHeader, OrionEmptyState, OrionStatusBadge, OrionPriorityBadge, OrionColumnTable } from '@/components/orion';
import {
  AppListSkeleton, AppButton, AppActivityTile, AppListPagination,
  AppModuleShell, AppModuleToolbar, AppResponsiveKpiGrid, AppStickyActionBar, AppViewToggle,
  AppDataListRow, AppTableRowActions, EntityModuleDataBar,
} from '@/components/ui/app-ui';
import { useModuleDateFilter } from '@/components/layout/module-date-filter-context';
import { unwrapPaginated, unwrapListItems, getApiErrorMessage } from '@/lib/api-client';
import { CommandesKanban } from '@/components/commandes/commandes-kanban';
import { List, LayoutGrid, LayoutList } from 'lucide-react';
import { ACTION_INFO_CLASS } from '@/lib/ui/status-styles';
import { VirtualizedList } from '@/components/ui/virtualized-list';
import { useResponsiveMode } from '@/lib/responsive/use-responsive-mode';
import { prefersCardList } from '@/lib/responsive/layout-registry';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';
import { emitOrionLive, liveFetch } from '@/lib/live/orion-live';
import {
  COMMANDE_LIST_BUCKETS,
  commandeListBucket,
  type CommandeListBucket,
} from '@/lib/commande/commande-life-rail';
import { emitCommercialJourney } from '@/lib/commercial/commercial-journey-store';

type CommandeData = {
  id: string; numero: string; clientId: string | null; devisId: string | null;
  article: string; configSnapshot: any; qty: number; total: number;
  acompte: number; reste: number; statut: string; avancement: number;
  operateur: string | null; dateCmd: string; dateLiv: string | null;
  priorite: string; machine: string | null; note: string | null;
  createdAt: string;
  client: { id: string; name: string; code: string } | null;
  devis: { id: string; numero: string } | null;
  lignes?: { articleLabel: string; quantity: number; totalLigne: number }[];
  _count?: { lignes: number };
  nextAction?: { label: string; href: string } | null;
};

const PRIORITES = ['Normal', 'Haute', 'Urgente'];

const getStatusConfig = (s: string) => {
  const m: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
    'En production': { bg: 'bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]', text: 'text-[var(--primary)]', icon: Play },
    'En finition': { bg: 'bg-[color-mix(in_srgb,var(--ans-plum-700,#9D174D)_12%,transparent)]', text: 'text-[var(--ans-plum-700,#9D174D)] dark:text-[#D4A0C0]', icon: Play },
    'Prête': { bg: 'bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]', text: 'text-[var(--primary)]', icon: CheckCircle2 },
    'Livré': { bg: 'bg-green-500/10', text: 'text-green-500', icon: Truck },
    'À planifier': { bg: 'bg-muted', text: 'text-muted-foreground', icon: Clock },
    'En attente stock': { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: Pause },
    'Suspendu': { bg: 'bg-orange-500/10', text: 'text-orange-500', icon: AlertTriangle },
    'Annulée': { bg: 'bg-red-500/10', text: 'text-red-500', icon: X },
  };
  return m[s] ?? { bg: 'bg-muted', text: 'text-muted-foreground', icon: Clock };
};

export default function CommandesPageWrapper() {
  return (
    <Suspense fallback={<AppListSkeleton rows={5} />}>
      <CommandesPage />
    </Suspense>
  );
}

function CommandesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { queryString, revision } = useModuleDateFilter();
  const liveTick = useOrionLiveRevision(['commandes', 'paiements', 'livraisons', 'production']);
  const [commandes, setCommandes] = useState<CommandeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterBucket, setFilterBucket] = useState<CommandeListBucket | 'tous'>('tous');
  const [filterQuick, setFilterQuick] = useState<'tous' | 'resteAPayer' | 'urgente'>('tous');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [editCmd, setEditCmd] = useState<CommandeData | null>(null);
  const [editForm, setEditForm] = useState({ statut: '', avancement: 0, priorite: '', operateur: '', note: '', acompte: 0 });
  const [editTaskAvancement, setEditTaskAvancement] = useState<CommandeTaskAvancementResult | null>(null);
  const [encTarget, setEncTarget] = useState<EncaissementTarget | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'table' | 'kanban'>('list');
  const { mode, ready } = useResponsiveMode();

  useEffect(() => {
    if (!ready) return;
    if (prefersCardList('/commandes', mode) && viewMode === 'table') {
      setViewMode('list');
    }
  }, [ready, mode, viewMode]);
  const [kanbanCmds, setKanbanCmds] = useState<CommandeData[]>([]);
  const [showNewOrderGuide, setShowNewOrderGuide] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [summary, setSummary] = useState({
    total: 0, enCours: 0, enRetard: 0, aPlanifier: 0, livrees: 0, caTotal: 0,
    resteAPayer: 0, urgentes: 0, resteAPayerCount: 0,
  });

  const fetchCommandes = useCallback(async () => {
    void revision;
    void liveTick;
    setLoading(true);
    try {
      const p = new URLSearchParams({
        search: debouncedSearch,
        statut: filterStatut,
        paginated: '1',
        page: String(page),
        pageSize: '50',
      });
      if (filterQuick === 'resteAPayer') p.set('resteAPayer', '1');
      if (filterQuick === 'urgente') p.set('urgente', '1');
      if (showTrash) p.set('archived', '1');
      const dateQs = new URLSearchParams(queryString);
      dateQs.forEach((v, k) => p.set(k, v));
      const res = await fetch(`/api/commandes?${p}`);
      if (res.ok) {
        const pageData = unwrapPaginated<CommandeData>(await res.json(), 50);
        setCommandes(pageData.items);
        setTotalPages(pageData.totalPages);
        setTotalItems(pageData.total);
      }
    } catch { uxToast.error('Erreur chargement'); }
    setLoading(false);
  }, [debouncedSearch, filterStatut, filterQuick, page, queryString, revision, liveTick, showTrash]);

  useEffect(() => {
    emitCommercialJourney('manual', { preferredStep: 'commandes' });
  }, []);

  useEffect(() => { fetchCommandes(); }, [fetchCommandes]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatut, filterQuick, filterBucket, revision, liveTick, showTrash]);

  useEffect(() => {
    const p = new URLSearchParams();
    const dateQs = new URLSearchParams(queryString);
    dateQs.forEach((v, k) => p.set(k, v));
    p.set('summary', '1');
    fetch(`/api/commandes?${p}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSummary(d))
      .catch(() => {
        console.warn('[commandes] résumé indisponible');
      });
  }, [queryString, revision, liveTick]);

  const fetchKanban = useCallback(async () => {
    try {
      const p = new URLSearchParams({ search: debouncedSearch, statut: filterStatut === 'tous' ? '' : filterStatut, paginated: '1', page: '1', pageSize: '80' });
      if (filterQuick === 'resteAPayer') p.set('resteAPayer', '1');
      if (filterQuick === 'urgente') p.set('urgente', '1');
      const dateQs = new URLSearchParams(queryString);
      dateQs.forEach((v, k) => p.set(k, v));
      const res = await fetch(`/api/commandes?${p}`);
      if (res.ok) {
        setKanbanCmds(unwrapListItems<CommandeData>(await res.json()));
      }
    } catch { /* ignore */ }
  }, [debouncedSearch, filterStatut, filterQuick, queryString]);

  useEffect(() => {
    if (viewMode === 'kanban') fetchKanban();
  }, [viewMode, fetchKanban, revision]);

  useEffect(() => {
    const s = searchParams.get('statut');
    if (s) setFilterStatut(s);
    const q = searchParams.get('search');
    if (q) setSearch(q);
    if (searchParams.get('new') === '1') {
      setShowNewOrderGuide(true);
      router.replace('/commandes', { scroll: false });
    }
  }, [searchParams, router]);

  const loadEditTaskAvancement = async (commandeId: string, fallbackAvancement: number, fallbackStatut: string) => {
    try {
      const tr = await fetch(`/api/equipe/taches?commandeId=${encodeURIComponent(commandeId)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!tr.ok) {
        setEditTaskAvancement(null);
        return { avancement: fallbackAvancement, statut: fallbackStatut };
      }
      const tasks = unwrapListItems<{ title?: string; status?: string; assigneeName?: string | null }>(await tr.json());
      const computed = computeCommandeAvancementFromTasks(
        tasks.map((t) => ({
          title: String(t.title ?? ''),
          status: String(t.status ?? 'À faire'),
          assigneeName: t.assigneeName ?? null,
        })),
      );
      setEditTaskAvancement(computed);
      return {
        avancement: Math.max(fallbackAvancement, computed.avancement),
        statut: computed.suggestedStatut && computed.avancement >= fallbackAvancement
          ? computed.suggestedStatut
          : fallbackStatut,
      };
    } catch {
      setEditTaskAvancement(null);
      return { avancement: fallbackAvancement, statut: fallbackStatut };
    }
  };

  const openEdit = async (cmd: CommandeData) => {
    setEditTaskAvancement(null);
    try {
      const r = await fetch(`/api/commandes/${cmd.id}`);
      if (r.ok) {
        const full = await r.json();
        const fromTasks = await loadEditTaskAvancement(full.id, full.avancement, full.statut);
        setEditCmd(full);
        setEditForm({
          statut: fromTasks.statut,
          avancement: fromTasks.avancement,
          priorite: full.priorite,
          operateur: full.operateur || '',
          note: full.note || '',
          acompte: full.acompte || 0,
        });
        return;
      }
    } catch { /* fallback */ }
    const fromTasks = await loadEditTaskAvancement(cmd.id, cmd.avancement, cmd.statut);
    setEditCmd(cmd);
    setEditForm({
      statut: fromTasks.statut,
      avancement: fromTasks.avancement,
      priorite: cmd.priorite,
      operateur: cmd.operateur || '',
      note: cmd.note || '',
      acompte: cmd.acompte || 0,
    });
  };

  const apiAction = async (label: string, url: string, body: object, onOk?: () => void) => {
    try {
      const r = await liveFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { uxToast.success(`${label} — OK`); onOk?.(); return true; }
      uxToast.error(getApiErrorMessage(d, `${label} — erreur ${r.status}`));
    } catch { uxToast.error(`${label} — erreur réseau`); }
    return false;
  };

  const saveEdit = async () => {
    if (!editCmd) return;
    try {
      const res = await liveFetch(`/api/commandes/${editCmd.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        uxToast.success('Commande mise à jour');
        setEditCmd(null);
        emitOrionLive('commandes', { entityId: editCmd.id, source: 'saveEdit' });
        fetchCommandes();
      }
    } catch { uxToast.error('Erreur mise à jour'); }
  };

  const stats = summary;
  const visibleCommandes =
    filterBucket === 'tous'
      ? commandes
      : commandes.filter((cmd) => commandeListBucket(cmd.statut) === filterBucket);

  const applyBucket = (bucket: CommandeListBucket | 'tous') => {
    setFilterBucket(bucket);
    // Filtre API large ; raffinement client via visibleCommandes pour les buckets multi-statuts
    if (bucket === 'pretes') setFilterStatut('Prête');
    else if (bucket === 'livrees') setFilterStatut('Livré');
    else setFilterStatut('tous');
  };

  return (
    <AppModuleShell className="cmd-page">
      <OrionPageHeader
        title="Commandes"
        kicker="Étape 5 · Commercial"
        description="Créée → BAT → Impression → Emballage → Livrée"
        compact
        icon={ClipboardList}
        syncStatus={loading ? 'queued' : 'synced'}
        syncAsOf={loading ? null : new Date().toISOString()}
        actions={
          <div className="hidden xl:flex flex-wrap gap-2 items-center">
            <EntityModuleDataBar entity="commandes" trash={showTrash} onTrashChange={setShowTrash} />
            <AppButton type="button" size="sm" onClick={() => router.push('/pos')}>
              Catalogue POS
            </AppButton>
            <AppButton type="button" size="sm" variant="outline" onClick={() => router.push('/panier')}>
              Panier
            </AppButton>
          </div>
        }
      />

      <section
        className="cmd-list-hero space-y-4 rounded-[7px] border-0 bg-[color-mix(in_srgb,var(--bg-card,#fff)_88%,transparent)] p-4 md:p-5"
        aria-label="Pilotage des commandes"
      >
        <AnimatePresence>
          {showNewOrderGuide && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[7px] border-0 bg-[color-mix(in_srgb,var(--brand-primary,#cc0033)_7%,var(--bg-card,#fff))] p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Nouvelle commande</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Parcours : Client → POS → Panier → Devis confirmé (+ acompte) → Commande.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <AppButton type="button" size="sm" onClick={() => router.push('/clients?flow=pos')}>
                  1 · Choisir un client
                </AppButton>
                <AppButton type="button" size="sm" variant="outline" onClick={() => router.push('/pos')}>
                  2 · Catalogue POS
                </AppButton>
                <AppButton type="button" size="icon-sm" variant="ghost" onClick={() => setShowNewOrderGuide(false)} aria-label="Fermer">
                  <X size={16} />
                </AppButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="cmd-list-buckets" role="tablist" aria-label="Files commandes">
          {COMMANDE_LIST_BUCKETS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={filterBucket === b.id}
              className={`cmd-list-bucket ${filterBucket === b.id ? 'is-active' : ''}`}
              onClick={() => applyBucket(b.id)}
            >
              {b.label}
              {b.id === 'a_traiter' && <span className="cmd-list-bucket__count">{stats.aPlanifier}</span>}
              {b.id === 'en_cours' && <span className="cmd-list-bucket__count">{stats.enCours}</span>}
              {b.id === 'livrees' && <span className="cmd-list-bucket__count">{stats.livrees}</span>}
              {b.id === 'tous' && <span className="cmd-list-bucket__count">{stats.total}</span>}
            </button>
          ))}
        </div>

        <div className="cmd-list-kpis">
          <AppResponsiveKpiGrid columns={4} phoneMax={2} className="gap-2 sm:gap-3">
            <AppActivityTile label="À traiter" value={stats.aPlanifier} icon={Clock} tone="brand" compact onClick={() => applyBucket('a_traiter')} />
            <AppActivityTile label="En cours" value={stats.enCours} icon={Play} tone="brand" compact onClick={() => applyBucket('en_cours')} />
            <AppActivityTile label="En retard" value={stats.enRetard} icon={AlertTriangle} tone="danger" compact />
            <AppActivityTile label="Livrées" value={stats.livrees} icon={Truck} tone="brand" compact onClick={() => applyBucket('livrees')} />
          </AppResponsiveKpiGrid>
        </div>

        <div className="cmd-list-toolbar rounded-[7px] border-0 bg-[color-mix(in_srgb,var(--bg-card,#fff)_90%,transparent)] p-3">
          <AppModuleToolbar
            search={{ value: search, onChange: setSearch, placeholder: 'Rechercher commande, client, article…' }}
            chips={[
              { id: 'tous', label: 'Toutes' },
              { id: 'resteAPayer', label: 'Reste à payer' },
              { id: 'urgente', label: 'Urgentes' },
            ]}
            chipValue={filterQuick}
            onChipChange={(id) => setFilterQuick(id as typeof filterQuick)}
            filters={(
              <select value={filterStatut} onChange={(e) => { setFilterStatut(e.target.value); setFilterBucket('tous'); }} className="orion-filter-select shrink-0" aria-label="Filtrer par statut">
                <option value="tous">Tous les statuts</option>
                {COMMANDE_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            viewToggle={(
              <AppViewToggle
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { id: 'list', label: 'Liste', icon: List },
                  { id: 'table', label: 'Tableau', icon: LayoutList },
                  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
                ]}
              />
            )}
          />
        </div>
      </section>

      {loading && (viewMode === 'list' || viewMode === 'table') ? (
        <AppListSkeleton rows={6} />
      ) : viewMode === 'kanban' ? (
        <CommandesKanban commandes={kanbanCmds} onRefresh={() => { fetchKanban(); fetchCommandes(); }} />
      ) : visibleCommandes.length === 0 ? (
        <OrionEmptyState
          icon={ClipboardList}
          title="Aucune commande dans cette file"
          description="Changez de filtre ou validez un devis pour créer une commande."
          action={
            <AppButton type="button" onClick={() => router.push('/devis')}>
              Ouvrir Devis & Proformas
            </AppButton>
          }
        />
      ) : viewMode === 'table' ? (
        <div className="space-y-3">
          <OrionColumnTable
            data={visibleCommandes}
            rowKey={(cmd) => cmd.id}
            enableSorting
            virtualizeThreshold={50}
            onRowClick={(cmd) => router.push(`/commandes/${cmd.id}`)}
            columns={[
              {
                id: 'numero',
                accessorKey: 'numero',
                enableSorting: true,
                header: 'N° commande',
                cell: (cmd) => <span className="orion-ref-muted font-mono">{cmd.numero}</span>,
              },
              {
                id: 'client',
                accessorFn: (cmd) => cmd.client?.name ?? '',
                enableSorting: true,
                header: 'Client',
                cell: (cmd) => cmd.client?.name || '—',
              },
              {
                id: 'statut',
                accessorKey: 'statut',
                enableSorting: true,
                header: 'Statut',
                cell: (cmd) => <OrionStatusBadge statut={cmd.statut} />,
              },
              {
                id: 'priorite',
                accessorKey: 'priorite',
                header: 'Priorité',
                cell: (cmd) =>
                  cmd.priorite === 'Urgente' || cmd.priorite === 'Haute' ? (
                    <OrionPriorityBadge priority={cmd.priorite} size="md" />
                  ) : (
                    <span className="text-muted-foreground text-xs">{cmd.priorite}</span>
                  ),
              },
              {
                id: 'article',
                accessorKey: 'article',
                header: 'Article',
                cell: (cmd) => (
                  <span className="truncate max-w-[12rem] inline-block" title={cmd.article}>
                    {cmd.article}
                  </span>
                ),
              },
              {
                id: 'total',
                accessorKey: 'total',
                enableSorting: true,
                header: 'Total',
                headerClassName: 'text-right',
                className: 'text-right font-mono orion-amount',
                cell: (cmd) => `${formatPrice(cmd.total)} Ar`,
              },
              {
                id: 'avancement',
                accessorKey: 'avancement',
                enableSorting: true,
                header: 'Avancement',
                headerClassName: 'text-center',
                className: 'text-center',
                cell: (cmd) => `${cmd.avancement}%`,
              },
              {
                id: 'dateCmd',
                accessorKey: 'dateCmd',
                enableSorting: true,
                header: 'Date',
                cell: (cmd) => new Date(cmd.dateCmd).toLocaleDateString('fr-FR'),
              },
              {
                id: 'actions',
                header: 'Actions',
                headerClassName: 'text-right',
                className: 'text-right',
                cell: (cmd) => (
                  <div onClick={(e) => e.stopPropagation()}>
                    <AppTableRowActions
                      actions={[
                        { id: 'edit', label: 'Modifier', icon: <Edit3 size={16} strokeWidth={1.75} />, onClick: () => openEdit(cmd) },
                      ]}
                    />
                  </div>
                ),
              },
            ]}
          />
          <AppListPagination page={page} totalPages={totalPages} total={totalItems} onPageChange={setPage} />
        </div>
      ) : (
        <div className="cmd-list-stack">
          <VirtualizedList
            items={visibleCommandes}
            rowKey={(cmd) => cmd.id}
            rowHeight={108}
            threshold={50}
            renderRow={(cmd, i) => {
            const sc = getStatusConfig(cmd.statut);
            const StatusIcon = sc.icon;
            return (
              <AppDataListRow
                className="cmd-order-row"
                delay={Math.min(i * 0.03, 0.3)}
                onClick={() => router.push(`/commandes/${cmd.id}`)}
                icon={<StatusIcon size={18} strokeWidth={1.75} className={sc.text} />}
                title={(
                  <>
                    <span className="orion-ref-muted">{cmd.numero}</span>
                    <OrionStatusBadge statut={cmd.statut} />
                    {(cmd.priorite === 'Urgente' || cmd.priorite === 'Haute') && (
                      <OrionPriorityBadge priority={cmd.priorite} size="md" />
                    )}
                    {cmd.devis && <span className="text-[10px] text-muted-foreground">via {cmd.devis.numero}</span>}
                  </>
                )}
                subtitle={(
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{cmd.client?.name || 'Client non assigné'}</span>
                    {cmd.client && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/clients/${cmd.client!.id}`); }}
                        className="cmd-client-chip"
                      >
                        <User size={10} aria-hidden /> Fiche
                      </button>
                    )}
                  </div>
                )}
                meta={(
                  <>
                    <span>
                      {cmd.article} · {cmd.qty} ex.
                      {(cmd._count?.lignes ?? cmd.lignes?.length ?? 0) > 1 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
                          {cmd._count?.lignes ?? cmd.lignes!.length} lignes
                        </span>
                      )}
                      {cmd.dateLiv ? ` · Livraison ${new Date(cmd.dateLiv).toLocaleDateString('fr-FR')}` : ''}
                    </span>
                    {cmd.nextAction?.label ? (
                      <span className="cmd-order-next">
                        <ArrowRight size={11} strokeWidth={2.25} aria-hidden />
                        <span className="truncate">{cmd.nextAction.label}</span>
                      </span>
                    ) : null}
                  </>
                )}
                trailing={(
                  <div className="cmd-order-trailing">
                    <div className="orion-amount">{formatPrice(cmd.total)} Ar</div>
                    {cmd.acompte > 0 && <div className="cmd-pay-ok">Payé {formatPrice(cmd.acompte)} Ar</div>}
                    {cmd.reste > 0 && <div className="cmd-pay-due">Reste {formatPrice(cmd.reste)} Ar</div>}
                    <div className="cmd-progress" title={`Avancement ${cmd.avancement}%`}>
                      <div className="cmd-progress__track">
                        <div className="cmd-progress__fill" style={{ width: `${Math.max(0, Math.min(100, cmd.avancement))}%` }} />
                      </div>
                      <span className="cmd-progress__pct">{cmd.avancement}%</span>
                    </div>
                  </div>
                )}
                actions={(
                  <AppTableRowActions
                    actions={[
                      { id: 'edit', label: 'Modifier', icon: <Edit3 size={16} strokeWidth={1.75} />, onClick: () => openEdit(cmd) },
                    ]}
                  />
                )}
              />
            );
          }}
          />
          <AppListPagination page={page} totalPages={totalPages} total={totalItems} onPageChange={setPage} />
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editCmd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-backdrop backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditCmd(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-[7px] p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="orion-text-section-title flex items-center gap-2">
                    <ClipboardList size={18} className="text-primary" aria-hidden />
                    {editCmd.numero}
                  </h2>
                  <p className="text-xs text-muted-foreground">{editCmd.client?.name} • {new Date(editCmd.dateCmd).toLocaleDateString('fr-FR')}</p>
                </div>
                <button onClick={() => setEditCmd(null)} className="p-1 rounded-[7px] hover:bg-accent"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-accent/50 rounded-[7px] p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase">Total TTC</div>
                  <div className="font-mono font-bold text-primary">{formatPrice(editCmd.total)}</div>
                </div>
                <div className="bg-green-500/5 rounded-[7px] p-3 text-center border border-green-500/20">
                  <div className="text-[10px] text-muted-foreground uppercase">Acompte</div>
                  <div className="font-mono font-bold text-green-500">{formatPrice(editForm.acompte || editCmd.acompte || 0)}</div>
                  {(editForm.acompte || editCmd.acompte) > 0 && <div className="text-[9px] text-green-600">{Math.round(((editForm.acompte || editCmd.acompte) / editCmd.total) * 100)}% payé</div>}
                </div>
                <div className="bg-red-500/5 rounded-[7px] p-3 text-center border border-red-500/20">
                  <div className="text-[10px] text-muted-foreground uppercase">Reste</div>
                  <div className="font-mono font-bold text-red-500">{formatPrice(Math.max(0, editCmd.total - (editForm.acompte || editCmd.acompte || 0)))}</div>
                </div>
              </div>
              <div className="space-y-3">
                {(editCmd.lignes?.length ?? 0) > 0 && (
                  <div className="rounded-[7px] border border-border p-3 bg-accent/30">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Lignes commande</p>
                    <ul className="space-y-1 text-xs">
                      {editCmd.lignes!.map((l, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate">{l.articleLabel} × {l.quantity}</span>
                          <span className="font-mono shrink-0">{formatPrice(l.totalLigne)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Statut</label>
                    <select value={editForm.statut} onChange={e => setEditForm(f => ({ ...f, statut: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
                      {COMMANDE_STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Priorité</label>
                    <select value={editForm.priorite} onChange={e => setEditForm(f => ({ ...f, priorite: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
                      {PRIORITES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Jalons atelier</label>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Automatique selon l’état des tâches du personnel (démarrer / terminer une tâche met à jour l’avancement).
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {COMMANDE_PRODUCTION_STEPS.map((step) => {
                      const done = editForm.avancement >= step.avancement;
                      const active = editTaskAvancement?.activeJalon === step.label
                        || (!editTaskAvancement && editForm.avancement === step.avancement);
                      const assignee = (() => {
                        if (!editTaskAvancement) return null;
                        if (step.label === 'BAT envoyé' || step.label === 'BAT approuvé') {
                          return editTaskAvancement.jalons.find(
                            (j) => j.jalon === 'BAT envoyé' || j.jalon === 'BAT approuvé',
                          )?.assigneeName ?? null;
                        }
                        return editTaskAvancement.jalons.find((j) => j.jalon === step.label)?.assigneeName ?? null;
                      })();
                      return (
                        <span
                          key={step.label}
                          title={assignee ? `${step.label} — ${assignee}` : step.label}
                          className={`inline-flex flex-col items-start px-2 py-1 rounded-[7px] text-[10px] font-medium border ${
                            active
                              ? 'border-primary bg-primary/10 text-primary'
                              : done
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'border-border text-muted-foreground'
                          }`}
                        >
                          <span>{step.label}</span>
                          {assignee ? (
                            <span className="text-[9px] font-normal opacity-80 truncate max-w-[9rem]">{assignee}</span>
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Avancement ({editForm.avancement}%)
                    {editTaskAvancement ? ' — depuis tâches personnel' : ''}
                  </label>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-[width] duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, editForm.avancement))}%` }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Opérateur</label>
                  <input type="text" value={editForm.operateur} onChange={e => setEditForm(f => ({ ...f, operateur: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Acompte reçu (Ar)</label>
                  <input type="number" min={0} value={editForm.acompte} readOnly disabled title="Acompte calculé depuis les encaissements (ledger)" className="w-full bg-muted/40 border border-border rounded-[7px] px-3 py-2.5 text-sm font-mono outline-none opacity-80 cursor-not-allowed" />
                  <p className="text-[10px] mt-1 text-muted-foreground">Lecture seule — source ledger paiements. Pour encaisser, utilisez Paiements.</p>
                  {editCmd && editForm.acompte > 0 && <p className="text-[10px] mt-1 text-muted-foreground">Reste : <span className="font-mono font-bold text-chart-2">{formatPrice(editCmd.total - editForm.acompte)} Ar</span></p>}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Note</label>
                  <textarea value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} rows={2} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
                {/* Quick workflow actions */}
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase">Actions rapides</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => apiAction('Production', '/api/productions', { commandeId: editCmd?.id, priorite: editForm.priorite, operateur: editForm.operateur }, () => { setEditCmd(null); fetchCommandes(); })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-[7px] text-xs font-semibold transition-colors ${ACTION_INFO_CLASS}`}>
                      <Factory size={14} /> Lancer production
                    </button>
                    <button onClick={() => apiAction('Facture', '/api/factures', { commandeId: editCmd?.id, clientId: editCmd?.clientId }, () => { setEditCmd(null); fetchCommandes(); })}
                      className="flex items-center gap-2 px-3 py-2 rounded-[7px] bg-chart-3/10 text-chart-3 text-xs font-semibold hover:bg-chart-3/20 transition-colors">
                      <Receipt size={14} /> Créer facture
                    </button>
                    <button onClick={() => setEncTarget({
                      id: editCmd.id, commandeId: editCmd.id, numero: editCmd.numero,
                      label: editCmd.client?.name || editCmd.article, totalTTC: editCmd.total,
                      dejaPaye: editCmd.acompte || 0, clientId: editCmd.clientId || undefined,
                    })} className="flex items-center gap-2 px-3 py-2 rounded-[7px] bg-green-500/10 text-green-600 text-xs font-semibold hover:bg-green-500/20 transition-colors col-span-2">
                      <Banknote size={14} /> Encaissement rapide
                    </button>
                    <button onClick={() => apiAction('Livraison', '/api/livraisons', { commandeId: editCmd?.id, clientId: editCmd?.clientId, adresse: editCmd?.client?.name || 'Adresse à confirmer' }, () => { setEditCmd(null); fetchCommandes(); })}
                      className="flex items-center gap-2 px-3 py-2 rounded-[7px] bg-emerald-500/10 text-emerald-500 text-xs font-semibold hover:bg-emerald-500/20 transition-colors">
                      <Truck size={14} /> Planifier livraison
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <AppButton type="button" variant="outline" onClick={() => setEditCmd(null)} className="flex-1">Annuler</AppButton>
                <AppButton type="button" onClick={saveEdit} className="flex-1">
                  <Save size={14} /> Enregistrer
                </AppButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <EncaissementModal target={encTarget} onClose={() => setEncTarget(null)} onSuccess={() => { fetchCommandes(); setEditCmd(null); }} />
      <AppStickyActionBar>
        <AppButton type="button" onClick={() => router.push('/pos')}>
          Catalogue POS
        </AppButton>
        <AppButton type="button" variant="outline" onClick={() => router.push('/panier')}>
          Panier
        </AppButton>
      </AppStickyActionBar>
    </AppModuleShell>
  );
}
