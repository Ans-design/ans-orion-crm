'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Loader2,
  Plus,
  Package,
  Wrench,
  Users,
  Megaphone,
  CircleDollarSign,
  Factory,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  AppPageHeader,
  AppKpiCard,
  AppButton,
  AppEmptyState,
  AppListSkeleton,
} from '@/components/ui/app-ui';
import { CHARGE_CATEGORIES } from '@/lib/constants/finance-adv';
import { unwrapApiData } from '@/lib/api-client';

type Charge = {
  id: string;
  label: string;
  category: string;
  amount: number;
  dateCharge: string;
  supplierRef: string | null;
};

type FinanceStats = {
  entreesMois: number;
  sortiesMois: number;
  tresorerieMois: number;
  impayes: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat('fr-MG').format(Math.round(n)) + ' Ar';
}

const CAT_ICON: Record<string, LucideIcon> = {
  Exploitation: Factory,
  Matière: Package,
  Matières: Package,
  Salaire: Users,
  Maintenance: Wrench,
  Marketing: Megaphone,
  Autre: CircleDollarSign,
};

export default function FinanceChargesPage() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', category: 'Exploitation', amount: '', supplierRef: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/finance/charges').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/finance/charges?stats=1').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([listBody, stBody]) => {
        const list = unwrapApiData<unknown>(listBody);
        setCharges(Array.isArray(list) ? (list as Charge[]) : []);
        if (stBody) {
          const st = unwrapApiData<FinanceStats>(stBody);
          if (st && typeof st === 'object') setStats(st);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/finance/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label,
          category: form.category,
          amount: parseFloat(form.amount),
          supplierRef: form.supplierRef || null,
        }),
      });
      if (res.ok) {
        setForm({ label: '', category: 'Exploitation', amount: '', supplierRef: '' });
        setShowForm(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="charges-page dashboard-full">
      <AppPageHeader
        title="Charges & dépenses"
        description="Sorties · trésorerie · suivi mensuel"
        icon={Wallet}
        actions={
          <AppButton type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus size={14} />
            {showForm ? 'Fermer' : 'Nouvelle charge'}
          </AppButton>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AppKpiCard
          label="Entrées mois"
          value={stats?.entreesMois ?? 0}
          icon={TrendingUp}
          tone="success"
          format="price"
        />
        <AppKpiCard
          label="Sorties mois"
          value={stats?.sortiesMois ?? 0}
          icon={TrendingDown}
          tone="danger"
          format="price"
        />
        <AppKpiCard
          label="Trésorerie nette"
          value={stats?.tresorerieMois ?? 0}
          icon={Wallet}
          tone="info"
          format="price"
        />
        <AppKpiCard
          label="Impayés clients"
          value={stats?.impayes ?? 0}
          icon={TrendingDown}
          tone="warning"
          format="price"
        />
      </div>

      {showForm && (
        <form onSubmit={submit} className="charges-composer">
          <input
            required
            placeholder="Libellé"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            aria-label="Libellé"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            aria-label="Catégorie"
          >
            {CHARGE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            placeholder="Montant (Ar)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            aria-label="Montant"
          />
          <AppButton type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Enregistrer
          </AppButton>
          <input
            className="charges-composer__ref"
            placeholder="Réf. fournisseur (optionnel)"
            value={form.supplierRef}
            onChange={(e) => setForm({ ...form, supplierRef: e.target.value })}
            aria-label="Référence fournisseur"
          />
        </form>
      )}

      <div className="charges-toolbar">
        <div>
          <h2>
            {charges.length} charge{charges.length > 1 ? 's' : ''}
          </h2>
          <p className="hint">Sorties enregistrées · catégories métier</p>
        </div>
      </div>

      {loading ? (
        <AppListSkeleton rows={4} />
      ) : charges.length === 0 ? (
        <AppEmptyState
          icon={Wallet}
          title="Aucune charge"
          description="Enregistrez une sortie (matière, exploitation, salaire…)."
          action={
            <AppButton type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Nouvelle charge
            </AppButton>
          }
        />
      ) : (
        <div className="charges-grid">
          {charges.map((c) => {
            const Icon = CAT_ICON[c.category] ?? CircleDollarSign;
            return (
              <article key={c.id} className="charge-card">
                <div className="charge-card__top">
                  <span className="charge-card__icon" data-cat={c.category} aria-hidden>
                    <Icon size={15} strokeWidth={2} />
                  </span>
                  <div className="charge-card__main">
                    <h3 className="charge-card__label">{c.label}</h3>
                    <div className="charge-card__chips">
                      <span className="charge-pill">{c.category}</span>
                    </div>
                    {c.supplierRef ? (
                      <div className="charge-card__ref">Réf. {c.supplierRef}</div>
                    ) : null}
                  </div>
                </div>
                <div className="charge-card__foot">
                  <span className="charge-card__amount">{fmt(c.amount)}</span>
                  <span className="charge-card__date">
                    {new Date(c.dateCharge).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
