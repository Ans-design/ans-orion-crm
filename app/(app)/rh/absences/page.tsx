'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Loader2,
  Send,
  Check,
  X,
  Clock,
  CalendarDays,
  Wallet,
} from 'lucide-react';
import { ABSENCE_TYPES, ABSENCE_STATUTS } from '@/lib/constants/rh';
import {
  AppPageHeader,
  AppButton,
  AppKpiCard,
  AppEmptyState,
  AppListSkeleton,
} from '@/components/ui/app-ui';

function countAbsenceDays(debut: string, fin: string, demiDebut: boolean, demiFin: boolean) {
  if (!debut || !fin) return 0;
  const d0 = new Date(debut);
  const d1 = new Date(fin);
  const diff = Math.floor((d1.getTime() - d0.getTime()) / 86400000) + 1;
  let days = Math.max(0, diff);
  if (demiDebut) days -= 0.5;
  if (demiFin) days -= 0.5;
  return Math.max(0, days);
}

type Absence = {
  id: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
  motif: string | null;
  employee: { firstName: string; lastName: string; matricule: string; departement: string };
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statutTone(statut: string) {
  if (statut === 'Validé') return 'ok';
  if (statut === 'Refusé') return 'ko';
  return 'wait';
}

export default function RhAbsencesPage() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');
  const [type, setType] = useState<string>(ABSENCE_TYPES[0]);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [motif, setMotif] = useState('');
  const [posting, setPosting] = useState(false);
  const [demiDebut, setDemiDebut] = useState(false);
  const [demiFin, setDemiFin] = useState(false);
  const [congeSolde, setCongeSolde] = useState(12.5);

  const demandDays = useMemo(
    () => countAbsenceDays(dateDebut, dateFin, demiDebut, demiFin),
    [dateDebut, dateFin, demiDebut, demiFin],
  );
  const soldeRestant = useMemo(
    () => Math.max(0, congeSolde - demandDays),
    [congeSolde, demandDays],
  );

  const pendingCount = useMemo(
    () => absences.filter((a) => a.statut === 'En attente').length,
    [absences],
  );

  const load = useCallback(() => {
    setLoading(true);
    const q = filter !== 'tous' ? `?statut=${encodeURIComponent(filter)}` : '';
    fetch(`/api/rh/absences${q}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAbsences(Array.isArray(d) ? d : []))
      .catch(() => setAbsences([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch('/api/rh/mon-profil')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.employee?.congeSolde != null) setCongeSolde(d.employee.congeSolde);
      })
      .catch(() => {
        console.warn('[rh/absences] fetch secondary failed');
      });
  }, []);

  const submit = async () => {
    if (!dateDebut || !dateFin || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/rh/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, dateDebut, dateFin, motif: motif || null }),
      });
      if (res.ok) {
        setDateDebut('');
        setDateFin('');
        setMotif('');
        setDemiDebut(false);
        setDemiFin(false);
        load();
      }
    } finally {
      setPosting(false);
    }
  };

  const review = async (id: string, statut: 'Validé' | 'Refusé') => {
    const res = await fetch('/api/rh/absences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statut }),
    });
    if (res.ok) load();
  };

  return (
    <div className="rh-abs-page dashboard-full">
      <AppPageHeader
        title="Congés & absences"
        description="Demandes · validation direction"
        icon={CalendarClock}
        actions={
          <Link href="/rh/employes" className="rh-abs-link">
            ← Employés
          </Link>
        }
      />

      <div className="rh-abs-kpi">
        <AppKpiCard label="Solde congés" value={congeSolde} icon={Wallet} tone="info" hint=" j" />
        <AppKpiCard
          label="En attente"
          value={pendingCount}
          icon={Clock}
          tone={pendingCount > 0 ? 'warning' : 'neutral'}
        />
        <AppKpiCard
          label="Demandes"
          value={absences.length}
          icon={CalendarDays}
          tone="brand"
        />
        <AppKpiCard
          label="Cette demande"
          value={demandDays}
          icon={Send}
          tone={demandDays > 0 ? 'warning' : 'neutral'}
          hint=" j"
        />
      </div>

      <form
        className="rh-abs-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="rh-abs-composer__head">Nouvelle demande</div>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Type d'absence"
        >
          {ABSENCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <div className="rh-abs-date">
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            aria-label="Date début"
            required
          />
          <label className="rh-abs-half">
            <input
              type="checkbox"
              checked={demiDebut}
              onChange={(e) => setDemiDebut(e.target.checked)}
            />
            Après-midi
          </label>
        </div>

        <div className="rh-abs-date">
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            aria-label="Date fin"
            required
          />
          <label className="rh-abs-half">
            <input
              type="checkbox"
              checked={demiFin}
              onChange={(e) => setDemiFin(e.target.checked)}
            />
            Fin midi
          </label>
        </div>

        <textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={2}
          placeholder="Commentaire (optionnel)"
          className="rh-abs-composer__motif"
          aria-label="Commentaire"
        />

        {dateDebut && dateFin ? (
          <div className="rh-abs-preview">
            <span>
              Solde <strong>{congeSolde.toFixed(1)} j</strong>
            </span>
            <span>
              Demande <strong>−{demandDays.toFixed(1)} j</strong>
            </span>
            <span className={soldeRestant < 2 ? 'is-low' : 'is-ok'}>
              Restant <strong>{soldeRestant.toFixed(1)} j</strong>
            </span>
          </div>
        ) : null}

        <AppButton
          type="submit"
          size="sm"
          disabled={!dateDebut || !dateFin || posting}
          className="rh-abs-composer__submit gap-1"
        >
          {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Soumettre
        </AppButton>
      </form>

      <div className="rh-abs-filters">
        {['tous', ...ABSENCE_STATUTS].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rh-abs-chip${filter === s ? ' is-active' : ''}`}
          >
            {s === 'tous' ? 'Toutes' : s}
          </button>
        ))}
      </div>

      {loading ? (
        <AppListSkeleton rows={3} />
      ) : absences.length === 0 ? (
        <AppEmptyState
          icon={CalendarClock}
          title="Aucune demande"
          description="Soumettez une absence ou changez le filtre."
        />
      ) : (
        <div className="rh-abs-grid">
          {absences.map((a) => {
            const tone = statutTone(a.statut);
            const days = countAbsenceDays(
              a.dateDebut.slice(0, 10),
              a.dateFin.slice(0, 10),
              false,
              false,
            );
            return (
              <article key={a.id} className="rh-abs-card" data-statut={tone}>
                <div className="rh-abs-card__top">
                  <div className="min-w-0">
                    <div className="rh-abs-card__meta">
                      <span className="mat">{a.employee.matricule}</span>
                      <span className={`rh-abs-pill rh-abs-pill--${tone}`}>{a.statut}</span>
                    </div>
                    <h2 className="rh-abs-card__name">
                      {a.employee.firstName} {a.employee.lastName}
                    </h2>
                    <p className="rh-abs-card__type">
                      {a.type} · {a.employee.departement}
                    </p>
                  </div>
                </div>

                <div className="rh-abs-card__dates">
                  <span>
                    {fmtDate(a.dateDebut)} → {fmtDate(a.dateFin)}
                  </span>
                  <span className="days">{days} j</span>
                </div>

                {a.motif ? <p className="rh-abs-card__motif">{a.motif}</p> : null}

                {a.statut === 'En attente' ? (
                  <div className="rh-abs-card__actions">
                    <button
                      type="button"
                      className="rh-abs-btn rh-abs-btn--ok"
                      onClick={() => review(a.id, 'Validé')}
                    >
                      <Check size={13} /> Valider
                    </button>
                    <button
                      type="button"
                      className="rh-abs-btn rh-abs-btn--ko"
                      onClick={() => review(a.id, 'Refusé')}
                    >
                      <X size={13} /> Refuser
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
