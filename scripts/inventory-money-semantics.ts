import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
async function main() {
  const rows = await p.productOptionValue.findMany({
    select: { id: true, modifierType: true, priceModifier: true, label: true, valueKey: true },
  });
  const byType: Record<string, number> = {};
  const frac: Array<{ id: string; type: string; v: number }> = [];
  const ambiguous: Array<{ id: string; type: string; v: number; label: string }> = [];
  for (const r of rows) {
    byType[r.modifierType] = (byType[r.modifierType] || 0) + 1;
    if (!Number.isInteger(r.priceModifier)) frac.push({ id: r.id, type: r.modifierType, v: r.priceModifier });
    // multiplier should typically be small (e.g. 0.1 = +10%); fixed/m2/piece are Ar
    if (r.modifierType === 'multiplier' && Math.abs(r.priceModifier) > 5) {
      ambiguous.push({ id: r.id, type: r.modifierType, v: r.priceModifier, label: r.label });
    }
    if (r.modifierType === 'fixed' && r.priceModifier > 0 && r.priceModifier < 1 && r.priceModifier !== 0) {
      ambiguous.push({ id: r.id, type: r.modifierType, v: r.priceModifier, label: r.label });
    }
  }
  // max amounts in ledger
  const maxCmd = await p.commande.aggregate({ _max: { total: true, acompte: true } });
  const maxPay = await p.paiement.aggregate({ _max: { montant: true } });
  console.log(
    JSON.stringify(
      {
        optionValues: rows.length,
        byType,
        fracCount: frac.length,
        fracSample: frac.slice(0, 15),
        ambiguousCount: ambiguous.length,
        ambiguousSample: ambiguous.slice(0, 15),
        maxCommandeTotal: maxCmd._max.total,
        maxAcompte: maxCmd._max.acompte,
        maxPaiement: maxPay._max.montant,
      },
      null,
      2,
    ),
  );
  await p.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
