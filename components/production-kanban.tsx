'use client';

import { motion } from 'framer-motion';
import { Factory, GripVertical } from 'lucide-react';

const COLUMNS = [
  { key: 'En attente', label: 'En attente', color: 'border-yellow-500/30 bg-yellow-500/5' },
  { key: 'En cours', label: 'En cours', color: 'border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]' },
  { key: 'Terminé', label: 'Terminé', color: 'border-green-500/30 bg-green-500/5' },
  { key: 'Bloqué', label: 'Bloqué', color: 'border-red-500/30 bg-red-500/5' },
];

type ProdItem = {
  id: string;
  statut: string;
  priorite?: string;
  operateur?: string | null;
  commande?: { numero?: string; article?: string; client?: { name?: string } | null } | null;
};

type Props = {
  items: ProdItem[];
  onSelect: (item: ProdItem) => void;
  onMove: (id: string, newStatut: string) => void;
};

/** Vue Kanban production — colonnes par statut */
export function ProductionKanban({ items, onSelect, onMove }: Props) {
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('prodId', id);
  };

  const onDrop = (e: React.DragEvent, statut: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('prodId');
    if (id) onMove(id, statut);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const colItems = items.filter((p) => p.statut === col.key);
        return (
          <div
            key={col.key}
            className={`rounded-[7px] border p-3 min-h-[280px] ${col.color}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wide">{col.label}</h3>
              <span className="text-xs bg-background/80 px-2 py-0.5 rounded-full">{colItems.length}</span>
            </div>
            <div className="space-y-2">
              {colItems.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  draggable
                  onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, p.id)}
                  onClick={() => onSelect(p)}
                  className="bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors"
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
                        {p.operateur && <span className="text-[10px] text-muted-foreground">· {p.operateur}</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {colItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Glissez une carte ici</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
