/** Fonctionnalités ANS Talk — plan §2.2 / §4.7 */

/** WebRTC masqué tant que signalisation complète non livrée */
export const ANS_TALK_WEBRTC_ENABLED = false;

/** Recherche globale conversations / messages */
export const ANS_TALK_SEARCH_ENABLED = true;

/** Groupes métiers par défaut */
export const ANS_TALK_SERVICE_GROUPS = [
  'Graphistes',
  'Impression',
  'Façonnage',
  'Conducteurs machine',
  'Stock',
  'Livraison',
  'Finance',
  'RH',
] as const;
