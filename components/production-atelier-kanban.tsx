'use client';

import { Factory, GripVertical } from 'lucide-react';

import { COLUMN_PATTERNS, matchEtape, type AtelierColumnKey } from '@/lib/production/atelier-columns';

/** 10 colonnes métier atelier — flux imprimerie complet */
export const ATELIER_COLUMNS = [
  { key: 'nouvelle', label: 'Nouvelle commande', color: 'border-slate-500/30 bg-slate-500/5' },
  { key: 'preparer', label: 'À préparer', color: 'border-violet-500/30 bg-violet-500/5' },
  { key: 'design', label: 'Design à valider', color: 'border-pink-500/30 bg-pink-500/5' },
  { key: 'fichier', label: 'Fichier reçu', color: 'border-rose-500/30 bg-rose-500/5' },
  { key: 'impression', label: 'En impression', color: 'border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]' },
  { key: 'finition', label: 'Finition', color: 'border-[color-mix(in_srgb,var(--ans-plum-700,#9D174D)_30%,transparent)] bg-[color-mix(in_srgb,var(--ans-plum-700,#9D174D)_5%,transparent)]' },
  { key: 'qa', label: 'Contrôle qualité', color: 'border-amber-500/30 bg-amber-500/5' },
  { key: 'pret_livraison', label: 'Prêt livraison', color: 'border-orange-500/30 bg-orange-500/5' },
  { key: 'livre', label: 'Livré', color: 'border-green-500/30 bg-green-500/5' },
  { key: 'bloque', label: 'Bloqué', color: 'border-red-500/30 bg-red-500/5' },
] as const;

export type { AtelierColumnKey };

type Etape = { id: string; nom: string; statut: string; ordre: number };
type ProdItem = {
  id: string;
  statut: string;
  priorite?: string;
  operateur?: string | null;
  avancement?: number;
  etapes?: Etape[];
  commande?: { numero?: string; article?: string; client?: { name?: string } | null } | null;
};

function matchEtapeLocal(nom: string, patterns: string[]): boolean {
  return matchEtape(nom, patterns);
}

export function resolveAtelierColumn(item: ProdItem): AtelierColumnKey {
  if (item.statut === 'Bloqué') return 'bloque';
  if (item.statut === 'Terminé') return 'livre';

  const etapes = [...(item.etapes ?? [])].sort((a, b) => a.ordre - b.ordre);
  const allPending = etapes.every((e) => e.statut === 'À faire');
  if (item.statut === 'En attente' || allPending) return 'nouvelle';

  const allDone = etapes.length > 0 && etapes.every((e) => e.statut === 'Terminé' || e.statut === 'Sauté');
  if (allDone) return 'pret_livraison';

  const active = etapes.find((e) => e.statut === 'En cours')
    ?? etapes.find((e) => e.statut === 'À faire');
  if (!active) return 'nouvelle';

  for (const col of ATELIER_COLUMNS) {
    if (col.key === 'nouvelle' || col.key === 'livre' || col.key === 'bloque') continue;
    if (matchEtapeLocal(active.nom, COLUMN_PATTERNS[col.key])) return col.key;
  }
  return 'finition';
}

export { COLUMN_PATTERNS, matchEtape };

type Props = {
  items: ProdItem[];
  onSelect: (item: ProdItem) => void;
  onMove: (id: string, column: AtelierColumnKey) => void;
};

/** Kanban atelier 10 colonnes — drag & drop persisté via callback parent */
export function ProductionAtelierKanban({ items, onSelect, onMove }: Props) {
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('prodId', id);
  };

  const onDrop = (e: React.DragEvent, column: AtelierColumnKey) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('prodId');
    if (id) onMove(id, column);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
      {ATELIER_COLUMNS.map((col) => {
        const colItems = items.filter((p) => resolveAtelierColumn(p) === col.key);
        return (
          <div
            key={col.key}
            className={`rounded-[7px] border p-3 min-w-[200px] max-w-[220px] flex-shrink-0 snap-start min-h-[280px] ${col.color}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wide leading-tight">{col.label}</h3>
              <span className="text-xs bg-background/80 px-2 py-0.5 rounded-full">{colItems.length}</span>
            </div>
            <div className="space-y-2">
              {colItems.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, p.id)}
                  onClick={() => onSelect(p)}
                  className="bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-[#FFD60A]/40 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{p.commande?.numero || p.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.commande?.client?.name || 'Sans client'}</p>
                      <p className="text-xs truncate mt-1">{p.commande?.article}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Factory size={12} className="text-[#FFD60A]" />
                        <span className="text-[10px] text-muted-foreground">{p.priorite || 'Normal'}</span>
                        {p.avancement != null && (
                          <span className="text-[10px] font-mono text-[#FF174D]">{p.avancement}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {colItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Glissez ici</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

