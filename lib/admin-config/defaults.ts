import { CATALOGUE } from '@/lib/data/catalogue';
import { getProductConfig } from '@/lib/data/config-types';
import { DEFAULT_GLOBAL_PRICING } from '@/lib/data/global-pricing';
import { BOX_ADMIN_DEFAULTS, BOX_MATERIAL_ADMIN_DEFAULTS } from '@/lib/packaging/box-admin-defaults';
import type {
  AdminConfigMeta,
  AdminConfigSnapshot,
  ChipAdminEntry,
  FeatureFlagEntry,
  VariableAdminEntry,
} from './types';

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlagEntry[] = [
  { key: 'pos_force_price', label: 'Prix forcé', description: 'Saisie manuelle du prix unitaire', enabled: true, rolesAllowed: ['admin', 'manager'] },
  { key: 'pos_global_discount', label: 'Remise globale panier', enabled: true, rolesAllowed: ['admin', 'manager', 'commercial'] },
  { key: 'pos_promo_code', label: 'Codes promo', enabled: true, rolesAllowed: ['admin', 'manager', 'commercial', 'caisse'] },
  { key: 'pos_partial_payment', label: 'Paiement partiel / acompte', enabled: true, rolesAllowed: ['admin', 'manager', 'caisse'] },
  { key: 'pos_mixed_payment', label: 'Paiement mixte', enabled: true, rolesAllowed: ['admin', 'manager', 'caisse'] },
  { key: 'pos_client_credit', label: 'Crédit client', enabled: true, rolesAllowed: ['admin', 'manager'] },
  { key: 'pos_auto_stock', label: 'Déduction stock automatique', enabled: false, rolesAllowed: ['admin'] },
  { key: 'pos_bat_required', label: 'BAT obligatoire (sensible)', enabled: false, rolesAllowed: ['admin'] },
  { key: 'pos_quick_quote', label: 'Devis rapide', enabled: true, rolesAllowed: ['admin', 'manager', 'commercial', 'caisse'] },
  { key: 'pos_quick_order', label: 'Commande rapide', enabled: true, rolesAllowed: ['admin', 'manager', 'commercial', 'caisse'] },
  { key: 'pos_counter_sale', label: 'Vente comptoir', enabled: true, rolesAllowed: ['admin', 'manager', 'caisse'] },
  { key: 'pos_auto_invoice', label: 'Facture automatique', enabled: false, rolesAllowed: ['admin'] },
  { key: 'pos_receipt_ticket', label: 'Ticket caisse', enabled: true, rolesAllowed: ['admin', 'manager', 'caisse'] },
  { key: 'pos_production_slip', label: 'Bon de production auto', enabled: false, rolesAllowed: ['admin', 'production'] },
  { key: 'pos_delivery', label: 'Livraison', enabled: true, rolesAllowed: ['admin', 'manager', 'commercial', 'livraison'] },
  { key: 'pos_whatsapp', label: 'Messages WhatsApp', enabled: false, rolesAllowed: ['admin', 'commercial'] },
  { key: 'pos_export_csv', label: 'Export CSV', enabled: true, rolesAllowed: ['admin', 'manager'] },
  { key: 'pos_import_json', label: 'Import JSON config', enabled: true, rolesAllowed: ['admin'] },
];

function buildDefaultVariables(): Record<string, VariableAdminEntry> {
  const g = DEFAULT_GLOBAL_PRICING;
  return {
    tva: { key: 'tva', label: 'TVA par défaut', value: g.tvaDefault, unit: '%', category: 'pricing' },
    marge_cible: { key: 'marge_cible', label: 'Marge cible', value: 30, unit: '%', category: 'margin' },
    marge_minimum: { key: 'marge_minimum', label: 'Marge minimum', value: 15, unit: '%', category: 'margin' },
    gache_papier: { key: 'gache_papier', label: 'Gâche papier', value: 5, unit: '%', category: 'production' },
    bat_physique: { key: 'bat_physique', label: 'Frais BAT physique', value: g.bat.physiquePapier, unit: 'Ar', category: 'pricing' },
    emballage: { key: 'emballage', label: 'Frais emballage renforcé', value: g.livraison.emballageRenforce, unit: 'Ar', category: 'delivery' },
    livraison_tana: { key: 'livraison_tana', label: 'Livraison Antananarivo', value: g.livraison.livraisonTana, unit: 'Ar', category: 'delivery' },
    delai_standard_h: { key: 'delai_standard_h', label: 'Délai standard', value: 72, unit: 'h', category: 'production' },
    delai_express_h: { key: 'delai_express_h', label: 'Délai express', value: 48, unit: 'h', category: 'production' },
    coef_urgence: { key: 'coef_urgence', label: 'Coefficient urgence', value: g.production.superExpress24h, unit: '×', category: 'production' },
    prix_min_commande: { key: 'prix_min_commande', label: 'Prix minimum commande', value: 10000, unit: 'Ar', category: 'pricing' },
    remise_max_vendeur: { key: 'remise_max_vendeur', label: 'Remise max commercial', value: 10, unit: '%', category: 'margin' },
    remise_max_manager: { key: 'remise_max_manager', label: 'Remise max manager', value: 25, unit: '%', category: 'margin' },
    grammage_min_carte: { key: 'grammage_min_carte', label: 'Grammage min. carte / papier épais', value: 230, unit: 'g', category: 'production' },
    grammage_min_fidelite: { key: 'grammage_min_fidelite', label: 'Grammage min. carte fidélité', value: 250, unit: 'g', category: 'production' },
    grammage_max_flyer: { key: 'grammage_max_flyer', label: 'Grammage max. flyer', value: 300, unit: 'g', category: 'production' },
    box_marge_chute_mm: {
      key: 'box_marge_chute_mm',
      label: 'Boîte — marge chute',
      value: BOX_ADMIN_DEFAULTS.marge_chute_mm,
      unit: 'mm',
      category: 'production',
    },
    box_bleed_mm: {
      key: 'box_bleed_mm',
      label: 'Boîte — fond perdu',
      value: BOX_ADMIN_DEFAULTS.bleed_mm,
      unit: 'mm',
      category: 'production',
    },
    box_patte_colle_mm: {
      key: 'box_patte_colle_mm',
      label: 'Boîte — patte de colle',
      value: BOX_ADMIN_DEFAULTS.patte_colle_mm,
      unit: 'mm',
      category: 'production',
    },
    box_surface_brute_extra_mm: {
      key: 'box_surface_brute_extra_mm',
      label: 'Format perso — surplus surface brute',
      value: BOX_ADMIN_DEFAULTS.surface_brute_extra_mm,
      unit: 'mm',
      category: 'production',
    },
    box_prix_m2_carton_300: {
      key: 'box_prix_m2_carton_300',
      label: 'Boîte — prix m² carton 300 g',
      value: BOX_MATERIAL_ADMIN_DEFAULTS.find((r) => r.grammage === 300)?.prixM2 ?? 9500,
      unit: 'Ar/m²',
      category: 'pricing',
    },
    box_prix_m2_carton_350: {
      key: 'box_prix_m2_carton_350',
      label: 'Boîte — prix m² carton 350 g',
      value: BOX_MATERIAL_ADMIN_DEFAULTS.find((r) => r.grammage === 350)?.prixM2 ?? 10500,
      unit: 'Ar/m²',
      category: 'pricing',
    },
  };
}

function extractChipsFromCatalogue(): Record<string, ChipAdminEntry> {
  const chips: Record<string, ChipAdminEntry> = {};
  for (const art of CATALOGUE) {
    const cfg = getProductConfig(art.id);
    if (!cfg) continue;
    cfg.sections.forEach((section) => {
      const sectionArchived = Boolean(section.archived || section.posHidden);
      section.fields.forEach((field) => {
        if (field.type !== 'chips' && field.type !== 'chips_multi') return;
        const fieldArchived = sectionArchived || Boolean(field.archived || field.posHidden);
        field.options?.forEach((opt, idx) => {
          const optionKey = slug(opt);
          const id = `${art.id}:${field.key}:${optionKey}`;
          chips[id] = {
            id,
            scope: 'article',
            productId: art.id,
            blockKey: section.title,
            fieldKey: field.key,
            optionKey,
            label: opt,
            order: (idx + 1) * 10,
            visibility: fieldArchived ? 'HIDDEN' : 'ACTIVE',
            priceImpact: fieldArchived ? 0 : (field.forcePriceValues?.includes(opt) ? -1 : 0),
            affectsStock: false,
            affectsProduction: !fieldArchived,
            affectsDelay: false,
            required: false,
            defaultSelected: !fieldArchived && field.default === opt,
            rolesVisible: [],
            compatibleWith: [],
            incompatibleWith: [],
            source: 'catalogue',
            archived: fieldArchived || undefined,
          };
        });
      });
    });
  }
  return chips;
}

/** Bootstrap depuis le catalogue code — source unique initiale */
export function buildDefaultAdminSnapshot(status: 'draft' | 'published' = 'published'): AdminConfigSnapshot {
  const articles: AdminConfigSnapshot['articles'] = {};
  for (const art of CATALOGUE) {
    articles[art.id] = {
      id: art.id,
      name: art.name,
      category: art.category,
      visibility: 'ACTIVE',
    };
  }
  const featureFlags: AdminConfigSnapshot['featureFlags'] = {};
  DEFAULT_FEATURE_FLAGS.forEach((f) => { featureFlags[f.key] = f; });

  return {
    version: 1,
    status,
    updatedAt: new Date().toISOString(),
    articles,
    chips: extractChipsFromCatalogue(),
    featureFlags,
    variables: buildDefaultVariables(),
  };
}

export const DEFAULT_ADMIN_META: AdminConfigMeta = {
  draftVersion: 1,
  publishedVersion: 1,
  lastPublishedAt: null,
  lastPublishedBy: null,
};

export const CONFIG_KEYS = {
  draft: 'pos_admin_draft',
  published: 'pos_admin_published',
  meta: 'pos_admin_meta',
} as const;
