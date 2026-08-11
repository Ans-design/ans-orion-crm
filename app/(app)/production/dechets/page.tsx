'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trash2,
  Loader2,
  Package,
  Factory,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';
import {
  AppPageHeader,
  AppKpiCard,
  AppEmptyState,
  AppListSkeleton,
  AppButton,
} from '@/components/ui/app-ui';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';

type StockMatch = {
  reservationId: string;
  label: string;
  qty: number;
  status: string;
  available: number;
  unit: string;
};

type Plan = {
  id: string;
  cmdId: string;
  client: string;
  art: string;
  qty: number;
  machine: string;
  statut: string;
  papier?: string;
  qtePapier?: string;
  encre?: string;
  stockMatch?: StockMatch[];
};

type Waste = {
  id: string;
  matiere: string;
  quantity: number;
  unite: string;
  cause: string;
  poste: string;
  createdAt: string;
  commande?: { numero: string } | null;
};

type EmpOpt = { id: string; name: string; poste: string };

function displayOrEmpty(value?: string | null) {
  if (!value || value === '—' || value === '---') return null;
  return value;
}

function DechetsPertesPageInner() {
  const router = useRouter();
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [wastes, setWastes] = useState<Waste[]>([]);
  const [stats, setStats] = useState<{ total: number; recentWeek: number } | null>(null);
  const [stockCritique, setStockCritique] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<EmpOpt[]>([]);
  const [form, setForm] = useState({
    matiere: '',
    quantity: '',
    cause: 'Réglage machine',
    poste: 'production',
    notes: '',
    commandeId: '',
    employeeId: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const plansQ = commandeId
      ? `/api/production/dechets?plans=1&commande=${encodeURIComponent(commandeId)}`
      : '/api/production/dechets?plans=1';
    Promise.all([
      fetch(plansQ).then((r) => (r.ok ? r.json() : { plans: [] })),
      fetch('/api/production/dechets?stats=1').then((r) => (r.ok ? r.json() : {})),
      fetch('/api/production/dechets').then((r) => (r.ok ? r.json() : { wastes: [] })),
      fetch('/api/cockpit/stats?role=production').then((r) => (r.ok ? r.json() : {})),
    ])
      .then(([p, st, w, cockpit]) => {
        setPlans((p as { plans?: Plan[] }).plans ?? []);
        setStats((st as { stats?: { total: number; recentWeek: number } }).stats ?? null);
        setWastes((w as { wastes?: Waste[] }).wastes ?? []);
        setStockCritique((cockpit as { kpis?: { stockCritique?: number } }).kpis?.stockCritique ?? 0);
      })
      .finally(() => setLoading(false));
  }, [commandeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (commandeId) {
      setForm((f) => ({ ...f, commandeId }));
    }
  }, [commandeId]);

  useEffect(() => {
    if (!showForm) return;
    fetch('/api/equipe/employes-options', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const items = (body as { items?: EmpOpt[] } | null)?.items;
        setEmployees(Array.isArray(items) ? items : []);
      })
      .catch(() => setEmployees([]));
  }, [showForm]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/production/dechets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matiere: form.matiere,
          quantity: Number(form.quantity),
          cause: form.cause,
          poste: form.poste,
          notes: form.notes || null,
          commandeId: form.commandeId || null,
          employeeId: form.employeeId || null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({
          matiere: '',
          quantity: '',
          cause: 'Réglage machine',
          poste: 'production',
          notes: '',
          commandeId: commandeId ?? '',
          employeeId: '',
        });
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const enProd = plans.filter((p) => p.statut === 'En prod.').length;
  const termines = plans.filter((p) => p.statut === 'Terminé').length;
  const listedWastes = useMemo(() => {
    if (!commandeId) return wastes;
    return wastes.filter((w) => w.commande?.numero && plans.some((p) => p.id === commandeId));
  }, [wastes, commandeId, plans]);

  return (
    <div className="plan-matiere-page dashboard-full w-full">
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      <FlowPageBanner
        entity="production"
        status="En cours"
        entityId={commandeId ?? undefined}
        impactedModules={['Stock', 'GPAO', 'Achats']}
      />

      <AppPageHeader
        title="Plan matière · Déchets & pertes"
        description="Besoins config commande · réservations stock · déclaration pertes"
        icon={Package}
        actions={
          <div className="flex flex-wrap gap-2">
            <AppButton type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <AlertTriangle size={14} />
              Déclarer déchet
            </AppButton>
            <AppButton type="button" variant="outline" size="sm" onClick={() => router.push('/stock?tab=inventaire')}>
              <Package size={14} />
              Inventaire
            </AppButton>
            <AppButton type="button" variant="outline" size="sm" onClick={() => router.push('/achats')}>
              <ShoppingCart size={14} />
              Cmd fournisseur
            </AppButton>
          </div>
        }
      />

      <div className="plan-matiere-kpi">
        <AppKpiCard label="Articles en plan" value={plans.length} icon={Package} tone="info" />
        <AppKpiCard label="En production" value={enProd} icon={Factory} tone="warning" />
        <AppKpiCard label="Terminés" value={termines} icon={CheckCircle2} tone="success" />
        <AppKpiCard
          label="Stocks critiques"
          value={stockCritique}
          icon={AlertTriangle}
          tone="danger"
          onClick={() => router.push('/stock?critical=1')}
        />
      </div>

      {showForm && (
        <form onSubmit={submit} className="plan-matiere-form space-y-3">
          <h3>Déclarer déchet / perte</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="fc text-sm"
              placeholder="Matière"
              value={form.matiere}
              onChange={(e) => setForm({ ...form, matiere: e.target.value })}
              required
            />
            <input
              className="fc text-sm"
              type="number"
              placeholder="Quantité"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
            <select
              className="fc text-sm"
              value={form.cause}
              onChange={(e) => setForm({ ...form, cause: e.target.value })}
            >
              {['Réglage machine', 'Mauvais calage', 'Papier froissé', 'Coupe incorrecte', 'Pliage raté', 'Autre'].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
            <select
              className="fc text-sm"
              value={form.poste}
              onChange={(e) => setForm({ ...form, poste: e.target.value })}
            >
              {['production', 'faconnage', 'studio', 'logistique'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              className="fc text-sm sm:col-span-2"
              placeholder="ID commande (optionnel)"
              value={form.commandeId}
              onChange={(e) => setForm({ ...form, commandeId: e.target.value })}
            />
            <select
              className="fc text-sm sm:col-span-2"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              aria-label="Employé concerné"
            >
              <option value="">
                {form.commandeId
                  ? 'Tous les intervenants de la commande'
                  : 'Employé concerné (optionnel)'}
              </option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}{e.poste ? ` · ${e.poste}` : ''}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-muted-foreground m-0">
            Déchet envoyé automatiquement dans les notes &amp; la performance (qualité) de l’employé / des intervenants.
          </p>
          <div className="flex gap-2">
            <AppButton type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Soumettre
            </AppButton>
            <AppButton type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Annuler
            </AppButton>
          </div>
        </form>
      )}

      <section>
        <div className="plan-matiere-toolbar">
          <div>
            <h2>Plan matière — commandes actives</h2>
            <p className="hint">{plans.length} ligne{plans.length > 1 ? 's' : ''} · clic carte → dossier commande</p>
          </div>
        </div>

        {loading ? (
          <AppListSkeleton rows={4} />
        ) : plans.length === 0 ? (
          <AppEmptyState
            icon={Package}
            title="Aucune commande active"
            description="Les besoins matière des commandes en production apparaîtront ici."
            action={
              <AppButton type="button" variant="outline" size="sm" onClick={() => router.push('/production')}>
                Voir la production
              </AppButton>
            }
          />
        ) : (
          <div className="plan-matiere-grid">
            {plans.map((p) => {
              const papier = displayOrEmpty(p.papier);
              const encre = displayOrEmpty(p.encre);
              const machine = displayOrEmpty(p.machine);
              const hasStock = (p.stockMatch?.length ?? 0) > 0;

              return (
                <button
                  key={p.id}
                  type="button"
                  className="plan-matiere-card"
                  data-status={p.statut}
                  onClick={() => router.push(`/commandes/${p.id}`)}
                >
                  <div className="plan-matiere-card-top">
                    <div>
                      <Link
                        href={`/commandes/${p.id}`}
                        className="plan-matiere-cmd"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.cmdId}
                      </Link>
                      <div className="plan-matiere-client">{p.client || 'Client —'}</div>
                    </div>
                    <span className="plan-matiere-badge" data-status={p.statut}>
                      {p.statut}
                    </span>
                  </div>

                  <div className="plan-matiere-art">
                    {p.art}
                    <span className="text-muted-foreground font-semibold"> · ×{p.qty}</span>
                  </div>

                  <div className="plan-matiere-meta">
                    <div className="plan-matiere-meta-item">
                      <span className="lbl">Papier / matière</span>
                      <span className={`val${papier ? '' : ' empty'}`}>
                        {papier
                          ? `${papier}${p.qtePapier && displayOrEmpty(p.qtePapier) ? ` · ${p.qtePapier}` : ''}`
                          : 'Non renseigné'}
                      </span>
                    </div>
                    <div className="plan-matiere-meta-item">
                      <span className="lbl">Encre</span>
                      <span className={`val${encre ? '' : ' empty'}`}>{encre ?? 'Non renseigné'}</span>
                    </div>
                    <div className="plan-matiere-meta-item">
                      <span className="lbl">Machine</span>
                      <span className={`val${machine ? '' : ' empty'}`}>{machine ?? 'Non assignée'}</span>
                    </div>
                    <div className="plan-matiere-meta-item">
                      <span className="lbl">Qté commande</span>
                      <span className="val">{p.qty}</span>
                    </div>
                  </div>

                  <div className="plan-matiere-stock" onClick={(e) => e.stopPropagation()}>
                    <span className="lbl">Stock réservé</span>
                    {hasStock ? (
                      <ul>
                        {p.stockMatch!.map((s) => (
                          <li key={s.reservationId}>
                            {s.label}: {s.qty} {s.unit}
                            <span className="text-muted-foreground font-medium"> · {s.status}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Link href={`/stock?commande=${p.id}`} className="plan-matiere-stock-link">
                        Lier stock →
                      </Link>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="plan-matiere-waste-panel">
        <div className="plan-matiere-waste-head">
          <h2>
            <Trash2 size={14} />
            Pertes déclarées
          </h2>
          <span className="stats">
            {stats?.total ?? 0} total · {stats?.recentWeek ?? 0} cette semaine
          </span>
        </div>

        {listedWastes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 m-0">Aucune perte déclarée</p>
        ) : (
          <div className="plan-matiere-waste-grid">
            {listedWastes.slice(0, 12).map((w) => (
              <div key={w.id} className="plan-matiere-waste-card">
                <div className="title">
                  {w.matiere} · {w.quantity} {w.unite}
                </div>
                <div className="meta">
                  {w.cause}
                  {w.commande?.numero ? ` · ${w.commande.numero}` : ''} · {w.poste} ·{' '}
                  {new Date(w.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function DechetsPertesPage() {
  return (
    <Suspense fallback={<AppListSkeleton rows={4} />}>
      <DechetsPertesPageInner />
    </Suspense>
  );
}
