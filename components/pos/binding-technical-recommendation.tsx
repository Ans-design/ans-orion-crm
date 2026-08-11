'use client';

import { useMemo } from 'react';
import {
  evaluateBinding,
  evaluateBindingFromConfig,
  resolveBindingLabelFromConfig,
  type BindingEvaluation,
} from '@/lib/print/binding-rules';

type Props = {
  config: Record<string, unknown>;
  bindingLabel?: string;
  compact?: boolean;
  className?: string;
};

function BindingBlock({ ev, compact }: { ev: BindingEvaluation; compact?: boolean }) {
  const tone =
    !ev.compatible || !ev.valid
      ? 'border-[#F59E0B]/40 bg-[#F59E0B]/5'
      : 'border-accent-brand/30 bg-accent-brand/5';
  const titleColor = !ev.compatible || !ev.valid ? 'text-[#F59E0B]' : 'text-accent-brand';

  return (
    <div
      className={`rounded-[7px] border p-3 space-y-1.5 ${tone} ${compact ? 'text-[10px]' : 'text-xs'}`}
      role="status"
      aria-live="polite"
    >
      <p className={`font-bold uppercase tracking-wide ${titleColor}`}>
        Référence technique recommandée
      </p>

      {ev.pageCount != null && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
          <span>
            Pages : <strong className="text-foreground">{ev.pageCount}</strong>
          </span>
          <span>{ev.printModeLabel}</span>
          {ev.physicalSheets != null && (
            <span>
              Feuilles physiques :{' '}
              <strong className="text-foreground">{ev.physicalSheets}</strong>
            </span>
          )}
          <span>Grammage : {ev.paperWeightLabel}</span>
        </div>
      )}

      {ev.referenceLabel && ev.compatible && (
        <p className="font-semibold text-foreground">{ev.referenceLabel}</p>
      )}

      {ev.maxCapacityLabel && ev.compatible && (
        <p className="text-muted-foreground">Capacité : {ev.maxCapacityLabel}</p>
      )}

      {ev.spineMmCalculated != null && ev.compatible && (
        <p className="text-muted-foreground">
          Épaisseur calculée :{' '}
          <strong className="text-foreground">
            {ev.spineMmCalculated.toLocaleString('fr-FR')} mm
          </strong>
          {ev.spineMmRange ? ` · Tranche tarifaire : ${ev.spineMmRange}` : ''}
        </p>
      )}

      {ev.priceAr != null && ev.compatible && (
        <p className="font-medium text-accent-brand">
          Prix : {ev.priceAr.toLocaleString('fr-FR')} Ar / exemplaire
        </p>
      )}

      {(!ev.compatible || !ev.valid) && (
        <div className="space-y-0.5">
          {ev.errors.map((e) => (
            <p key={e} className="text-[#F59E0B] font-medium">
              {e}
            </p>
          ))}
        </div>
      )}

      {ev.warnings.map((w) => (
        <p key={w} className="text-muted-foreground italic">
          {w}
        </p>
      ))}
    </div>
  );
}

export function BindingTechnicalRecommendation({
  config,
  bindingLabel,
  compact = false,
  className = '',
}: Props) {
  const ev = useMemo(() => {
    const label = bindingLabel ?? resolveBindingLabelFromConfig(config);
    if (!label || label === 'Sans reliure' || label === 'Pelliculé' || label === 'Pli simple') {
      return null;
    }
    if (bindingLabel) {
      return evaluateBinding(bindingLabel, config);
    }
    return evaluateBindingFromConfig(config);
  }, [config, bindingLabel]);

  const label = bindingLabel ?? resolveBindingLabelFromConfig(config);
  if (!label || !ev) return null;

  return (
    <div className={className}>
      <BindingBlock ev={ev} compact={compact} />
    </div>
  );
}

export function useBindingRules(config: Record<string, unknown>, bindingLabel?: string) {
  return useMemo(() => {
    const label = bindingLabel ?? resolveBindingLabelFromConfig(config);
    const evaluation = label
      ? evaluateBinding(label, config)
      : evaluateBindingFromConfig(config);
    return { evaluation, label };
  }, [config, bindingLabel]);
}
