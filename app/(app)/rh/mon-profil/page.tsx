'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Loader2, Trophy, FileText, Send } from 'lucide-react';
import { ANS, ANS_KPI_COLORS } from '@/lib/ans-colors';
import { canViewPayrollAmounts } from '@/lib/auth/margin-access';

type ProfilData = {
  employee: {
    id: string; matricule: string; firstName: string; lastName: string;
    poste: string; departement: string; email: string | null; site: string;
    presenceStatut: string; horaireDebut: string | null;
  } | null;
  performance: { ponctualite: number; qualite: number; consignes: number; total: number; rank: number } | null;
  leaderboard: { name: string; total: number }[];
};

export default function MonProfilPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'user';
  const canSeePaie = canViewPayrollAmounts(role);
  const [data, setData] = useState<ProfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reclamMsg, setReclamMsg] = useState('');
  const [reclamSujet, setReclamSujet] = useState('Suggestion générale');

  useEffect(() => {
    fetch('/api/rh/mon-profil')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  const emp = data?.employee;
  const perf = data?.performance;
  const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Employé';
  const initials = emp ? `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase() : '??';

  const submitReclam = async () => {
    if (!reclamMsg.trim()) return;
    await fetch('/api/equipe/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: reclamSujet, content: reclamMsg, category: 'Réclamation' }),
    });
    setReclamMsg('');
  };

  return (
    <div className="dashboard-full space-y-5 w-full max-w-5xl">
      <header className="pb-4 border-b border-border">
        <h1 className="font-display text-2xl font-bold">Mon Profil</h1>
        <p className="text-sm text-muted-foreground">{name} · {emp?.poste ?? '—'}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ans-card-premium p-5">
          <div className="flex gap-4 items-start pb-4 mb-4 border-b border-border">
            <div className="w-[72px] h-[72px] rounded-[7px] bg-primary text-primary-foreground flex items-center justify-center text-xl font-black">{initials}</div>
            <div>
              <div className="text-lg font-black">{name}</div>
              <div className="text-[11px] font-bold uppercase text-primary tracking-wide">{emp?.poste}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="badge text-[9px]">Mat: {emp?.matricule ?? '—'}</span>
                {perf && <span className="badge text-[9px] bg-green-50 text-green-700">Rang #{perf.rank}</span>}
                {perf && <span className="badge text-[9px] bg-slate-500/10 text-slate-700 dark:text-slate-300">{perf.total} pts</span>}
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {[
              ['✉', 'Email', emp?.email ?? '—'],
              ['🏢', 'Département', emp?.departement ?? '—'],
              ['📍', 'Site', emp?.site ?? 'AX0'],
              ['⏱', 'Horaire', emp?.horaireDebut ?? '—'],
              ['📊', 'Présence', emp?.presenceStatut ?? '—'],
            ].map(([ico, lbl, val]) => (
              <div key={lbl} className="flex gap-3 py-2 border-b border-border last:border-0">
                <span>{ico}</span>
                <span className="text-muted-foreground w-28 shrink-0">{lbl}</span>
                <span className="font-semibold">{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {perf && (
            <div className="ans-card-premium p-5">
              <h2 className="font-semibold text-sm mb-4 flex items-center gap-2"><Trophy size={16} /> Ma performance</h2>
              {[
                { label: 'Productivité', val: perf.ponctualite, color: ANS_KPI_COLORS.success },
                { label: 'Qualité', val: perf.qualite, color: ANS.cyan },
                { label: 'Ponctualité', val: perf.consignes, color: '#00838f' },
              ].map((b) => (
                <div key={b.label} className="mb-3">
                  <div className="flex justify-between text-[10px] mb-1"><span>{b.label}</span><span>{Math.min(100, Math.max(0, b.val * 20))}%</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, b.val * 20))}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="ans-card-premium p-5">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileText size={16} /> Coffre-fort numérique</h2>
            {['Bulletin de paie — Février 2026', 'Bulletin de paie — Janvier 2026', 'Avenant contrat travail'].map((doc) => (
              <div key={doc} className="flex items-center gap-2 py-2 border-b border-border text-xs cursor-pointer hover:bg-muted/30">
                <span>📄</span>
                <span className="flex-1 font-bold text-[var(--ans-cyan)]">{doc}</span>
                <span className="text-muted-foreground">👁</span>
              </div>
            ))}
            {canSeePaie && (
              <Link href="/rh/paie" className="text-xs text-[var(--ans-cyan)] mt-2 inline-block">Paie & salaires →</Link>
            )}
          </div>
        </div>
      </div>

      <div className="ans-card-premium p-5">
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Send size={16} /> Réclamation / Suggestion</h2>
        <select className="fc w-full text-sm mb-2" value={reclamSujet} onChange={(e) => setReclamSujet(e.target.value)}>
          {['Suggestion générale', 'Réclamation matériel', 'Réclamation RH', 'Idée d\'amélioration'].map((o) => <option key={o}>{o}</option>)}
        </select>
        <textarea className="fc w-full text-sm mb-3" rows={3} placeholder="Votre message sera transmis à l'administration." value={reclamMsg} onChange={(e) => setReclamMsg(e.target.value)} />
        <button type="button" className="btn btn-r btn-sm" onClick={submitReclam}>✉ Envoyer</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/equipe/taches" className="btn btn-out btn-sm">Mon planning tâches</Link>
        <Link href="/rh/absences" className="btn btn-out btn-sm">Congés & absences</Link>
        <Link href="/messagerie" className="btn btn-out btn-sm">ANS Talk</Link>
      </div>
    </div>
  );
}
