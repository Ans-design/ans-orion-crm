/**
 * Sync runtime Soft Packaging (Doypack / Étiquette / Gobelet / Hangtag)
 */
import {
  getDefaultDoypackBlanks,
  setDoypackRuntime,
  type DoypackBlankDefault,
} from '@/lib/packaging/doypack-price';
import { setPrecutLabelRuntime, getPrecutLabelStandards } from '@/lib/packaging/precut-label-price';
import { getDefaultCupBlanks, setCupRuntime } from '@/lib/packaging/custom-cup-price';
import {
  getDefaultHangtagAccessories,
  getDefaultHangtagImpositions,
  setHangtagRuntime,
} from '@/lib/packaging/hangtag-price';
import { setVinylM2RuntimeOverrides } from '@/lib/packaging/packaging-soft-shared';

let readyPromise: Promise<void> | null = null;

export async function ensureSoftPackagingPricingRuntimeReady(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    try {
      const { prisma } = await import('@/lib/prisma');

      const [blanks, printRules, apps, labs, labels, cups, cupPrint, imps, accs, gf] = await Promise.all([
        prisma.doypackBlankPrice.findMany({ where: { actif: true }, orderBy: { sortOrder: 'asc' } }).catch(() => []),
        prisma.doypackPrintRule.findMany({ where: { actif: true } }).catch(() => []),
        prisma.doypackApplicationRule.findMany({ where: { actif: true } }).catch(() => []),
        prisma.doypackLaborRule.findMany({ where: { actif: true } }).catch(() => []),
        prisma.precutLabelStandardPrice.findMany({ where: { actif: true } }).catch(() => []),
        prisma.cupBlankPrice.findMany({ where: { actif: true } }).catch(() => []),
        prisma.cupPrintingRule.findMany({ where: { actif: true } }).catch(() => []),
        prisma.hangtagImpositionRule.findMany({ where: { actif: true } }).catch(() => []),
        prisma.hangtagAccessoryPrice.findMany({ where: { actif: true } }).catch(() => []),
        prisma.grandFormatPricing.findMany({ where: { active: true } }).catch(() => [] as Array<{ materialKey?: string | null; pricePerM2?: number | null; basePrice?: number | null }>),
      ]);

      if (blanks.length) {
        const mapped: DoypackBlankDefault[] = blanks.map((b) => ({
          matiere: b.matiere,
          formatLabel: b.formatLabel,
          largeurMm: b.largeurMm,
          hauteurMm: b.hauteurMm,
          souffletMm: b.souffletMm,
          contenance: b.contenance ?? undefined,
          couleur: b.couleur ?? undefined,
          typeFermeture: b.typeFermeture ?? undefined,
          fenetre: b.fenetre,
          prixViergeHt: b.prixViergeHt,
          visiblePos: b.visiblePos,
          actif: b.actif,
        }));
        const print = printRules[0];
        const pose = apps.find((a) => /pose|petit/i.test(a.typePose)) ?? apps[0];
        const labor = labs[0];
        setDoypackRuntime({
          blanks: mapped,
          printMinPrix: print?.prixMinimum ?? 0,
          printMinSurfaceM2: print?.surfaceMinimumM2 ?? 0,
          posePrixPiece: pose?.prixHt ?? 0,
          laborPrixPiece: labor?.prixHt ?? 0,
        });
      } else {
        setDoypackRuntime({ blanks: getDefaultDoypackBlanks() });
      }

      if (labels.length) {
        setPrecutLabelRuntime(
          labels.map((l) => ({
            typeVinyle: l.typeVinyle,
            formatStandard: l.formatStandard,
            largeurCm: l.largeurCm,
            hauteurCm: l.hauteurCm,
            surfaceM2: l.surfaceM2,
            prixStandardHt: l.prixStandardHt,
          })),
        );
      }

      if (cups.length) {
        setCupRuntime(
          cups.map((c) => ({
            typeGobelet: c.typeGobelet,
            matiere: c.matiere ?? undefined,
            contenance: c.contenance ?? undefined,
            couleur: c.couleur ?? undefined,
            diametreHautMm: c.diametreHautMm ?? undefined,
            hauteurMm: c.hauteurMm ?? undefined,
            prixViergeHt: c.prixViergeHt,
          })),
        );
      }

      if (imps.length || accs.length) {
        setHangtagRuntime({
          impositions: imps.length
            ? imps.map((i) => ({
                formatFini: i.formatFini,
                largeurMm: i.largeurMm,
                hauteurMm: i.hauteurMm,
                formatFeuilleBase: i.formatFeuilleBase,
                piecesParFeuille: i.piecesParFeuille,
              }))
            : getDefaultHangtagImpositions(),
          accessories: accs.length
            ? accs.map((a) => ({ accessoire: a.accessoire, prixHt: a.prixHt }))
            : getDefaultHangtagAccessories(),
        });
      }

      const vinylMap: Record<string, number> = {};
      for (const row of gf) {
        const key = String(row.materialKey ?? '');
        const m2 = Number(row.pricePerM2 ?? row.basePrice) || 0;
        if (key && m2 > 0) vinylMap[key] = m2;
      }
      // map common GF article ids if materialKey matches
      if (vinylMap['Vinyle blanc'] || vinylMap['Vinyle blanc brillant']) {
        vinylMap['gf-vinyl-blanc'] = vinylMap['Vinyle blanc'] ?? vinylMap['Vinyle blanc brillant']!;
      }
      if (vinylMap['Vinyle transparent'] || vinylMap['Vinyle']) {
        vinylMap['gf-vinyl-transp'] = vinylMap['Vinyle transparent'] ?? vinylMap['Vinyle']!;
      }
      setVinylM2RuntimeOverrides(vinylMap);

      void cupPrint;
      void getPrecutLabelStandards;
    } catch {
      setDoypackRuntime({ blanks: getDefaultDoypackBlanks() });
      setCupRuntime(getDefaultCupBlanks());
      setHangtagRuntime({
        impositions: getDefaultHangtagImpositions(),
        accessories: getDefaultHangtagAccessories(),
      });
    }
  })();
  return readyPromise;
}

export function invalidateSoftPackagingPricingRuntime() {
  readyPromise = null;
}

export async function seedSoftPackagingDefaults(): Promise<Record<string, number>> {
  const { prisma } = await import('@/lib/prisma');
  const counts: Record<string, number> = {};

  if ((await prisma.doypackBlankPrice.count()) === 0) {
    for (const [i, b] of getDefaultDoypackBlanks().entries()) {
      await prisma.doypackBlankPrice.create({
        data: {
          excelId: `DOY-BLANK-${i + 1}`,
          matiere: b.matiere,
          formatLabel: b.formatLabel,
          largeurMm: b.largeurMm,
          hauteurMm: b.hauteurMm,
          souffletMm: b.souffletMm,
          contenance: b.contenance,
          couleur: b.couleur,
          typeFermeture: b.typeFermeture,
          fenetre: b.fenetre ?? false,
          prixViergeHt: b.prixViergeHt,
          sortOrder: i,
        },
      });
      counts.doypackBlanks = (counts.doypackBlanks ?? 0) + 1;
    }
  }

  if ((await prisma.doypackApplicationRule.count()) === 0) {
    await prisma.doypackApplicationRule.create({
      data: {
        excelId: 'DOY-POSE-1',
        typePose: 'Pose autocollant petit format',
        condition: 'par pièce',
        unite: 'piece',
        prixHt: 300,
        sourceFinition: 'FIN-POSE-PETIT',
      },
    });
    counts.doypackPose = 1;
  }

  if ((await prisma.doypackPrintRule.count()) === 0) {
    await prisma.doypackPrintRule.create({
      data: {
        excelId: 'DOY-PRINT-1',
        typeImpression: 'Vinyle / autocollant',
        matiereImpression: 'Vinyle blanc',
        sourcePrix: 'grand_format',
        prixMinimum: 0,
        surfaceMinimumM2: 0,
      },
    });
    counts.doypackPrint = 1;
  }

  if ((await prisma.precutLabelStandardPrice.count()) === 0) {
    await prisma.precutLabelStandardPrice.createMany({
      data: [
        {
          excelId: 'ETIQ-STD-BLANC',
          typeVinyle: 'Vinyle blanc',
          formatStandard: '50×50 cm',
          largeurCm: 50,
          hauteurCm: 50,
          surfaceM2: 0.25,
          prixStandardHt: 10000,
        },
        {
          excelId: 'ETIQ-STD-TRANSP',
          typeVinyle: 'Vinyle transparent',
          formatStandard: '50×50 cm',
          largeurCm: 50,
          hauteurCm: 50,
          surfaceM2: 0.25,
          prixStandardHt: 12000,
        },
      ],
    });
    counts.etiquette = 2;
  }

  if ((await prisma.cupBlankPrice.count()) === 0) {
    for (const [i, c] of getDefaultCupBlanks().entries()) {
      await prisma.cupBlankPrice.create({
        data: {
          excelId: `CUP-${i + 1}`,
          typeGobelet: c.typeGobelet,
          matiere: c.matiere,
          contenance: c.contenance,
          couleur: c.couleur,
          prixViergeHt: c.prixViergeHt,
          sortOrder: i,
        },
      });
      counts.cups = (counts.cups ?? 0) + 1;
    }
  }

  if ((await prisma.hangtagImpositionRule.count()) === 0) {
    for (const [i, r] of getDefaultHangtagImpositions().entries()) {
      await prisma.hangtagImpositionRule.create({
        data: {
          excelId: `HT-IMP-${i + 1}`,
          formatFini: r.formatFini,
          largeurMm: r.largeurMm,
          hauteurMm: r.hauteurMm,
          formatFeuilleBase: r.formatFeuilleBase,
          piecesParFeuille: r.piecesParFeuille,
          sortOrder: i,
        },
      });
      counts.hangtagImp = (counts.hangtagImp ?? 0) + 1;
    }
  }

  if ((await prisma.hangtagAccessoryPrice.count()) === 0) {
    for (const [i, a] of getDefaultHangtagAccessories().entries()) {
      await prisma.hangtagAccessoryPrice.create({
        data: {
          excelId: `HT-ACC-${i + 1}`,
          accessoire: a.accessoire,
          prixHt: a.prixHt,
          sortOrder: i,
        },
      });
      counts.hangtagAcc = (counts.hangtagAcc ?? 0) + 1;
    }
  }

  invalidateSoftPackagingPricingRuntime();
  return counts;
}
