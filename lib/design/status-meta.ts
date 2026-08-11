import { statusBadgeClass, STATUS_TONE } from '@/lib/ui/status-styles';

export type StatusMeta = {
  label: string;
  description: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
};

const META: Record<string, StatusMeta> = {
  'À planifier': { label: 'À planifier', description: 'Commande créée, en attente de planification atelier', tone: 'neutral' },
  'En attente stock': { label: 'En attente stock', description: 'Matière insuffisante ou réservation en cours', tone: 'warning' },
  'En production': { label: 'En production', description: 'Impression ou façonnage en cours', tone: 'info' },
  'En finition': { label: 'En finition', description: 'Finition, découpe ou contrôle en cours', tone: 'info' },
  'Prête': { label: 'Prête', description: 'Lot conforme — prêt pour livraison', tone: 'success' },
  'Livré': { label: 'Livré', description: 'Marchandise remise au client', tone: 'success' },
  'Suspendu': { label: 'Suspendu', description: 'Production bloquée — action requise', tone: 'warning' },
  'Annulée': { label: 'Annulée', description: 'Commande annulée', tone: 'danger' },
  Bloqué: { label: 'Bloqué', description: 'Blocage actif — voir la cause dans le hub 360°', tone: 'danger' },
  'En attente contrôle': { label: 'En attente contrôle', description: 'Checklist qualité à compléter', tone: 'warning' },
  Conforme: { label: 'Conforme', description: 'Contrôle qualité validé', tone: 'success' },
  'Non conforme': { label: 'Non conforme', description: 'NC enregistrée — action corrective requise', tone: 'danger' },
  'A refaire': { label: 'À refaire', description: 'Reprise production nécessaire', tone: 'warning' },
  'Accepte avec reserve': { label: 'Accepté avec réserve', description: 'Livraison possible avec réserve documentée', tone: 'warning' },
  Brouillon: { label: 'Brouillon', description: 'Document non finalisé', tone: 'neutral' },
  Envoyé: { label: 'Envoyé', description: 'En attente de retour client', tone: 'info' },
  Accepté: { label: 'Accepté', description: 'Validé par le client', tone: 'success' },
  Refusé: { label: 'Refusé', description: 'Refus client ou interne', tone: 'danger' },
  Payée: { label: 'Payée', description: 'Facture soldée', tone: 'success' },
  'Partiellement payée': { label: 'Partiellement payée', description: 'Acompte ou paiement partiel reçu', tone: 'warning' },
};

export function getStatusMeta(statut: string): StatusMeta {
  return META[statut] ?? {
    label: statut,
    description: 'Statut métier ORION',
    tone: 'neutral',
  };
}

export function statusBadgeClasses(statut: string): string {
  return statusBadgeClass(statut);
}

export function statusToneClasses(tone: StatusMeta['tone']): string {
  const map: Record<StatusMeta['tone'], string> = {
    neutral: STATUS_TONE.neutral,
    info: STATUS_TONE.info,
    success: STATUS_TONE.success,
    warning: STATUS_TONE.warning,
    danger: STATUS_TONE.danger,
  };
  return map[tone];
}
