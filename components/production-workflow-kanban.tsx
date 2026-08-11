'use client';

import { motion } from 'framer-motion';
import { Factory, GripVertical } from 'lucide-react';

export const WORKFLOW_COLUMNS = [
  { key: 'PAO', label: 'PAO', color: 'border-violet-500/30 bg-violet-500/5' },
  { key: 'Impression', label: 'Impression', color: 'border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]' },
  { key: 'Finition', label: 'Finition', color: 'border-[color-mix(in_srgb,var(--ans-plum-700,#9D174D)_30%,transparent)] bg-[color-mix(in_srgb,var(--ans-plum-700,#9D174D)_5%,transparent)]' },
  { key: 'Découpe', label: 'Découpe', color: 'border-rose-500/30 bg-rose-500/5' },
  { key: 'QA', label: 'Contrôle QA', color: 'border-amber-500/30 bg-amber-500/5' },
  { key: 'Emballage', label: 'Emballage', color: 'border-orange-500/30 bg-orange-500/5' },
  { key: 'Terminé', label: 'Terminé', color: 'border-green-500/30 bg-green-500/5' },
];

type Etape = { nom: string; statut: string; ordre: number };
type ProdItem = {
  id: string;
  statut: string;
  priorite?: string;
  operateur?: string | null;
  etapes?: Etape[];
  commande?: { numero?: string; article?: string; client?: { name?: string } | null } | null;
};

function resolveWorkflowColumn(item: ProdItem): string {
  if (item.statut === 'Terminé') return 'Terminé';
  if (item.statut === 'Bloqué') return 'PAO';
  const etapes = [...(item.etapes ?? [])].sort((a, b) => a.ordre - b.ordre);
  const active = etapes.find((e) => e.statut === 'En cours')
    ?? etapes.find((e) => e.statut === 'À faire');
  if (!active) return item.statut === 'En attente' ? 'PAO' : 'Terminé';
  const nom = active.nom.toLowerCase();
  if (nom.includes('pao') || nom.includes('préparation')) return 'PAO';
  if (nom.includes('impression')) return 'Impression';
  if (nom.includes('finition')) return 'Finition';
  if (nom.includes('découpe') || nom.includes('decoupe')) return 'Découpe';
  if (nom.includes('contrôle') || nom.includes('controle') || nom.includes('qualité') || nom.includes('qualite') || nom.includes('qa')) return 'QA';
  if (nom.includes('emballage')) return 'Emballage';
  return 'Finition';
}

type Props = {
  items: ProdItem[];
  onSelect: (item: ProdItem) => void;
};

/** Kanban atelier par phase (PAO → QA → Emballage) */
export function ProductionWorkflowKanban({ items, onSelect }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
      {WORKFLOW_COLUMNS.map((col) => {
        const colItems = items.filter((p) => resolveWorkflowColumn(p) === col.key);
        return (
          <div
            key={col.key}
            className={`rounded-[7px] border p-3 min-w-[220px] max-w-[260px] flex-shrink-0 snap-start min-h-[280px] ${col.color}`}
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
                  onClick={() => onSelect(p)}
                  className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-[#FFD60A]/40 transition-colors"
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
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {colItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { resolveWorkflowColumn };
