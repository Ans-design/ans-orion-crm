/**
 * Règles de synchronisation métier ANS ORION (étape 7).
 * Documentation exécutable — les services existants implémentent ces flux.
 */
export const COMMERCIAL_FLOW = [
  { from: 'CRM Client', to: 'POS', rule: 'Client sélectionné visible dans SalesClientBanner / store' },
  { from: 'POS', to: 'Panier', rule: 'Lignes config + clientId sur addToCart' },
  { from: 'Panier', to: 'Devis', rule: 'checkout → Devis avec snapshot client + lignes' },
  { from: 'Devis', to: 'Commande', rule: 'acceptation / conversion workflow' },
  { from: 'Commande', to: 'Production', rule: 'production-commande-sync, GPAO dossiers' },
  { from: 'Commande', to: 'BAT', rule: 'proofs liés commandeId' },
  { from: 'Commande', to: 'Livraison', rule: 'livraisons API + statuts' },
  { from: 'Paiement', to: 'Finance', rule: 'paiements → dashboard finance, factures' },
  { from: 'Commande', to: 'Timeline client', rule: 'historique + audit logs' },
  { from: 'Backoffice', to: 'POS', rule: 'admin-config publish → catalogue POS / pricing' },
  { from: 'Stock', to: 'POS', rule: 'stock-check API, réservations commande' },
  { from: 'ANS Talk', to: 'Commande/Devis', rule: 'create-from-order / create-from-dossier' },
] as const;

export type CommercialFlowStep = (typeof COMMERCIAL_FLOW)[number];

/** Services responsables par domaine (point d'entrée pour refactor). */
export const MODULE_SERVICE_MAP = {
  clients: ['lib/services/client-detail.ts', 'lib/services/client-merge-service.ts', 'lib/server/modules/clients/'],
  cart: ['lib/services/cart-service.ts'],
  devis: ['lib/services/devis-accept-service.ts', 'lib/services/devis-expiration-service.ts'],
  commandes: ['lib/services/commande-service.ts', 'lib/services/commande-module-sync.ts', 'lib/services/commande-workflow-service.ts'],
  paiements: ['lib/services/finance.service.ts'],
  production: ['lib/services/production.service.ts', 'lib/services/production-commande-sync.ts'],
  stock: ['lib/services/stock-service.ts', 'lib/services/StockAvailabilityService.ts'],
  messaging: ['lib/messaging/messaging-service.ts'],
  rh: ['lib/services/rh-service.ts', 'lib/services/late-arrival-service.ts'],
  admin: ['lib/services/admin-config.ts', 'lib/services/backoffice-article-service.ts'],
  dashboard: ['lib/services/dashboard-slices.ts', 'lib/services/dashboard-stats.ts'],
} as const;
