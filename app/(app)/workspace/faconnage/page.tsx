'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scissors, ClipboardList, Cpu, AlertTriangle, ArrowRight, ListTodo, Trash2 } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { ANS, ANS_KPI_COLORS } from '@/lib/ans-colors';
import { useCockpitStats } from '@/lib/hooks/use-cockpit-kpis';
import { CockpitErrorBanner } from '@/components/workspace/cockpit-error-banner';
import { PageHeader } from '@/components/layouts/page-header';
import { PosteTachesBoard } from '@/components/workspace/poste-taches-board';

export default function FaconnageWorkspacePage() {
  const router = useRouter();
  const { kpis, error, reload } = useCockpitStats('faconnage');
  const [wasteForm, setWasteForm] = useState({ matiere: '', quantity: '', cause: 'Réglage machine', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const submitWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteForm.matiere || !wasteForm.quantity) return;
    setSubmitting(true);
    try {
      await fetch('/api/production/dechets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          matiere: wasteForm.matiere,
          quantity: Number(wasteForm.quantity),
          cause: wasteForm.cause,
          poste: 'faconnage',
          notes: wasteForm.notes || null,
        }),
      });
      setWasteForm({ matiere: '', quantity: '', cause: 'Réglage machine', notes: '' });
      reload();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-full space-y-5 w-full">
      <PageHeader title="Façonnage — Mon poste" kicker="Mon espace" compact icon={Scissors} />

      {error && <CockpitErrorBanner onRetry={reload} />}

      <PosteTachesBoard type="finition" title="Mes tâches façonnage du jour" />

      <div className="grid gap-3 kpi-grid">
        <KpiCard label="Tâches façonnage" value={kpis.tachesOuvertes ?? 0} icon={ListTodo} color="#2e7d32" onClick={() => router.push('/equipe/taches?type=production')} />
        <KpiCard label="Machines en panne" value={kpis.machinesDown || 0} icon={Cpu} color={ANS.red} onClick={() => router.push('/machines')} />
        <KpiCard label="Stock critique" value={kpis.stockCritique || 0} icon={AlertTriangle} color={ANS.orange} onClick={() => router.push('/stock')} />
        <KpiCard label="Commandes actives" value={kpis.cmdActives || 0} icon={ClipboardList} color={ANS_KPI_COLORS.tech} onClick={() => router.push('/commandes')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ans-card-premium p-5 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2"><ListTodo size={16} /> Tâches de façonnage</h2>
          <p className="text-xs text-muted-foreground">Pliage, découpe, reliure — voir toutes les tâches atelier</p>
          <button type="button" onClick={() => router.push('/equipe/taches?type=production')} className="btn btn-out btn-sm w-full">
            Voir toutes les tâches →
          </button>
        </div>

        <form onSubmit={submitWaste} className="ans-card-premium p-5 space-y-3 border border-red-100 dark:border-red-900/30">
          <h2 className="font-semibold text-sm flex items-center gap-2 text-red-600"><Trash2 size={16} /> Déclarer déchet / perte</h2>
          <input className="fc w-full text-sm" placeholder="Matière / article (ex: Couché 150g A3…)" value={wasteForm.matiere} onChange={(e) => setWasteForm({ ...wasteForm, matiere: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            <input className="fc text-sm" type="number" min="0" step="0.1" placeholder="Quantité" value={wasteForm.quantity} onChange={(e) => setWasteForm({ ...wasteForm, quantity: e.target.value })} required />
            <select className="fc text-sm" value={wasteForm.cause} onChange={(e) => setWasteForm({ ...wasteForm, cause: e.target.value })}>
              {['Réglage machine', 'Mauvais calage', 'Papier froissé', 'Coupe incorrecte', 'Pliage raté', 'Reliure défectueuse', 'Autre'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <input className="fc w-full text-sm" placeholder="Note complémentaire…" value={wasteForm.notes} onChange={(e) => setWasteForm({ ...wasteForm, notes: e.target.value })} />
          <button type="submit" disabled={submitting} className="btn btn-r btn-full btn-sm">📤 Soumettre rapport</button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pointage / présence', href: '/rh/employes', icon: Scissors },
          { label: 'Déchets & pertes', href: '/production/dechets', icon: Trash2 },
          { label: 'Machines', href: '/machines', icon: Cpu },
          { label: 'Mon profil', href: '/rh/mon-profil', icon: ListTodo },
        ].map((a) => (
          <button key={a.href} type="button" onClick={() => router.push(a.href)} className="ans-card-premium p-4 flex items-center gap-3 text-left">
            <a.icon size={20} className="text-[#2e7d32]" />
            <span className="text-sm font-semibold flex-1">{a.label}</span>
            <ArrowRight size={14} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
