'use client';

import { useMemo } from 'react';
import type { GrandFormatBillableResult } from '@/lib/grand-format/types';
import type { GfStockKind } from '@/lib/grand-format/types';

type Props = {
  billable: GrandFormatBillableResult | null;
  qty?: number;
  stockKind?: GfStockKind | null;
  epaisseur?: string | null;
  epaisseurAutre?: string | null;
  compact?: boolean;
  className?: string;
};

const ORIENTATION_LABELS: Record<string, string> = {
  normal: 'normale',
  rotation: 'rotation sur rouleau',
  assemblage: 'assemblage / raccord',
};

export function GrandFormatTechnicalPanel({
  billable,
  qty = 1,
  stockKind = null,
  epaisseur = null,
  epaisseurAutre = null,
  compact = false,
  className = '',
}: Props) {
  const q = Math.max(1, qty);
  const isPlaque = stockKind === 'plaque';

  const totals = useMemo(() => {
    if (!billable) return null;
    return {
      reelle: Math.round(billable.surfaceReelleM2 * q * 100) / 100,
      laize: Math.round(billable.surfaceLaizeM2 * q * 100) / 100,
      facturable: Math.round(
        (billable.pricingSurfaceMode === 'laize'
          ? billable.surfaceLaizeM2
          : billable.surfaceFactureeM2) *
          q *
          100,
      ) / 100,
    };
  }, [billable, q]);

  if (!billable || billable.surfaceReelleM2 <= 0) return null;

  const tone = billable.assemblageRequired || billable.surDevis
    ? 'border-[#F59E0B]/40 bg-[#F59E0B]/5'
    : 'border-accent-brand/30 bg-accent-brand/5';

  const epaisseurLabel = (() => {
    const chip = String(epaisseur ?? '').trim();
    if (!chip) return null;
    if (/autres|personnalis/i.test(chip)) {
      const autre = String(epaisseurAutre ?? '').trim();
      return autre ? `${autre} mm` : chip;
    }
    return chip;
  })();

  return (
    <div
      className={`rounded-[7px] border p-3 space-y-2 ${tone} ${compact ? 'text-[10px]' : 'text-xs'} ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-bold uppercase tracking-wide text-accent-brand">Récapitulatif technique</p>

      <dl className="grid gap-0.5 text-muted-foreground">
        <div className="flex gap-2">
          <dt className="shrink-0">Dimensions client :</dt>
          <dd>
            {billable.clientLargeurCm} × {billable.clientHauteurCm} cm
          </dd>
        </div>
        {epaisseurLabel && (
          <div className="flex gap-2">
            <dt className="shrink-0">Épaisseur :</dt>
            <dd>{epaisseurLabel}</dd>
          </div>
        )}
        {billable.laizeLabel && (
          <div className="flex gap-2">
            <dt className="shrink-0">{isPlaque ? 'Dimension plaque :' : 'Laize :'}</dt>
            <dd>{billable.laizeLabel}</dd>
          </div>
        )}
        {billable.orientation && !isPlaque && (
          <div className="flex gap-2">
            <dt className="shrink-0">Orientation :</dt>
            <dd>{ORIENTATION_LABELS[billable.orientation] ?? billable.orientation}</dd>
          </div>
        )}
      </dl>

      <div className="pt-1 border-t border-border/50 space-y-0.5">
        <p>
          Surface réelle{q > 1 ? ' unitaire' : ''} :{' '}
          <strong className="text-foreground">{billable.surfaceReelleM2.toFixed(2)} m²</strong>
        </p>
        {!isPlaque &&
          billable.surfaceLaizeM2 > 0 &&
          billable.surfaceLaizeM2 !== billable.surfaceReelleM2 && (
            <p>
              Surface consommée laize{q > 1 ? ' unitaire' : ''} :{' '}
              <strong className="text-foreground">{billable.surfaceLaizeM2.toFixed(2)} m²</strong>
            </p>
          )}
        {billable.surfaceFactureeM2 > 0 &&
          billable.pricingSurfaceMode !== 'laize' &&
          billable.surfaceFactureeM2 !== billable.surfaceReelleM2 && (
            <p>
              Surface facturable{q > 1 ? ' unitaire' : ''} :{' '}
              <strong className="text-foreground">{billable.surfaceFactureeM2.toFixed(2)} m²</strong>
            </p>
          )}
        {billable.margeDecoupePercent != null && billable.margeDecoupePercent > 0 && (
          <p>
            Marge découpe :{' '}
            <strong className="text-foreground">
              {billable.margeDecoupePercent}%
              {billable.margeDecoupeAr != null && billable.margeDecoupeAr > 0
                ? ` (+${billable.margeDecoupeAr.toLocaleString('fr-FR')} Ar)`
                : ''}
            </strong>
          </p>
        )}
        {q > 1 && totals && (
          <>
            <p className="text-muted-foreground pt-1">
              Surface réelle totale :{' '}
              <strong className="text-foreground">{totals.reelle.toFixed(2)} m²</strong>
            </p>
            {!isPlaque && (
              <p className="text-muted-foreground">
                Surface laize totale :{' '}
                <strong className="text-foreground">{totals.laize.toFixed(2)} m²</strong>
              </p>
            )}
          </>
        )}
        {billable.ruleMessage && (
          <p className="text-muted-foreground italic text-[10px]">{billable.ruleMessage}</p>
        )}
        {billable.assemblageRequired && (
          <p className="text-[#F59E0B] font-medium">
            Assemblage requis — {billable.strips} bande(s)
          </p>
        )}
      </div>

      {billable.prixUnitaire > 0 && !billable.surDevis && (
        <p className="font-medium text-accent-brand">
          Prix estimé unitaire : {billable.prixUnitaire.toLocaleString('fr-FR')} Ar
          {billable.prixM2 != null && billable.prixM2 > 0
            ? ` (${billable.prixM2.toLocaleString('fr-FR')} Ar/m²)`
            : ''}
        </p>
      )}

      {billable.warning && (
        <p className="text-[#F59E0B] font-medium">{billable.warning}</p>
      )}
    </div>
  );
}
