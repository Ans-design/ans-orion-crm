export type DataQualitySeverity = 'critical' | 'high' | 'medium' | 'low';

export type DataQualityRule = {
  id: string;
  module: string;
  label: string;
  severity: DataQualitySeverity;
  description: string;
};

export const DATA_QUALITY_RULES: DataQualityRule[] = [
  { id: 'client-no-phone', module: 'CRM', label: 'Client sans téléphone', severity: 'medium', description: 'tel et whatsapp vides' },
  { id: 'client-no-nif', module: 'CRM', label: 'Client sans NIF (facultatif)', severity: 'low', description: 'NIF non renseigné — normal pour un particulier' },
  { id: 'commande-no-client', module: 'Commandes', label: 'Commande sans client', severity: 'high', description: 'clientId null' },
  { id: 'commande-reste-negative', module: 'Commandes', label: 'Reste négatif', severity: 'critical', description: 'reste < 0' },
  { id: 'devis-no-lines', module: 'Devis', label: 'Devis sans lignes', severity: 'high', description: 'aucune DevisLigne' },
  { id: 'facture-unpaid-overdue', module: 'Finance', label: 'Facture impayée échue', severity: 'high', description: 'statut impayé + dateEcheance passée' },
  { id: 'livraison-no-address', module: 'Logistique', label: 'Livraison sans adresse', severity: 'medium', description: 'adresseLiv vide' },
  { id: 'talk-orphan-commande', module: 'ANS Talk', label: 'Conversation commande orpheline', severity: 'medium', description: 'commandeId sans Commande' },
  { id: 'stock-negative', module: 'Stock', label: 'Stock négatif', severity: 'critical', description: 'quantité < 0' },
  { id: 'commande-no-payment-snapshot', module: 'Commandes', label: 'Commande sans paymentSnapshot', severity: 'medium', description: 'paymentSnapshot null' },
  { id: 'devis-no-logistics-snapshot', module: 'Devis', label: 'Devis accepté sans logisticsSnapshot', severity: 'medium', description: 'devis Accepté sans logisticsSnapshot' },
  { id: 'devis-expired-pending', module: 'Devis', label: 'Devis expiré en attente', severity: 'high', description: 'validUntil passée + statut En attente/Envoyé' },
];
