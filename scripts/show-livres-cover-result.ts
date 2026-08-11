/**
 * Affiche le résultat couverture Livres (nombre × PU) pour contrôle utilisateur.
 */
import { calculatePrice } from '@/lib/pricing/calculate';
import { computePublicationPrice } from '@/lib/pricing/publication-core';
import { calculateLivresMaterialRecap } from '@/lib/pricing/livres-material-recap';
import { getProductConfig } from '@/lib/data/config-types';
import { buildEmptyPosConfig } from '@/lib/pos/initial-config';

async function main() {
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
    type: 'Livre',
    qty: 1,
  };

  console.log('\n════════ LIVRES / PUBLICATIONS — COUVERTURE ════════\n');

  const cfg = getProductConfig('bk-livres');
  const cover = cfg?.sections.find((s) => /Couverture/i.test(s.title));
  const nb = cover?.fields.find((f) => f.key === 'nombre_couverture');
  console.log('POS — section Couverture');
  console.log(`  champ: ${nb?.label} (default ${nb?.default}, presets ${JSON.stringify(nb?.presets)})`);
  console.log(`  seed:  nombre_couverture = ${buildEmptyPosConfig(cfg!).nombre_couverture}`);

  console.log('\nTarif PCB 300g A4 (exemple)');
  for (const n of [1, 2, 4] as const) {
    const r = computePublicationPrice({
      config: { ...base, nombre_couverture: n },
      qty: 1,
      overrides: { puNoir: 200, reliure: 0 },
    });
    const print = r.prixCouvertureDetail?.find((p) => /Impression/.test(p.label));
    console.log(
      `  ${n} couverture(s) → int. ${r.prixInterieur} + couv. ${r.prixCouverture} = ${r.prixUnitaireAvantRemise} Ar  [${print?.label}]`,
    );
  }

  const invitation = computePublicationPrice({
    config: { ...base, matiere_couv: 'Invitation luxe', nombre_couverture: 2 },
    qty: 1,
    overrides: { puNoir: 200, reliure: 0 },
  });
  const rigid = invitation.prixCouvertureDetail?.some((p) => /rigide/i.test(p.label));
  console.log(`\nBugfix — Invitation luxe ×2 : supplément rigide = ${rigid ? 'OUI (KO)' : 'non (OK)'}`);

  const calc = await calculatePrice('bk-livres', { ...base, nombre_couverture: 2 });
  const snap = calc.snapshot as {
    livresNote?: string | null;
    livresPricing?: {
      publication?: { nombreCouverture?: number };
      breakdown?: { prixCouverture?: number };
    };
  };
  console.log('\ncalculatePrice (POS)');
  console.log(`  PU: ${calc.prixUnitaire} Ar`);
  console.log(`  Note: ${snap.livresNote ?? calc.formulaApplied ?? '—'}`);
  console.log(
    `  Détail: Couverture (${snap.livresPricing?.publication?.nombreCouverture ?? 2}×) = ${snap.livresPricing?.breakdown?.prixCouverture} Ar`,
  );

  const recap = calculateLivresMaterialRecap('bk-livres', {
    ...base,
    nombre_couverture: 4,
    face_interieur: 'Recto-verso',
    pages: 48,
    reliure: 'Spirale plastique',
  });
  console.log('\nRécap matière (affiche POS)');
  console.log(`  Nombre de couvertures: ${recap?.nombreCouverture}`);
  console.log(`  Surface couverture:   ${recap?.coverSurfaceM2} m²`);
  console.log(`  Prix couverture:      ${recap?.prixCouverture} Ar`);

  console.log('\n═══════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
