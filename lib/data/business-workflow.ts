/** Transitions métier recommandées (étape O) — phase simple, modifiable */

export type WorkflowTransition = {
  from: string;
  to: string;
  action: string;
  module: string;
};

export const CRM_WORKFLOW_CHAIN = [
  'Client',
  'Devis',
  'BAT',
  'Commande',
  'Stock réservé',
  'GPAO',
  'Production',
  'Contrôle qualité',
  'Livraison',
  'Facture',
  'Paiement',
  'Historique client',
] as const;

export const RECOMMENDED_TRANSITIONS: WorkflowTransition[] = [
  { from: 'Devis Accepté', to: 'Commande créée', action: 'devis-accept', module: 'devis' },
  { from: 'Commande confirmée', to: 'Dossier GPAO', action: 'create-gpao', module: 'production' },
  { from: 'BAT validé', to: 'Production autorisée', action: 'bat-validate', module: 'bat' },
  { from: 'Production terminée', to: 'En contrôle qualité', action: 'prod-to-cq', module: 'production' },
  { from: 'En contrôle qualité', to: 'Prêt à livrer', action: 'cq-validate', module: 'production' },
  { from: 'Livraison terminée', to: 'Facture proposée', action: 'delivery-done', module: 'livraison' },
  { from: 'Facture payée', to: 'Dossier clôturé', action: 'payment-received', module: 'finance' },
];

export const CONFIGURABLE_STATUSES = [
  { id: 'draft', label: 'Brouillon', entity: 'article' },
  { id: 'published', label: 'Actif', entity: 'article' },
  { id: 'archived', label: 'Archivé', entity: 'article' },
  { id: 'review', label: 'À vérifier', entity: 'article' },
  { id: 'Brouillon', label: 'Brouillon', entity: 'devis' },
  { id: 'Accepté', label: 'Accepté', entity: 'devis' },
  { id: 'En cours', label: 'En production', entity: 'commande' },
  { id: 'Livré', label: 'Livré', entity: 'commande' },
  { id: 'Payé', label: 'Payé', entity: 'facture' },
] as const;

/** Statuts métier globaux (référentiel ultraprompt flow — visualisation Backoffice). */
export const GLOBAL_FLOW_STATUSES = [
  { id: 'brouillon', label: 'Brouillon', module: 'general' },
  { id: 'en-attente', label: 'En attente', module: 'general' },
  { id: 'a-verifier', label: 'À vérifier', module: 'general' },
  { id: 'validation-client', label: 'En validation client', module: 'devis' },
  { id: 'bat-requis', label: 'BAT requis', module: 'studio' },
  { id: 'bat-en-cours', label: 'BAT en cours', module: 'studio' },
  { id: 'bat-envoye', label: 'BAT envoyé', module: 'studio' },
  { id: 'bat-valide', label: 'BAT validé', module: 'studio' },
  { id: 'commande-confirmee', label: 'Commande confirmée', module: 'commande' },
  { id: 'stock-a-verifier', label: 'Stock à vérifier', module: 'stock' },
  { id: 'stock-reserve', label: 'Stock réservé', module: 'stock' },
  { id: 'en-preparation', label: 'En préparation', module: 'production' },
  { id: 'en-production', label: 'En production', module: 'production' },
  { id: 'controle-qualite', label: 'En contrôle qualité', module: 'production' },
  { id: 'pret-livrer', label: 'Prêt à livrer', module: 'logistique' },
  { id: 'livre', label: 'Livré', module: 'logistique' },
  { id: 'non-facture', label: 'Non facturé', module: 'finance' },
  { id: 'facture', label: 'Facturé', module: 'finance' },
  { id: 'partiellement-paye', label: 'Partiellement payé', module: 'finance' },
  { id: 'paye', label: 'Payé', module: 'finance' },
  { id: 'cloture', label: 'Clôturé', module: 'commande' },
  { id: 'archive', label: 'Archivé', module: 'general' },
  { id: 'bloque', label: 'Bloqué', module: 'production' },
  { id: 'annule', label: 'Annulé', module: 'general' },
] as const;
