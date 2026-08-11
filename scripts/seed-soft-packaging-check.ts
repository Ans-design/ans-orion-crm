/**
 * Seed Soft Packaging + rapport anomalies (local).
 * Usage: npx tsx scripts/seed-soft-packaging-check.ts
 */
import {
  ensureSoftPackagingPricingRuntimeReady,
  seedSoftPackagingDefaults,
} from '../lib/services/soft-packaging-pricing-sync.service';
import { calculateDoypackPrice } from '../lib/packaging/doypack-price';
import { calculatePrecutLabelPrice } from '../lib/packaging/precut-label-price';
import { calculateCustomCupPrice } from '../lib/packaging/custom-cup-price';
import { calculateHangtagPrice } from '../lib/packaging/hangtag-price';
import { prisma } from '../lib/prisma';

async function main() {
  const seeded = await seedSoftPackagingDefaults();
  await ensureSoftPackagingPricingRuntimeReady();

  const anomalies: Array<{ code: string; message: string }> = [];
  const blankCount = await prisma.doypackBlankPrice.count({ where: { actif: true } });
  if (blankCount === 0) {
    anomalies.push({ code: 'DOYPACK_NO_BLANK', message: 'Aucun doypack vierge actif' });
  }
  const noPrice = await prisma.doypackBlankPrice.count({
    where: { actif: true, prixViergeHt: { lte: 0 } },
  });
  if (noPrice > 0) {
    anomalies.push({ code: 'DOYPACK_BLANK_NO_PRICE', message: `${noPrice} sans prix` });
  }
  const etiBad = await prisma.precutLabelStandardPrice.count({
    where: { actif: true, prixStandardHt: { lte: 0 } },
  });
  if (etiBad > 0) {
    anomalies.push({ code: 'ETIQUETTE_STD_NO_PRICE', message: `${etiBad} sans prix` });
  }
  const cupsBad = await prisma.cupBlankPrice.count({
    where: { actif: true, prixViergeHt: { lte: 0 } },
  });
  if (cupsBad > 0) {
    anomalies.push({ code: 'CUP_BLANK_NO_PRICE', message: `${cupsBad} sans prix` });
  }

  const doypack = calculateDoypackPrice({
    matiere: 'Kraft',
    format: '100×150mm',
    zoneImpression: 'Impression partielle personnalisée',
    printWidthMm: 50,
    printHeightMm: 50,
    prixViergeHt: 1000,
    prixVinylM2: 40_000,
    prixDecoupeM2: 10_000,
    prixPosePiece: 300,
    qty: 1,
  });
  const etiquette = calculatePrecutLabelPrice({
    typeVinyle: 'Vinyle blanc',
    format: '50×50 cm',
    qty: 1,
  });
  const gobelet = calculateCustomCupPrice({
    typeGobelet: 'Gobelet carton',
    contenance: '8 oz (240 ml)',
    zoneImpression: 'Impression partielle personnalisée',
    printWidthMm: 50,
    printHeightMm: 50,
    prixViergeHt: 1000,
    prixVinylM2: 40_000,
    prixDecoupeM2: 10_000,
    prixPosePiece: 300,
    qty: 1,
  });
  const hangtag = calculateHangtagPrice({
    dimension: '85×55 mm',
    matiere: 'PCB',
    grammage: '300g',
    particularites: ['Cordelette', 'Œillet'],
    prixFeuilleIsf: 1000,
    qty: 1,
  });

  const counts = {
    doypackBlanks: blankCount,
    etiquette: await prisma.precutLabelStandardPrice.count({ where: { actif: true } }),
    cups: await prisma.cupBlankPrice.count({ where: { actif: true } }),
    hangtagImp: await prisma.hangtagImpositionRule.count({ where: { actif: true } }),
    hangtagAcc: await prisma.hangtagAccessoryPrice.count({ where: { actif: true } }),
  };

  console.log(
    JSON.stringify(
      {
        ok: anomalies.length === 0,
        seeded,
        anomalies,
        counts,
        samples: {
          doypack: doypack.prixUnitaire,
          etiquette: etiquette.prixUnitaire,
          gobelet: gobelet.prixUnitaire,
          hangtag: hangtag.prixUnitaire,
        },
      },
      null,
      2,
    ),
  );

  if (anomalies.length > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
