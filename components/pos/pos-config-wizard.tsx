'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ConfigSection, ProductConfig } from '@/lib/data/config-types';
import {
  buildPosWizardStages,
  resolveWizardStageIndex,
} from '@/lib/pos/step-assistant';
import { PosStepAssistant } from '@/components/pos/pos-step-assistant';
import { PosFieldPriceImpactBadge } from '@/components/pos/pos-field-price-impact-badge';

type Props = {
  articleId: string;
  productConfig: ProductConfig;
  config: Record<string, unknown>;
  completion: { done: number; total: number; pct: number };
  /** Rend la section filtrée pour le champ actif (et éventuels siblings) */
  renderStage: (args: {
    section: ConfigSection;
    fieldKeys: string[];
    stepIndex: number;
    stepLabel: string;
  }) => ReactNode;
};

/**
 * Wizard POS — une étape à la fois (matière+grammage, L×P×H regroupés).
 * Synthèse à droite inchangée.
 */
export function PosConfigWizard({
  articleId,
  productConfig,
  config,
  completion,
  renderStage,
}: Props) {
  const stages = useMemo(
    () => buildPosWizardStages(productConfig, config),
    [productConfig, config],
  );

  const defaultKey =
    stages.find((s) => s.isCurrent)?.primaryKey
    ?? stages[0]?.primaryKey
    ?? null;

  const [activeKey, setActiveKey] = useState<string | null>(defaultKey);

  useEffect(() => {
    if (!stages.length) {
      setActiveKey(null);
      return;
    }
    const stillValid =
      activeKey && stages.some((s) => s.fieldKeys.includes(activeKey));
    if (!stillValid) {
      setActiveKey(defaultKey);
    }
  }, [stages, activeKey, defaultKey]);

  const stageIndex = resolveWizardStageIndex(stages, activeKey);
  const current = stages[stageIndex];
  const section = current?.section ?? null;
  const fieldKeys = current?.fieldKeys ?? [];

  const go = (delta: number) => {
    const next = stageIndex + delta;
    if (next < 0 || next >= stages.length) return;
    setActiveKey(stages[next]!.primaryKey);
  };

  if (!stages.length) return null;

  return (
    <div className="pos-wizard">
      <PosStepAssistant
        productConfig={productConfig}
        config={config}
        completion={completion}
        activeFieldKey={activeKey}
        onSelectField={setActiveKey}
        wizardStages={stages}
        className="pos-wizard__stepper"
      />

      <section className="pos-wizard-stage" aria-label={`Étape ${stageIndex + 1}`}>
        <header className="pos-wizard-stage__head">
          <div className="pos-wizard-stage__icon" aria-hidden>
            {section?.icon ?? '•'}
          </div>
          <div className="pos-wizard-stage__titles min-w-0">
            <h2 className="pos-wizard-stage__title">
              {current?.label ?? section?.title ?? 'Configuration'}
            </h2>
            <p className="pos-wizard-stage__sub">
              {fieldKeys.length > 1
                ? 'Complétez les options de cette étape.'
                : current?.fields[0]?.label && current.fields[0].label !== current.label
                  ? current.fields[0].label
                  : 'Complétez ce paramètre pour continuer.'}
            </p>
          </div>
          <span className="pos-wizard-stage__count tabular-nums">
            {String(stageIndex + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}
          </span>
          {current?.fields[0] ? (
            <PosFieldPriceImpactBadge articleId={articleId} field={current.fields[0]} />
          ) : null}
        </header>

        <div className="pos-wizard-stage__body">
          {section && fieldKeys.length > 0
            ? renderStage({
                section,
                fieldKeys,
                stepIndex: stageIndex,
                stepLabel: current?.label ?? '',
              })
            : (
              <p className="text-[11px] text-muted-foreground p-3">
                Aucun champ pour cette étape.
              </p>
            )}
        </div>

        <footer className="pos-wizard-stage__actions">
          <button
            type="button"
            className="pos-wizard-stage__btn pos-wizard-stage__btn--prev"
            onClick={() => go(-1)}
            disabled={stageIndex <= 0}
          >
            ← Précédent
          </button>
          <span className="pos-wizard-stage__progress">
            <b>{completion.done}</b>
            {' '}
            / {completion.total} champs
          </span>
          <button
            type="button"
            className="pos-wizard-stage__btn pos-wizard-stage__btn--next"
            onClick={() => {
              if (stageIndex >= stages.length - 1) {
                document
                  .querySelector('.pos-config-summary')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return;
              }
              go(1);
            }}
          >
            {stageIndex >= stages.length - 1 ? 'Voir la synthèse' : 'Suivant →'}
          </button>
        </footer>
      </section>
    </div>
  );
}
