'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Power, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  catalogDef,
  type PriceBlock,
} from '@/lib/pricing/price-builder-blocks';

type Props = {
  blocks: PriceBlock[];
  selectedId: string | null;
  canEdit: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onAddRequest?: () => void;
};

function blockSummary(block: PriceBlock): string {
  const def = catalogDef(block.kind);
  if (!block.enabled) return 'Désactivé — non inclus dans le calcul';
  if (def.requiresValue && block.value != null) {
    return `${def.valueLabel ?? 'Valeur'} : ${block.value} ${def.valueUnit ?? ''}`.trim();
  }
  return def.description;
}

export function FormulaCanvas({
  blocks,
  selectedId,
  canEdit,
  onSelect,
  onToggle,
  onRemove,
  onMove,
  onAddRequest,
}: Props) {
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null);

  return (
    <div className="fw-canvas" aria-label="Canvas du constructeur">
      <ol className="fw-block-list">
        {blocks.map((block, idx) => {
          const def = catalogDef(block.kind);
          const selected = selectedId === block.id;
          const label = block.label?.trim() || def.label;
          return (
            <li key={block.id}>
              <article
                className={cn(
                  'fw-block-row',
                  selected && 'is-selected',
                  !block.enabled && 'is-disabled',
                )}
              >
                <button
                  type="button"
                  className="fw-block-row__main"
                  onClick={() => onSelect(block.id)}
                  aria-pressed={selected}
                >
                  <span className="fw-num" aria-hidden>{idx + 1}</span>
                  <span className="fw-block-row__text">
                    <span className="fw-block-row__label">{label}</span>
                    <span className="fw-block-row__summary">{blockSummary(block)}</span>
                  </span>
                </button>

                <span
                  className={cn('fw-state-pill', block.enabled ? 'is-on' : 'is-off')}
                >
                  {block.enabled ? 'Actif' : 'Inactif'}
                </span>

                {canEdit ? (
                  <div className="fw-block-row__actions" aria-label={`Actions du bloc ${label}`}>
                    <button
                      type="button"
                      className="fw-icon-btn"
                      title={block.enabled ? 'Désactiver' : 'Activer'}
                      aria-label={block.enabled ? 'Désactiver le bloc' : 'Activer le bloc'}
                      onClick={() => onToggle(block.id)}
                    >
                      <Power className={cn('h-4 w-4', block.enabled ? 'text-emerald-600' : 'text-slate-400')} />
                    </button>
                    <button
                      type="button"
                      className="fw-icon-btn"
                      disabled={idx <= 0}
                      aria-label="Monter"
                      title="Monter"
                      onClick={() => onMove(block.id, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="fw-icon-btn"
                      disabled={idx >= blocks.length - 1}
                      aria-label="Descendre"
                      title="Descendre"
                      onClick={() => onMove(block.id, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="fw-icon-btn tone-danger"
                      aria-label="Retirer le bloc"
                      title="Retirer du brouillon"
                      onClick={() => setRemoveTarget({ id: block.id, label })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}

                <GripVertical className="fw-block-row__grip" aria-hidden />
              </article>
            </li>
          );
        })}
      </ol>

      {blocks.length === 0 ? (
        <p className="fw-empty fw-canvas__empty">
          Aucun bloc — ajoutez un premier bloc de calcul pour construire la formule.
        </p>
      ) : null}

      {canEdit ? (
        <button type="button" className="fw-add-block" onClick={onAddRequest}>
          <Plus className="h-4 w-4" aria-hidden />
          Ajouter un bloc de calcul
        </button>
      ) : null}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Retirer ce bloc du brouillon ?"
        description={
          removeTarget
            ? `Le bloc « ${removeTarget.label} » sera retiré du calcul. Le résultat tarifaire peut changer après enregistrement.`
            : undefined
        }
        confirmLabel="Retirer le bloc"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={() => {
          if (removeTarget) onRemove(removeTarget.id);
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}
