import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

function modelBlock(schema: string, modelName: string): string {
  const start = schema.indexOf(`model ${modelName} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = schema.slice(start);
  const endRel = rest.indexOf('\nmodel ', 1);
  return endRel > 0 ? rest.slice(0, endRel) : rest;
}

describe('FIN-01 suite 5 — Int monétaire opérationnel', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  it('Tarif / ArticlePricingProfile / MaterialContextPrice en Int', () => {
    const tarif = modelBlock(schema, 'Tarif');
    expect(tarif).toMatch(/prixUnitaire\s+Int/);
    expect(tarif).not.toMatch(/prixUnitaire\s+Float/);

    const profile = modelBlock(schema, 'ArticlePricingProfile');
    expect(profile).toMatch(/prixBase\s+Int\?/);
    expect(profile).toMatch(/prixM2\s+Int\?/);
    expect(profile).not.toMatch(/prixBase\s+Float/);

    const ctx = modelBlock(schema, 'MaterialContextPrice');
    expect(ctx).toMatch(/priceHT\s+Int/);
    expect(ctx).not.toMatch(/priceHT\s+Float/);
  });

  it('Stock / caisse / achats / RH en Int monétaire', () => {
    const cash = modelBlock(schema, 'CashSession');
    expect(cash).toMatch(/openingFloat\s+Int/);
    expect(cash).toMatch(/closingCash\s+Int\?/);

    const stock = modelBlock(schema, 'StockItem');
    expect(stock).toMatch(/unitCost\s+Int\?/);
    expect(stock).toMatch(/salePrice\s+Int\?/);
    expect(stock).toMatch(/quantity\s+Float/); // qty reste Float

    const po = modelBlock(schema, 'PurchaseOrder');
    expect(po).toMatch(/totalHT\s+Int/);

    const emp = modelBlock(schema, 'Employee');
    expect(emp).toMatch(/salaireBaseMGA\s+Int/);
    expect(emp).toMatch(/primeMGA\s+Int/);
    expect(emp).toMatch(/congeSolde\s+Float/); // jours

    const slip = modelBlock(schema, 'Payslip');
    expect(slip).toMatch(/brutAmount\s+Int/);
    expect(slip).toMatch(/netAmount\s+Int/);
  });

  it('FinishingPrice / BlankMaterialPrice / SupplierPrice en Int', () => {
    expect(modelBlock(schema, 'FinishingPrice')).toMatch(/unitPrice\s+Int/);
    expect(modelBlock(schema, 'BlankMaterialPrice')).toMatch(/purchasePrice\s+Int/);
    expect(modelBlock(schema, 'SupplierPrice')).toMatch(/purchasePrice\s+Int/);
  });
});
