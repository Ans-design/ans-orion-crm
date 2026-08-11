import { normalizePaperInConfig } from '@/lib/data/paper-material';
import type { CatalogueItem } from '@/lib/data/catalogue';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import { normalizeFinitionConfig } from '@/lib/finition/finition-normalize';
import { finitionSummaryLines, displayArticleName } from '@/lib/finition/finition-display';
import { isStandaloneFinitionArticle } from '@/lib/finition/finition-pricing';
import { articleUsesBindingEngine, bindingCartSummaryLine } from '@/lib/print/binding-rules';
import { BACHE_CANONICAL_ID } from '@/lib/pos/bache-catalog';
import { bacheCartSummaryLine } from '@/lib/grand-format/bache-display';
import { gfCartSummaryLine } from '@/lib/grand-format/gf-display';
import { formatPosFieldDisplay } from '@/lib/pos/field-display';
import { collectPosProgressFields, isFieldValueComplete } from '@/lib/pos/initial-config';
import { LEGACY_PERFORATION_FIELDS } from '@/lib/pos/variable-price-impact.config';
import type { ConfigField } from '@/lib/data/config-types';
import { inferFieldPriceImpactDefaults } from '@/lib/pricing/config-to-dynamic-pricing';
import { resolveFieldPriceImpact } from '@/lib/pricing/price-impact-rules';
import type { GrandFormatBillableResult } from '@/lib/grand-format/types';
import { formatClientDimensionsCm, parseGrandFormatDimensionsCm } from '@/lib/dimensions/grand-format-units';
import { formatClientDimensionsMm, isPetitFormatArticle, parsePetitFormatDimensionsMm } from '@/lib/dimensions/petit-format-units';

export interface CartItemDisplayFields { matiere: string; grammage: string; format: string; impression: string; finition: string; delai: string; }
export type CartConfigSummaryField = {
  label: string;
  value: string;
  order?: number;
  fieldKey?: string;
  impactsPrice?: boolean;
  isInformational?: boolean;
  priceImpactBadge?: 'Impact prix' | 'Descriptif' | 'N’impacte pas le prix';
};
const SKIP = new Set(['', '—', '-', 'non choisi', 'Aucune', 'Sans finition']);
function ok(v: string) { const t = v.trim(); return t && !SKIP.has(t) && t !== '— mm'; }
function push(
  out: CartConfigSummaryField[],
  seen: Set<string>,
  label: string,
  value: string,
  order = 50,
  meta?: Pick<CartConfigSummaryField, 'fieldKey' | 'impactsPrice' | 'isInformational' | 'priceImpactBadge'>,
) {
  if (!ok(value)) return;
  const k = `${label}::${value}`;
  if (seen.has(k)) return;
  seen.add(k);
  out.push({ label, value, order, ...meta });
}

function resolveSummaryImpact(
  articleId: string,
  fieldKey: string,
  field?: Pick<ConfigField, 'key' | 'type' | 'customInput' | 'forcePriceValues'>,
): Pick<CartConfigSummaryField, 'impactsPrice' | 'isInformational' | 'priceImpactBadge'> {
  const defaults = field
    ? inferFieldPriceImpactDefaults({
        key: fieldKey,
        type: field.type,
        customInput: field.customInput,
        forcePriceValues: field.forcePriceValues,
      })
    : { impactsPrice: false, isInformational: true };
  const status = resolveFieldPriceImpact({
    articleId,
    fieldKey,
    defaultImpactsPrice: defaults.impactsPrice,
    defaultIsInformational: defaults.isInformational,
  });
  return {
    impactsPrice: status.impactsPrice,
    isInformational: status.isInformational,
    priceImpactBadge: status.badge,
  };
}

export function formatCartConfigSummaryLine(field: CartConfigSummaryField): string {
  const badge = field.priceImpactBadge === 'Impact prix'
    ? 'impact prix'
    : field.priceImpactBadge === 'Descriptif' || field.priceImpactBadge === 'N’impacte pas le prix'
      ? 'descriptif'
      : null;
  return badge ? `${field.label}: ${field.value} (${badge})` : `${field.label}: ${field.value}`;
}

export function formatCartConfigSummaryLines(fields: CartConfigSummaryField[]): string {
  return fields.map(formatCartConfigSummaryLine).join(' | ');
}
function pick(config: Record<string, unknown>, keys: string[], fb = '—') {
  for (const k of keys) { const v = config[k]; if (v != null && String(v).trim()) return String(v); } return fb;
}

export function getCartItemDisplayFields(config: Record<string, unknown>, articleId?: string): CartItemDisplayFields {
  let n = config as Record<string, unknown>;
  if (articleId?.startsWith('fin-')) n = normalizeFinitionConfig(articleId, n);
  n = normalizePaperInConfig(n).config;
  let format = pick(n, ['dim', 'format', 'dimensions', 'taille', 'format_final']);
  if (articleId?.startsWith('gf-') || articleId === BACHE_CANONICAL_ID) {
    const d = parseGrandFormatDimensionsCm(n); if (d) format = formatClientDimensionsCm(d.longueurCm, d.largeurCm);
  } else if (isPetitFormatArticle(articleId)) {
    const d = parsePetitFormatDimensionsMm(n); if (d) format = formatClientDimensionsMm(d.longueurMm, d.largeurMm);
  }
  let finition = '—';
  if (articleId && isStandaloneFinitionArticle(articleId)) {
    const lines = finitionSummaryLines(articleId, n); finition = lines.length ? lines.join(' · ') : pick(n, ['type']);
  } else if (articleId && articleUsesBindingEngine(articleId)) {
    finition = bindingCartSummaryLine(n) ?? pick(n, ['reliure', 'type_reliure', 'type']);
  } else if (articleId === BACHE_CANONICAL_ID) {
    finition = bacheCartSummaryLine(n) ?? pick(n, ['type_bache', 'grammage']);
  } else if (articleId?.startsWith('gf-')) {
    finition = gfCartSummaryLine(n) ?? pick(n, ['finition', 'grammage', 'laize']);
  } else {
    const raw = n.finition ?? n.finitions ?? n.finition_surface;
    if (Array.isArray(raw)) { const list = (raw as string[]).filter((f) => f && f !== 'Aucune'); finition = list.length ? list.join(', ') : '—'; }
    else if (typeof raw === 'string' && raw.trim()) finition = raw;
  }
  return { matiere: pick(n, ['paperType', 'paperType_int', 'type']), grammage: pick(n, ['paperWeight', 'paperWeight_int', 'grammage']), format, impression: pick(n, ['face', 'impression', 'couleur']), finition, delai: pick(n, ['delai', 'delaiProduction', 'delaiExecution']) };
}

export function getCartItemConfigSummary(config: Record<string, unknown>, articleId: string, quantity?: number): CartConfigSummaryField[] {
  const fields: CartConfigSummaryField[] = []; const seen = new Set<string>();
  let n = { ...config }; if (articleId?.startsWith('fin-')) n = normalizeFinitionConfig(articleId, n);
  n = normalizePaperInConfig(n).config;
  if (articleId.startsWith('cg-') || n.serviceLabel) {
    if (n.serviceLabel) push(fields, seen, 'Prestation', String(n.serviceLabel), 1);
    if (n.level) push(fields, seen, 'Niveau', String(n.level), 2);
    if (n.proposals != null) push(fields, seen, 'Propositions', String(n.proposals), 3);
    if (n.revisions != null) push(fields, seen, 'Révisions', String(n.revisions), 4);
    if (n.delay) push(fields, seen, 'Délai', String(n.delay), 5);
    if (Array.isArray(n.extras) && n.extras.length) push(fields, seen, 'Options', (n.extras as string[]).join(', '), 6);
    if (n.remarques) push(fields, seen, 'Remarques', String(n.remarques), 80);
  } else {
    const pc = getProductConfig(articleId);
    if (pc) for (const f of collectPosProgressFields(pc, n)) {
      const v = n[f.key]; if (!isFieldValueComplete(f, v, n)) continue;
      push(fields, seen, f.label, formatPosFieldDisplay(f, v, n), 10, {
        fieldKey: f.key,
        ...resolveSummaryImpact(articleId, f.key, f),
      });
    }
    for (const legacyKey of LEGACY_PERFORATION_FIELDS) {
      const legacyValue = n[legacyKey];
      if (legacyValue == null || legacyValue === '') continue;
      push(fields, seen, 'Nombre de perforations', String(legacyValue), 88, {
        fieldKey: legacyKey,
        impactsPrice: false,
        isInformational: true,
        priceImpactBadge: 'Descriptif',
      });
    }
    const gf = n._gfBillable as GrandFormatBillableResult | undefined;
    if (gf?.clientLargeurCm) {
      push(fields, seen, 'Dimensions', `${gf.clientLargeurCm} × ${gf.clientHauteurCm} cm`, 20);
      push(fields, seen, 'Surface réelle', `${gf.surfaceReelleM2.toFixed(2)} m²`, 21);
      if (gf.laizeLabel) push(fields, seen, 'Laize', gf.laizeLabel, 23);
    }
    if (articleUsesBindingEngine(articleId)) { const b = bindingCartSummaryLine(n); if (b) push(fields, seen, 'Reliure', b, 25); }
    if (isStandaloneFinitionArticle(articleId)) for (const l of finitionSummaryLines(articleId, n)) push(fields, seen, 'Finition', l, 25);
  }
  if (quantity && quantity > 0 && !fields.some((f) => /quantit/i.test(f.label))) push(fields, seen, 'Quantité', `${quantity} pcs`, 99);
  return fields.sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
}

export function getCartItemArticleLabel(_articleId: string, name: string) { return displayArticleName(name); }
export function getCatalogueItemForCart(articleId: string): CatalogueItem | undefined { return findCatalogueItem(articleId); }
