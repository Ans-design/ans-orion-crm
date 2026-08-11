'use client';

import type { CatalogueItem } from '@/lib/data/catalogue';
import type { ProductConfig } from '@/lib/data/config-types';
import {
  buildConfigurationSummaryRows,
  collectMissingFieldLabels,
  formatMissingFieldsShort,
} from '@/lib/pos/configuration-summary';
import type { PosPriceCalc } from '@/components/pos/pos-summary-content';

type Props = {
  article: CatalogueItem;
  config: Record<string, unknown>;
  productConfig: ProductConfig | null;
  priceCalc: PosPriceCalc;
  grandFormatM2?: { m2: number } | null;
  /** Limite d’affichage Soft UI (maquette ~6–8 lignes) */
  maxRows?: number;
};

/** Synthèse Soft UI — lignes icône + label / valeur (maquette sticky) */
export function PosConfigurationSummary({
  article,
  config,
  productConfig,
  priceCalc,
  grandFormatM2,
  maxRows = 8,
}: Props) {
  const rows = buildConfigurationSummaryRows({
    article,
    config,
    productConfig,
    quantity: priceCalc.qty,
    grandFormatM2: grandFormatM2?.m2 ?? null,
  }).filter((r) => r.key !== 'prix');

  const missing = collectMissingFieldLabels(productConfig, config);
  const missingShort = formatMissingFieldsShort(missing);
  const visible = rows.slice(0, maxRows);
  const hidden = Math.max(0, rows.length - visible.length);

  return (
    <div className="pos-synth-soft">
      <h3 className="pos-panel-title pos-synth-soft__title">Synthèse</h3>
      {visible.map((row) => (
        <div
          key={row.key}
          className={`pos-synth-soft__row ${row.complete ? '' : 'is-pending'}`}
        >
          <div className="pos-synth-soft__left">
            <span className="pos-synth-soft__ico" aria-hidden>
              {row.icon ?? '•'}
            </span>
            <span className="pos-synth-soft__label">
              {row.label}
              {row.priceImpactBadge === 'Impact prix' && (
                <span className="pos-impact-badge pos-impact-badge--mini">Prix</span>
              )}
              {row.priceImpactBadge === 'Descriptif' && (
                <span className="pos-impact-badge pos-impact-badge--info pos-impact-badge--mini">
                  Info
                </span>
              )}
            </span>
          </div>
          <span className={`pos-synth-soft__value ${row.complete ? '' : 'is-empty'}`}>
            {row.value}
          </span>
        </div>
      ))}
      {hidden > 0 && (
        <p className="pos-synth-soft__more">+{hidden} autre{hidden > 1 ? 's' : ''}</p>
      )}
      {missing.length > 0 && (
        <p className="pos-synth-soft__missing">Manquant : {missingShort}</p>
      )}
    </div>
  );
}
