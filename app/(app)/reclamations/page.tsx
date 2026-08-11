'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertOctagon, ArrowRight, Plus } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import {
  AppEmptyState, AppListSkeleton, AppButton, AppFormModal, AppFormModalFooter,
  EntityModuleDataBar, EntityListPageShell,
} from '@/components/ui/app-ui';
import { statusBadgeClass } from '@/lib/ui/status-styles';
import { getApiErrorMessage, unwrapApiData } from '@/lib/api-client';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';

type Reclamation = {
  id: string;
  subject: string;
  description: string | null;
  statut: string;
  priorite: string;
  createdAt: string;
  client: { id: string; name: string; code: string };
  commande?: { id: string; numero: string } | null;
  employee?: { id: string; firstName: string; lastName: string; poste: string } | null;
};

type ClientOpt = { id: string; name: string; code: string };
type CmdOpt = { id: string; numero: string; article?: string };
type EmpOpt = { id: string; name: string; poste: string };

const PRIORITY_CLS: Record<string, string> = {
  Urgente: 'bg-red-500/15 text-red-600',
  Haute: 'bg-orange-500/15 text-orange-600',
  Normale: statusBadgeClass('Normale'),
  Basse: 'bg-gray-500/15 text-gray-600',
};

function ReclamationsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const commandeFilter = searchParams.get('commande') || searchParams.get('commandeId') || '';
  const talkConvId = searchParams.get('talk') || searchParams.get('conv') || '';
  const highlightId = searchParams.get('id') || '';
  const showTrash =
    searchParams.get('archived') === '1' || searchParams.get('trash') === '1';
  const setShowTrash = useCallback(
    (trash: boolean) => {
      const p = new URLSearchParams(searchParams.toString());
      if (trash) {
        p.set('archived', '1');
        p.delete('trash');
      } else {
        p.delete('archived');
        p.delete('trash');
      }
      const qs = p.toString();
      router.replace(qs ? `/reclamations?${qs}` : '/reclamations', { scroll: false });
    },
    [router, searchParams],
  );
  const [items, setItems] = useState<Reclamation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const liveTick = useOrionLiveRevision(['reclamations', 'clients', 'rh'], { debounceMs: 400 });
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [cmds, setCmds] = useState<CmdOpt[]>([]);
  const [employees, setEmployees] = useState<EmpOpt[]>([]);
  const [form, setForm] = useState({
    clientId: '',
    commandeId: commandeFilter,
    employeeId: '',
    subject: '',
    description: '',
    priorite: 'Normale',
  });

  useEffect(() => {
    if (commandeFilter) setForm((f) => ({ ...f, commandeId: commandeFilter }));
  }, [commandeFilter]);

  // Deeplink finalize → ne pas masquer la fiche par un filtre statut
  useEffect(() => {
    if (highlightId) setFilter('');
  }, [highlightId]);

  useEffect(() => {
    void import('@/lib/commercial/commercial-journey-store').then(({ emitCommercialJourney }) => {
      emitCommercialJourney('manual', {
        preferredStep: 'reclamations',
        lastCommandeId: commandeFilter || undefined,
      });
    });
  }, [commandeFilter]);

  useEffect(() => {
    if (!highlightId || loading) return;
    const el = document.getElementById(`reclamation-${highlightId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, loading, items]);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    const p = new URLSearchParams();
    if (filter) p.set('statut', filter);
    if (commandeFilter) p.set('commandeId', commandeFilter);
    if (showTrash) p.set('archived', '1');
    fetch(`/api/reclamations?${p}`, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          setLoadError(true);
          setItems([]);
          uxToast.error('Impossible de charger les réclamations');
          return;
        }
        const body = await r.json();
        const data = unwrapApiData<{ items?: Reclamation[] } | Reclamation[]>(body);
        if (Array.isArray(data)) setItems(data);
        else setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        setLoadError(true);
        setItems([]);
        uxToast.error('Erreur réseau — réclamations');
      })
      .finally(() => setLoading(false));
  }, [filter, commandeFilter, showTrash, liveTick]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!showNew) return;
    fetch('/api/clients?pageSize=100&page=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const data = unwrapApiData<{ items?: ClientOpt[] } | ClientOpt[]>(body);
        const list = Array.isArray(data) ? data : (data?.items ?? []);
        setClients(list.map((c) => ({ id: c.id, name: c.name, code: c.code })));
      })
      .catch(() => {
        setClients([]);
      });
    fetch('/api/equipe/employes-options', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const data = unwrapApiData<{ items?: EmpOpt[] }>(body);
        setEmployees(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => setEmployees([]));
  }, [showNew]);

  useEffect(() => {
    if (!showNew || !form.clientId) {
      setCmds([]);
      return;
    }
    fetch(`/api/commandes?clientId=${encodeURIComponent(form.clientId)}&pageSize=50`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const data = unwrapApiData<{ items?: CmdOpt[] } | CmdOpt[]>(body);
        const list = Array.isArray(data) ? data : (data?.items ?? []);
        setCmds(list.map((c) => ({ id: c.id, numero: c.numero, article: (c as CmdOpt).article })));
      })
      .catch(() => setCmds([]));
  }, [showNew, form.clientId]);

  const updateStatut = async (id: string, statut: string) => {
    const r = await fetch(`/api/reclamations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut }),
    });
    if (r.ok) { uxToast.success(`Réclamation → ${statut}`); load(); }
    else {
      const err = await r.json().catch(() => ({}));
      uxToast.error(getApiErrorMessage(err, 'Erreur mise à jour'));
    }
  };

  const createReclamation = async () => {
    if (!form.clientId || !form.subject.trim()) {
      uxToast.error('Client et sujet obligatoires');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/reclamations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId,
          subject: form.subject.trim(),
          description: form.description.trim() || null,
          priorite: form.priorite,
          commandeId: form.commandeId || null,
          employeeId: form.employeeId || null,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        uxToast.error(getApiErrorMessage(body, 'Création impossible'));
        return;
      }
      uxToast.success(
        form.employeeId
          ? 'Réclamation créée — notée sur l’employé concerné'
          : 'Réclamation créée — notée sur les intervenants',
      );
      setShowNew(false);
      setForm({
        clientId: '',
        commandeId: commandeFilter,
        employeeId: '',
        subject: '',
        description: '',
        priorite: 'Normale',
      });
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityListPageShell
      title="Réclamations clients"
      description="SAV, litiges qualité, retards — suivi centralisé"
      icon={AlertOctagon}
      actions={(
          <div className="flex flex-wrap items-center gap-2">
            <EntityModuleDataBar
              entity="reclamations"
              trash={showTrash}
              onTrashChange={setShowTrash}
              activeHref="/reclamations"
              trashHref="/reclamations?archived=1"
              onAfterImport={load}
            />
            <AppButton type="button" size="sm" onClick={() => setShowNew(true)} className="gap-1.5">
              <Plus size={14} /> Nouvelle réclamation
            </AppButton>
          </div>
      )}
    >
      {talkConvId && (
        <div className="cmd-talk-banner">
          <div className="cmd-talk-banner__copy">
            <p className="cmd-talk-banner__title">Évaluation avec les participants</p>
            <p className="cmd-talk-banner__sub">
              Groupe ANS Talk prêt — responsables de tâches et participants peuvent commenter le retour client.
            </p>
          </div>
          <Link
            href={`/messagerie?conv=${encodeURIComponent(talkConvId)}`}
            className="cmd-finalize__cta cmd-talk-banner__cta"
          >
            Ouvrir le chat groupe
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        {['', 'Ouverte', 'En cours', 'Résolue'].map((f) => (
          <button
            key={f || 'all'}
            type="button"
            onClick={() => setFilter(f)}
            className={`orion-surface-chip ${filter === f ? 'orion-surface-chip--active' : ''}`}
          >
            {f || 'Toutes'}
          </button>
        ))}
      </div>

      {loading ? (
        <AppListSkeleton rows={4} />
      ) : loadError ? (
        <div className="rounded-[7px] border-0 bg-[color-mix(in_srgb,var(--danger,#dc2626)_8%,var(--bg-card,#fff))] p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-[var(--danger,#dc2626)]">Chargement impossible</p>
          <p className="text-xs text-muted-foreground">Vérifiez la connexion ou réessayez.</p>
          <AppButton type="button" size="sm" onClick={load}>Réessayer</AppButton>
        </div>
      ) : items.length === 0 ? (
        <AppEmptyState icon={AlertOctagon} title="Aucune réclamation" description="Les réclamations clients apparaîtront ici ou depuis la fiche client." />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div
              key={r.id}
              id={`reclamation-${r.id}`}
              className="rounded-[7px] border-0 bg-[var(--bg-card)] p-4 flex flex-col lg:flex-row lg:items-center gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none"
              style={
                highlightId === r.id
                  ? { boxShadow: '0 0 0 2px color-mix(in srgb, var(--primary) 35%, transparent)' }
                  : undefined
              }
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`orion-status-chip text-meta font-bold ${PRIORITY_CLS[r.priorite] ?? ''}`}>{r.priorite}</span>
                  <span className="orion-status-chip badge badge-b text-meta">{r.statut}</span>
                </div>
                <p className="font-semibold text-body mt-2.5">{r.subject}</p>
                <p className="text-meta text-muted-foreground mt-1">
                  <Link href={`/clients/${r.client.id}`} className="text-[var(--primary,#FF174D)] font-semibold hover:underline">{r.client.name}</Link>
                  {' · '}{r.client.code}
                  {r.commande?.id && (
                    <>
                      {' · '}
                      <Link
                        href={`/commandes/${r.commande.id}`}
                        className="font-mono font-semibold text-primary hover:underline"
                      >
                        {r.commande.numero}
                      </Link>
                    </>
                  )}
                </p>
                {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                {r.employee ? (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Concerné · <strong>{r.employee.firstName} {r.employee.lastName}</strong>
                    {r.employee.poste ? ` · ${r.employee.poste}` : ''}
                  </p>
                ) : r.commande?.id ? (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Impact RH · intervenants de la commande
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.statut === 'Ouverte' && (
                  <button type="button" onClick={() => updateStatut(r.id, 'En cours')} className="orion-surface-chip text-xs">
                    Prendre en charge
                  </button>
                )}
                {r.statut !== 'Résolue' && (
                  <button type="button" onClick={() => updateStatut(r.id, 'Résolue')} className="orion-surface-chip text-xs">
                    Résoudre
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AppFormModal
        open={showNew}
        onOpenChange={setShowNew}
        title="Nouvelle réclamation"
        maxWidthClass="max-w-md"
        footer={(
          <AppFormModalFooter
            onCancel={() => setShowNew(false)}
            onSubmit={createReclamation}
            submitLabel="Créer"
            loading={saving}
          />
        )}
      >
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Client *</label>
          <select
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value, commandeId: commandeFilter || '' })}
            className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm"
          >
            <option value="">Sélectionner…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Commande (optionnel)</label>
          <select
            value={form.commandeId}
            onChange={(e) => setForm({ ...form, commandeId: e.target.value })}
            className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm"
            disabled={!form.clientId && !commandeFilter}
          >
            <option value="">Sans commande</option>
            {cmds.map((c) => (
              <option key={c.id} value={c.id}>{c.numero}{c.article ? ` — ${c.article}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Employé concerné (optionnel)
          </label>
          <select
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm"
          >
            <option value="">
              {form.commandeId
                ? 'Tous les intervenants de la commande'
                : 'Aucun (pas d’impact RH auto)'}
            </option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}{e.poste ? ` · ${e.poste}` : ''}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground mt-1">
            Enregistré automatiquement dans les notes &amp; la performance (qualité).
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Sujet *</label>
          <input
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Priorité</label>
          <select
            value={form.priorite}
            onChange={(e) => setForm({ ...form, priorite: e.target.value })}
            className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm"
          >
            {['Basse', 'Normale', 'Haute', 'Urgente'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm"
          />
        </div>
      </AppFormModal>
    </EntityListPageShell>
  );
}

export default function ReclamationsPage() {
  return (
    <Suspense fallback={<AppListSkeleton rows={4} />}>
      <ReclamationsPageInner />
    </Suspense>
  );
}
