'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { COMMANDE_BLOCAGE_RAISONS } from '@/lib/constants/commande-blocage';
import { Button } from '@/components/ui/button';

type Blocage = {
  id: string;
  raison: string;
  causeDetail: string | null;
  responsable: string | null;
  actionAttendue: string | null;
  statut: string;
  createdAt: string;
  createdByName: string | null;
  resolvedAt: string | null;
  resolveNote: string | null;
};

type Props = {
  commandeId: string;
  canEdit?: boolean;
};

export function CommandeBlocagePanel({ commandeId, canEdit = true }: Props) {
  const [blocages, setBlocages] = useState<Blocage[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [raison, setRaison] = useState<string>(COMMANDE_BLOCAGE_RAISONS[0]);
  const [causeDetail, setCauseDetail] = useState('');
  const [responsable, setResponsable] = useState('');
  const [actionAttendue, setActionAttendue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/commandes/${commandeId}/blocages`);
      if (r.ok) {
        const d = await r.json();
        setBlocages(d.blocages ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [commandeId]);

  useEffect(() => { load(); }, [load]);

  const actifs = blocages.filter((b) => b.statut === 'actif');

  const createBlocage = async () => {
    setActing(true);
    try {
      const res = await fetch(`/api/commandes/${commandeId}/blocages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raison, causeDetail, responsable, actionAttendue }),
      });
      if (!res.ok) {
        uxToast.error('Impossible de bloquer la commande');
        return;
      }
      uxToast.success('Commande bloquée — équipe notifiée');
      setShowForm(false);
      setCauseDetail('');
      setResponsable('');
      setActionAttendue('');
      load();
    } finally {
      setActing(false);
    }
  };

  const resolve = async (blocageId: string) => {
    const note = window.prompt('Commentaire de résolution (optionnel) :') ?? '';
    setActing(true);
    try {
      const res = await fetch(`/api/commandes/${commandeId}/blocages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', blocageId, resolveNote: note || null }),
      });
      if (res.ok) {
        uxToast.success('Blocage résolu');
        load();
      }
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 size={14} className="animate-spin" /> Blocages…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actifs.length > 0 && (
        <div className="rounded-[7px] border border-primary/40 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ShieldAlert size={16} /> Commande bloquée ({actifs.length})
          </div>
          {actifs.map((b) => (
            <div key={b.id} className="text-xs space-y-1 border-t border-primary/20 pt-2 first:border-0 first:pt-0">
              <p><strong>{b.raison}</strong>{b.causeDetail ? ` — ${b.causeDetail}` : ''}</p>
              {b.responsable && <p>Responsable : {b.responsable}</p>}
              {b.actionAttendue && <p>Action : {b.actionAttendue}</p>}
              <p className="text-muted-foreground">
                {new Date(b.createdAt).toLocaleString('fr-FR')}
                {b.createdByName ? ` · ${b.createdByName}` : ''}
              </p>
              {canEdit && (
                <Button size="sm" variant="outline" disabled={acting} onClick={() => resolve(b.id)} className="h-7 text-xs">
                  <CheckCircle2 size={12} className="mr-1" /> Résoudre
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <>
          {!showForm ? (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="text-xs">
              <AlertTriangle size={12} className="mr-1" /> Signaler un blocage
            </Button>
          ) : (
            <div className="rounded-[7px] border border-border p-3 space-y-2 text-xs">
              <select
                value={raison}
                onChange={(e) => setRaison(e.target.value)}
                className="w-full border rounded-[7px] px-2 py-1.5 bg-background"
              >
                {COMMANDE_BLOCAGE_RAISONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input
                placeholder="Détail de la cause"
                value={causeDetail}
                onChange={(e) => setCauseDetail(e.target.value)}
                className="w-full border rounded-[7px] px-2 py-1.5 bg-background"
              />
              <input
                placeholder="Responsable"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full border rounded-[7px] px-2 py-1.5 bg-background"
              />
              <input
                placeholder="Action attendue"
                value={actionAttendue}
                onChange={(e) => setActionAttendue(e.target.value)}
                className="w-full border rounded-[7px] px-2 py-1.5 bg-background"
              />
              <div className="flex gap-2">
                <Button size="sm" loading={acting} onClick={createBlocage}>Bloquer</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
              </div>
            </div>
          )}
        </>
      )}

      {blocages.filter((b) => b.statut === 'resolu').length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Historique blocages résolus ({blocages.filter((b) => b.statut === 'resolu').length})</summary>
          <ul className="mt-2 space-y-1 pl-2">
            {blocages.filter((b) => b.statut === 'resolu').map((b) => (
              <li key={b.id}>
                {b.raison} — résolu {b.resolvedAt ? new Date(b.resolvedAt).toLocaleDateString('fr-FR') : ''}
                {b.resolveNote ? ` (${b.resolveNote})` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
