'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, AlertTriangle } from 'lucide-react';

type Overview = {
  urgentCards: { id: string; icon: string; label: string; title: string; desc: string; href: string; color: string }[];
  presence: { presentCount: number; pauseCount: number; absentCount: number; rows: { id: string; name: string; poste: string; station: string; checkIn: string; statut: string }[] };
  stockPriorities: { name: string; level: string }[];
  kpis: { cmdRetard: number; machinesDown: number; absencesPending: number; proofsPending: number; totalActifs: number };
};

export default function AdminVuePage() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'rh' | 'messages' | 'suggestions'>('rh');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/overview')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  if (!data) {
    return <div className="p-12 text-center text-muted-foreground">Accès réservé direction / admin</div>;
  }

  const cardBorder: Record<string, string> = {
    red: 'border-red-200 dark:border-red-900',
    cyan: 'border-[var(--orion-red-vivid)]/30 dark:border-[var(--orion-red-vivid)]/40',
    green: 'border-green-200 dark:border-green-900',
  };

  return (
    <div className="dashboard-full space-y-5 w-full max-w-none">
      <header className="pb-4 border-b border-border">
        <h1 className="font-display text-2xl font-bold">Vue d&apos;ensemble — Administration</h1>
        <p className="text-sm text-muted-foreground">Effectifs, urgences, stocks critiques — adm_vue HTML v29</p>
      </header>

      <div>
        <div className="text-[11px] font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
          Les tâches urgentes
          <span className="badge bg-red-100 text-red-700 text-[9px]">{data.kpis.cmdRetard + data.kpis.proofsPending} priorités</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.urgentCards.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => router.push(c.href)}
              className={`ans-card-premium p-4 text-left border-2 ${cardBorder[c.color] ?? ''} hover:shadow-md transition-shadow`}
            >
              <div className="flex justify-between mb-2">
                <span className="text-lg">{c.icon}</span>
                <span className="badge text-[9px]">{c.label}</span>
              </div>
              <div className="font-bold text-sm mb-1">{c.title}</div>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="ans-card-premium p-5">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
          <h2 className="font-semibold text-sm flex items-center gap-2"><Users size={16} /> Effectifs et présence en direct</h2>
          <div className="flex gap-4 text-[11px] font-bold">
            <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />{data.presence.presentCount} PRÉSENTS</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />{data.presence.pauseCount} EN PAUSE</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />{data.presence.absentCount} ABSENTS</span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase text-muted-foreground border-b border-border">
                <th className="p-2">Employé</th><th>Statut</th><th>Affectation</th><th>Arrivée</th><th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.presence.rows.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-2 font-bold">{r.name}</td>
                  <td><span className="badge text-[9px]">{r.statut}</span></td>
                  <td className="text-muted-foreground">{r.station}</td>
                  <td>{r.checkIn}</td>
                  <td>
                    <button type="button" className="text-[var(--ans-cyan)] text-[10px]" onClick={() => router.push('/rh/employes')}>Voir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn btn-b btn-sm mx-auto block mt-4" onClick={() => router.push('/rh/employes')}>
          VOIR TOUTE L&apos;ÉQUIPE ({data.kpis.totalActifs}) ›
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ans-card-premium p-5">
          <div className="flex gap-2 mb-4 border-b border-border pb-2">
            {(['rh', 'messages', 'suggestions'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`text-xs font-bold px-3 py-1 rounded ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                {t === 'rh' ? 'Demandes RH' : t === 'messages' ? 'Messages' : 'Suggestions'}
              </button>
            ))}
          </div>
          {tab === 'rh' && (
            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">{data.kpis.absencesPending} demande(s) de congé en attente</p>
              <button type="button" className="btn btn-out btn-sm" onClick={() => router.push('/rh/absences')}>Traiter les absences →</button>
              <button type="button" className="btn btn-out btn-sm ml-2" onClick={() => router.push('/rh/recrutement')}>Recrutement →</button>
            </div>
          )}
          {tab === 'messages' && (
            <button type="button" className="btn btn-out btn-sm text-xs" onClick={() => router.push('/messagerie')}>Ouvrir ANS Talk →</button>
          )}
          {tab === 'suggestions' && (
            <button type="button" className="btn btn-out btn-sm text-xs" onClick={() => router.push('/equipe/suggestions')}>Boîte à idées →</button>
          )}
        </div>

        <div className="rounded-[7px] border-2 border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-5">
          <h2 className="font-bold text-sm text-red-600 flex items-center gap-2 mb-4">
            <AlertTriangle size={16} /> PRIORITÉS STOCKS
          </h2>
          <div className="space-y-2">
            {data.stockPriorities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune rupture critique</p>
            ) : data.stockPriorities.map((s) => (
              <div key={s.name} className="flex justify-between items-center bg-card rounded-lg px-3 py-2 text-xs">
                <span className="font-bold">{s.name}</span>
                <span className="badge bg-red-100 text-red-700 text-[9px]">{s.level}</span>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-r btn-sm w-full mt-4" onClick={() => router.push('/stock?critical=1')}>
            RÉAPPROVISIONNER
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-out btn-sm" onClick={() => router.push('/planning')}>Planning Gantt →</button>
        <button type="button" className="btn btn-out btn-sm" onClick={() => router.push('/rh/paie')}>Paie & salaires →</button>
        <button type="button" className="btn btn-out btn-sm" onClick={() => router.push('/admin/pricing?tab=articles')}>Backoffice →</button>
      </div>
    </div>
  );
}
