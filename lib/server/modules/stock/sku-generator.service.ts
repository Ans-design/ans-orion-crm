/**
 * Génération SKU automatique — référence lisible, unique, stable.
 * @see docs/STOCK_SKU_AUTOMATIC_RULES.md
 */
import { buildSkuFromInput, ensureUniqueSku, type SkuInput } from './stock-sku.service';

export type SkuGeneratorInput = SkuInput & {
  unitDisplay?: string | null;
  conversionFactor?: number | null;
};

export function generateSku(input: SkuGeneratorInput): string {
  const parts: string[] = [];
  const base = buildSkuFromInput(input);

  if (input.unitDisplay === 'rame' && input.conversionFactor != null && input.conversionFactor > 0) {
    parts.push(`R${Math.round(input.conversionFactor)}`);
  }

  if (!parts.length) return base;
  const suffix = parts.join('-');
  if (base.includes(suffix)) return base;
  return `${base}-${suffix}`.slice(0, 48);
}

export async function generateUniqueSku(
  input: SkuGeneratorInput,
  exists: (sku: string) => Promise<boolean>,
): Promise<string> {
  const base = generateSku(input);
  return ensureUniqueSku(base, exists);
}

export { buildSkuFromInput, ensureUniqueSku, type SkuInput };
