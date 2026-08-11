'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeDollarSign,
  Loader2,
  FileText,
  X,
  Save,
  Plus,
  Settings2,
  Pencil,
  Wallet,
  Users,
  Clock,
  Gift,
  Banknote,
} from 'lucide-react';
import type { FiscalConfig } from '@/lib/fiscal-config';
import {
  AppPageHeader,
  AppButton,
  AppKpiCard,
  AppEmptyState,
  AppListSkeleton,
} from '@/components/ui/app-ui';

type PayrollRow = {
  id: string;
  matricule: string;
  name: string;
  poste: string;
  departement: string;
  salaireBaseMGA: number;
  notesFraisMGA: number;
  heuresSup: number;
  hsAmount: number;
  primeMGA: number;
  brutMGA?: number;
  cotisationsMGA?: number;
  avancesMGA?: number;
  netMGA: number;
};

type Grid = {
  rows: PayrollRow[];
  stats: {
    masseSalariale: number;
    masseBrute?: number;
    cotisationsTotal?: number;
    avancesTotal?: number;
    heuresSupTotal: number;
    notesFraisTotal: number;
    primesTotal: number;
    fiscal?: FiscalConfig;
  };
};

type Advance = {
  id: string;
  montant: number;
  motif: string | null;
  statut: string;
  dateAvance: string;
  employee: { id: string; matricule: string; firstName: string; lastName: string };
};

type PayslipPreview = {
  employee: { firstName: string; lastName: string; poste: string };
  payslip: {
    period: string;
    companyMeta: { name: string; adresse: string; siret: string };
    employeeMeta: {
      name: string;
      emploi: string;
      anciennete: string;
      periode: string;
      paiement: string;
    };
    lines: { designation: string; base: string; taux: string; montant: string }[];
    netAmount: number;
    currency: string;
  };
};

function fmtMGA(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} Ar`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export default function RhPaiePage() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PayslipPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editForm, setEditForm] = useState({
    salaireBaseMGA: 0,
    notesFraisMGA: 0,
    heuresSup: 0,
    primeMGA: 0,
  });
  const [saving, setSaving] = useState(false);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [advanceStats, setAdvanceStats] = useState({ enCours: 0, montantTotal: 0 });
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ employeeId: '', montant: 0, motif: '' });
  const [fiscal, setFiscal] = useState<FiscalConfig | null>(null);
  const [showFiscal, setShowFiscal] = useState(false);
  const [fiscalSaving, setFiscalSaving] = useState(false);

  const loadAdvances = useCallback(() => {
    fetch('/api/rh/avances')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setAdvances(d.advances ?? []);
          setAdvanceStats(d.stats ?? { enCours: 0, montantTotal: 0 });
        }
      });
  }, []);

  const loadFiscal = useCallback(() => {
    fetch('/api/admin/fiscalite')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setFiscal(d);
      })
      .catch(() => {
        console.warn('[rh/paie] fetch secondary failed');
      });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/rh/paie')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setGrid(data);
        if (data?.stats?.fiscal) setFiscal(data.stats.fiscal);
      })
      .finally(() => setLoading(false));
    loadAdvances();
  }, [loadAdvances]);

  useEffect(() => {
    load();
  }, [load]);

  const openPayslip = async (employeeId: string) => {
    setPreviewLoading(true);
    setPreview(null);
    try {
      const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/rh/paie?employeeId=${employeeId}&period=${period}`);
      if (res.ok) setPreview(await res.json());
    } finally {
      setPreviewLoading(false);
    }
  };

  const startEdit = (row: PayrollRow) => {
    setEditId(row.id);
    setEditName(row.name);
    setEditForm({
      salaireBaseMGA: row.salaireBaseMGA,
      notesFraisMGA: row.notesFraisMGA,
      heuresSup: row.heuresSup,
      primeMGA: row.primeMGA,
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/rh/paie', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: editId, ...editForm }),
      });
      if (res.ok) {
        setEditId(null);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const createAdvance = async () => {
    if (!advanceForm.employeeId || advanceForm.montant <= 0) return;
    const res = await fetch('/api/rh/avances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(advanceForm),
    });
    if (res.ok) {
      setShowAdvanceForm(false);
      setAdvanceForm({ employeeId: '', montant: 0, motif: '' });
      load();
    }
  };

  const settleAdvance = async (id: string) => {
    const res = await fetch('/api/rh/avances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'rembourser' }),
    });
    if (res.ok) load();
  };

  const saveFiscal = async () => {
    if (!fiscal) return;
    setFiscalSaving(true);
    try {
      const res = await fetch('/api/admin/fiscalite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fiscal),
      });
      if (res.ok) {
        setShowFiscal(false);
        load();
      }
    } finally {
      setFiscalSaving(false);
    }
  };

  const openAdvances = advances.filter((a) => a.statut === 'en_cours');

  return (
    <div className="rh-paie-page dashboard-full">
      <AppPageHeader
        title="Paie & salaires"
        description="Variables MGA · bulletins · cotisations"
        icon={BadgeDollarSign}
        actions={
          <div className="rh-paie-actions">
            <button
              type="button"
              className="rh-paie-chip-btn"
              onClick={() => {
                setShowFiscal(true);
                loadFiscal();
              }}
            >
              <Settings2 size={13} /> Fiscalité
            </button>
            <button
              type="button"
              className="rh-paie-chip-btn"
              onClick={() => setShowAdvanceForm(true)}
            >
              <Plus size={13} /> Avance
            </button>
            <Link href="/rh/employes">Employés</Link>
            <Link href="/rh/recrutement">Recrutement</Link>
            <Link href="/finance/fiscalite">Échéances</Link>
          </div>
        }
      />

      {loading ? (
        <AppListSkeleton rows={5} />
      ) : !grid ? (
        <AppEmptyState
          icon={BadgeDollarSign}
          title="Paie indisponible"
          description="Impossible de charger la grille de paie."
        />
      ) : (
        <>
          <div className="rh-paie-kpi">
            <AppKpiCard
              label="Masse nette"
              value={grid.stats.masseSalariale}
              icon={Wallet}
              tone="info"
              format="price"
            />
            <AppKpiCard
              label="Cotisations"
              value={grid.stats.cotisationsTotal ?? 0}
              icon={Banknote}
              tone="brand"
              format="price"
            />
            <AppKpiCard
              label="Avances"
              value={advanceStats.montantTotal}
              icon={Users}
              tone={advanceStats.montantTotal > 0 ? 'warning' : 'neutral'}
              format="price"
            />
            <AppKpiCard
              label="Heures sup."
              value={grid.stats.heuresSupTotal}
              icon={Clock}
              tone="success"
              hint=" h"
            />
            <AppKpiCard
              label="Primes"
              value={grid.stats.primesTotal}
              icon={Gift}
              tone="warning"
              format="price"
            />
          </div>

          {openAdvances.length > 0 ? (
            <div className="rh-paie-advances">
              <h2>Avances en cours</h2>
              <div className="rh-paie-advances__grid">
                {openAdvances.map((a) => (
                  <article key={a.id} className="rh-paie-advance">
                    <div className="min-w-0">
                      <p className="name">
                        {a.employee.firstName} {a.employee.lastName}
                      </p>
                      <p className="amt">{fmtMGA(a.montant)}</p>
                      {a.motif ? <p className="motif">{a.motif}</p> : null}
                    </div>
                    <button type="button" onClick={() => settleAdvance(a.id)}>
                      Remboursée
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rh-paie-toolbar">
            <h2>
              {grid.rows.length} bulletin{grid.rows.length > 1 ? 's' : ''}
            </h2>
            <p>Net estimé après cotisations & avances</p>
          </div>

          {grid.rows.length === 0 ? (
            <AppEmptyState
              icon={Users}
              title="Aucun salarié"
              description="Synchronisez les employés actifs pour générer la paie."
            />
          ) : (
            <div className="rh-paie-grid">
              {grid.rows.map((r) => (
                <article key={r.id} className="rh-paie-card">
                  <div className="rh-paie-card__top">
                    <span className="rh-paie-avatar" aria-hidden>
                      {initials(r.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="rh-paie-card__meta">
                        <span className="mat">{r.matricule}</span>
                        <span className="dept">{r.departement}</span>
                      </div>
                      <h3 className="rh-paie-card__name">{r.name}</h3>
                      <p className="rh-paie-card__poste">{r.poste}</p>
                    </div>
                  </div>

                  <div className="rh-paie-card__metrics">
                    <div>
                      <span className="lbl">Base</span>
                      <span className="val">{fmtMGA(r.salaireBaseMGA)}</span>
                    </div>
                    <div>
                      <span className="lbl">Frais</span>
                      <span className="val">{fmtMGA(r.notesFraisMGA)}</span>
                    </div>
                    <div>
                      <span className="lbl">H.sup</span>
                      <span className="val">{r.heuresSup} h</span>
                    </div>
                    <div>
                      <span className="lbl">Prime</span>
                      <span className="val">{fmtMGA(r.primeMGA)}</span>
                    </div>
                    <div>
                      <span className="lbl">Cotis.</span>
                      <span className="val is-muted">{fmtMGA(r.cotisationsMGA ?? 0)}</span>
                    </div>
                    <div>
                      <span className="lbl">Avances</span>
                      <span className={`val${(r.avancesMGA ?? 0) > 0 ? ' is-avance' : ''}`}>
                        {fmtMGA(r.avancesMGA ?? 0)}
                      </span>
                    </div>
                  </div>

                  <div className="rh-paie-card__foot">
                    <div>
                      <span className="lbl">Net estimé</span>
                      <span className="net">{fmtMGA(r.netMGA)}</span>
                    </div>
                    <div className="rh-paie-card__actions">
                      <button type="button" onClick={() => startEdit(r)}>
                        <Pencil size={12} /> Modifier
                      </button>
                      <button type="button" onClick={() => openPayslip(r.id)}>
                        <FileText size={12} /> Bulletin
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {editId ? (
        <div
          className="rh-paie-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setEditId(null)}
        >
          <div className="rh-paie-modal" role="dialog" aria-labelledby="paie-edit-title">
            <h2 id="paie-edit-title">Variables de paie</h2>
            <p className="rh-paie-modal__sub">{editName} · mois en cours</p>
            <label>
              Salaire de base (MGA)
              <input
                type="number"
                value={editForm.salaireBaseMGA}
                onChange={(e) =>
                  setEditForm({ ...editForm, salaireBaseMGA: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Notes de frais (MGA)
              <input
                type="number"
                value={editForm.notesFraisMGA}
                onChange={(e) =>
                  setEditForm({ ...editForm, notesFraisMGA: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Heures supplémentaires
              <input
                type="number"
                value={editForm.heuresSup}
                onChange={(e) =>
                  setEditForm({ ...editForm, heuresSup: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Prime (MGA)
              <input
                type="number"
                value={editForm.primeMGA}
                onChange={(e) => setEditForm({ ...editForm, primeMGA: Number(e.target.value) })}
              />
            </label>
            <div className="rh-paie-modal__actions">
              <AppButton type="button" variant="outline" className="flex-1" onClick={() => setEditId(null)}>
                Annuler
              </AppButton>
              <AppButton type="button" className="flex-1 gap-1" disabled={saving} onClick={saveEdit}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}

      {previewLoading || preview ? (
        <div
          className="rh-paie-modal-overlay"
          onClick={() => !previewLoading && setPreview(null)}
        >
          <div
            className="rh-paie-modal rh-paie-modal--wide"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="paie-bulletin-title"
          >
            <div className="rh-paie-bulletin__head">
              <h2 id="paie-bulletin-title">
                Bulletin —{' '}
                {preview?.payslip?.period ??
                  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
              </h2>
              <button type="button" onClick={() => setPreview(null)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            {previewLoading ? (
              <div className="rh-paie-bulletin__loading">
                <Loader2 className="animate-spin" />
              </div>
            ) : preview ? (
              <div className="rh-paie-bulletin">
                <div className="rh-paie-bulletin__co">
                  <strong>{preview.payslip.companyMeta.name}</strong>
                  <span>{preview.payslip.companyMeta.adresse}</span>
                  <span>SIRET: {preview.payslip.companyMeta.siret}</span>
                </div>
                <div className="rh-paie-bulletin__emp">
                  <div>
                    <strong>{preview.payslip.employeeMeta.name}</strong>
                    <span>Emploi: {preview.payslip.employeeMeta.emploi}</span>
                    <span>Ancienneté: {preview.payslip.employeeMeta.anciennete}</span>
                  </div>
                  <div className="right">
                    <span>Période: {preview.payslip.employeeMeta.periode}</span>
                    <span>{preview.payslip.employeeMeta.paiement}</span>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Désignation</th>
                      <th>Base</th>
                      <th>Taux</th>
                      <th>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.payslip.lines.map((line, i) => (
                      <tr key={i}>
                        <td>{line.designation}</td>
                        <td>{line.base}</td>
                        <td>{line.taux}</td>
                        <td>{line.montant}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="rh-paie-bulletin__note">
                  Cotisations configurables (CNAPS, OSTIE, FMFP, IRSA) · déduction avances
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showAdvanceForm && grid ? (
        <div
          className="rh-paie-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowAdvanceForm(false)}
        >
          <div className="rh-paie-modal" role="dialog" aria-labelledby="paie-avance-title">
            <h2 id="paie-avance-title">Nouvelle avance</h2>
            <label>
              Employé
              <select
                value={advanceForm.employeeId}
                onChange={(e) => setAdvanceForm({ ...advanceForm, employeeId: e.target.value })}
              >
                <option value="">— Sélectionner —</option>
                {grid.rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Montant (MGA)
              <input
                type="number"
                value={advanceForm.montant || ''}
                onChange={(e) =>
                  setAdvanceForm({ ...advanceForm, montant: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Motif
              <input
                type="text"
                value={advanceForm.motif}
                onChange={(e) => setAdvanceForm({ ...advanceForm, motif: e.target.value })}
              />
            </label>
            <div className="rh-paie-modal__actions">
              <AppButton
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowAdvanceForm(false)}
              >
                Annuler
              </AppButton>
              <AppButton type="button" className="flex-1" onClick={createAdvance}>
                Enregistrer
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}

      {showFiscal && fiscal ? (
        <div
          className="rh-paie-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowFiscal(false)}
        >
          <div className="rh-paie-modal" role="dialog" aria-labelledby="paie-fiscal-title">
            <h2 id="paie-fiscal-title">Fiscalité paie</h2>
            <p className="rh-paie-modal__sub">Taux Backoffice · impact bulletins</p>
            {(
              [
                ['cnapsRate', fiscal.labelCnaps],
                ['ostieRate', fiscal.labelOstie],
                ['fmfpRate', 'FMFP'],
                ['irsaRate', 'IRSA'],
                ['tvaRate', 'TVA'],
                ['hsRateMGA', 'Heures sup. (Ar/h)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                {key === 'hsRateMGA' ? '' : ' (%)'}
                <input
                  type="number"
                  step="0.1"
                  value={fiscal[key]}
                  onChange={(e) => setFiscal({ ...fiscal, [key]: Number(e.target.value) })}
                />
              </label>
            ))}
            <div className="rh-paie-modal__actions">
              <AppButton
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowFiscal(false)}
              >
                Annuler
              </AppButton>
              <AppButton
                type="button"
                className="flex-1 gap-1"
                disabled={fiscalSaving}
                onClick={saveFiscal}
              >
                {fiscalSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
