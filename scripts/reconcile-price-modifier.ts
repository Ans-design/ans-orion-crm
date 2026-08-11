/**
 * Réconciliation legacy priceModifier vs priceAddonAr / priceMultiplier.
 * Exit 0 si match ; 2 si drift.
 */
import { PrismaClient } from '@prisma/client';
import { isMoneyAddonType, isMultiplierType } from '../lib/money/option-modifier';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.productOptionValue.findMany({
    select: {
      id: true,
      modifierType: true,
      priceModifier: true,
      priceAddonAr: true,
      priceMultiplier: true,
    },
  });

  const drifts: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    const legacy = Number(r.priceModifier);
    if (isMultiplierType(r.modifierType)) {
      if (r.priceAddonAr !== 0 || r.priceMultiplier !== legacy) {
        drifts.push({ id: r.id, kind: 'multiplier', legacy, ...r });
      }
    } else if (isMoneyAddonType(r.modifierType)) {
      if (!Number.isInteger(legacy)) {
        drifts.push({ id: r.id, kind: 'fractional_legacy', legacy });
        continue;
      }
      if (r.priceAddonAr !== legacy || r.priceMultiplier !== 0) {
        drifts.push({ id: r.id, kind: 'addon', legacy, priceAddonAr: r.priceAddonAr, priceMultiplier: r.priceMultiplier });
      }
    }
  }

  console.log(JSON.stringify({ total: rows.length, driftCount: drifts.length, sample: drifts.slice(0, 30) }, null, 2));
  await prisma.$disconnect();
  process.exit(drifts.length ? 2 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
