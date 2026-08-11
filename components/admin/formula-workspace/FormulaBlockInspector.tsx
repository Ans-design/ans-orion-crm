'use client';

import { cn } from '@/lib/utils';
import {
  catalogDef,
  type PriceBlock,
} from '@/lib/pricing/price-builder-blocks';

type Props = {
  block: PriceBlock | null;
  canEdit: boolean;
  onChange: (next: PriceBlock) => void;
};

export function FormulaBlockInspector({ block, canEdit, onChange }: Props) {
  if (!block) {
    return (
      <div className="fw-panel">
        <div className="fw-insp-head">
          <h3 className="fw-section-title">Inspecteur</h3>
          <p className="fw-insp-head__sub">Aucun bloc sélectionné</p>
        </div>
        <p className="fw-muted text-sm">Sélectionnez un bloc sur le canvas pour le configurer.</p>
      </div>
    );
  }

  const def = catalogDef(block.kind);

  return (
    <div className="fw-panel" aria-label="Inspecteur de bloc">
      <div className="fw-insp-head">
        <h3 className="fw-section-title">Inspecteur</h3>
        <p className="fw-insp-head__sub">Bloc sélectionné</p>
      </div>

      <div className="fw-inspector-sections">
        <label className="fw-field">
          <span className="fw-field__label">Libellé</span>
          <input
            className="fw-input"
            value={block.label ?? def.label}
            disabled={!canEdit}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
          />
        </label>

        <div className="fw-field">
          <span className="fw-field__label">Type de calcul</span>
          <select className="fw-select" value={block.kind} disabled aria-label="Type de calcul">
            <option value={block.kind}>{def.label}</option>
          </select>
        </div>

        <div className="fw-field">
          <span className="fw-field__label">Configuration</span>
          {def.requiresValue ? (
            <label className="fw-insp-value">
              <span className="fw-insp-value__label">
                {def.valueLabel ?? 'Valeur'}
                {def.valueUnit ? ` (${def.valueUnit})` : ''}
              </span>
              <input
                type="number"
                className="fw-input"
                value={block.value ?? ''}
                disabled={!canEdit}
                onChange={(e) =>
                  onChange({
                    ...block,
                    value: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </label>
          ) : (
            <p className="fw-insp-config-note">{def.description}</p>
          )}
          {block.kind === 'minimum' ? (
            <p className="fw-hint">Plancher de prix — le total ne descend pas sous cette valeur.</p>
          ) : null}
          {block.kind === 'margin_percent' ? (
            <p className="fw-hint">
              Taux de marque sur coût. Le taux de marge (sur prix de vente) est distinct.
            </p>
          ) : null}
          {block.kind === 'material_cost' || block.kind === 'option_modifiers' ? (
            <p className="fw-hint">
              Sources = matières / options canoniques du produit (pas de module parallèle).
            </p>
          ) : null}
        </div>

        <div className="fw-insp-toggle">
          <div className="min-w-0">
            <p className="fw-insp-toggle__label">Actif dans le calcul</p>
            <p className="fw-insp-toggle__sub">Appliqué après enregistrement</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={block.enabled}
            aria-label="Actif dans le calcul"
            className={cn('fw-switch', block.enabled && 'is-on')}
            disabled={!canEdit}
            onClick={() => onChange({ ...block, enabled: !block.enabled })}
          >
            <span className="fw-switch__thumb" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
