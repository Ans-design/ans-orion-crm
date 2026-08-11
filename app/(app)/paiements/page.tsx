'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData, unwrapListItems, getApiErrorMessage } from '@/lib/api-client';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  AppListSkeleton, AppSearchBar,
  AppButton, AppKpiCard, AppFormModal, AppFormModalFooter, AppViewToggle,
  AppResponsiveKpiGrid, AppStickyActionBar, EntityDataToolbar,
} from '@/components/ui/app-ui';
import { useEntityDataIo } from '@/lib/hooks/use-entity-data-io';
import { ADMIN_UI } from '@/lib/administration/admin-ui-vocab';
import { OrionPageHeader, OrionEmptyState, OrionColumnTable } from '@/components/orion';
import { OrionErrorBoundary } from '@/components/shared/orion-error-boundary';
import { Banknote, Plus, CheckCircle2, RotateCcw, Wallet, List, LayoutList } from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { ComptableExportButton } from '@/components/finance/comptable-export-button';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';
import { useResponsiveMode } from '@/lib/responsive/use-responsive-mode';
import { prefersCardList } from '@/lib/responsive/layout-registry';
import { hasPermission } from '@/lib/auth/permissions';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';

const MODES = ['Espèces', 'Virement', 'Mobile Money', 'Chèque', 'Carte'];
const TYPES = ['Acompte', 'Solde', 'Remboursement'];

function modePillClass(mode?: string) {
  switch (mode) {
    case 'Espèces':
      return 'paiement-pill paiement-pill--mode-especes';
    case 'Virement':
      return 'paiement-pill paiement-pill--mode-virement';
    case 'Mobile Money':
      return 'paiement-pill paiement-pill--mode-mobile';
    case 'Chèque':
      return 'paiement-pill paiement-pill--mode-cheque';
    case 'Carte':
      return 'paiement-pill paiement-pill--mode-carte';
    default:
      return 'paiement-pill';
  }
}

function typePillClass(type?: string) {
  if (type === 'Remboursement') return 'paiement-pill paiement-pill--type-remb';
  if (type === 'Solde') return 'paiement-pill paiement-pill--type-solde';
  if (type === 'Acompte') return 'paiement-pill paiement-pill--type-acompte';
  return 'paiement-pill';
}

export default function PaiementsPage() {
  return (
    <Suspense fallback={<AppListSkeleton rows={4} />}>
      <PaiementsPageInner />
    </Suspense>
  );
}

type PaiementListItem = {
  id: string;
  numero?: string;
  montant?: number;
  mode?: string;
  type?: string;
  statut?: string;
  createdAt?: string;
  datePaiement?: string;
  clientName?: string;
  client?: { name?: string | null } | null;
  commandeId?: string | null;
  factureId?: string | null;
  devisId?: string | null;
  reference?: string | null;
  commande?: { numero?: string; id?: string } | null;
  facture?: { numero?: string; id?: string } | null;
};

type DevisRef = {
  id: string;
  numero?: string;
  statut?: string;
  clientId?: string | null;
  totalTTC?: number;
};

type CmdRef = {
  id: string;
  numero?: string;
  article?: string;
  reste?: number;
  clientId?: string | null;
};

type FactureRef = {
  id: string;
  numero?: string;
  totalTTC?: number;
  statut?: string;
  clientId?: string | null;
};

function PaiementsPageInner() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'user';
  const canWritePaiement = hasPermission(role, 'paiements:write');
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [list, setList] = useState<PaiementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [listViewMode, setListViewMode] = useState<'list' | 'table'>('list');
  const { mode, ready } = useResponsiveMode();

  useEffect(() => {
    if (!ready) return;
    if (prefersCardList('/paiements', mode) && listViewMode === 'table') {
      setListViewMode('list');
    }
  }, [ready, mode, listViewMode]);
  const [filterMode, setFilterMode] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [cmds, setCmds] = useState<CmdRef[]>([]);
  const [factures, setFactures] = useState<FactureRef[]>([]);
  const [devisList, setDevisList] = useState<DevisRef[]>([]);
  const [nf, setNf] = useState({ commandeId: '', factureId: '', devisId: '', montant: 0, mode: 'Espèces', type: 'Acompte', reference: '', notes: '', printFormat: 'facture' as 'ticket' | 'facture' });
  const [showTrash, setShowTrash] = useState(false);
  const { fileRef, exportExcel } = useEntityDataIo('paiements');
  const liveTick = useOrionLiveRevision(['paiements', 'factures', 'commandes', 'caisse'], { debounceMs: 400 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const p = new URLSearchParams();
      if (debouncedSearch) p.set('search', debouncedSearch);
      if (filterMode) p.set('mode', filterMode);
      if (commandeId) p.set('commande', commandeId);
      if (showTrash) p.set('archived', '1');
      const r = await fetch(`/api/paiements?${p}`);
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        const msg = getApiErrorMessage(json, `Erreur chargement paiements (${r.status})`);
        setLoadError(msg);
        uxToast.error(msg);
        return;
      }
      setList(unwrapListItems(await r.json()));
    } catch {
      const msg = 'Réseau indisponible — impossible de charger les paiements';
      setLoadError(msg);
      uxToast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterMode, commandeId, showTrash, liveTick]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (commandeId) setNf((prev) => ({ ...prev, commandeId }));
  }, [commandeId]);

  const loadRefs = async () => {
    const [r1, r2, r3] = await Promise.all([
      fetch('/api/commandes?paginated=1&pageSize=50'),
      fetch('/api/factures?paginated=1&pageSize=50'),
      fetch('/api/devis?paginated=1&pageSize=50'),
    ]);
    if (r1.ok) setCmds(unwrapListItems(await r1.json()));
    if (r2.ok) setFactures(unwrapListItems(await r2.json()));
    if (r3.ok) setDevisList(unwrapListItems(await r3.json()));
  };

  const handleNew = async () => {
    if (saving) return;
    if (!nf.montant || nf.montant <= 0) return uxToast.error('Montant requis');
    if (!nf.commandeId && !nf.factureId && !nf.devisId) return uxToast.error('Liez à une commande, facture ou devis');
    const cmd = cmds.find((c) => c.id === nf.commandeId);
    const fac = factures.find((f) => f.id === nf.factureId);
    const dev = devisList.find((d) => d.id === nf.devisId);
    if (nf.type !== 'Remboursement' && cmd && typeof cmd.reste === 'number' && nf.montant > cmd.reste + 1) {
      return uxToast.error(`Montant supérieur au reste commande (${cmd.reste})`);
    }
    setSaving(true);
    try {
    const r = await fetch('/api/paiements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...nf,
        montant: Number(nf.montant),
        clientId: cmd?.clientId || fac?.clientId || dev?.clientId || null,
      }),
    });
    if (r.ok) {
      const data = unwrapApiData<{
        devisConversion?: { converted?: boolean; commande?: { numero?: string } };
        factureId?: string | null;
        printFormat?: string;
      }>(await r.json());
      if (data.devisConversion?.converted) {
        uxToast.success(`Acompte enregistré — commande ${data.devisConversion.commande?.numero ?? ''} créée`);
      } else {
        uxToast.success('Paiement enregistré');
      }
      const facId = data.factureId || nf.factureId;
      const fmt = data.printFormat === 'ticket' ? 'ticket' : nf.printFormat;
      if (facId) {
        window.open(`/api/factures/${facId}/pdf?print=${fmt}&format=html`, '_blank', 'noopener,noreferrer');
      }
      setShowNew(false);
      setNf({ commandeId: '', factureId: '', devisId: '', montant: 0, mode: 'Espèces', type: 'Acompte', reference: '', notes: '', printFormat: 'facture' });
      load();
    } else {
      const err = await r.json().catch(() => ({}));
      uxToast.error(getApiErrorMessage(err, 'Erreur enregistrement'), 'Erreur enregistrement');
    }
    } finally {
      setSaving(false);
    }
  };

  const totalEncaisse = list.filter(p => p.type !== 'Remboursement').reduce((s, p) => s + (p.montant ?? 0), 0);
  const totalRembourse = list.filter(p => p.type === 'Remboursement').reduce((s, p) => s + (p.montant ?? 0), 0);
  const totalNet = totalEncaisse - totalRembourse;

  return (
    <div className="paiements-page dashboard-full">
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      <FlowPageBanner
        entity="facture"
        status={totalNet > 0 && list.some((p) => p.type !== 'Remboursement') ? 'Payé' : 'Non facturé'}
        nextAction={{
          id: 'paiement-enregistrer',
          label: 'Enregistrer un encaissement',
          description: 'Acompte, solde ou remboursement lié à une commande',
          href: '/paiements',
          module: 'finance',
          priority: 'high',
        }}
        impactedModules={['Commandes', 'Finance', 'Factures']}
      />
      <OrionPageHeader
        title="Paiements & Acomptes"
        description="Encaissements · acomptes · remboursements"
        icon={Banknote}
        actions={
          <div className="hidden md:flex flex-wrap gap-2 items-center">
            <EntityDataToolbar
              trash={showTrash}
              onTrashChange={setShowTrash}
              onExport={() => void exportExcel(showTrash)}
              canImport={false}
              exportLabel={ADMIN_UI.export}
              trashLabel={ADMIN_UI.trash}
              activeLabel={ADMIN_UI.activeList}
            />
            <input ref={fileRef} type="file" className="hidden" accept=".xlsx" />
            <ComptableExportButton variant="outline" />
            {canWritePaiement && (
              <AppButton type="button" size="sm" onClick={() => { setShowNew(true); void loadRefs(); }}>
                <Plus size={14} /> Enregistrer paiement
              </AppButton>
            )}
          </div>
        }
      />
      <AppResponsiveKpiGrid columns={4} phoneMax={3}>
        <AppKpiCard label="Transactions" value={list.length} icon={Banknote} tone="brand" />
        <AppKpiCard label="Encaissé" value={totalEncaisse} icon={CheckCircle2} tone="success" format="price" />
        <AppKpiCard label="Remboursé" value={totalRembourse} icon={RotateCcw} tone="danger" format="price" />
        <AppKpiCard label="Net" value={totalNet} icon={Wallet} tone="info" format="price" />
      </AppResponsiveKpiGrid>
      <div className="orion-filter-toolbar">
        <AppSearchBar value={search} onChange={setSearch} placeholder="Rechercher paiement, client…" className="flex-1 min-w-[160px]" />
        <AppViewToggle
          value={listViewMode}
          onChange={setListViewMode}
          options={[
            { id: 'list', label: 'Cartes', icon: List },
            { id: 'table', label: 'Tableau', icon: LayoutList },
          ]}
        />
        <div className="paiements-filters">
          <button type="button" onClick={() => setFilterMode('')} className={`paiements-filter${!filterMode ? ' is-active' : ''}`}>Tous</button>
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilterMode(m)}
              className={`paiements-filter${filterMode === m ? ' is-active' : ''}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <OrionErrorBoundary zone="paiements">
      {loading ? <AppListSkeleton rows={4} /> : loadError ? (
        <OrionEmptyState
          icon={Banknote}
          title="Impossible de charger les paiements"
          description={loadError}
          action={
            <AppButton type="button" onClick={() => { setLoading(true); void load(); }}>
              <RotateCcw size={16} /> Réessayer
            </AppButton>
          }
        />
      ) : list.length === 0 ? (
        <OrionEmptyState
          icon={Banknote}
          title="Aucun paiement enregistré"
          description="Enregistrez un acompte ou un solde lié à une commande ou facture."
          action={
            canWritePaiement ? (
              <AppButton type="button" onClick={() => { setShowNew(true); loadRefs(); }}>
                <Plus size={16} /> Enregistrer paiement
              </AppButton>
            ) : undefined
          }
        />
      ) : listViewMode === 'table' ? (
        <OrionColumnTable
          data={list}
          rowKey={(p) => p.id}
          enableSorting
          virtualizeThreshold={50}
          columns={[
            { id: 'numero', accessorKey: 'numero', enableSorting: true, header: 'N°', cell: (p) => <span className="font-mono text-sm">{p.numero}</span> },
            { id: 'client', accessorFn: (p) => p.client?.name ?? '', enableSorting: true, header: 'Client', cell: (p) => p.client?.name || 'Sans client' },
            { id: 'mode', accessorKey: 'mode', enableSorting: true, header: 'Mode', cell: (p) => p.mode },
            { id: 'type', accessorKey: 'type', enableSorting: true, header: 'Type', cell: (p) => p.type },
            {
              id: 'montant',
              accessorKey: 'montant',
              enableSorting: true,
              header: 'Montant',
              cell: (p) => (
                <span className={`font-mono font-semibold ${p.type === 'Remboursement' ? 'text-red-500' : 'text-green-500'}`}>
                  {p.type === 'Remboursement' ? '-' : '+'}{formatPrice(p.montant ?? 0)}
                </span>
              ),
            },
            {
              id: 'date',
              accessorFn: (p) => p.datePaiement ?? '',
              enableSorting: true,
              header: 'Date',
              cell: (p) => (p.datePaiement ? new Date(p.datePaiement).toLocaleDateString('fr-FR') : '—'),
            },
          ]}
        />
      ) : (
        <div className="paiements-grid">
          {list.map((p) => {
            const isRemb = p.type === 'Remboursement';
            return (
              <article key={p.id} className="paiement-card" data-type={p.type ?? ''}>
                <div className="paiement-card__top">
                  <span
                    className="paiement-card__icon"
                    data-mode={p.mode ?? ''}
                    data-type={p.type ?? ''}
                    aria-hidden
                  >
                    <Banknote size={15} strokeWidth={2} />
                  </span>
                  <div className="paiement-card__main">
                    <div className="paiement-card__num-row">
                      <span className="paiement-card__num">{p.numero}</span>
                      <span className={modePillClass(p.mode)}>{p.mode}</span>
                      <span className={typePillClass(p.type)}>{p.type}</span>
                    </div>
                    <div className="paiement-card__meta">
                      {p.client?.name || 'Sans client'}
                      {p.commandeId && p.commande?.numero ? (
                        <>
                          {' · '}
                          <Link href={`/commandes/${p.commandeId}?tab=finance`}>
                            {p.commande.numero}
                          </Link>
                        </>
                      ) : null}
                      {p.facture?.numero ? ` · ${p.facture.numero}` : ''}
                      {p.reference ? ` · Réf ${p.reference}` : ''}
                    </div>
                  </div>
                </div>
                <div className="paiement-card__foot">
                  <span className={`paiement-card__amount${isRemb ? ' is-out' : ' is-in'}`}>
                    {isRemb ? '−' : '+'}
                    {formatPrice(p.montant ?? 0)}
                  </span>
                  <span className="paiement-card__date">
                    {p.datePaiement
                      ? new Date(p.datePaiement).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                        })
                      : '—'}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </OrionErrorBoundary>
      <AppFormModal
        open={showNew}
        onOpenChange={setShowNew}
        title="Enregistrer un paiement"
        footer={<AppFormModalFooter onCancel={() => setShowNew(false)} onSubmit={handleNew} submitLabel="Enregistrer" loading={saving} />}
      >
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Devis (acompte)</label>
          <select value={nf.devisId} onChange={e => setNf({ ...nf, devisId: e.target.value, type: 'Acompte' })} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">Aucun</option>
            {devisList.filter((d) => !['Accepté', 'Refusé', 'Expiré'].includes(String(d.statut ?? ''))).map((d) => (
              <option key={d.id} value={d.id}>{d.numero} — {formatPrice(d.totalTTC ?? 0)} ({d.statut})</option>
            ))}
          </select></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Commande</label>
          <select value={nf.commandeId} onChange={e => setNf({ ...nf, commandeId: e.target.value })} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">Aucune</option>
            {cmds.map((c) => <option key={c.id} value={c.id}>{c.numero} — {c.article} (reste: {formatPrice(c.reste)})</option>)}
          </select></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Facture</label>
          <select value={nf.factureId} onChange={e => setNf({ ...nf, factureId: e.target.value })} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">Aucune</option>
            {factures.filter((f) => f.statut !== 'Payée' && f.statut !== 'Annulée').map((f) => <option key={f.id} value={f.id}>{f.numero} — {formatPrice(f.totalTTC)}</option>)}
          </select></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Montant (Ar) *</label>
          <input type="number" value={nf.montant} onChange={e => setNf({ ...nf, montant: Number(e.target.value) })} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Mode</label>
            <select value={nf.mode} onChange={e => setNf({ ...nf, mode: e.target.value })} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm">
              {MODES.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
            <select value={nf.type} onChange={e => setNf({ ...nf, type: e.target.value })} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm">
              {TYPES.map(t => <option key={t}>{t}</option>)}</select></div></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Référence</label>
          <input value={nf.reference} onChange={e => setNf({ ...nf, reference: e.target.value })} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm" placeholder="N° chèque, réf virement..." /></div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Document à remettre</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNf({ ...nf, printFormat: 'ticket' })}
              className={`rounded-[7px] border-2 p-3 text-left text-sm ${nf.printFormat === 'ticket' ? 'border-[var(--accent-primary,#FF174D)]' : 'border-border'}`}
              aria-pressed={nf.printFormat === 'ticket'}
            >
              <span className="font-semibold block">Ticket</span>
              <span className="text-[11px] text-muted-foreground">Version simplifiée</span>
            </button>
            <button
              type="button"
              onClick={() => setNf({ ...nf, printFormat: 'facture' })}
              className={`rounded-[7px] border-2 p-3 text-left text-sm ${nf.printFormat === 'facture' ? 'border-[var(--accent-primary,#FF174D)]' : 'border-border'}`}
              aria-pressed={nf.printFormat === 'facture'}
            >
              <span className="font-semibold block">Facture</span>
              <span className="text-[11px] text-muted-foreground">Forme complète</span>
            </button>
          </div>
        </div>
      </AppFormModal>
      <AppStickyActionBar>
        {canWritePaiement ? (
          <AppButton type="button" onClick={() => { setShowNew(true); loadRefs(); }}>
            <Plus size={16} className="mr-1.5" /> Encaisser
          </AppButton>
        ) : null}
        <ComptableExportButton variant="outline" className="flex-1 min-w-0 [&_button]:min-h-[44px] [&_button]:w-full" />
      </AppStickyActionBar>
    </div>
  );
}
