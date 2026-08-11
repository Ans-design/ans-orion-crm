/**
 * Préflight lecture seule — intégrité monétaire (SQLite local ou Postgres/Neon).
 *
 * Usage:
 *   npx tsx scripts/preflight-money-integrity.ts
 *   npx tsx scripts/preflight-money-integrity.ts --json reports/money-preflight.json
 *
 * Ne fait AUCUNE écriture. Exit 0 = OK ; 2 = exceptions (fractionnaires / hors plage / ambiguës).
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { MGA_INT32_MAX, MGA_INT32_WARN } from '../lib/money/mga';
import { detectAmbiguousModifier, isMoneyAddonType, isMultiplierType } from '../lib/money/option-modifier';

type Exception = {
  table: string;
  id: string;
  field: string;
  value: unknown;
  reason: string;
};

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

async function checkIntField(
  table: string,
  rows: Array<{ id: string; [k: string]: unknown }>,
  fields: string[],
  exceptions: Exception[],
) {
  for (const row of rows) {
    for (const field of fields) {
      const v = row[field];
      if (v == null) continue;
      const n = Number(v);
      if (!Number.isFinite(n)) {
        exceptions.push({ table, id: row.id, field, value: v, reason: 'non_finite' });
        continue;
      }
      if (!Number.isInteger(n)) {
        exceptions.push({ table, id: row.id, field, value: n, reason: 'fractional_amount' });
      }
      if (n > MGA_INT32_MAX || n < -MGA_INT32_MAX) {
        exceptions.push({ table, id: row.id, field, value: n, reason: 'out_of_int32' });
      } else if (Math.abs(n) >= MGA_INT32_WARN) {
        exceptions.push({ table, id: row.id, field, value: n, reason: 'near_int32_limit_warn' });
      }
    }
  }
}

async function main() {
  const exceptions: Exception[] = [];
  const summary: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    providerHint: process.env.DATABASE_URL?.startsWith('postgres') ? 'postgresql' : 'sqlite',
    typeChoice: {
      mgaAmounts: 'Int (Int32 Prisma)',
      mgaMaxSafe: MGA_INT32_MAX,
      upgradePath: 'Decimal(18,0) if preflight finds out_of_int32 — prefer over BigInt for JSON',
      percentages: 'Float (voluntary decimal)',
      multipliers: 'Float priceMultiplier',
      dimensionsQty: 'Float (not money)',
    },
  };

  const commandes = await prisma.commande.findMany({
    select: { id: true, total: true, acompte: true, reste: true },
  });
  await checkIntField('Commande', commandes, ['total', 'acompte', 'reste'], exceptions);

  const paiements = await prisma.paiement.findMany({ select: { id: true, montant: true } });
  await checkIntField('Paiement', paiements, ['montant'], exceptions);

  const factures = await prisma.facture.findMany({
    select: { id: true, sousTotal: true, remise: true, totalHT: true, totalTTC: true },
  });
  await checkIntField('Facture', factures, ['sousTotal', 'remise', 'totalHT', 'totalTTC'], exceptions);

  const devis = await prisma.devis.findMany({
    select: { id: true, sousTotal: true, remise: true, totalHT: true, totalTTC: true },
  });
  await checkIntField('Devis', devis, ['sousTotal', 'remise', 'totalHT', 'totalTTC'], exceptions);

  const opts = await prisma.productOptionValue.findMany({
    select: {
      id: true,
      modifierType: true,
      priceModifier: true,
      priceAddonAr: true,
      priceMultiplier: true,
      label: true,
    },
  });

  let modifierByType: Record<string, number> = {};
  let dualMismatch = 0;
  for (const o of opts) {
    modifierByType[o.modifierType] = (modifierByType[o.modifierType] || 0) + 1;
    const amb = detectAmbiguousModifier(o);
    if (amb) {
      exceptions.push({
        table: 'ProductOptionValue',
        id: o.id,
        field: 'priceModifier',
        value: o.priceModifier,
        reason: amb,
      });
    }
    if (isMoneyAddonType(o.modifierType)) {
      const legacy = Number(o.priceModifier);
      if (Number.isFinite(legacy) && !Number.isInteger(legacy)) {
        exceptions.push({
          table: 'ProductOptionValue',
          id: o.id,
          field: 'priceModifier',
          value: legacy,
          reason: 'fractional_amount',
        });
      }
      // Après backfill : priceAddonAr doit égaler round(legacy)
      if (
        o.priceAddonAr != null &&
        Number.isInteger(legacy) &&
        o.priceAddonAr !== 0 &&
        o.priceAddonAr !== Math.round(legacy)
      ) {
        dualMismatch += 1;
        exceptions.push({
          table: 'ProductOptionValue',
          id: o.id,
          field: 'priceAddonAr',
          value: { priceAddonAr: o.priceAddonAr, priceModifier: legacy },
          reason: 'dual_write_mismatch',
        });
      }
    }
    if (isMultiplierType(o.modifierType) && o.priceAddonAr !== 0) {
      exceptions.push({
        table: 'ProductOptionValue',
        id: o.id,
        field: 'priceAddonAr',
        value: o.priceAddonAr,
        reason: 'multiplier_with_nonzero_addon',
      });
    }
  }

  summary.optionValues = opts.length;
  summary.modifierByType = modifierByType;
  summary.dualMismatch = dualMismatch;
  summary.exceptionCount = exceptions.length;
  summary.exceptionsSample = exceptions.slice(0, 50);
  summary.maxCommandeTotal = commandes.reduce((m, c) => Math.max(m, c.total ?? 0), 0);
  summary.maxPaiement = paiements.reduce((m, p) => Math.max(m, p.montant ?? 0), 0);

  const text = JSON.stringify(summary, null, 2);
  console.log(text);

  if (jsonOut) {
    const abs = path.resolve(jsonOut);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(
      abs,
      JSON.stringify({ ...summary, exceptions }, null, 2),
      'utf8',
    );
    console.error(`Wrote ${abs}`);
  }

  await prisma.$disconnect();
  if (exceptions.some((e) => e.reason !== 'near_int32_limit_warn')) {
    process.exit(2);
  }
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
