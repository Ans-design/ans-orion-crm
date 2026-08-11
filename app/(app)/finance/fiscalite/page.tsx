'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  FileText,
  Landmark,
  Plus,
  Percent,
  Users,
  Wallet,
} from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import {
  AppPageHeader,
  AppButton,
  AppKpiCard,
  AppListSkeleton,
  AppEmptyState,
} from '@/components/ui/app-ui';
import { formatPriceAr } from '@/lib/data/catalogue';

type Obligation = {
  id: string;
  type: string;
  label: string;
  periode: string;
  dateEcheance: string;
  montant: number;
  statut: string;
  notes: string | null;
};

type Stats = {
  aPreparer: number;
  enCours?: number;
  enRetard: number;
  deposees: number;
  ouvertes?: number;
};

type Snapshot = {
  periode: string;
  rates: {
    tva: number;
    irsa: number;
    cnaps: number;
    ostie: number;
    fmfp: number;
    labelCnaps: string;
    labelOstie: string;
    currency: string;
  };
  facturesMois: {
    count: number;
    caHT: number;
    caTTC: number;
    tvaCollectee: number;
  };
  paieMois: {
    employesActifs: number;
    irsa: number;
    cnaps: number;
    ostie: number;
    fmfp: number;
    total: number;
  };
};

const STATUT_LABELS: Record<string, string> = {
  a_preparer: 'À préparer',
  en_cours: 'En cours',
  depose: 'Déposée',
  archive: 'Archivée',
};

const TYPES = ['TVA', 'IRSA', 'CNAPS', 'IS', 'FMFP', 'autre'];

function isLate(dateEcheance: string, statut: string) {
  if (['depose', 'archive'].includes(statut)) return false;
  const d = new Date(dateEcheance);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export default function FinanceFiscalitePage() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [stats, setStats] = useState<Stats>({ aPreparer: 0, enRetard: 0, deposees: 0 });
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'TVA',
    label: '',
    periode: '',
    dateEcheance: '',
    montant: 0,
    notes: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/fiscal/obligations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setObligations(d.obligations ?? []);
        setStats(d.stats ?? { aPreparer: 0, enRetard: 0, deposees: 0 });
        setSnapshot(d.snapshot ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!form.label || !form.periode || !form.dateEcheance) {
      uxToast.error('Libellé, période et échéance requis');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/fiscal/obligations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        uxToast.success('Obligation enregistrée');
        setShowForm(false);
        setForm({ type: 'TVA', label: '', periode: '', dateEcheance: '', montant: 0, notes: '' });
        load();
      } else {
        uxToast.error('Erreur création');
      }
    } finally {
      setSaving(false);
    }
  };

  const patchStatut = async (id: string, statut: string) => {
    const res = await fetch(`/api/fiscal/obligations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut }),
    });
    if (res.ok) {
      uxToast.success('Statut mis à jour');
      load();
    }
  };

  const prefillFromSnapshot = (type: string, label: string, montant: number) => {
    const periode = snapshot?.periode ?? '';
    setForm({
      type,
      label,
      periode,
      dateEcheance: '',
      montant: Math.round(montant),
      notes: `Estimé ORION ${periode} — à valider`,
    });
    setShowForm(true);
  };

  return (
    <div className="fiscal-page dashboard-full">
      <AppPageHeader
        title="Fiscalité & échéances"
        description="Taux Backoffice · montants factures / paie · rappels J-7 / J-1"
        icon={Landmark}
        actions={
          <AppButton size="sm" onClick={() => setShowForm((v) => !v)} className="gap-2">
            <Plus size={14} />
            {showForm ? 'Fermer' : 'Nouvelle obligation'}
          </AppButton>
        }
      />

      <div className="fiscal-kpi">
        <AppKpiCard
          label="À préparer"
          value={stats.aPreparer}
          icon={FileText}
          tone="brand"
        />
        <AppKpiCard
          label="En cours"
          value={stats.enCours ?? 0}
          icon={Calendar}
          tone="info"
        />
        <AppKpiCard
          label="En retard"
          value={stats.enRetard}
          icon={AlertTriangle}
          tone="danger"
        />
        <AppKpiCard
          label="Déposées"
          value={stats.deposees}
          icon={Landmark}
          tone="success"
        />
      </div>

      {snapshot ? (
        <div className="fiscal-snapshot">
          <div className="fiscal-rates">
            <div className="fiscal-rates__head">
              <Percent size={14} strokeWidth={2.2} aria-hidden />
              <span>Taux actifs · {snapshot.periode}</span>
              <Link href="/rh/paie" className="fiscal-rates__link">
                Config paie
              </Link>
            </div>
            <div className="fiscal-rates__grid">
              <div className="fiscal-rate">
                <span className="lbl">TVA</span>
                <span className="val">{snapshot.rates.tva}%</span>
              </div>
              <div className="fiscal-rate">
                <span className="lbl">IRSA</span>
                <span className="val">{snapshot.rates.irsa}%</span>
              </div>
              <div className="fiscal-rate">
                <span className="lbl">{snapshot.rates.labelCnaps}</span>
                <span className="val">{snapshot.rates.cnaps}%</span>
              </div>
              <div className="fiscal-rate">
                <span className="lbl">{snapshot.rates.labelOstie}</span>
                <span className="val">{snapshot.rates.ostie}%</span>
              </div>
              <div className="fiscal-rate">
                <span className="lbl">FMFP</span>
                <span className="val">{snapshot.rates.fmfp}%</span>
              </div>
            </div>
          </div>

          <div className="fiscal-estims">
            <button
              type="button"
              className="fiscal-estim"
              data-tone="tva"
              onClick={() =>
                prefillFromSnapshot(
                  'TVA',
                  `TVA collectée ${snapshot.periode}`,
                  snapshot.facturesMois.tvaCollectee,
                )
              }
            >
              <Wallet size={15} aria-hidden />
              <div className="min-w-0">
                <span className="lbl">TVA collectée (factures)</span>
                <span className="val">{formatPriceAr(snapshot.facturesMois.tvaCollectee)}</span>
                <span className="meta">
                  {snapshot.facturesMois.count} fact. · HT {formatPriceAr(snapshot.facturesMois.caHT)}
                </span>
              </div>
            </button>
            <button
              type="button"
              className="fiscal-estim"
              data-tone="paie"
              onClick={() =>
                prefillFromSnapshot(
                  'IRSA',
                  `IRSA paie ${snapshot.periode}`,
                  snapshot.paieMois.irsa,
                )
              }
            >
              <Users size={15} aria-hidden />
              <div className="min-w-0">
                <span className="lbl">IRSA (paie active)</span>
                <span className="val">{formatPriceAr(snapshot.paieMois.irsa)}</span>
                <span className="meta">{snapshot.paieMois.employesActifs} salariés actifs</span>
              </div>
            </button>
            <button
              type="button"
              className="fiscal-estim"
              data-tone="cnaps"
              onClick={() =>
                prefillFromSnapshot(
                  'CNAPS',
                  `${snapshot.rates.labelCnaps} ${snapshot.periode}`,
                  snapshot.paieMois.cnaps,
                )
              }
            >
              <Landmark size={15} aria-hidden />
              <div className="min-w-0">
                <span className="lbl">{snapshot.rates.labelCnaps} + {snapshot.rates.labelOstie}</span>
                <span className="val">
                  {formatPriceAr(snapshot.paieMois.cnaps + snapshot.paieMois.ostie)}
                </span>
                <span className="meta">
                  FMFP {formatPriceAr(snapshot.paieMois.fmfp)} · total cotis.{' '}
                  {formatPriceAr(snapshot.paieMois.total)}
                </span>
              </div>
            </button>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <div className="fiscal-composer">
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            aria-label="Type"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={form.periode}
            onChange={(e) => setForm({ ...form, periode: e.target.value })}
            placeholder="Période (ex. 2026-08)"
            aria-label="Période"
          />
          <input
            className="fiscal-composer__wide"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Libellé"
            aria-label="Libellé"
          />
          <input
            type="date"
            value={form.dateEcheance}
            onChange={(e) => setForm({ ...form, dateEcheance: e.target.value })}
            aria-label="Échéance"
          />
          <input
            type="number"
            value={form.montant || ''}
            onChange={(e) => setForm({ ...form, montant: Number(e.target.value) || 0 })}
            placeholder="Montant Ar"
            aria-label="Montant"
          />
          <AppButton size="sm" onClick={create} disabled={saving}>
            Enregistrer
          </AppButton>
        </div>
      ) : null}

      <div className="fiscal-toolbar">
        <h2>
          {loading ? '…' : `${obligations.length} échéance${obligations.length > 1 ? 's' : ''}`}
        </h2>
      </div>

      {loading ? (
        <AppListSkeleton rows={4} />
      ) : obligations.length === 0 ? (
        <AppEmptyState
          icon={Landmark}
          title="Aucune obligation"
          description="Cliquez un montant estimé ci-dessus ou créez une échéance TVA / IRSA / CNAPS."
          action={
            <AppButton size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Nouvelle obligation
            </AppButton>
          }
        />
      ) : (
        <div className="fiscal-grid">
          {obligations.map((o) => {
            const late = isLate(o.dateEcheance, o.statut);
            return (
              <article
                key={o.id}
                className="fiscal-card"
                data-late={late ? '1' : undefined}
                data-statut={o.statut}
              >
                <div className="fiscal-card__top">
                  <div className="min-w-0">
                    <span className="fiscal-card__type">{o.type}</span>
                    <h3 className="fiscal-card__label">{o.label}</h3>
                    <p className="fiscal-card__meta">
                      {o.periode} ·{' '}
                      {new Date(o.dateEcheance).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {late ? <span className="fiscal-late"> · En retard</span> : null}
                    </p>
                  </div>
                  <span className={`fiscal-pill fiscal-pill--${o.statut}`}>
                    {STATUT_LABELS[o.statut] ?? o.statut}
                  </span>
                </div>
                <div className="fiscal-card__foot">
                  <span className="fiscal-card__amount">{formatPriceAr(o.montant)}</span>
                  <div className="fiscal-card__actions">
                    {o.statut === 'a_preparer' ? (
                      <AppButton
                        size="sm"
                        variant="outline"
                        onClick={() => patchStatut(o.id, 'en_cours')}
                      >
                        En cours
                      </AppButton>
                    ) : null}
                    {o.statut !== 'depose' && o.statut !== 'archive' ? (
                      <AppButton size="sm" onClick={() => patchStatut(o.id, 'depose')}>
                        Déposée
                      </AppButton>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
