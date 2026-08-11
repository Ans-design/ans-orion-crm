/**
 * Probe prix couvertures livre A4 (1×) — pelliculé vs PCB vs PVC.
 * Usage: npx tsx scripts/probe-cover-material-prices.ts
 */
import { computePublicationPrice } from '../lib/pricing/publication-core';
import {
  resetPublicationRuntimeParams,
  setPublicationRuntimeParams,
} from '../lib/pricing/publication-pricing-rules';
import { resolveImpressionSfPaperPriceKey, paperTierUnitPrice } from '../lib/pricing/impression-sf-pricing';

resetPublicationRuntimeParams();
setPublicationRuntimeParams({ utilisePalier: false, allowFallbackPrint: true });

const cases: Array<{ matiere: string; grammage: string }> = [
  { matiere: 'PCB', grammage: '300g' },
  { matiere: 'Papier pelliculé mat', grammage: '320g' },
  { matiere: 'Papier pelliculé brillant', grammage: '370g' },
  { matiere: 'PVC translucide 1 mm', grammage: '1 mm' },
  { matiere: 'PVC opaque 1 mm', grammage: '1 mm' },
  { matiere: 'Toile fin', grammage: '270g' },
  { matiere: 'Invitation luxe', grammage: '300g' },
  { matiere: 'Kraft', grammage: '300g' },
];

for (const c of cases) {
  const key = resolveImpressionSfPaperPriceKey(c.matiere, c.grammage, 'Impression numérique couleur');
  const tier = key ? paperTierUnitPrice(key, 1) : null;
  const r = computePublicationPrice({
    config: {
      format: 'A4 — 210×297 mm',
      pages: 16,
      matiere_int: 'Offset',
      grammage_int: '80g',
      couleur_int: 'Noir',
      face_interieur: 'Recto',
      matiere_couv: c.matiere,
      grammage_couv: c.grammage,
      nombre_couverture: 1,
      reliure: 'Sans reliure',
    },
    qty: 1,
    overrides: { puNoir: 200, reliure: 0 },
  });
  const detail = (r.prixCouvertureDetail ?? []).map((p) => `${p.label}=${p.amount}`).join(' | ');
  console.log(
    `${c.matiere} / ${c.grammage} → key=${key} tier=${tier} cover=${r.prixCouverture} [${detail}]`,
  );
}
