'use client';

import { useMemo } from 'react';
import { evaluateBache } from '@/lib/grand-format/bache-rules';
import { formatClientDimensionsCm } from '@/lib/dimensions/grand-format-units';
import { laizeCmToChipLabel } from '@/lib/grand-format/laize-utils';

type Props = {
  config: Record<string, unknown>;
  prixM2?: number | null;
  compact?: boolean;
  className?: string;
  updateConfig?: (key: string, value: unknown) => void;
  /** summary = bloc plat dans « Détails techniques & matière » */
  placement?: 'inline' | 'summary';
};

export function BacheTechnicalPanel({
  config,
  prixM2,
  className = '',
  updateConfig,
}: Props) {
  const ev = useMemo(() => evaluateBache(config, { prixM2 }), [config, prixM2]);

  const hasDimensions = ev.longueurCm > 0 && ev.largeurCm > 0;
  if (!ev.typeBache && !hasDimensions) return null;

  const laizeLabel =
    ev.laize
    || ev.recommendedLaize
    || (ev.laizeUtiliseeCm != null ? laizeCmToChipLabel(ev.laizeUtiliseeCm) : null);

  const facturableFormula =
    ev.billableWidthCm > 0 && ev.billableLengthCm > 0
      ? `${ev.billableWidthCm} × ${ev.billableLengthCm} cm ÷ 10 000`
      : null;

  return (
    <section className={`pos-tech-block ${className}`}>
      <header className="pos-tech-block__head">
        <h3 className="pos-tech-block__title">Récapitulatif technique</h3>
        <span className="pos-tech-block__badge">Bâche</span>
      </header>

      <div className="pos-tech-dl">
        {ev.typeBache && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-mono font-semibold">{ev.typeBache}</span>
          </div>
        )}
        {ev.grammage && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Grammage</span>
            <span className="font-mono font-semibold">{ev.grammage}</span>
          </div>
        )}
        {hasDimensions && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dimensions client</span>
            <span className="font-mono font-semibold">
              {formatClientDimensionsCm(ev.longueurCm, ev.largeurCm)}
            </span>
          </div>
        )}
        {laizeLabel && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{ev.laize ? 'Laize' : 'Laize recommandée'}</span>
            <span className="font-mono font-semibold">{laizeLabel}</span>
          </div>
        )}
        {ev.surfaceReelleM2 > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Surface réelle</span>
            <span className="font-mono">{ev.surfaceReelleM2.toFixed(2)} m²</span>
          </div>
        )}
        {ev.surfaceLaizeM2 > 0 && ev.surfaceLaizeM2 !== ev.surfaceReelleM2 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Surface consommée laize</span>
            <span className="font-mono">{ev.surfaceLaizeM2.toFixed(2)} m²</span>
          </div>
        )}
        {ev.surfaceFacturableM2 > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Surface facturable</span>
            <span className="font-mono font-bold text-[#FF174D]">
              {ev.surfaceFacturableM2.toFixed(2)} m²
            </span>
          </div>
        )}
        {facturableFormula && (
          <p className="pos-tech-note" style={{ marginBottom: 0 }}>
            Calcul :{' '}
            <strong className="font-mono text-foreground">{facturableFormula}</strong>
            {' = '}
            <strong className="font-mono text-[#FF174D]">{ev.surfaceFacturableM2.toFixed(2)} m²</strong>
          </p>
        )}
        {ev.laizeRuleLabel && (
          <p className="pos-tech-note" style={{ marginBottom: 0 }}>
            {ev.laizeRuleLabel}
          </p>
        )}
        {ev.assemblageRequired && (
          <p className="text-[10px] text-[#F59E0B] font-semibold">
            Assemblage — {ev.strips} bande(s)
          </p>
        )}
        {ev.finalTotal != null && ev.finalTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {ev.manualPriceApplied ? 'Prix manuel' : 'Prix estimé'}
            </span>
            <span className="font-mono font-bold text-[#FF174D]">
              {ev.finalTotal.toLocaleString('fr-FR')} Ar
            </span>
          </div>
        )}
        {ev.warnings.slice(0, 2).map((w) => (
          <p key={w} className="text-[10px] text-[#F59E0B] font-semibold m-0">
            {w}
          </p>
        ))}
        {ev.warnings.some((w) => w.includes('Stock insuffisant')) && !config.stock_override && updateConfig && (
          <button
            type="button"
            onClick={() => updateConfig('stock_override', true)}
            className="pos-bache-tech__btn"
          >
            Commander malgré stock insuffisant
          </button>
        )}
        {ev.errors.map((e) => (
          <p key={e} className="text-[10px] text-[#F59E0B] font-semibold m-0">
            {e}
          </p>
        ))}
      </div>
    </section>
  );
}

export function useBacheRules(config: Record<string, unknown>, prixM2?: number | null) {
  return useMemo(() => evaluateBache(config, { prixM2 }), [config, prixM2]);
}
