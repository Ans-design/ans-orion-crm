/**
 * Vérifie A5 = A4/2 (sans +50 découpe) pour PaperFormat + Livres.
 */
import { setImpressionSfRuntimeRules } from '../lib/pricing/impression-sf-pricing';
import { DEFAULT_PAPER_FORMAT_RULES, computePaperFormatPrice } from '../lib/pricing/paper-format-rules';
import { computeLivresPrice } from '../lib/pricing/livres-pricing';

setImpressionSfRuntimeRules({ formatRules: DEFAULT_PAPER_FORMAT_RULES });

const a5 = computePaperFormatPrice(1000, 'A5');
console.log('PaperFormat A5 from A4=1000:', a5.price, a5.formula, 'cutAr=', a5.rule?.cutAr);

const base = {
  matiere_int: 'Standard / Offset',
  grammage_int: '80g',
  couleur_int: 'Noir',
  face_interieur: 'Recto',
  pages: '16',
  matiere_couv: 'PCB',
  grammage_couv: '300g',
  reliure: 'Agrafage',
  qty: 1,
};

const r4 = computeLivresPrice('liv-livre', { ...base, format: 'A4' });
const r5 = computeLivresPrice('liv-livre', { ...base, format: 'A5' });
console.log('Livre A4', { ok: r4.calculable, pu: r4.prixUnitaire, int: r4.publication?.prixInterieur });
console.log('Livre A5', { ok: r5.calculable, pu: r5.prixUnitaire, int: r5.publication?.prixInterieur });

if (r4.publication && r5.publication && r4.publication.prixInterieur > 0) {
  const ratio = r5.publication.prixInterieur / r4.publication.prixInterieur;
  console.log('ratio intérieur A5/A4 =', ratio, ratio === 0.5 ? 'OK' : 'CHECK');
}

if (a5.price !== 500 || a5.rule?.cutAr !== 0) {
  process.exitCode = 1;
}
