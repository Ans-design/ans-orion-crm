'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  User, Mail, Phone, Building2, Clock, Calendar, ArrowLeft, Loader2,
  Wallet, ClipboardList, MapPin,
} from 'lucide-react';
import { ANS } from '@/lib/ans-colors';
import { Button } from '@/components/ui/button';
import { canViewPayrollAmounts } from '@/lib/auth/margin-access';

type Employee360 = {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  poste: string;
  departement: string;
  authRole: string;
  email: string | null;
  tel: string | null;
  site: string | null;
  statut: string;
  presenceStatut: string;
  horaireDebut: string | null;
  horaireFin: string | null;
  dateEmbauche: string | null;
  salaireBaseMGA: number | null;
  congeSolde: number | null;
  notes: string | null;
  bio: string | null;
  presences: { id: string; date: string; statut: string; retardMin: number; checkIn: string | null; checkOut: string | null }[];
  absences: { id: string; type: string; dateDebut: string; dateFin: string; statut: string }[];
};

export default function Employe360Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'user';
  const canSeePaie = canViewPayrollAmounts(role);
  const [emp, setEmp] = useState<Employee360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'infos' | 'presences' | 'absences'>('infos');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/rh/employes/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEmp(d))
      .catch(() => setEmp(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="dashboard-full space-y-4">
        <Button variant="outline" onClick={() => router.push('/rh/employes')} className="gap-2">
          <ArrowLeft size={16} /> Retour
        </Button>
        <div className="ans-card-premium p-8 text-center text-muted-foreground">Employé introuvable.</div>
      </div>
    );
  }

  const initials = `${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="dashboard-full space-y-5 w-full">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push('/rh/employes')} className="gap-1">
          <ArrowLeft size={14} /> Employés
        </Button>
        <span className="text-xs text-muted-foreground font-mono">{emp.matricule}</span>
      </div>

      <header className="ans-card-premium p-5 flex flex-wrap gap-4 items-start">
        <div className="w-14 h-14 rounded-[7px] flex items-center justify-center text-xl font-bold text-white" style={{ background: ANS.cyan }}>
          {initials}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-display text-2xl font-bold">{emp.firstName} {emp.lastName}</h1>
          <p className="text-sm text-muted-foreground">{emp.poste} · {emp.departement}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">{emp.presenceStatut}</span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-accent">{emp.statut}</span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--ans-cyan)]/15 text-[var(--ans-cyan)]">{emp.authRole}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSeePaie && (
            <Link href="/rh/paie" className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-muted flex items-center gap-1">
              <Wallet size={12} /> Paie
            </Link>
          )}
          <Link href="/equipe/taches" className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-muted flex items-center gap-1">
            <ClipboardList size={12} /> Tâches
          </Link>
        </div>
      </header>

      <div className="flex gap-2 border-b border-border">
        {(['infos', 'presences', 'absences'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`text-xs font-semibold px-4 py-2 border-b-2 -mb-px capitalize ${tab === t ? 'border-[var(--ans-cyan)] text-[var(--ans-cyan)]' : 'border-transparent text-muted-foreground'}`}>
            {t === 'infos' ? 'Informations' : t}
          </button>
        ))}
      </div>

      {tab === 'infos' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="ans-card-premium p-4 space-y-3">
            <h2 className="text-sm font-bold uppercase text-muted-foreground">Coordonnées</h2>
            {emp.email && <p className="text-sm flex items-center gap-2"><Mail size={14} className="text-muted-foreground" />{emp.email}</p>}
            {emp.tel && <p className="text-sm flex items-center gap-2"><Phone size={14} className="text-muted-foreground" />{emp.tel}</p>}
            <p className="text-sm flex items-center gap-2"><MapPin size={14} className="text-muted-foreground" />Site {emp.site ?? '—'}</p>
            <p className="text-sm flex items-center gap-2"><Building2 size={14} className="text-muted-foreground" />{emp.departement}</p>
          </div>
          <div className="ans-card-premium p-4 space-y-3">
            <h2 className="text-sm font-bold uppercase text-muted-foreground">Contrat & horaires</h2>
            {emp.horaireDebut && (
              <p className="text-sm flex items-center gap-2"><Clock size={14} className="text-muted-foreground" />{emp.horaireDebut} – {emp.horaireFin ?? '17:00'}</p>
            )}
            {emp.dateEmbauche && (
              <p className="text-sm flex items-center gap-2"><Calendar size={14} className="text-muted-foreground" />Embauché le {new Date(emp.dateEmbauche).toLocaleDateString('fr-FR')}</p>
            )}
            {emp.congeSolde != null && <p className="text-sm">Solde congés : <strong>{emp.congeSolde} j</strong></p>}
            {emp.salaireBaseMGA != null && <p className="text-sm">Salaire base : <strong>{emp.salaireBaseMGA.toLocaleString('fr-FR')} Ar</strong></p>}
          </div>
          {(emp.bio || emp.notes) && (
            <div className="ans-card-premium p-4 md:col-span-2 space-y-2">
              <h2 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2"><User size={14} />Notes</h2>
              {emp.bio && <p className="text-sm">{emp.bio}</p>}
              {emp.notes && <p className="text-sm text-muted-foreground">{emp.notes}</p>}
            </div>
          )}
        </div>
      )}

      {tab === 'presences' && (
        <div className="ans-card-premium overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-left">Entrée</th>
                <th className="px-4 py-2 text-left">Sortie</th>
                <th className="px-4 py-2 text-right">Retard</th>
              </tr>
            </thead>
            <tbody>
              {emp.presences.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Aucune présence enregistrée.</td></tr>
              ) : emp.presences.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-2">{new Date(p.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2">{p.statut}</td>
                  <td className="px-4 py-2">{p.checkIn ? new Date(p.checkIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-2">{p.checkOut ? new Date(p.checkOut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-2 text-right">{p.retardMin > 0 ? `+${p.retardMin} min` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'absences' && (
        <div className="ans-card-premium overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Du</th>
                <th className="px-4 py-2 text-left">Au</th>
                <th className="px-4 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {emp.absences.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Aucune absence.</td></tr>
              ) : emp.absences.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-2">{a.type}</td>
                  <td className="px-4 py-2">{new Date(a.dateDebut).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2">{new Date(a.dateFin).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2">{a.statut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
