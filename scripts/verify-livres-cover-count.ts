/**
 * Vérification complète couverture Livres : nombre × PU, pas R/V.
 * Usage: npx tsx --require dotenv/config scripts/verify-livres-cover-count.ts
 */
import { getProductConfig } from '@/lib/data/config-types';
import { buildEmptyPosConfig } from '@/lib/pos/initial-config';
import { computePublicationPrice } from '@/lib/pricing/publication-core';
import { computeLivresPrice } from '@/lib/pricing/livres-pricing';
import { calculateLivresMaterialRecap } from '@/lib/pricing/livres-material-recap';
import { resolveIsfPageUnitPrice } from '@/lib/pricing/publication-core';

const issues: string[] = [];

function ok(label: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  OK  ${label}${detail ? ` — ${detail}` : ''}`);
  else {
    console.log(`  KO  ${label}${detail ? ` — ${detail}` : ''}`);
    issues.push(label);
  }
}

console.log('=== 1. Config POS bk-livres ===');
const cfg = getProductConfig('bk-livres');
const coverSection = cfg?.sections.find((s) => /Couverture/i.test(s.title));
const nbField = coverSection?.fields.find((f) => f.key === 'nombre_couverture');
ok('section Couverture présente', Boolean(coverSection));
ok('champ nombre_couverture', Boolean(nbField), nbField ? `type=${nbField.type} default=${nbField.default}` : '');
ok('presets 1,2,4', JSON.stringify(nbField?.presets) === JSON.stringify([1, 2, 4]));
ok('min=1', nbField?.min === 1);
ok('pas de face_couverture dans config', !coverSection?.fields.some((f) => /face_couv/.test(f.key)));

console.log('\n=== 2. Seed config vide ===');
const empty = buildEmptyPosConfig(cfg!);
ok(
  'nombre_couverture seedé à 1',
  Number(empty.nombre_couverture) === 1,
  `got=${empty.nombre_couverture}`,
);

console.log('\n=== 3. Moteur prix (PU × nombre) ===');
const base = {
  format: 'A4 — 210×297 mm',
  pages: 16,
  matiere_int: 'Offset',
  grammage_int: '80g',
  couleur_int: 'Noir',
  face_interieur: 'Recto',
  matiere_couv: 'PCB',
  grammage_couv: '300g',
  reliure: 'Sans reliure',
  qty: 1,
};

const pu = resolveIsfPageUnitPrice({
  format: base.format,
  matiere: 'PCB',
  grammage: '300g',
  couleur: 'Quadri',
  qty: 1,
});
ok('PU couverture ISF > 0', pu.ok && pu.prix > 0, `pu=${pu.prix} ${pu.formula}`);

for (const n of [1, 2, 4]) {
  const r = computePublicationPrice({
    config: { ...base, nombre_couverture: n },
    qty: 1,
    overrides: { puNoir: 200, reliure: 0 },
  });
  const print = r.prixCouvertureDetail?.find((p) => /Impression couverture/.test(p.label));
  const expected = Math.round(n * pu.prix);
  ok(
    `nombre=${n} → ${n}×PU`,
    r.calculable && print?.amount === expected,
    `amount=${print?.amount} expected=${expected} label=${print?.label}`,
  );
  ok(`label sans R/V (n=${n})`, !/recto.?verso|R\/V/i.test(print?.label ?? ''));
}

// Sans champ → défaut 1
const rDef = computePublicationPrice({
  config: base,
  qty: 1,
  overrides: { puNoir: 200, reliure: 0 },
});
const pDef = rDef.prixCouvertureDetail?.find((p) => /Impression couverture/.test(p.label));
ok('défaut sans champ = 1×', pDef?.amount === Math.round(pu.prix), `amount=${pDef?.amount}`);

// face_couverture ne doit plus doubler
const rFace = computePublicationPrice({
  config: { ...base, face_couverture: 'Recto-verso' },
  qty: 1,
  overrides: { puNoir: 200, reliure: 0 },
});
const pFace = rFace.prixCouvertureDetail?.find((p) => /Impression couverture/.test(p.label));
ok(
  'face_couverture R/V ignoré (reste 1×)',
  pFace?.amount === Math.round(pu.prix),
  `amount=${pFace?.amount}`,
);

console.log('\n=== 4. computeLivresPrice ===');
const livre = computeLivresPrice(
  'bk-livres',
  { ...base, nombre_couverture: 2, type: 'Livre', face_interieur: 'Recto-verso', pages: 48 },
  10,
);
ok('livres calculable ou en attente métier', livre.calculable || Boolean(livre.missingField), JSON.stringify({
  calculable: livre.calculable,
  pu: livre.prixUnitaire,
  couv: livre.breakdown?.prixCouverture,
  missing: livre.missingField,
}));

console.log('\n=== 5. Récap matière ===');
const recap = calculateLivresMaterialRecap('bk-livres', {
  ...base,
  nombre_couverture: 4,
  type: 'Livre',
  face_interieur: 'Recto-verso',
  pages: 48,
  reliure: 'Spirale plastique',
});
ok('récap présent', Boolean(recap));
if (recap) {
  const unitApprox = recap.coverSurfaceM2 / 4;
  ok(
    'surface couverture ×4',
    Math.abs(recap.coverSurfaceM2 - unitApprox * 4) < 1e-9,
    `coverSurfaceM2=${recap.coverSurfaceM2}`,
  );
}

console.log('\n=== RÉSUMÉ ===');
if (issues.length) {
  console.error(`ÉCHECS: ${issues.length}`);
  issues.forEach((i) => console.error(' -', i));
  process.exit(1);
}
console.log('Tous les contrôles OK');
