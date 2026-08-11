'use client';

import { useCallback, useEffect, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { CheckCircle, XCircle, Loader2, UserPlus, Save, RefreshCw } from 'lucide-react';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import type { BrandingConfig } from '@/lib/branding-config';
import './access-requests.css';

type AccessRequest = {
  id: string;
  nom: string;
  email: string;
  telephone: string | null;
  matricule: string | null;
  roleDemande: string | null;
  service: string | null;
  message: string | null;
  statut: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

const FILTERS: { id: string; label: string }[] = [
  { id: 'envoye', label: 'envoyées' },
  { id: 'en_attente', label: 'en attente' },
  { id: 'accepte', label: 'accepté' },
  { id: 'refuse', label: 'refusé' },
  { id: 'traitee', label: 'traitées' },
  { id: 'tous', label: 'tous' },
];

function badgeClass(statut: string) {
  if (statut === 'en_attente' || statut === 'envoye') return 'is-wait';
  if (statut === 'accepte' || statut === 'traitee') return 'is-ok';
  return 'is-bad';
}

export function AccessRequestsAdminPanel({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<AccessRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filtre, setFiltre] = useState('en_attente');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [savingBrand, setSavingBrand] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([
      fetch(`/api/admin/access-requests?statut=${filtre}`).then((r) =>
        r.ok ? r.json() : { items: [], counts: {} },
      ),
      fetch('/api/admin/branding').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([data, brand]) => {
        setItems(data.items ?? []);
        setCounts(data.counts ?? {});
        if (brand) setBranding(brand);
      })
      .finally(() => setLoading(false));
  }, [filtre]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (
    id: string,
    statut: 'accepte' | 'refuse',
    createUser = false,
    reviewNote?: string,
  ) => {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/access-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut, createUser, role: 'commercial', reviewNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        uxToast.error(data.error, 'Erreur');
        return;
      }
      if (data.tempPassword) {
        uxToast.success(`Compte créé — mot de passe temporaire : ${data.tempPassword}`, {
          duration: 12000,
        });
      } else {
        uxToast.success(statut === 'accepte' ? 'Demande acceptée' : 'Demande refusée');
      }
      void load();
    } finally {
      setActing(null);
    }
  };

  const saveBranding = async () => {
    if (!branding || !canEdit) return;
    setSavingBrand(true);
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      });
      if (res.ok) uxToast.success('Identité société enregistrée');
      else uxToast.error('Erreur enregistrement');
    } finally {
      setSavingBrand(false);
    }
  };

  return (
    <div className="acc-page">
      {branding ? (
        <section className="acc-card" aria-label="Identité page login">
          <h3>Identité page login</h3>
          <div className="acc-brand-grid">
            <label className="acc-field">
              Nom société
              <input
                type="text"
                value={branding.companyName}
                disabled={!canEdit}
                onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
              />
            </label>
            <label className="acc-field">
              Sous-titre
              <input
                type="text"
                value={branding.companySubtitle}
                disabled={!canEdit}
                onChange={(e) => setBranding({ ...branding, companySubtitle: e.target.value })}
              />
            </label>
            <label className="acc-field is-full">
              Email administrateur (non affiché publiquement)
              <input
                type="email"
                value={branding.contactEmail}
                disabled={!canEdit}
                onChange={(e) => setBranding({ ...branding, contactEmail: e.target.value })}
              />
            </label>
            <label className="acc-check">
              <input
                type="checkbox"
                checked={branding.showPublicVersion}
                disabled={!canEdit}
                onChange={(e) => setBranding({ ...branding, showPublicVersion: e.target.checked })}
              />
              Afficher la version sur la page login publique
            </label>
          </div>
          {canEdit ? (
            <div className="acc-card-foot">
              <button
                type="button"
                className="acc-btn acc-btn--accent"
                onClick={() => void saveBranding()}
                disabled={savingBrand}
              >
                {savingBrand ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer identité
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="acc-toolbar">
        <div className="acc-filters" role="tablist" aria-label="Filtrer les demandes">
          {FILTERS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={filtre === s.id}
              onClick={() => setFiltre(s.id)}
              className={`acc-chip${filtre === s.id ? ' is-active' : ''}`}
            >
              {s.label}
              {counts[s.id] != null && s.id !== 'tous' ? ` (${counts[s.id]})` : ''}
            </button>
          ))}
        </div>
        <div className="acc-toolbar-actions">
          <button
            type="button"
            onClick={() => void load().then(() => uxToast.success('Liste actualisée'))}
            disabled={loading}
            className="acc-btn acc-btn--ghost"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <ExcelTableActions
            fileStem="demandes-acces"
            sheetName="Demandes accès"
            canImport={false}
            getExportRows={() =>
              items.map((r, i) => ({
                NOM: r.nom,
                EMAIL: r.email,
                TÉLÉPHONE: r.telephone ?? '',
                MATRICULE: r.matricule ?? '',
                RÔLE: r.roleDemande ?? '',
                SERVICE: r.service ?? '',
                STATUT: r.statut,
                MESSAGE: r.message ?? '',
                'DATE DEMANDE': new Date(r.createdAt).toLocaleString('fr-FR'),
                ID: String(i + 1).padStart(3, '0'),
              }))
            }
          />
        </div>
      </div>

      {loading ? (
        <div className="acc-loading">
          <Loader2 className="animate-spin" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <div className="acc-empty">
          <b>Aucune demande</b>
          Aucune demande d&apos;accès pour ce filtre.
        </div>
      ) : (
        <div className="acc-list">
          {items.map((r) => (
            <article key={r.id} className="acc-item">
              <div className="acc-item-top">
                <div className="min-w-0">
                  <span className="acc-item-name">{r.nom}</span>
                  <span className="acc-item-email">{r.email}</span>
                  {r.telephone ? (
                    <span className="acc-item-email">{r.telephone}</span>
                  ) : null}
                </div>
                <span className={`acc-badge ${badgeClass(r.statut)}`}>{r.statut}</span>
              </div>
              {r.matricule ? (
                <p className="acc-item-meta">Matricule : {r.matricule}</p>
              ) : null}
              {r.roleDemande ? (
                <p className="acc-item-meta">Rôle demandé : {r.roleDemande}</p>
              ) : null}
              {r.service ? <p className="acc-item-meta">Service : {r.service}</p> : null}
              {r.message ? <p className="acc-item-meta">{r.message}</p> : null}
              {r.reviewNote ? (
                <p className="acc-item-meta" style={{ fontStyle: 'italic' }}>
                  Motif : {r.reviewNote}
                </p>
              ) : null}
              <p className="acc-item-meta">{new Date(r.createdAt).toLocaleString('fr-FR')}</p>
              {['envoye', 'en_attente'].includes(r.statut) && canEdit ? (
                <div className="acc-item-actions">
                  <button
                    type="button"
                    disabled={acting === r.id}
                    onClick={() => void review(r.id, 'accepte', true)}
                    className="acc-btn is-ok-btn"
                  >
                    <UserPlus size={12} /> Accepter + compte
                  </button>
                  <button
                    type="button"
                    disabled={acting === r.id}
                    onClick={() => void review(r.id, 'accepte')}
                    className="acc-btn is-ok-btn"
                  >
                    <CheckCircle size={12} /> Accepter
                  </button>
                  <button
                    type="button"
                    disabled={acting === r.id}
                    onClick={() => {
                      const note = window.prompt('Motif du refus (visible par le demandeur) :');
                      if (note === null) return;
                      void review(r.id, 'refuse', false, note.trim() || undefined);
                    }}
                    className="acc-btn is-bad-btn"
                  >
                    <XCircle size={12} /> Refuser
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
