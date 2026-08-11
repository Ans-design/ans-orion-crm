export const GPAO_16_ETAPES = [
  'Commande reçue',
  'Vérification dossier',
  'Fichiers complets',
  'Préparation graphique',
  'BAT envoyé',
  'BAT validé',
  'Planification production',
  'Impression',
  'Séchage / attente',
  'Façonnage',
  'Contrôle qualité',
  'Emballage',
  'Prêt livraison',
  'Livré',
  'Facturé / payé',
  'Archivé',
] as const;

export const DOSSIER_STATUTS = [
  'Nouveau',
  'En préparation',
  'En attente fichiers',
  'En attente BAT',
  'BAT validé',
  'Planifié',
  'En production',
  'En pause',
  'Bloqué',
  'En retard',
  'Prêt',
  'Livré',
  'Annulé',
] as const;

export const ETAPE_STATUTS = ['À faire', 'En cours', 'Terminé', 'Sauté', 'Bloqué'] as const;

export const INCIDENT_SEVERITIES = ['Faible', 'Moyenne', 'Haute', 'Critique'] as const;

export const INCIDENT_STATUTS = ['Ouvert', 'En cours', 'Résolu'] as const;

export type GpaoEtapeNom = (typeof GPAO_16_ETAPES)[number];

/** 15 statuts production audit — mappés sur les 16 étapes GPAO (sans suppression). */
export const GPAO_AUDIT_15_STATUTS = [
  'Nouveau',
  'En attente BAT',
  'BAT validé',
  'Préparation fichier',
  'En attente matière',
  'Prêt impression',
  'Impression en cours',
  'Impression terminée',
  'Façonnage',
  'Contrôle qualité',
  'Prêt livraison',
  'Livré',
  'Facturé',
  'Payé',
  'Archivé',
] as const;

export type GpaoAuditStatut = (typeof GPAO_AUDIT_15_STATUTS)[number];

/** Dérive le statut audit à partir de l'étape GPAO courante (première non terminée). */
export function deriveGpaoAuditStatut(
  etapes: { nom: string; statut: string }[],
): GpaoAuditStatut {
  const order = GPAO_16_ETAPES as readonly string[];
  const etapeToAudit: Record<string, GpaoAuditStatut> = {
    'Commande reçue': 'Nouveau',
    'Vérification dossier': 'Nouveau',
    'Fichiers complets': 'Préparation fichier',
    'Préparation graphique': 'Préparation fichier',
    'BAT envoyé': 'En attente BAT',
    'BAT validé': 'BAT validé',
    'Planification production': 'Prêt impression',
    Impression: 'Impression en cours',
    'Séchage / attente': 'Impression terminée',
    Façonnage: 'Façonnage',
    'Contrôle qualité': 'Contrôle qualité',
    Emballage: 'Prêt livraison',
    'Prêt livraison': 'Prêt livraison',
    Livré: 'Livré',
    'Facturé / payé': 'Facturé',
    Archivé: 'Archivé',
  };

  const active = etapes.find((e) => e.statut === 'En cours' || e.statut === 'Bloqué');
  if (active) {
    const mapped = etapeToAudit[active.nom];
    if (mapped) return mapped;
  }

  const allDone = etapes.every((e) => e.statut === 'Terminé' || e.statut === 'Sauté');
  if (allDone) return 'Archivé';

  const firstPending = etapes.find((e) => e.statut === 'À faire' || e.statut === 'En cours');
  if (firstPending) {
    const mapped = etapeToAudit[firstPending.nom];
    if (mapped) return mapped;
  }

  const lastDone = [...etapes].reverse().find((e) => e.statut === 'Terminé' || e.statut === 'Sauté');
  if (lastDone) {
    const idx = order.indexOf(lastDone.nom);
    const next = order[idx + 1];
    if (next && etapeToAudit[next]) return etapeToAudit[next];
    if (lastDone.nom === 'Facturé / payé') return 'Payé';
  }

  return 'Nouveau';
}
