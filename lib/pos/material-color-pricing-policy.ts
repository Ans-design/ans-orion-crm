import type { ConfigField } from '@/lib/data/config-types';

/** Champs colorimétrie impression — peuvent impacter le prix. */
const IMPRESSION_COLOR_KEYS = new Set([
  'couleur_impression',
  'couleurs_souches',
  'type',
  'type_impression',
]);

/** Couleur matière / palette — descriptive uniquement (sauf « Personnalisée »). */
export function isMaterialPaletteField(field: Pick<ConfigField, 'key' | 'type'>): boolean {
  if (field.type === 'color_palette') return true;
  const k = field.key.toLowerCase();
  if (IMPRESSION_COLOR_KEYS.has(k)) return false;
  if (k.startsWith('couleur') && !k.includes('impression')) return true;
  return false;
}

export function isMaterialColorCustomValue(value: unknown): boolean {
  const v = String(value ?? '').toLowerCase().trim();
  return /personnalis|autres|sur devis|custom/.test(v);
}

/** La couleur matière ne force le prix que si l’option est explicitement personnalisée. */
export function shouldMaterialColorForcePrice(
  field: Pick<ConfigField, 'key' | 'type' | 'forcePriceValues'>,
  value: unknown,
): boolean {
  if (!isMaterialPaletteField(field)) {
    return Boolean(field.forcePriceValues?.includes(String(value ?? '')));
  }
  return isMaterialColorCustomValue(value);
}
