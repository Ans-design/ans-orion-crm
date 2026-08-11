'use client';

import { Plus } from 'lucide-react';
import {
  PRICE_BLOCK_CATALOG,
  type PriceBlockKind,
} from '@/lib/pricing/price-builder-blocks';
import { stageForBlockKind, FORMULA_STAGE_LABELS } from '@/lib/pricing/formula-display';

type Props = {
  canEdit: boolean;
  onAdd: (kind: PriceBlockKind) => void;
};

const GROUPS: { title: string; kinds: PriceBlockKind[] }[] = [
  {
    title: 'Bases',
    kinds: ['base_fixed', 'base_tier', 'surface_m2', 'surface_cm2'],
  },
  {
    title: 'Matières & options',
    kinds: ['material_cost', 'option_modifiers', 'finishing'],
  },
  {
    title: 'Charges & marge',
    kinds: ['labor', 'surcharge_fixed', 'waste_percent', 'margin_percent'],
  },
  {
    title: 'Finalisation',
    kinds: ['discount_percent', 'minimum', 'round_ar'],
  },
];

export function FormulaBlockPalette({ canEdit, onAdd }: Props) {
  if (!canEdit) {
    return (
      <div className="fw-panel">
        <h3 className="fw-section-title">Palette</h3>
        <p className="fw-muted text-sm">Lecture seule — ajout de blocs désactivé.</p>
      </div>
    );
  }

  return (
    <div className="fw-panel" aria-label="Palette de blocs">
      <h3 className="fw-section-title">Ajouter un bloc</h3>
      <p className="fw-muted mb-2 text-[12px]">
        Cliquez pour insérer. Configurez ensuite dans l’inspecteur.
      </p>
      <div className="space-y-3">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="fw-palette-group-title">{g.title}</div>
            <ul className="fw-palette-list">
              {g.kinds.map((kind) => {
                const def = PRICE_BLOCK_CATALOG.find((d) => d.kind === kind)!;
                return (
                  <li key={kind}>
                    <button
                      type="button"
                      className="fw-palette-item"
                      onClick={() => onAdd(kind)}
                      title={`${FORMULA_STAGE_LABELS[stageForBlockKind(kind)]} — ${def.description}`}
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        <span className="block text-[13px] font-medium">{def.label}</span>
                        <span className="block text-[11px] text-slate-500">{def.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
