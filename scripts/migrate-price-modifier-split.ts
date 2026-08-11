/**
 * Backfill contrôlé ProductOptionValue : priceModifier → priceAddonAr / priceMultiplier.
 *
 * Modes:
 *   --dry-run   (défaut) : rapport seulement, aucune écriture
 *   --apply     : écriture locale / test uniquement
 *   --json path : rapport exceptions
 *
 * Interdit : arrondi silencieux — les fractionnaires vont dans le rapport d’exception.
 * Ne jamais pointer DATABASE_URL Neon sans autorisation explicite.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { isMoneyAddonType, isMultiplierType } from '../lib/money/option-modifier';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : 'reports/money-price-modifier-backfill.json';

type Exc = {
  id: string;
  modifierType: string;
  priceModifier: number;
  reason: string;
  proposedAddonAr?: number;
  proposedMultiplier?: number;
};

async function main() {
  if (apply && process.env.USE_PRODUCTION_DB === 'true' && !process.env.ALLOW_MONEY_MIGRATION_WRITE) {
    console.error(
      'REFUS: USE_PRODUCTION_DB=true sans ALLOW_MONEY_MIGRATION_WRITE=1. Aucune écriture.',
    );
    process.exit(1);
  }

  const rows = await prisma.productOptionValue.findMany({
    select: { id: true, modifierType: true, priceModifier: true, priceAddonAr: true, priceMultiplier: true },
  });

  const exceptions: Exc[] = [];
  const updates: Array<{ id: string; priceAddonAr: number; priceMultiplier: number }> = [];

  for (const r of rows) {
    const legacy = Number(r.priceModifier);
    if (!Number.isFinite(legacy)) {
      exceptions.push({
        id: r.id,
        modifierType: r.modifierType,
        priceModifier: r.priceModifier,
        reason: 'non_finite',
      });
      continue;
    }

    if (isMultiplierType(r.modifierType)) {
      updates.push({ id: r.id, priceAddonAr: 0, priceMultiplier: legacy });
      continue;
    }

    if (isMoneyAddonType(r.modifierType)) {
      if (!Number.isInteger(legacy)) {
        exceptions.push({
          id: r.id,
          modifierType: r.modifierType,
          priceModifier: legacy,
          reason: 'fractional_amount_no_silent_round',
          proposedAddonAr: Math.round(legacy),
        });
        continue;
      }
      updates.push({ id: r.id, priceAddonAr: legacy, priceMultiplier: 0 });
      continue;
    }

    exceptions.push({
      id: r.id,
      modifierType: r.modifierType,
      priceModifier: legacy,
      reason: 'unknown_modifier_type',
      proposedAddonAr: Number.isInteger(legacy) ? legacy : undefined,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    total: rows.length,
    wouldUpdate: updates.length,
    exceptionCount: exceptions.length,
    exceptions,
  };

  const abs = path.resolve(jsonOut);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ ...report, exceptions: exceptions.slice(0, 20) }, null, 2));
  console.error(`Report: ${abs}`);

  if (!apply) {
    await prisma.$disconnect();
    process.exit(exceptions.length ? 2 : 0);
  }

  if (exceptions.length) {
    console.error('REFUS apply: des exceptions existent. Corriger manuellement puis relancer.');
    await prisma.$disconnect();
    process.exit(2);
  }

  const BATCH = 200;
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);
    await Promise.all(
      chunk.map((u) =>
        prisma.productOptionValue.update({
          where: { id: u.id },
          data: { priceAddonAr: u.priceAddonAr, priceMultiplier: u.priceMultiplier },
        }),
      ),
    );
  }

  console.log(`Applied ${updates.length} updates.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
