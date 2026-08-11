'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  UsersRound,
  LogIn,
  LogOut,
  Loader2,
  Clock,
  AlertTriangle,
  Pencil,
  Phone,
  Search,
  ExternalLink,
} from 'lucide-react';
import { canViewPayrollAmounts } from '@/lib/auth/margin-access';
import { DEPARTEMENTS, LATE_CAUSES, type LateCause } from '@/lib/constants/rh';
import { EmployeeEditModal } from '@/components/rh/employee-edit-modal';
import {
  AppButton,
  AppKpiCard,
  AppEmptyState,
  AppListSkeleton,
  EntityModuleDataBar, EntityListPageShell,
} from '@/components/ui/app-ui';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';
import { Button } from '@/components/ui/button';

type Employee = {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  poste: string;
  departement: string;
  presenceStatut: string;
  horaireDebut: string | null;
  horaireFin: string | null;
  tel: string | null;
  avatarColor: string | null;
  site: string | null;
  presences: {
    id: string;
    statut: string;
    retardMin: number;
    checkIn: string | null;
    checkOut: string | null;
    cause?: string | null;
  }[];
};

type RhStats = {
  totalActifs: number;
  presentNow: number;
  retardsToday: number;
  absencesPending?: number;
};

const PRESENCE_TONE: Record<string, string> = {
  Présent: 'ok',
  Absent: 'off',
  Congé: 'warn',
  Télétravail: 'info',
};

function initials(first: string, last: string) {
  const a = (first || '').trim().charAt(0);
  const b = (last || '').trim().charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function RhEmployesPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'user';
  const canSeePaie = canViewPayrollAmounts(role);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<RhStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState('tous');
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [acting, setActing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [justifyId, setJustifyId] = useState<string | null>(null);
  const [justifyCause, setJustifyCause] = useState<LateCause>(LATE_CAUSES[0]);
  const [justifyNote, setJustifyNote] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const liveTick = useOrionLiveRevision(['rh'], { debounceMs: 400 });

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 280);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    void liveTick;
    setLoading(true);
    const params = new URLSearchParams();
    if (dept !== 'tous') params.set('departement', dept);
    if (qDebounced) params.set('q', qDebounced);
    if (showTrash) params.set('archived', '1');
    const qs = params.toString();
    Promise.all([
      fetch(`/api/rh/employes${qs ? `?${qs}` : ''}`).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/rh/employes?stats=1').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([emps, st]) => {
        setEmployees(Array.isArray(emps) ? emps : []);
        if (st) setStats(st);
      })
      .catch(() => {
        console.warn('[rh/employes] fetch secondary failed');
      })
      .finally(() => setLoading(false));
  }, [dept, qDebounced, showTrash, liveTick]);

  useEffect(() => {
    load();
  }, [load]);

  const pointage = async (action: 'checkin' | 'checkout') => {
    setActing(true);
    try {
      const res = await fetch('/api/rh/presences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) load();
      else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Pointage impossible — fiche employé non liée');
      }
    } finally {
      setActing(false);
    }
  };

  const submitJustify = async () => {
    if (!justifyId || !justifyCause) return;
    const res = await fetch(`/api/rh/presences/${justifyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cause: justifyCause, remarque: justifyNote.trim() || null }),
    });
    if (res.ok) {
      setJustifyId(null);
      setJustifyNote('');
      load();
    }
  };

  const deptsUsed = useMemo(() => {
    const set = new Set(DEPARTEMENTS as readonly string[]);
    for (const e of employees) if (e.departement) set.add(e.departement);
    return ['tous', ...Array.from(set)];
  }, [employees]);

  return (
    <EntityListPageShell
      className="rh-emp-page"
      title="Employés & pointage"
      description="Liste ANS Excel · présences · retards"
      icon={UsersRound}
      actions={
          <div className="rh-emp-links flex flex-wrap items-center gap-3">
            <EntityModuleDataBar entity="employees" trash={showTrash} onTrashChange={setShowTrash} onAfterImport={load} />
            <Link href="/rh/absences">Congés</Link>
            <Link href="/rh/recrutement">Recrutement</Link>
            {canSeePaie ? <Link href="/rh/paie">Paie</Link> : null}
            <Link href="/rh/annonces">Annonces</Link>
          </div>
      }
    >
      <div className="rh-emp-kpi">
        <AppKpiCard
          label="Actifs"
          value={stats?.totalActifs ?? 0}
          icon={UsersRound}
          tone="info"
        />
        <AppKpiCard
          label="Présents"
          value={stats?.presentNow ?? 0}
          icon={LogIn}
          tone="success"
        />
        <AppKpiCard
          label="Retards"
          value={stats?.retardsToday ?? 0}
          icon={AlertTriangle}
          tone={(stats?.retardsToday ?? 0) > 0 ? 'danger' : 'neutral'}
        />
        <AppKpiCard
          label="Congés en attente"
          value={stats?.absencesPending ?? 0}
          icon={Clock}
          tone="warning"
        />
      </div>

      <div className="rh-emp-toolbar">
        <div className="rh-emp-pointage">
          <span className="lbl">Mon pointage</span>
          <AppButton size="sm" disabled={acting} onClick={() => pointage('checkin')} className="gap-1">
            {acting ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            Entrée
          </AppButton>
          <AppButton
            size="sm"
            variant="outline"
            disabled={acting}
            onClick={() => pointage('checkout')}
            className="gap-1"
          >
            <LogOut size={14} /> Sortie
          </AppButton>
        </div>
        <label className="rh-emp-search">
          <Search size={14} aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, matricule, poste, tél…"
            aria-label="Rechercher un employé"
          />
        </label>
      </div>

      <div className="rh-emp-filters">
        {deptsUsed.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDept(d)}
            className={`rh-emp-chip${dept === d ? ' is-active' : ''}`}
          >
            {d === 'tous' ? 'Tous' : d}
          </button>
        ))}
      </div>

      {loading ? (
        <AppListSkeleton rows={6} />
      ) : employees.length === 0 ? (
        <AppEmptyState
          icon={UsersRound}
          title="Aucun employé"
          description="Synchronisez la liste ANS (sync-ans-employees) ou changez le filtre."
        />
      ) : (
        <div className="rh-emp-grid">
          {employees.map((e) => {
            const today = e.presences[0];
            const tone = PRESENCE_TONE[e.presenceStatut] ?? 'off';
            const color = e.avatarColor || '#cc0033';
            const inTime = fmtTime(today?.checkIn);
            const outTime = fmtTime(today?.checkOut);
            const horaire =
              e.horaireDebut || e.horaireFin
                ? `${e.horaireDebut || '—'} – ${e.horaireFin || '—'}`
                : null;

            return (
              <article key={e.id} className="rh-emp-card" data-presence={tone}>
                <div className="rh-emp-card__top">
                  <span className="rh-emp-avatar" style={{ background: color }} aria-hidden>
                    {initials(e.firstName, e.lastName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="rh-emp-card__meta">
                      <span className="mat">{e.matricule}</span>
                      <span className={`rh-emp-status rh-emp-status--${tone}`}>
                        {e.presenceStatut}
                      </span>
                    </div>
                    <h2 className="rh-emp-card__name">
                      {e.firstName} {e.lastName}
                    </h2>
                    <p className="rh-emp-card__poste">
                      {e.poste} · {e.departement}
                    </p>
                  </div>
                </div>

                <div className="rh-emp-card__facts">
                  {horaire ? (
                    <span>
                      <Clock size={11} aria-hidden /> {horaire}
                    </span>
                  ) : null}
                  {e.tel ? (
                    <span>
                      <Phone size={11} aria-hidden /> {e.tel}
                    </span>
                  ) : null}
                  {e.site ? <span className="site">{e.site}</span> : null}
                </div>

                {today ? (
                  <div className="rh-emp-card__today">
                    <strong>{today.statut}</strong>
                    {today.retardMin > 0 ? (
                      <span className="late">+{today.retardMin} min</span>
                    ) : null}
                    {inTime ? <span>Entrée {inTime}</span> : null}
                    {outTime ? <span>Sortie {outTime}</span> : null}
                    {today.statut === 'Retard' ? (
                      <button
                        type="button"
                        className="justify-btn"
                        onClick={() => setJustifyId(today.id)}
                      >
                        <AlertTriangle size={11} /> Justifier
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="rh-emp-card__actions">
                  <button type="button" onClick={() => setEditId(e.id)}>
                    <Pencil size={12} /> Éditer
                  </button>
                  <Link href={`/rh/employes/${e.id}`}>
                    Fiche 360° <ExternalLink size={11} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <EmployeeEditModal
        employeeId={editId}
        open={!!editId}
        onClose={() => setEditId(null)}
        onSaved={load}
      />

      {justifyId ? (
        <div
          className="modal-blocking-overlay"
          onClick={(e) => e.target === e.currentTarget && setJustifyId(null)}
        >
          <div className="modal-blocking-card max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <h3 className="font-bold">Déclaration de retard</h3>
              <fieldset className="space-y-2 border-0 p-0">
                {LATE_CAUSES.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={justifyCause === c}
                      onChange={() => setJustifyCause(c)}
                      className="accent-[var(--ans-red)]"
                    />
                    {c}
                  </label>
                ))}
              </fieldset>
              <textarea
                className="fc min-h-[60px]"
                placeholder="Remarques (optionnel)"
                value={justifyNote}
                onChange={(e) => setJustifyNote(e.target.value)}
              />
            </div>
            <div className="modal-blocking-footer flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setJustifyId(null)}>
                Annuler
              </Button>
              <Button className="flex-1 ans-btn-primary" onClick={submitJustify}>
                Valider
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </EntityListPageShell>
  );
}
