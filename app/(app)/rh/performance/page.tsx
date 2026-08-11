'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Trophy,
  Search,
  Star,
  Pencil,
  Users,
  Target,
  Award,
} from 'lucide-react';
import {
  AppPageHeader,
  AppButton,
  AppKpiCard,
  AppEmptyState,
  AppListSkeleton,
} from '@/components/ui/app-ui';

type Row = {
  id: string;
  matricule?: string;
  name: string;
  poste: string;
  departement?: string;
  ponctualite: number;
  qualite: number;
  consignes: number;
  total: number;
  color: string;
  evaluated?: boolean;
};

const CRITERIA = [
  { key: 'ponctualite' as const, label: 'Ponctualité' },
  { key: 'qualite' as const, label: 'Qualité' },
  { key: 'consignes' as const, label: 'Consignes' },
];

const PERF_MAX = 21;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function scoreTone(v: number) {
  if (v > 0) return 'pos';
  if (v < 0) return 'neg';
  return 'zero';
}

export default function RhPerformancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [leaderboard, setLeaderboard] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState<Row | null>(null);
  const [form, setForm] = useState({ ponctualite: 0, qualite: 0, consignes: 0 });

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(search.trim()), 280);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const q = qDebounced ? `?q=${encodeURIComponent(qDebounced)}` : '';
    fetch(`/api/rh/performance${q}`)
      .then((r) => (r.ok ? r.json() : { rows: [], leaderboard: [] }))
      .then((d) => {
        setRows(d.rows ?? []);
        setLeaderboard(d.leaderboard ?? []);
      })
      .finally(() => setLoading(false));
  }, [qDebounced]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => {
    const evaluated = rows.filter((r) => r.evaluated || r.total !== 0).length;
    const avg =
      rows.length === 0
        ? 0
        : Math.round((rows.reduce((s, r) => s + r.total, 0) / rows.length) * 10) / 10;
    const top = leaderboard[0]?.total ?? 0;
    return { evaluated, avg, top, total: rows.length };
  }, [rows, leaderboard]);

  const formTotal = form.ponctualite + form.qualite + form.consignes;

  const saveEval = async () => {
    if (!evaluating) return;
    setSaving(true);
    try {
      await fetch('/api/rh/performance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: evaluating.id, ...form }),
      });
      setEvaluating(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rh-perf-page dashboard-full">
      <AppPageHeader
        title="Performance équipe"
        description="Ponctualité · Qualité · Consignes"
        icon={Star}
        actions={
          <div className="rh-perf-actions">
            <Link href="/rh/employes">Employés</Link>
            <label className="rh-perf-search">
              <Search size={14} aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                aria-label="Rechercher un employé"
              />
            </label>
          </div>
        }
      />

      <div className="rh-perf-kpi">
        <AppKpiCard label="Équipe" value={kpis.total} icon={Users} tone="info" />
        <AppKpiCard label="Évalués" value={kpis.evaluated} icon={Award} tone="success" />
        <AppKpiCard label="Moyenne" value={kpis.avg} icon={Target} tone="brand" hint={`/${PERF_MAX}`} />
        <AppKpiCard label="Top score" value={kpis.top} icon={Trophy} tone="warning" hint={`/${PERF_MAX}`} />
      </div>

      <div className="rh-perf-layout">
        <section className="rh-perf-list">
          <div className="rh-perf-list__head">
            <h2>Évaluations</h2>
            <span>{rows.length}</span>
          </div>

          {loading ? (
            <AppListSkeleton rows={5} />
          ) : rows.length === 0 ? (
            <AppEmptyState
              icon={Star}
              title="Aucun collaborateur"
              description="Aucun employé actif ne correspond à la recherche."
            />
          ) : (
            <div className="rh-perf-grid">
              {rows.map((e) => {
                const unevaluated = !e.evaluated && e.total === 0;
                return (
                  <article key={e.id} className="rh-perf-card" data-uneval={unevaluated ? '1' : undefined}>
                    <div className="rh-perf-card__top">
                      <span
                        className="rh-perf-avatar"
                        style={{ background: e.color || '#cc0033' }}
                        aria-hidden
                      >
                        {initials(e.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="rh-perf-card__meta">
                          <span className="mat">{e.matricule || '—'}</span>
                          <span className={`rh-perf-note rh-perf-note--${scoreTone(e.total)}`}>
                            {unevaluated ? '—' : `${e.total > 0 ? '+' : ''}${e.total}`}
                            <small>/{PERF_MAX}</small>
                          </span>
                        </div>
                        <h3 className="rh-perf-card__name">{e.name}</h3>
                        <p className="rh-perf-card__poste">
                          {e.poste}
                          {e.departement ? ` · ${e.departement}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="rh-perf-scores">
                      {CRITERIA.map((c) => (
                        <div key={c.key}>
                          <span className="lbl">{c.label.slice(0, 5)}</span>
                          <span className={`val rh-perf-note--${scoreTone(e[c.key])}`}>
                            {e[c.key] > 0 ? '+' : ''}
                            {e[c.key]}
                          </span>
                        </div>
                      ))}
                    </div>

                    <AppButton
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rh-perf-card__btn gap-1"
                      onClick={() => {
                        setEvaluating(e);
                        setForm({
                          ponctualite: e.ponctualite,
                          qualite: e.qualite,
                          consignes: e.consignes,
                        });
                      }}
                    >
                      <Pencil size={12} /> Évaluer
                    </AppButton>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="rh-perf-board">
          <div className="rh-perf-board__head">
            <Trophy size={15} aria-hidden />
            <h2>Leaderboard</h2>
          </div>
          <p className="rh-perf-board__sub">Classement période courante</p>

          {loading ? (
            <AppListSkeleton rows={3} />
          ) : leaderboard.length === 0 ? (
            <p className="rh-perf-board__empty">Pas encore de classement.</p>
          ) : (
            <ol className="rh-perf-rank">
              {leaderboard.map((e, i) => {
                const pct = Math.max(8, Math.round((Math.max(0, e.total) / PERF_MAX) * 100));
                return (
                  <li key={e.id} className="rh-perf-rank__item" data-rank={i + 1}>
                    <span className="rh-perf-rank__badge" aria-hidden>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="rh-perf-rank__name">{e.name}</div>
                      <div className="rh-perf-rank__bar" aria-hidden>
                        <div style={{ width: `${pct}%`, background: e.color || '#cc0033' }} />
                      </div>
                    </div>
                    <span className="rh-perf-rank__score">
                      {e.total > 0 ? '+' : ''}
                      {e.total}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="rh-perf-board__goal">Objectif : +15 / {PERF_MAX}</p>
        </aside>
      </div>

      {evaluating ? (
        <div
          className="rh-perf-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setEvaluating(null)}
        >
          <div className="rh-perf-modal" role="dialog" aria-labelledby="rh-perf-modal-title">
            <div className="rh-perf-modal__head">
              <h3 id="rh-perf-modal-title">Évaluer</h3>
              <p>
                {evaluating.name}
                <span> · {evaluating.poste}</span>
              </p>
            </div>

            <div className="rh-perf-modal__total">
              Total{' '}
              <strong className={`rh-perf-note--${scoreTone(formTotal)}`}>
                {formTotal > 0 ? '+' : ''}
                {formTotal}
              </strong>
              <span>/{PERF_MAX}</span>
            </div>

            {CRITERIA.map((c) => (
              <div key={c.key} className="rh-perf-slider">
                <div className="rh-perf-slider__head">
                  <span>{c.label}</span>
                  <strong className={`rh-perf-note--${scoreTone(form[c.key])}`}>
                    {form[c.key] > 0 ? '+' : ''}
                    {form[c.key]}
                  </strong>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={7}
                  value={form[c.key]}
                  onChange={(e) =>
                    setForm({ ...form, [c.key]: Number(e.target.value) })
                  }
                  aria-label={c.label}
                />
                <div className="rh-perf-slider__scale">
                  <span>−5</span>
                  <span>0</span>
                  <span>+7</span>
                </div>
              </div>
            ))}

            <div className="rh-perf-modal__actions">
              <AppButton type="button" onClick={saveEval} disabled={saving} className="flex-1">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Enregistrer
              </AppButton>
              <AppButton
                type="button"
                variant="outline"
                onClick={() => setEvaluating(null)}
                disabled={saving}
              >
                Annuler
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
