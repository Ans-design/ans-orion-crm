'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData, unwrapListItems, getApiErrorMessage } from '@/lib/api-client';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  AppListSkeleton,
  AppButton, AppKpiCard, AppFormModal, AppFormModalFooter, AppResponsiveKpiGrid, AppStickyActionBar,
} from '@/components/ui/app-ui';
import { OrionPageHeader, OrionEmptyState } from '@/components/orion';
import {
  ProductionTableToolbar,
  PRODUCTION_STATUTS,
  type ProductionFilterChip,
  type ProductionSortId,
} from '@/components/production/ProductionTableToolbar';
import '@/components/backoffice-v2/ui/admin-table.css';
import { COLUMN_PATTERNS, matchEtape, type AtelierColumnKey } from '@/lib/production/atelier-columns';
import {
  Factory, Plus, ChevronRight, CheckCircle2, AlertTriangle,
  Play, SkipForward, X, User, Cpu, ArrowLeft, RefreshCw, LayoutGrid, List, CalendarDays, GitBranch, Columns3, Clock,
} from 'lucide-react';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';
import { VirtualizedList } from '@/components/ui/virtualized-list';
import { OrionErrorBoundary } from '@/components/shared/orion-error-boundary';
import { ANS } from '@/lib/ans-colors';
import { statusBadgeClass, ACTION_INFO_CLASS } from '@/lib/ui/status-styles';
import { useResponsiveMode } from '@/lib/responsive/use-responsive-mode';

const ProductionKanban = dynamic(
  () => import('@/components/production-kanban').then((m) => m.ProductionKanban),
  { ssr: false, loading: () => <AppListSkeleton rows={4} /> },
);
const ProductionWorkflowKanban = dynamic(
  () => import('@/components/production-workflow-kanban').then((m) => m.ProductionWorkflowKanban),
  { ssr: false, loading: () => <AppListSkeleton rows={4} /> },
);
const ProductionAtelierKanban = dynamic(
  () => import('@/components/production-atelier-kanban').then((m) => m.ProductionAtelierKanban),
  { ssr: false, loading: () => <AppListSkeleton rows={4} /> },
);
const ProductionCalendar = dynamic(
  () => import('@/components/production-calendar').then((m) => m.ProductionCalendar),
  { ssr: false, loading: () => <AppListSkeleton rows={4} /> },
);

const STATUTS = [...PRODUCTION_STATUTS];
const SC: Record<string, string> = {
  'En attente': statusBadgeClass('En attente'),
  'En cours': statusBadgeClass('En cours'),
  'Terminé': statusBadgeClass('Terminé'),
  'Bloqué': statusBadgeClass('Bloqué'),
};
const EI: Record<string, string> = {
  'À faire': 'text-muted-foreground',
  'En cours': 'text-[var(--primary)]',
  'Terminé': 'text-green-500',
  'Sauté': 'text-orange-400',
};

export default function ProductionPageWrapper() {
  return (
    <Suspense fallback={<AppListSkeleton rows={5} />}>
      <ProductionPage />
    </Suspense>
  );
}

function ProductionPage() {
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState<ProductionFilterChip>('all');
  const [sort, setSort] = useState<ProductionSortId>('date-desc');
  const debouncedSearch = useDebounce(search, 300);
  const [sel, setSel] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cmds, setCmds] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'workflow' | 'atelier' | 'calendar'>('atelier');
  const [nf, setNf] = useState({ commandeId: '', priorite: 'Normal', operateur: '', machine: '' });
  const { mode, ready } = useResponsiveMode();

  useEffect(() => {
    if (!ready) return;
    if (mode === 'phone' && viewMode !== 'list') {
      setViewMode('list');
    }
  }, [ready, mode, viewMode]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const p = new URLSearchParams();
      if (debouncedSearch.trim()) p.set('search', debouncedSearch.trim());
      if (activeChip !== 'all') p.set('statut', activeChip);
      if (commandeId) p.set('commande', commandeId);
      const r = await fetch(`/api/productions?${p}`);
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        const msg = getApiErrorMessage(json, `Erreur chargement production (${r.status})`);
        setLoadError(msg);
        uxToast.error(msg);
        return;
      }
      setList(unwrapListItems(await r.json()));
    } catch {
      const msg = 'Réseau indisponible — impossible de charger la production';
      setLoadError(msg);
      uxToast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeChip, commandeId]);

  const displayList = useMemo(() => {
    const items = [...list];
    switch (sort) {
      case 'priority':
        items.sort((a, b) => {
          const rank = (p: string) => (p === 'Urgent' ? 0 : p === 'Haute' ? 1 : 2);
          return rank(a.priorite ?? '') - rank(b.priorite ?? '');
        });
        break;
      case 'client-asc':
        items.sort((a, b) => (a.clientNom ?? '').localeCompare(b.clientNom ?? '', 'fr'));
        break;
      default:
        break;
    }
    return items;
  }, [list, sort]);

  useEffect(() => { load(); }, [load]);

  const loadCmds = async () => {
    const r = await fetch('/api/commandes?paginated=1&pageSize=50');
    if (r.ok) setCmds(unwrapListItems(await r.json()));
  };

  const handleNew = async () => {
    if (saving) return;
    if (!nf.commandeId) return uxToast.error('Sélectionnez une commande');
    setSaving(true);
    try {
      const r = await fetch('/api/productions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nf) });
      if (r.ok) { uxToast.success('Ordre créé'); setShowNew(false); setNf({ commandeId: '', priorite: 'Normal', operateur: '', machine: '' }); load(); }
      else { const err = await r.json().catch(() => ({})); uxToast.error(getApiErrorMessage(err, 'Erreur')); }
    } finally { setSaving(false); }
  };

  const openDetail = async (p: { id: string }) => {
    try {
      const r = await fetch(`/api/productions/${p.id}`);
      if (r.ok) setSel(await r.json());
      else { uxToast.error('Impossible de charger le détail'); setSel(p); }
    } catch { setSel(p); }
  };

  const updEtape = async (pid: string, eid: string, statut: string) => {
    const r = await fetch(`/api/productions/${pid}/etapes`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ etapeId: eid, statut }) });
    if (r.ok) { setSel(await r.json()); load(); uxToast.success(`Étape: ${statut}`); }
  };

  const moveKanban = async (id: string, statut: string) => {
    const r = await fetch(`/api/productions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut }) });
    if (r.ok) { load(); uxToast.success(`Statut → ${statut}`); }
    else uxToast.error('Transition impossible');
  };

  const moveAtelier = async (id: string, column: AtelierColumnKey) => {
    try {
      const r = await fetch(`/api/productions/${id}`);
      if (!r.ok) return uxToast.error('Ordre introuvable');
      const prod = await r.json();
      const etapes = [...(prod.etapes ?? [])].sort((a: { ordre: number }, b: { ordre: number }) => a.ordre - b.ordre);

      const updEtapeSilent = async (etapeId: string, statut: string) => {
        await fetch(`/api/productions/${id}/etapes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ etapeId, statut }),
        });
      };

      if (column === 'bloque') {
        await moveKanban(id, 'Bloqué');
        return;
      }
      if (column === 'nouvelle') {
        await moveKanban(id, 'En attente');
        return;
      }
      if (column === 'livre') {
        for (const e of etapes) {
          if (e.statut !== 'Terminé' && e.statut !== 'Sauté') {
            await updEtapeSilent(e.id, 'Terminé');
          }
        }
        load();
        uxToast.success('Ordre marqué livré');
        return;
      }

      const target = etapes.find((e: { nom: string }) => matchEtape(e.nom, COLUMN_PATTERNS[column]));
      if (!target) return uxToast.error('Étape correspondante introuvable');

      for (const e of etapes) {
        if (e.ordre < target.ordre && e.statut !== 'Terminé' && e.statut !== 'Sauté') {
          await updEtapeSilent(e.id, 'Terminé');
        }
      }
      await updEtapeSilent(target.id, 'En cours');
      if (prod.statut === 'En attente' || prod.statut === 'Bloqué') {
        await fetch(`/api/productions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: 'En cours' }) });
      }
      load();
      uxToast.success(`Déplacé → ${column.replace('_', ' ')}`);
    } catch {
      uxToast.error('Erreur déplacement atelier');
    }
  };

  const updProd = async (id: string, data: Record<string, unknown>) => {
    const r = await fetch(`/api/productions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (r.ok) { setSel(await r.json()); load(); uxToast.success('Mis à jour'); }
  };

  const st = { total: displayList.length, enc: displayList.filter(p => p.statut === 'En cours').length, att: displayList.filter(p => p.statut === 'En attente').length, done: displayList.filter(p => p.statut === 'Terminé').length };

  if (sel) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AppButton type="button" variant="ghost" size="icon" onClick={() => setSel(null)} aria-label="Retour à la liste">
          <ArrowLeft size={20} />
        </AppButton>
        <Factory size={24} style={{ color: ANS.yellow }} />
        <div><h3 className="font-display font-bold text-lg">Production — {sel.commande?.numero}</h3>
          <p className="text-sm text-muted-foreground">{sel.commande?.article} • {sel.commande?.client?.name || 'Sans client'}</p></div>
        <div className="flex-1" />
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${SC[sel.statut] || ''}`}>{sel.statut}</span>
      </div>
      <div className="bg-card border border-border rounded-[7px] p-4">
        <div className="flex justify-between text-sm mb-2"><span className="font-medium">Avancement global</span><span className="font-mono font-bold text-[var(--primary,#FF174D)]">{sel.avancement}%</span></div>
        <div className="h-3 bg-accent rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-[width] duration-300" style={{ width: `${sel.avancement}%` }} /></div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          {sel.operateur && <span className="flex items-center gap-1"><User size={12} /> {sel.operateur}</span>}
          {sel.machine && <span className="flex items-center gap-1"><Cpu size={12} /> {sel.machine}</span>}
          <span>Priorité: <strong>{sel.priorite}</strong></span>
        </div>
      </div>
      <div className="bg-card border border-border rounded-[7px] p-4">
        <h4 className="font-display font-bold mb-4">Étapes de production</h4>
        <div className="space-y-3">
          {sel.etapes?.map((e: any) => (
            <div key={e.id} className={`flex items-center gap-3 p-3 rounded-[7px] border transition-all ${e.statut === 'En cours' ? 'border-primary bg-primary/5' : e.statut === 'Terminé' ? 'border-green-500/30 bg-green-500/5' : e.statut === 'Sauté' ? 'border-border bg-accent/50 opacity-60' : 'border-border'}`}>
              <span className={`text-xs font-semibold uppercase tracking-wide ${EI[e.statut] || 'text-muted-foreground'}`}>{e.statut}</span>
              <div className="flex-1"><div className="font-medium text-sm">{e.nom}</div>
                <div className="text-xs text-muted-foreground">{e.operateur && `Op: ${e.operateur} • `}{e.statut}</div></div>
              <div className="flex gap-1">
                {e.statut === 'À faire' && <AppButton type="button" variant="ghost" size="icon" onClick={() => updEtape(sel.id, e.id, 'En cours')} className={ACTION_INFO_CLASS} title="Démarrer"><Play size={14} /></AppButton>}
                {e.statut === 'En cours' && <AppButton type="button" variant="ghost" size="icon" onClick={() => updEtape(sel.id, e.id, 'Terminé')} className="text-green-500 hover:bg-green-500/10" title="Terminer"><CheckCircle2 size={14} /></AppButton>}
                {(e.statut === 'À faire' || e.statut === 'En cours') && <AppButton type="button" variant="ghost" size="icon" onClick={() => updEtape(sel.id, e.id, 'Sauté')} title="Sauter"><SkipForward size={14} /></AppButton>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {sel.statut !== 'Terminé' && sel.statut !== 'Bloqué' && (
          <AppButton type="button" variant="outline" onClick={() => updProd(sel.id, { statut: 'Bloqué' })} className="text-red-500 border-red-500/30 hover:bg-red-500/10">
            <AlertTriangle size={14} /> Bloquer
          </AppButton>
        )}
        {sel.statut === 'Bloqué' && (
          <AppButton type="button" variant="outline" onClick={() => updProd(sel.id, { statut: 'En cours' })} className={ACTION_INFO_CLASS}>
            <RefreshCw size={14} /> Reprendre
          </AppButton>
        )}
      </div>
    </div>
  );

  return (
    <div className="orion-page">
      <OrionPageHeader
        icon={Factory}
        title="Production & Atelier"
        description="Suivi de production en temps réel"
        actions={
          <AppButton type="button" className="hidden md:inline-flex" onClick={() => { setShowNew(true); loadCmds(); }}>
            <Plus size={16} /> Nouvel ordre
          </AppButton>
        }
      />
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      <FlowPageBanner
        entity="production"
        status={
          st.enc > 0 ? 'En cours'
          : st.att > 0 ? 'En attente'
          : st.done > 0 ? 'Terminé'
          : 'À planifier'
        }
        impactedModules={['Commandes', 'Stock', 'Qualité', 'Livraisons']}
      />
      <AppResponsiveKpiGrid columns={4} phoneMax={3}>
        <AppKpiCard label="Total" value={st.total} icon={Factory} tone="brand" />
        <AppKpiCard label="En cours" value={st.enc} icon={Play} color="#0F172A" />
        <AppKpiCard label="En attente" value={st.att} icon={Clock} color={ANS.yellow} />
        <AppKpiCard label="Terminés" value={st.done} icon={CheckCircle2} color="#10B981" />
      </AppResponsiveKpiGrid>
      <ProductionTableToolbar
        count={displayList.length}
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        activeChip={activeChip}
        onChipChange={setActiveChip}
      />
      <div className="flex gap-2 flex-wrap justify-end">
        <AppButton type="button" variant={viewMode === 'atelier' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('atelier')} aria-label="Vue atelier 10 colonnes"><Columns3 size={16} /></AppButton>
        <AppButton type="button" variant={viewMode === 'kanban' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('kanban')} aria-label="Vue Kanban statut"><LayoutGrid size={16} /></AppButton>
        <AppButton type="button" variant={viewMode === 'workflow' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('workflow')} aria-label="Vue workflow atelier"><GitBranch size={16} /></AppButton>
        <AppButton type="button" variant={viewMode === 'calendar' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('calendar')} aria-label="Calendrier"><CalendarDays size={16} /></AppButton>
        <AppButton type="button" variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')} aria-label="Vue liste"><List size={16} /></AppButton>
      </div>
      <OrionErrorBoundary zone="production">
      {loading ? <AppListSkeleton rows={4} /> : loadError ? (
        <OrionEmptyState
          icon={Factory}
          title="Impossible de charger la production"
          description={loadError}
          action={
            <AppButton type="button" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw size={16} /> Réessayer
            </AppButton>
          }
        />
      ) : displayList.length === 0 ? (
        <OrionEmptyState
          icon={Factory}
          title="Aucun ordre de production"
          description="Créez un ordre à partir d'une commande validée."
          action={
            <AppButton type="button" onClick={() => { setShowNew(true); loadCmds(); }}>
              <Plus size={16} /> Nouvel ordre
            </AppButton>
          }
        />
      ) : viewMode === 'calendar' ? (
        <ProductionCalendar />
      ) : viewMode === 'atelier' ? (
        <ProductionAtelierKanban items={displayList} onSelect={openDetail} onMove={moveAtelier} />
      ) : viewMode === 'workflow' ? (
        <ProductionWorkflowKanban items={displayList} onSelect={openDetail} />
      ) : viewMode === 'kanban' ? (
        <ProductionKanban items={displayList} onSelect={openDetail} onMove={moveKanban} />
      ) : (
        <VirtualizedList
          items={displayList}
          rowKey={(p) => p.id}
          rowHeight={88}
          threshold={50}
          renderRow={(p: any) => (
            <div
              onClick={() => openDetail(p)}
              className="bg-card border border-border rounded-[7px] p-4 hover:border-[color-mix(in_srgb,var(--primary)_30%,transparent)] transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[7px] bg-primary/10 flex items-center justify-center"><Factory size={18} style={{ color: ANS.yellow }} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-mono font-bold text-sm">{p.commande?.numero}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${SC[p.statut] || ''}`}>{p.statut}</span></div>
                  <div className="text-sm text-muted-foreground truncate">{p.commande?.article} • {p.commande?.client?.name || 'N/A'}</div></div>
                <div className="hidden sm:flex items-center gap-3">
                  <div className="w-24"><div className="h-2 bg-accent rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full" style={{ width: `${p.avancement}%` }} /></div>
                    <div className="text-[10px] text-muted-foreground text-right mt-0.5 font-mono">{p.avancement}%</div></div>
                  <ChevronRight size={16} className="text-muted-foreground" /></div>
              </div>
            </div>
          )}
        />
      )}
      </OrionErrorBoundary>
      <AppFormModal
        open={showNew}
        onOpenChange={setShowNew}
        title="Nouvel ordre de production"
        footer={<AppFormModalFooter onCancel={() => setShowNew(false)} onSubmit={handleNew} submitLabel="Créer l'ordre" loading={saving} />}
      >
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Commande *</label>
          <select value={nf.commandeId} onChange={e => setNf({ ...nf, commandeId: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm">
            <option value="">Sélectionner...</option>
            {cmds.filter((c: any) => c.statut !== 'Terminée' && c.statut !== 'Livrée').map((c: any) => <option key={c.id} value={c.id}>{c.numero} — {c.article}</option>)}
          </select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Priorité</label>
            <select value={nf.priorite} onChange={e => setNf({ ...nf, priorite: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm">
              {['Urgent', 'Haute', 'Normal', 'Basse'].map(p => <option key={p}>{p}</option>)}</select></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Opérateur</label>
            <input value={nf.operateur} onChange={e => setNf({ ...nf, operateur: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm" placeholder="Nom" /></div></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Machine</label>
          <input value={nf.machine} onChange={e => setNf({ ...nf, machine: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm" placeholder="Machine assignée" /></div>
      </AppFormModal>
      <AppStickyActionBar>
        <AppButton type="button" onClick={() => { setShowNew(true); loadCmds(); }}>
          <Plus size={16} className="mr-1.5" /> Nouvel ordre
        </AppButton>
        <AppButton type="button" variant="outline" onClick={() => setViewMode('list')}>
          <List size={16} className="mr-1.5" /> Liste
        </AppButton>
      </AppStickyActionBar>
    </div>
  );
}
