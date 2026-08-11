'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { GripVertical, Calendar, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import { COMMANDE_STATUTS } from '@/lib/data/commande-status';
import { liveFetch } from '@/lib/live/orion-live';

export type KanbanCommande = {
  id: string;
  numero: string;
  client: { name: string } | null;
  article: string;
  statut: string;
  avancement: number;
  priorite: string;
  total: number;
  acompte?: number;
  reste?: number;
  dateLiv?: string | null;
  nextAction?: { label: string; href: string } | null;
};

const KANBAN_COLUMNS = COMMANDE_STATUTS.filter((s) => !['Suspendu', 'Annulée'].includes(s));

const AVANCEMENT_BY_STATUT: Record<string, number> = {
  'À planifier': 10,
  'En attente stock': 20,
  'En production': 50,
  'En finition': 75,
  'Prête': 90,
  'Livré': 100,
};

type Props = {
  commandes: KanbanCommande[];
  onRefresh: () => void;
};

export function CommandesKanban({ commandes, onRefresh }: Props) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const byStatut = useMemo(() => {
    const map: Record<string, KanbanCommande[]> = {};
    for (const col of KANBAN_COLUMNS) map[col] = [];
    for (const c of commandes) {
      if (map[c.statut]) map[c.statut].push(c);
      else if (!['Suspendu', 'Annulée'].includes(c.statut)) map['À planifier'].push(c);
    }
    return map;
  }, [commandes]);

  const moveCommande = useCallback(async (id: string, newStatut: string, numero: string) => {
    const avancement = AVANCEMENT_BY_STATUT[newStatut] ?? 0;
    try {
      const r = await liveFetch(`/api/commandes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatut, avancement }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(d, 'Changement de statut impossible'), 'Changement de statut impossible');
        return;
      }
      uxToast.success(`${numero} → ${newStatut}`, { icon: '✓' });
      onRefresh();
    } catch {
      uxToast.error('Erreur réseau');
    }
  }, [onRefresh]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
      {KANBAN_COLUMNS.map((col) => (
        <div
          key={col}
          className={`flex-shrink-0 w-[min(280px,85vw)] rounded-md p-2 transition-colors border border-[var(--border-subtle)] ${
            overCol === col ? 'bg-[var(--brand-primary-soft)] ring-1 ring-[var(--brand-primary)]' : 'bg-[var(--orion-surface-soft)]'
          }`}
          onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
          onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            setOverCol(null);
            const id = e.dataTransfer.getData('text/cmd-id');
            const from = e.dataTransfer.getData('text/from-statut');
            const numero = e.dataTransfer.getData('text/numero');
            if (id && from !== col) moveCommande(id, col, numero);
            setDraggingId(null);
          }}
        >
          <div className="flex items-center justify-between px-2 py-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{col}</span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">{byStatut[col]?.length ?? 0}</span>
          </div>
          <div className="space-y-2 min-h-[120px] max-h-[calc(100vh-280px)] overflow-y-auto">
            {(byStatut[col] ?? []).map((cmd) => (
              <div
                key={cmd.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/cmd-id', cmd.id);
                  e.dataTransfer.setData('text/from-statut', cmd.statut);
                  e.dataTransfer.setData('text/numero', cmd.numero);
                  setDraggingId(cmd.id);
                }}
                onDragEnd={() => setDraggingId(null)}
                className={`orion-card p-3 cursor-grab active:cursor-grabbing active:scale-[0.98] ${
                  draggingId === cmd.id ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <GripVertical size={14} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                  <button
                    type="button"
                    className="flex-1 text-left min-w-0"
                    onClick={() => router.push(`/commandes/${cmd.id}`)}
                  >
                    <p className="font-mono text-[10px] text-[var(--orion-red-vivid)]">{cmd.numero}</p>
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">{cmd.client?.name ?? '—'}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{cmd.article}</p>
                    {cmd.dateLiv && (
                      <p className="text-[9px] text-[var(--text-muted)] flex items-center gap-1 mt-1">
                        <Calendar size={9} />
                        {new Date(cmd.dateLiv).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-[var(--orion-yellow)]">{formatPrice(cmd.total)}</span>
                      {(cmd.reste ?? 0) > 0 && (
                        <span className="text-[9px] font-semibold text-amber-600">Reste {formatPrice(cmd.reste!)}</span>
                      )}
                      {cmd.priorite === 'Urgente' && (
                        <span className="text-[8px] font-bold text-[var(--orion-red-vivid)]">URGENT</span>
                      )}
                      {cmd.priorite === 'Haute' && (
                        <span className="text-[8px] font-bold text-orange-500">HAUTE</span>
                      )}
                    </div>
                    {cmd.nextAction?.label && (
                      <p className="text-[9px] text-primary font-semibold mt-1.5 truncate flex items-center gap-0.5">
                        <ArrowRight size={9} className="shrink-0" />
                        {cmd.nextAction.label}
                      </p>
                    )}
                    <div className="h-1 bg-[var(--orion-surface-muted)] rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-[var(--orion-red-vivid)]" style={{ width: `${cmd.avancement}%` }} />
                    </div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
