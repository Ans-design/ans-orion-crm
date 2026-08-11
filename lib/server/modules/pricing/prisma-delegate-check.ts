/** Client Prisma obsolète (cache dev) sans délégué BaseMaterial. */
export function hasBaseMaterialDelegate(client: unknown): boolean {
  const c = client as { baseMaterial?: { findMany?: unknown } };
  return typeof c?.baseMaterial?.findMany === 'function';
}

export function hasBasePrintingPriceDelegate(client: unknown): boolean {
  const c = client as { basePrintingPrice?: { findMany?: unknown } };
  return typeof c?.basePrintingPrice?.findMany === 'function';
}

export function isPrismaPricingReady(client: unknown): boolean {
  const c = client as {
    businessRule?: { findMany?: unknown };
    priceFormula?: { findMany?: unknown };
    articlePricingProfile?: { findMany?: unknown };
    baseMaterial?: { findMany?: unknown };
  };
  return (
    typeof c?.businessRule?.findMany === 'function' &&
    typeof c?.priceFormula?.findMany === 'function' &&
    typeof c?.articlePricingProfile?.findMany === 'function' &&
    typeof c?.baseMaterial?.findMany === 'function'
  );
}
