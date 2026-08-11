import { CAT_LABELS } from '@/lib/data/catalogue';
import type { CatalogueItem } from '@/lib/data/catalogue';
import type { ConfigField, ProductConfig } from '@/lib/data/config-types';
import { displayArticleName } from '@/lib/finition/finition-display';
import { formatPosFieldDisplay } from '@/lib/pos/field-display';
import {
  collectPosProgressFields,
  isFieldValueComplete,
} from '@/lib/pos/initial-config';
import { inferFieldPriceImpactDefaults } from '@/lib/pricing/config-to-dynamic-pricing';
import { resolveFieldPriceImpact } from '@/lib/pricing/price-impact-rules';

export type ConfigurationSummaryRow = {
  key: string;
  label: string;
  value: string;
  complete: boolean;
  group: 'core' | 'config' | 'meta';
  priceImpactBadge?: 'Impact prix' | 'Descriptif' | 'N’impacte pas le prix';
  icon?: string;
};

const PRIORITY_FIELD_KEYS = new Set([
  'format',
  'dimension',
  'dimensions',
  'taille',
  'format_marquage',
  'diametre',
  'matiere',
  'paperType',
  'paperType_int',
  'type_bache',
  'grammage',
  'paperWeight',
  'paperWeight_int',
  'finition',
  'finitions',
  'finition_surface',
  'reliure',
  'type_reliure',
  'face',
  'impression',
  'couleur',
  'technique',
  'type',
  'quantite',
  'qty',
]);

const QTY_KEYS = new Set(['qty', 'quantite', 'quantity']);

function sortFields(a: ConfigField, b: ConfigField): number {
  const aPri = PRIORITY_FIELD_KEYS.has(a.key) ? 0 : 1;
  const bPri = PRIORITY_FIELD_KEYS.has(b.key) ? 0 : 1;
  if (aPri !== bPri) return aPri - bPri;
  return a.label.localeCompare(b.label, 'fr');
}

function iconForRow(key: string, label: string): string {
  const k = `${key} ${label}`.toLowerCase();
  if (/produit|article/.test(k)) return '🛍️';
  if (/catégor|categorie/.test(k)) return '📁';
  if (/type/.test(k)) return '🏷️';
  if (/format|dimension|diam|taille|laize/.test(k)) return '📏';
  if (/mati[eè]re|papier|support/.test(k)) return '📦';
  if (/grammage|épaisseur|epaiss/.test(k)) return '📄';
  if (/couleur|aspect|color/.test(k)) return '🎨';
  if (/face|impression|recto|verso/.test(k)) return '🖨️';
  if (/fini|reliure|technique/.test(k)) return '✨';
  if (/quantit|qty/.test(k)) return '#️⃣';
  return '•';
}

export function collectMissingFieldLabels(
  productConfig: ProductConfig | null,
  config: Record<string, unknown>,
): string[] {
  return collectPosProgressFields(productConfig, config)
    .filter((field) => !isFieldValueComplete(field, config[field.key], config))
    .map((field) => field.label);
}

export function buildConfigurationSummaryRows(input: {
  article: CatalogueItem;
  config: Record<string, unknown>;
  productConfig: ProductConfig | null;
  quantity?: number;
  grandFormatM2?: number | null;
}): ConfigurationSummaryRow[] {
  const { article, config, productConfig, quantity, grandFormatM2 } = input;
  const categoryLabel = CAT_LABELS[article.category] ?? article.category;
  const rows: ConfigurationSummaryRow[] = [
    {
      key: 'produit',
      label: 'Produit',
      value: displayArticleName(article.name ?? ''),
      complete: true,
      group: 'core',
      icon: '🛍️',
    },
    {
      key: 'categorie',
      label: 'Catégorie',
      value: categoryLabel,
      complete: true,
      group: 'core',
      icon: '📁',
    },
  ];

  const fields = productConfig
    ? [...collectPosProgressFields(productConfig, config)].sort(sortFields)
    : [];

  const seenKeys = new Set<string>();
  const seenLabels = new Set<string>(['produit', 'catégorie', 'categorie']);
  let hasQtyField = false;

  for (const field of fields) {
    if (seenKeys.has(field.key)) continue;
    // Évite Type = Catégorie en doublon + labels répétés
    const labelNorm = field.label.trim().toLowerCase();
    if (labelNorm === 'catégorie' || labelNorm === 'categorie' || labelNorm === 'produit') continue;
    if (seenLabels.has(labelNorm)) continue;
    if (QTY_KEYS.has(field.key)) {
      if (hasQtyField) continue;
      hasQtyField = true;
    }

    seenKeys.add(field.key);
    seenLabels.add(labelNorm);
    let val = config[field.key];
    if (QTY_KEYS.has(field.key)) {
      const qtyFromParam =
        typeof quantity === 'number' && quantity > 0
          ? quantity
          : parseInt(String(config.quantite ?? config.qty ?? val ?? ''), 10) || 0;
      if (qtyFromParam > 0) val = qtyFromParam;
    }
    const complete = QTY_KEYS.has(field.key)
      ? Number(val) > 0
      : isFieldValueComplete(field, val, config);
    const defaults = inferFieldPriceImpactDefaults({
      key: field.key,
      type: field.type,
      customInput: field.customInput,
      forcePriceValues: field.forcePriceValues,
    });
    const impact = resolveFieldPriceImpact({
      articleId: article.id,
      fieldKey: field.key,
      defaultImpactsPrice: defaults.impactsPrice,
      defaultIsInformational: defaults.isInformational,
    });
    rows.push({
      key: QTY_KEYS.has(field.key) ? 'quantite' : field.key,
      label: QTY_KEYS.has(field.key) ? 'Quantité' : field.label,
      value: QTY_KEYS.has(field.key)
        ? Number(val) > 0
          ? String(Number(val))
          : 'À sélectionner'
        : complete
          ? formatPosFieldDisplay(field, val, config)
          : 'À sélectionner',
      complete,
      group: 'config',
      priceImpactBadge: impact.badge,
      icon: iconForRow(field.key, field.label),
    });
  }

  if (grandFormatM2 && grandFormatM2 > 0) {
    rows.push({
      key: 'surface',
      label: 'Surface',
      value: `${grandFormatM2} m²`,
      complete: true,
      group: 'config',
      icon: '📐',
    });
  }

  if (!hasQtyField) {
    const qty =
      quantity ??
      (typeof config.quantite === 'number'
        ? config.quantite
        : parseInt(String(config.quantite ?? config.qty ?? ''), 10) || 0);
    rows.push({
      key: 'quantite',
      label: 'Quantité',
      value: qty > 0 ? String(qty) : 'À sélectionner',
      complete: qty > 0,
      group: 'config',
      icon: '#️⃣',
      priceImpactBadge: 'Impact prix',
    });
  }

  return rows;
}

export function formatMissingFieldsShort(labels: string[], max = 5): string {
  if (!labels.length) return '';
  if (labels.length <= max) return labels.join(', ');
  return `${labels.slice(0, max).join(', ')}… (+${labels.length - max})`;
}
