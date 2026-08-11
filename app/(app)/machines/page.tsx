'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData } from '@/lib/api-client';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  AppListSkeleton, AppSearchBar, AppButton, AppKpiCard,
  EntityModuleDataBar, EntityListPageShell,
} from '@/components/ui/app-ui';
import { OrionEmptyState } from '@/components/orion';
import { OrionErrorBoundary } from '@/components/shared/orion-error-boundary';
import { OrionPanelDrawer } from '@/components/ui/orion-panel-drawer';
import {
  Cpu, RefreshCw, AlertTriangle, CheckCircle2, Wrench, PauseCircle, XCircle, Settings2, Plus, Trash2,
} from 'lucide-react';
import { parseMachineNotes, serializeMachineNotes, type MachineGpaoMeta, type ConsumableEntry, type InterventionEntry } from '@/lib/gpao-meta';
import {
  resolveConsumableLevel,
  consumFillTone,
  utilFillTone,
} from '@/lib/machines/consumable-level';
import { statusBadgeClass } from '@/lib/ui/status-styles';
import { ANS } from '@/lib/ans-colors';
import { useCanViewMargin } from '@/hooks/use-can-view-margin';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';

type Machine = {
  id: string;
  code: string;
  name: string;
  category: string;
  status: string;
  utilization: number;
  nextMaintenance: string | null;
  notes: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  ok: 'Disponible',
  running: 'En production',
  waiting: 'En attente',
  maintenance: 'Maintenance',
  down: 'Hors service',
};

const STATUS_STYLE: Record<string, string> = {
  ok: 'bg-green-500/10 text-green-600',
  running: statusBadgeClass('running'),
  waiting: 'bg-yellow-500/10 text-yellow-600',
  maintenance: 'bg-amber-500/10 text-amber-600',
  down: 'bg-red-500/10 text-red-600',
};

const CATEGORY_LABEL: Record<string, string> = {
  impression: 'Impression',
  finition: 'Finition',
  decoupe: 'Découpe',
};

const MACHINE_TABS = [
  { id: 'infos' as const, label: 'Infos' },
  { id: 'technique' as const, label: 'Technique' },
  { id: 'consommables' as const, label: 'Consommables' },
  { id: 'intervention' as const, label: 'Intervention' },
  { id: 'finance' as const, label: 'Finance' },
];

function StatusIcon({ status }: { status: string }) {
  if (status === 'running') return <Cpu size={16} className="text-[var(--primary)]" />;
  if (status === 'maintenance') return <Wrench size={16} className="text-amber-500" />;
  if (status === 'down') return <XCircle size={16} className="text-red-500" />;
  if (status === 'waiting') return <PauseCircle size={16} className="text-yellow-500" />;
  return <CheckCircle2 size={16} className="text-green-500" />;
}

export default function MachinesPageWrapper() {
  return (
    <Suspense fallback={<AppListSkeleton rows={4} />}>
      <MachinesPage />
    </Suspense>
  );
}

function MachinesPage() {
  const searchParams = useSearchParams();
  const canViewFinance = useCanViewMargin();
  const [list, setList] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selected, setSelected] = useState<Machine | null>(null);
  const [tab, setTab] = useState<'infos' | 'technique' | 'consommables' | 'intervention' | 'finance'>('infos');
  const [editForm, setEditForm] = useState<Partial<Machine>>({});
  const [gpaoMeta, setGpaoMeta] = useState<MachineGpaoMeta>({ consumables: [], interventions: [], finance: {} });
  const [saving, setSaving] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const liveTick = useOrionLiveRevision(['machines', 'production'], { debounceMs: 400 });

  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setFilterStatus(s);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (debouncedSearch) p.set('search', debouncedSearch);
      if (filterStatus) p.set('status', filterStatus);
      if (filterCategory) p.set('category', filterCategory);
      if (showTrash) p.set('archived', '1');
      const r = await fetch(`/api/machines?${p}`);
      if (r.ok) setList(unwrapApiData<Machine[]>(await r.json()));
    } catch {
      uxToast.error('Erreur chargement machines');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStatus, filterCategory, showTrash, liveTick]);

  useEffect(() => { load(); }, [load]);

  const openMachine = async (m: Machine) => {
    setSelected(m);
    setTab('infos');
    setEditForm(m);
    try {
      const r = await fetch(`/api/machines/${m.id}`);
      if (r.ok) {
        const full = await r.json();
        setEditForm(full);
        setSelected(full);
        setGpaoMeta(parseMachineNotes(full.notes));
      }
    } catch { /* keep list data */ }
  };

  const saveMachine = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/machines/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          status: editForm.status,
          utilization: editForm.utilization,
          notes: serializeMachineNotes({ ...gpaoMeta, userNotes: gpaoMeta.userNotes }),
          category: editForm.category,
        }),
      });
      if (r.ok) {
        uxToast.success('Machine mise à jour');
        setSelected(null);
        load();
      } else uxToast.error('Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const addConsumable = () => {
    setGpaoMeta((m) => ({ ...m, consumables: [...m.consumables, { name: '', qty: '' }] }));
  };
  const updateConsumable = (idx: number, patch: Partial<ConsumableEntry>) => {
    setGpaoMeta((m) => ({
      ...m,
      consumables: m.consumables.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  };
  const removeConsumable = (idx: number) => {
    setGpaoMeta((m) => ({ ...m, consumables: m.consumables.filter((_, i) => i !== idx) }));
  };
  const addIntervention = () => {
    setGpaoMeta((m) => ({
      ...m,
      interventions: [...m.interventions, { date: new Date().toISOString().slice(0, 10), type: 'Préventive', description: '' }],
    }));
  };
  const updateIntervention = (idx: number, patch: Partial<InterventionEntry>) => {
    setGpaoMeta((m) => ({
      ...m,
      interventions: m.interventions.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  };
  const removeIntervention = (idx: number) => {
    setGpaoMeta((m) => ({ ...m, interventions: m.interventions.filter((_, i) => i !== idx) }));
  };

  const stats = {
    total: list.length,
    running: list.filter((m) => m.status === 'running').length,
    alert: list.filter((m) => m.status === 'down' || m.status === 'maintenance').length,
    avgUtil: list.length ? Math.round(list.reduce((s, m) => s + m.utilization, 0) / list.length) : 0,
  };

  return (
    <EntityListPageShell
      title="Machines de production"
      description={`${stats.total} machines atelier · ${stats.running} en production · charge moy. ${stats.avgUtil}%`}
      icon={Cpu}
      actions={
          <div className="flex flex-wrap gap-2 items-center">
            <EntityModuleDataBar entity="machines" trash={showTrash} onTrashChange={setShowTrash} onAfterImport={load} />
            <AppButton type="button" variant="outline" size="sm" onClick={load} className="gap-2">
              <RefreshCw size={14} /> Actualiser
            </AppButton>
          </div>
      }
    >
      {stats.alert > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[7px] border border-amber-500/30 bg-amber-500/10 text-sm">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">{stats.alert} alerte(s) machine</span>
            <span className="hidden sm:inline">
              {stats.alert} machine(s) en maintenance ou hors service — voir alertes cockpit.
            </span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AppKpiCard label="Équipements" value={stats.total} icon={Cpu} color={ANS.red} />
        <AppKpiCard label="En production" value={stats.running} icon={CheckCircle2} color="#0F172A" />
        <AppKpiCard label="Alertes" value={stats.alert} icon={AlertTriangle} color="#EF4444" />
        <AppKpiCard label="Charge moy." value={stats.avgUtil} icon={Settings2} color="#10B981" hint="%" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <AppSearchBar value={search} onChange={setSearch} placeholder="Rechercher machine, code…" className="flex-1" />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-card border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none"
        >
          <option value="">Toutes catégories</option>
          <option value="impression">Impression</option>
          <option value="finition">Finition</option>
          <option value="decoupe">Découpe</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-card border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none"
        >
          <option value="">Tous statuts</option>
          <option value="running">En production</option>
          <option value="ok">Disponible</option>
          <option value="maintenance">Maintenance</option>
          <option value="down">Hors service</option>
          <option value="waiting">En attente</option>
        </select>
      </div>

      <OrionErrorBoundary zone="machines">
      {loading ? (
        <AppListSkeleton rows={5} />
      ) : list.length === 0 ? (
        <OrionEmptyState
          icon={Cpu}
          title="Aucune machine enregistrée"
          description="Le parc machines apparaîtra ici après seed ou saisie manuelle."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((m) => {
            const meta = parseMachineNotes(m.notes);
            const utilTone = utilFillTone(m.utilization);
            return (
            <button
              key={m.id}
              type="button"
              onClick={() => openMachine(m)}
              className="mach-card bg-card border border-border p-4 text-left w-full"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[7px] bg-primary/10 flex items-center justify-center">
                    <StatusIcon status={m.status} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{m.name}</h3>
                    <p className="text-[10px] font-mono text-muted-foreground">{m.code}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[7px] ${STATUS_STYLE[m.status] ?? STATUS_STYLE.ok}`}>
                  {STATUS_LABEL[m.status] ?? m.status}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{CATEGORY_LABEL[m.category] ?? m.category}</span>
                  <span className="font-mono">{m.utilization}%</span>
                </div>
                <p className="mach-util-label">Taux d&apos;utilisation</p>
                <div className="consum-bar consum-bar--lg">
                  <div
                    className={`consum-fill consum-fill--${utilTone}`}
                    style={{ width: `${Math.max(0, Math.min(100, m.utilization))}%` }}
                  />
                </div>
                {meta.consumables.slice(0, 2).map((c, idx) => {
                  const level = resolveConsumableLevel(c);
                  if (!level) return null;
                  const tone = consumFillTone(level.pct);
                  return (
                    <div key={`${c.name}-${idx}`}>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span className="truncate font-semibold">{c.name || 'Consommable'}</span>
                        <span>{level.pct}% restant</span>
                      </div>
                      <div className="consum-bar">
                        <div className={`consum-fill consum-fill--${tone}`} style={{ width: `${level.pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {m.nextMaintenance && (
                  <p className="text-[11px] text-muted-foreground">
                    Prochaine maintenance : {new Date(m.nextMaintenance).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {meta.userNotes && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 line-clamp-2">{meta.userNotes}</p>
                )}
              </div>
            </button>
            );
          })}
        </div>
      )}
      </OrionErrorBoundary>

      <OrionPanelDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={editForm.name ?? 'Équipement'}
        subtitle={editForm.code ? `MACHINE · ${editForm.code}` : 'Fiche équipement'}
        footer={
          <>
            <AppButton type="button" variant="outline" className="flex-1" onClick={() => setSelected(null)}>Fermer</AppButton>
            <AppButton type="button" className="flex-1" disabled={saving} onClick={saveMachine}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </AppButton>
          </>
        }
      >
          <div className="mach-tab-nav" role="tablist" aria-label="Fiche machine">
            {MACHINE_TABS.filter((t) => t.id !== 'finance' || canViewFinance).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`mach-tab-btn${tab === t.id ? ' on' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'infos' && (
            <div className="space-y-3 text-sm">
              <label className="block text-xs font-bold">Nom<input className="fc mt-1" value={editForm.name ?? ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></label>
              <label className="block text-xs font-bold">Code<input className="fc mt-1 font-mono" readOnly value={editForm.code ?? ''} /></label>
              <label className="block text-xs font-bold">Statut
                <select className="fc mt-1" value={editForm.status ?? 'ok'} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold">Notes libres<textarea className="fc mt-1 min-h-[60px]" value={gpaoMeta.userNotes ?? ''} onChange={(e) => setGpaoMeta({ ...gpaoMeta, userNotes: e.target.value })} /></label>
            </div>
          )}
          {tab === 'technique' && (
            <div className="space-y-3 text-sm">
              <label className="block text-xs font-bold">Utilisation (%)
                <input type="number" min={0} max={100} className="fc mt-1" value={editForm.utilization ?? 0} onChange={(e) => setEditForm({ ...editForm, utilization: Number(e.target.value) })} />
              </label>
              <p className="mach-util-label">Aperçu charge</p>
              <div className="consum-bar consum-bar--lg">
                <div
                  className={`consum-fill consum-fill--${utilFillTone(editForm.utilization ?? 0)}`}
                  style={{ width: `${Math.max(0, Math.min(100, editForm.utilization ?? 0))}%` }}
                />
              </div>
              <p className="text-xs font-bold tabular-nums">{editForm.utilization ?? 0}%</p>
              <p className="text-xs text-muted-foreground">Prochaine maintenance : {editForm.nextMaintenance ? new Date(editForm.nextMaintenance).toLocaleDateString('fr-FR') : '—'}</p>
            </div>
          )}
          {tab === 'consommables' && (
            <div className="space-y-3 text-sm">
              {gpaoMeta.consumables.map((c, i) => {
                const level = resolveConsumableLevel(c);
                const tone = level ? consumFillTone(level.pct) : 'ok';
                return (
                  <div key={i} className="border border-border rounded-[7px] p-3 space-y-2">
                    <div className="flex gap-2 items-end">
                      <label className="flex-1 text-xs font-bold">Produit<input className="fc mt-1" value={c.name} onChange={(e) => updateConsumable(i, { name: e.target.value })} placeholder="Encre cyan, chiffons…" /></label>
                      <label className="w-20 text-xs font-bold">Qté<input className="fc mt-1" value={c.qty} onChange={(e) => updateConsumable(i, { qty: e.target.value })} placeholder="7/10" /></label>
                      <button type="button" onClick={() => removeConsumable(i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-[7px]"><Trash2 size={14} /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-xs font-bold">Utilisé<input type="number" min={0} className="fc mt-1" value={c.used ?? ''} onChange={(e) => updateConsumable(i, { used: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
                      <label className="text-xs font-bold">Capacité<input type="number" min={0} className="fc mt-1" value={c.capacity ?? ''} onChange={(e) => updateConsumable(i, { capacity: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
                      <label className="text-xs font-bold">Unité<input className="fc mt-1" value={c.unit ?? ''} onChange={(e) => updateConsumable(i, { unit: e.target.value })} placeholder="L, pcs…" /></label>
                    </div>
                    {level ? (
                      <div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                          <span>Vie restante estimée</span>
                          <span>{level.label} · {level.pct}%</span>
                        </div>
                        <div className="consum-bar consum-bar--lg">
                          <div className={`consum-fill consum-fill--${tone}`} style={{ width: `${level.pct}%` }} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Indiquez utilisé / capacité (ou Qté « 7/10 ») pour la barre de niveau.</p>
                    )}
                  </div>
                );
              })}
              <AppButton type="button" variant="outline" size="sm" className="w-full gap-1" onClick={addConsumable}><Plus size={14} /> Ajouter consommable</AppButton>
            </div>
          )}
          {tab === 'intervention' && (
            <div className="space-y-3 text-sm">
              {gpaoMeta.interventions.map((iv, i) => (
                <div key={i} className="border border-border rounded-[7px] p-2 space-y-2">
                  <div className="flex gap-2">
                    <label className="text-xs font-bold flex-1">Date<input type="date" className="fc mt-1" value={iv.date} onChange={(e) => updateIntervention(i, { date: e.target.value })} /></label>
                    <label className="text-xs font-bold flex-1">Type
                      <select className="fc mt-1" value={iv.type} onChange={(e) => updateIntervention(i, { type: e.target.value })}>
                        {['Préventive', 'Corrective', 'Urgente', 'Réglage'].map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </label>
                    <button type="button" onClick={() => removeIntervention(i)} className="p-2 text-red-500 self-end rounded-[7px]"><Trash2 size={14} /></button>
                  </div>
                  <label className="block text-xs font-bold">Description<textarea className="fc mt-1 min-h-[40px]" value={iv.description} onChange={(e) => updateIntervention(i, { description: e.target.value })} /></label>
                  <label className="block text-xs font-bold">Coût MGA<input type="number" className="fc mt-1" value={iv.costMGA ?? ''} onChange={(e) => updateIntervention(i, { costMGA: Number(e.target.value) })} /></label>
                </div>
              ))}
              <AppButton type="button" variant="outline" size="sm" className="w-full gap-1" onClick={addIntervention}><Plus size={14} /> Nouvelle intervention</AppButton>
            </div>
          )}
          {tab === 'finance' && canViewFinance && (
            <div className="space-y-3 text-sm">
              <label className="block text-xs font-bold">Coût mensuel MGA
                <input type="number" className="fc mt-1" value={gpaoMeta.finance.monthlyCostMGA ?? ''} onChange={(e) => setGpaoMeta({ ...gpaoMeta, finance: { ...gpaoMeta.finance, monthlyCostMGA: Number(e.target.value) } })} />
              </label>
              <label className="block text-xs font-bold">Amortissement MGA/mois
                <input type="number" className="fc mt-1" value={gpaoMeta.finance.depreciationMGA ?? ''} onChange={(e) => setGpaoMeta({ ...gpaoMeta, finance: { ...gpaoMeta.finance, depreciationMGA: Number(e.target.value) } })} />
              </label>
              <label className="block text-xs font-bold">Notes finance<textarea className="fc mt-1 min-h-[60px]" value={gpaoMeta.finance.notes ?? ''} onChange={(e) => setGpaoMeta({ ...gpaoMeta, finance: { ...gpaoMeta.finance, notes: e.target.value } })} /></label>
            </div>
          )}
      </OrionPanelDrawer>
    </EntityListPageShell>
  );
}
