'use client';

import { deriveMaterialTableFields } from '@/lib/backoffice/material-table-fields';
import type { MaterialPriceUnifiedRow } from './types';

export function MaterialCharacteristicCell({ row }: { row: MaterialPriceUnifiedRow }) {
  const fields = deriveMaterialTableFields(row);
  const c = fields.mainCharacteristic;

  if (!c) {
    return <span className="orion-master-muted">—</span>;
  }

  return (
    <span
      className={`orion-master-char-cell${c.isInconsistent ? ' is-inconsistent' : ''}`}
      title={c.isInconsistent ? `${c.display} — unité incohérente détectée` : c.display}
    >
      <span className="orion-master-char-type">{c.typeLabel}</span>
      <span className="orion-master-char-value">{c.displayValue}</span>
    </span>
  );
}
