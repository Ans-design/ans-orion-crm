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

describe('FIN-01 suite 6 — Int grilles Admin', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  it('BasePrintingPrice / SalePrice2026 / DiscountTier en Int', () => {
    const bpp = modelBlock(schema, 'BasePrintingPrice');
    expect(bpp).toMatch(/basePrice\s+Int/);
    expect(bpp).not.toMatch(/basePrice\s+Float/);
    expect(bpp).toMatch(/marginPct\s+Float/); // %

    const sale = modelBlock(schema, 'SalePrice2026');
    expect(sale).toMatch(/salePriceAr\s+Int\?/);
    expect(sale).not.toMatch(/salePriceAr\s+Float/);

    expect(modelBlock(schema, 'DiscountTier')).toMatch(/unitPrice\s+Int\?/);
  });

  it('DirectSale / Goodies / Textile / GF en Int', () => {
    expect(modelBlock(schema, 'DirectSaleArticle')).toMatch(/unitPrice\s+Int/);
    expect(modelBlock(schema, 'GoodiesArticleModel')).toMatch(/prixVierge\s+Int/);
    expect(modelBlock(schema, 'TextileMarkingPrice')).toMatch(/prixMarquage\s+Int/);
    const gf = modelBlock(schema, 'GrandFormatPricing');
    expect(gf).toMatch(/pricePerM2\s+Int\?/);
    expect(gf).toMatch(/laize\s+Float\?/); // dimension
  });

  it('Finance / photo / event en Int monétaire', () => {
    expect(modelBlock(schema, 'FinanceCharge')).toMatch(/amount\s+Int/);
    expect(modelBlock(schema, 'PhotobookPricingParam')).toMatch(/prixPageA4\s+Int/);
    expect(modelBlock(schema, 'EventAccessoryPrice')).toMatch(/priceAr\s+Int/);
    expect(modelBlock(schema, 'EventPricingParam')).toMatch(/badgeCutAr\s+Int/);
    expect(modelBlock(schema, 'EventPricingParam')).toMatch(/badgeMarginPct\s+Float/);
  });

  it('priceModifier reste Float (multiplicateur ou Ar selon type)', () => {
    expect(modelBlock(schema, 'ProductOptionValue')).toMatch(/priceModifier\s+Float/);
  });
});
