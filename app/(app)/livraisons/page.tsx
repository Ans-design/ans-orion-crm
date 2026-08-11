'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData, unwrapListItems, getApiErrorMessage } from '@/lib/api-client';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  AppListSkeleton, AppSearchBar,
  AppButton, AppKpiCard, AppFormModal, AppFormModalFooter, AppViewToggle,
  AppResponsiveKpiGrid, AppStickyActionBar, EntityModuleDataBar,
} from '@/components/ui/app-ui';
import { OrionPageHeader, OrionEmptyState, OrionColumnTable } from '@/components/orion';
import { OrionErrorBoundary } from '@/components/shared/orion-error-boundary';
import { LivreurDeliveryView } from '@/components/livreur-delivery-view';
import { DispatchBoard } from '@/components/logistics/dispatch-board';
import { DeliveryProofModal } from '@/components/logistics/delivery-proof-modal';
import { TourneePlanner } from '@/components/logistics/tournee-planner';
import { Truck, Plus, X, ChevronRight, ArrowLeft, MapPin, Phone, Package, User, Smartphone, Camera, List, CheckCircle2, Clock, LayoutList, FileText } from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/data/catalogue';
import { useOrionDrawer } from '@/components/orion/orion-drawer-provider';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';
import { VirtualizedList } from '@/components/ui/virtualized-list';
import { MADAGASCAR_CARRIERS, type MadagascarCarrier } from '@/lib/logistics/madagascar-carriers';
import { statusBadgeClass, ACTION_INFO_CLASS } from '@/lib/ui/status-styles';
import { ANS } from '@/lib/ans-colors';
import { useResponsiveMode } from '@/lib/responsive/use-responsive-mode';
import { prefersCardList } from '@/lib/responsive/layout-registry';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';

const STATUTS = ['Préparation', 'Prêt', 'En livraison', 'Livré', 'Retour'];
const SC: Record<string, string> = {
  'Préparation': statusBadgeClass('Préparation'),
  'Prêt': statusBadgeClass('Prêt'),
  'En livraison': statusBadgeClass('En livraison'),
  'Livré': statusBadgeClass('Livré'),
  'Retour': statusBadgeClass('Retour'),
};

export default function LivraisonsPageWrapper() {
  return (
    <Suspense fallback={<AppListSkeleton rows={4} />}>
      <LivraisonsPage />
    </Suspense>
  );
}

function LivraisonsPage() {
  const searchParams = useSearchParams();
  const { openDrawer } = useOrionDrawer();
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [listViewMode, setListViewMode] = useState<'cards' | 'table'>('cards');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterLivreur, setFilterLivreur] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cmds, setCmds] = useState<any[]>([]);
  const [nf, setNf] = useState({ commandeId: '', adresseLiv: '', contactLiv: '', telLiv: '', livreur: '', datePrevue: '', colisCount: 1, notes: '' });
  const [livreurMode, setLivreurMode] = useState(false);
  const [viewMode, setViewMode] = useState<'dispatch' | 'list'>('dispatch');
  const [carriers, setCarriers] = useState<MadagascarCarrier[]>(MADAGASCAR_CARRIERS);
  const [proofTarget, setProofTarget] = useState<{ id: string; numero?: string } | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const liveTick = useOrionLiveRevision(['livraisons', 'commandes'], { debounceMs: 400 });
  const { mode, ready } = useResponsiveMode();

  useEffect(() => {
    if (!ready) return;
    if (mode === 'phone') {
      setViewMode('list');
      setListViewMode('cards');
    }
  }, [ready, mode]);

  useEffect(() => {
    if (!ready) return;
    if (prefersCardList('/livraisons', mode) && listViewMode === 'table') {
      setListViewMode('cards');
    }
  }, [ready, mode, listViewMode]);

  useEffect(() => {
    fetch('/api/logistics/carriers', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.carriers?.length) setCarriers(d.carriers);
      })
      .catch(() => { console.warn('[livraisons] fetch secondary failed'); });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const p = new URLSearchParams();
      if (debouncedSearch) p.set('search', debouncedSearch);
      if (filterStatut) p.set('statut', filterStatut);
      if (filterLivreur) p.set('livreur', filterLivreur);
      if (commandeId) p.set('commande', commandeId);
      if (showTrash) p.set('archived', '1');
      const r = await fetch(`/api/livraisons?${p}`, { credentials: 'include', cache: 'no-store' });
      if (r.ok) {
        setList(unwrapListItems(await r.json()));
      } else {
        setLoadError(true);
        uxToast.error('Impossible de charger les livraisons');
      }
    } catch {
      setLoadError(true);
      uxToast.error('Erreur réseau — livraisons');
    } finally { setLoading(false); }
  }, [debouncedSearch, filterStatut, filterLivreur, commandeId, showTrash, liveTick]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const statut = searchParams.get('statut');
    const livreur = searchParams.get('livreur');
    const mode = searchParams.get('mode');
    if (statut) setFilterStatut(statut);
    if (livreur) setFilterLivreur(livreur);
    if (mode === 'livreur') setLivreurMode(true);
  }, [searchParams]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) openDrawer('livraison', id);
  }, [searchParams, openDrawer]);

  const loadCmds = async () => {
    const r = await fetch('/api/commandes?paginated=1&pageSize=50');
    if (r.ok) setCmds(unwrapListItems(await r.json()));
  };

  const handleNew = async () => {
    if (saving) return;
    if (!nf.commandeId) return uxToast.error('Sélectionnez une commande');
    setSaving(true);
    try {
      const r = await fetch('/api/livraisons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...nf, colisCount: Number(nf.colisCount) }) });
      if (r.ok) { uxToast.success('Livraison créée'); setShowNew(false); setNf({ commandeId: '', adresseLiv: '', contactLiv: '', telLiv: '', livreur: '', datePrevue: '', colisCount: 1, notes: '' }); load(); }
      else { const err = await r.json().catch(() => ({})); uxToast.error(getApiErrorMessage(err, 'Erreur')); }
    } finally { setSaving(false); }
  };

  const updStatut = async (id: string, statut: string) => {
    if (statut === 'Livré') {
      const item = list.find((l: { id: string }) => l.id === id) || (sel?.id === id ? sel : null);
      setProofTarget({ id, numero: item?.numero });
      return;
    }
    const r = await fetch(`/api/livraisons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut }),
    });
    if (r.ok) {
      const u = await r.json();
      setSel(u);
      load();
      uxToast.success(`Statut: ${statut}`);
    } else {
      const err = await r.json().catch(() => ({}));
      uxToast.error(getApiErrorMessage(err, 'Mise à jour statut impossible'));
    }
  };

  const st = { total: list.length, prep: list.filter(l => l.statut === 'Préparation' || l.statut === 'Prêt').length, route: list.filter(l => l.statut === 'En livraison').length, livre: list.filter(l => l.statut === 'Livré').length };

  if (sel) return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <AppButton type="button" variant="ghost" size="icon" onClick={() => setSel(null)} aria-label="Retour">
          <ArrowLeft size={20} />
        </AppButton>
        <Truck size={24} className="text-primary" />
        <div><h3 className="font-display font-bold text-lg">{sel.numero}</h3>
          <p className="text-sm text-muted-foreground">{sel.commande?.article} • {sel.client?.name || sel.commande?.client?.name || 'Sans client'}</p></div>
        <div className="flex-1" />
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${SC[sel.statut] || ''}`}>{sel.statut}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-[7px] p-4 space-y-3">
          <h4 className="font-display font-bold">Détails livraison</h4>
          {sel.adresseLiv && <div className="flex items-start gap-2 text-sm"><MapPin size={14} className="mt-0.5 text-muted-foreground" /><span>{sel.adresseLiv}</span></div>}
          {sel.contactLiv && <div className="flex items-center gap-2 text-sm"><User size={14} className="text-muted-foreground" /><span>{sel.contactLiv}</span></div>}
          {sel.telLiv && <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-muted-foreground" /><span>{sel.telLiv}</span></div>}
          {sel.livreur && <div className="flex items-center gap-2 text-sm"><Truck size={14} className="text-muted-foreground" /><span>Livreur: {sel.livreur}</span></div>}
          <div className="flex items-center gap-2 text-sm"><Package size={14} className="text-muted-foreground" /><span>{sel.colisCount} colis{sel.poidsKg ? ` • ${sel.poidsKg} kg` : ''}</span></div>
          {sel.datePrevue && <div className="text-sm text-muted-foreground">Prévue: {new Date(sel.datePrevue).toLocaleDateString('fr-FR')}</div>}
          {sel.dateLivree && <div className="text-sm text-green-500">Livrée: {new Date(sel.dateLivree).toLocaleDateString('fr-FR')}</div>}
          {sel.proofPhotoUrl && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1"><Camera size={12} /> Preuve livraison</p>
              <a href={sel.proofPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{sel.proofPhotoUrl}</a>
              {sel.proofNote && <p className="text-xs text-muted-foreground mt-1">{sel.proofNote}</p>}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-[7px] p-4">
          <h4 className="font-display font-bold mb-3">Commande associée</h4>
          <div className="text-sm space-y-1">
            <div><span className="text-muted-foreground">N°:</span> <span className="font-mono">{sel.commande?.numero}</span></div>
            <div><span className="text-muted-foreground">Article:</span> {sel.commande?.article}</div>
            <div><span className="text-muted-foreground">Quantité:</span> {sel.commande?.qty}</div>
            <div><span className="text-muted-foreground">Total:</span> <span className="font-mono font-bold">{formatPrice(sel.commande?.total || 0)}</span></div>
          </div>
        </div>
      </div>
      {/* Status progression */}
      <div className="bg-card border border-border rounded-[7px] p-4">
        <h4 className="font-display font-bold mb-3">Progression</h4>
        <div className="flex items-center gap-2">
          {STATUTS.filter(s => s !== 'Retour').map((s, i) => {
            const idx = STATUTS.indexOf(sel.statut);
            const current = i <= idx;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${current ? 'bg-primary text-white' : 'bg-accent text-muted-foreground'}`}>{i + 1}</div>
                <span className={`text-xs hidden sm:inline ${current ? 'font-medium' : 'text-muted-foreground'}`}>{s}</span>
                {i < 3 && <div className={`flex-1 h-0.5 ${current ? 'bg-primary' : 'bg-accent'}`} />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {sel.statut === 'Préparation' && (
          <AppButton type="button" size="sm" variant="outline" onClick={() => updStatut(sel.id, 'Prêt')} className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20">
            Marquer prêt
          </AppButton>
        )}
        {sel.statut === 'Prêt' && (
          <AppButton type="button" size="sm" onClick={() => updStatut(sel.id, 'En livraison')} className={ACTION_INFO_CLASS}>
            Envoyer en livraison
          </AppButton>
        )}
        {sel.statut === 'En livraison' && (
          <>
            <p className="w-full text-xs text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-[7px] px-3 py-2">
              Preuve requise avant confirmation : photo, signature ou note de livraison. Sans preuve, le serveur refuse le statut Livré.
            </p>
            <AppButton
              type="button"
              size="sm"
              onClick={() => setProofTarget({ id: sel.id, numero: sel.numero })}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Confirmer livraison
            </AppButton>
          </>
        )}
        {sel.statut === 'Livré' && sel.commandeId && (
          <Link
            href={`/factures?commande=${encodeURIComponent(sel.commandeId)}`}
            className="btn btn-sm inline-flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-[7px] text-sm font-semibold"
          >
            <FileText size={14} />
            Générer / ouvrir la facture
          </Link>
        )}
        {sel.statut === 'Livré' && sel.commandeId && (
          <Link
            href={`/commandes/${sel.commandeId}`}
            className="btn btn-out btn-sm inline-flex items-center gap-1.5 px-3 py-2 rounded-[7px] text-sm border border-border"
          >
            Ouvrir le dossier commande
          </Link>
        )}
        {sel.statut !== 'Retour' && sel.statut !== 'Livré' && (
          <AppButton type="button" size="sm" variant="outline" onClick={() => updStatut(sel.id, 'Retour')} className="text-red-600 border-red-500/30 hover:bg-red-500/10">
            Retour
          </AppButton>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6 dashboard-full max-w-none">
      <OrionPageHeader
        title="Logistique & Livraisons"
        description="Dispatch TMS — tournées, livreurs, preuves de livraison"
        icon={Truck}
        actions={
          <div className="hidden md:flex gap-2 flex-wrap items-center">
            <EntityModuleDataBar entity="livraisons" trash={showTrash} onTrashChange={setShowTrash} />
            <AppButton type="button" variant={!livreurMode && viewMode === 'list' ? 'default' : 'outline'} size="sm"
              onClick={() => { setLivreurMode(false); setViewMode('list'); }}>
              <List size={16} /> Liste
            </AppButton>
            <label className="sr-only" htmlFor="livraisons-mode-extra">Modes secondaires</label>
            <select
              id="livraisons-mode-extra"
              className="h-8 rounded-[7px] border border-border bg-card px-2 text-xs font-semibold"
              value={livreurMode ? 'livreur' : viewMode === 'dispatch' ? 'dispatch' : ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'dispatch') { setLivreurMode(false); setViewMode('dispatch'); }
                else if (v === 'livreur') { setLivreurMode(true); }
                else { setLivreurMode(false); setViewMode('list'); }
              }}
              aria-label="Modes secondaires livraisons"
            >
              <option value="">Modes…</option>
              <option value="dispatch">Dispatch TMS</option>
              <option value="livreur">Vue livreur</option>
            </select>
            <AppButton type="button" size="sm" onClick={() => { setShowNew(true); loadCmds(); }}>
              <Plus size={16} /> Nouvelle livraison
            </AppButton>
          </div>
        }
      />
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      <FlowPageBanner
        entity="livraison"
        status={filterStatut || 'Préparation'}
        impactedModules={['Commandes', 'Logistique', 'Finance']}
      />
      <AppResponsiveKpiGrid columns={4} phoneMax={3}>
        <AppKpiCard label="Total" value={st.total} icon={Truck} color={ANS.red} />
        <AppKpiCard label="En préparation" value={st.prep} icon={Clock} color={ANS.yellow} />
        <AppKpiCard label="En route" value={st.route} icon={Package} color="#0F172A" />
        <AppKpiCard label="Livrées" value={st.livre} icon={CheckCircle2} color="#10B981" />
      </AppResponsiveKpiGrid>
      <div className="flex flex-col sm:flex-row gap-3">
        <AppSearchBar value={search} onChange={setSearch} placeholder="Rechercher livraison, client…" className="flex-1" />
        {viewMode === 'list' && !livreurMode && (
          <AppViewToggle
            value={listViewMode}
            onChange={setListViewMode}
            options={[
              { id: 'cards', label: 'Cartes', icon: List },
              { id: 'table', label: 'Tableau', icon: LayoutList },
            ]}
          />
        )}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterStatut('')} className={`px-3 py-2 rounded-[7px] text-xs font-medium transition ${!filterStatut ? 'bg-primary/10 text-primary' : 'bg-card border border-border text-muted-foreground'}`}>Tous</button>
          {STATUTS.map(s => <button key={s} onClick={() => setFilterStatut(s)} className={`px-3 py-2 rounded-[7px] text-xs font-medium transition ${filterStatut === s ? 'bg-primary/10 text-primary' : 'bg-card border border-border text-muted-foreground'}`}>{s}</button>)}
        </div>
      </div>
      {!livreurMode && <TourneePlanner onRefresh={load} />}
      <OrionErrorBoundary zone="livraisons">
      {loading ? <AppListSkeleton rows={4} /> : loadError ? (
        <OrionEmptyState
          icon={Truck}
          title="Chargement impossible"
          description="Vérifiez votre connexion et réessayez."
          action={<AppButton type="button" size="sm" onClick={() => load()}>Réessayer</AppButton>}
        />
      ) : livreurMode ? (
        <LivreurDeliveryView items={list} onRefresh={load} />
      ) : viewMode === 'dispatch' ? (
        <DispatchBoard
          items={list}
          onSelect={(l) => openDrawer('livraison', l.id)}
          onStatusChange={updStatut}
          onRequestDelivered={(l) => setProofTarget({ id: l.id, numero: l.numero })}
        />
      ) : list.length === 0 ? (
        <OrionEmptyState
          icon={Truck}
          title="Aucune livraison"
          description="Planifiez une livraison à partir d'une commande prête."
          action={
            <AppButton type="button" onClick={() => { setShowNew(true); loadCmds(); }}>
              <Plus size={16} /> Nouvelle livraison
            </AppButton>
          }
        />
      ) : listViewMode === 'table' ? (
        <OrionColumnTable
          data={list}
          rowKey={(l) => l.id}
          enableSorting
          onRowClick={(l) => openDrawer('livraison', l.id)}
          columns={[
            { id: 'numero', accessorKey: 'numero', enableSorting: true, header: 'N°', cell: (l) => <span className="font-mono text-sm">{l.numero}</span> },
            { id: 'statut', accessorKey: 'statut', enableSorting: true, header: 'Statut', cell: (l) => l.statut },
            { id: 'client', accessorFn: (l) => l.client?.name ?? l.commande?.client?.name ?? '', enableSorting: true, header: 'Client', cell: (l) => l.client?.name || l.commande?.client?.name || 'N/A' },
            { id: 'livreur', accessorKey: 'livreur', enableSorting: true, header: 'Livreur', cell: (l) => l.livreur || '—' },
            { id: 'colis', accessorKey: 'colisCount', enableSorting: true, header: 'Colis', cell: (l) => l.colisCount },
          ]}
        />
      ) : (
        <VirtualizedList
          items={list}
          rowKey={(l) => l.id}
          rowHeight={88}
          threshold={50}
          renderRow={(l: any) => (
            <div
              onClick={() => openDrawer('livraison', l.id)}
              className="bg-card border border-border rounded-[7px] p-4 hover:border-primary/30 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[7px] bg-primary/10 flex items-center justify-center"><Truck size={18} className="text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-mono font-bold text-sm">{l.numero}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${SC[l.statut] || ''}`}>{l.statut}</span></div>
                  <div className="text-sm text-muted-foreground truncate">{l.commande?.article} • {l.client?.name || l.commande?.client?.name || 'N/A'}{l.livreur ? ` • Livreur: ${l.livreur}` : ''}</div></div>
                <div className="text-right hidden sm:block">
                  {l.datePrevue && <div className="text-xs text-muted-foreground">Prévue: {new Date(l.datePrevue).toLocaleDateString('fr-FR')}</div>}
                  <div className="text-xs text-muted-foreground">{l.colisCount} colis</div></div>
                <ChevronRight size={16} className="text-muted-foreground hidden sm:block" />
              </div>
            </div>
          )}
        />
      )}
      </OrionErrorBoundary>
      <AppFormModal
        open={showNew}
        onOpenChange={setShowNew}
        title="Nouvelle livraison"
        maxWidthClass="max-w-md"
        footer={<AppFormModalFooter onCancel={() => setShowNew(false)} onSubmit={handleNew} submitLabel="Créer" loading={saving} />}
      >
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Commande *</label>
          <select value={nf.commandeId} onChange={e => setNf({ ...nf, commandeId: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm">
            <option value="">Sélectionner...</option>
            {cmds.map((c: any) => <option key={c.id} value={c.id}>{c.numero} — {c.article}</option>)}
          </select></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Adresse de livraison</label>
          <input value={nf.adresseLiv} onChange={e => setNf({ ...nf, adresseLiv: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Contact</label>
            <input value={nf.contactLiv} onChange={e => setNf({ ...nf, contactLiv: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Téléphone</label>
            <input value={nf.telLiv} onChange={e => setNf({ ...nf, telLiv: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm" /></div></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Transporteur / livreur</label>
            <select
              value={carriers.find((c) => c.label === nf.livreur)?.id ?? ''}
              onChange={(e) => {
                const carrier = carriers.find((c) => c.id === e.target.value);
                setNf({ ...nf, livreur: carrier?.label ?? nf.livreur });
              }}
              className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm mb-2"
            >
              <option value="">Choisir un transporteur…</option>
              {carriers.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <input
              value={nf.livreur}
              onChange={(e) => setNf({ ...nf, livreur: e.target.value })}
              placeholder="Ou saisie libre (chauffeur, n° suivi…)"
              className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm"
            /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Colis</label>
            <input type="number" value={nf.colisCount} onChange={e => setNf({ ...nf, colisCount: Number(e.target.value) })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm" min={1} /></div></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Date prévue</label>
          <input type="date" value={nf.datePrevue} onChange={e => setNf({ ...nf, datePrevue: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm" /></div>
      </AppFormModal>
      <DeliveryProofModal
        open={Boolean(proofTarget)}
        livraisonId={proofTarget?.id ?? ''}
        numero={proofTarget?.numero}
        onClose={() => setProofTarget(null)}
        onConfirmed={(u) => {
          setSel(u);
          load();
        }}
      />
      <AppStickyActionBar>
        <AppButton type="button" onClick={() => { setShowNew(true); loadCmds(); }}>
          <Plus size={16} className="mr-1.5" /> Nouvelle
        </AppButton>
        <AppButton
          type="button"
          variant={livreurMode ? 'default' : 'outline'}
          onClick={() => setLivreurMode(!livreurMode)}
        >
          <Smartphone size={16} className="mr-1.5" /> {livreurMode ? 'Dispatch' : 'Livreur'}
        </AppButton>
      </AppStickyActionBar>
    </div>
  );
}
