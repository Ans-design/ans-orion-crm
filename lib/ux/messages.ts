/**
 * Messages utilisateur ANS ORION — jamais d’erreur technique brute.
 */

const PRISMA_PATTERNS = [/prisma/i, /P\d{4}/, /Unique constraint/i, /Foreign key/i];
const NEXT_PATTERNS = [/next\.js/i, /digest:/i, /ChunkLoadError/i];

export function toUserError(raw: unknown, fallback = 'Une erreur est survenue. Veuillez réessayer.') {
  const msg = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : '';
  if (!msg.trim()) return fallback;
  if (PRISMA_PATTERNS.some((p) => p.test(msg)) || NEXT_PATTERNS.some((p) => p.test(msg))) {
    return fallback;
  }
  if (msg.length > 180) return fallback;
  return msg;
}

/** Classe une réponse HTTP ou une erreur fetch pour un message utilisateur précis. */
export function classifyFetchError(
  input: { status?: number; message?: string } | Response | unknown,
  fallback: string = UX_MSG.loadFailed,
): string {
  if (input instanceof Response) {
    if (input.status === 401) return UX_MSG.sessionExpired;
    if (input.status === 403) return UX_MSG.forbidden;
    if (input.status === 404) return UX_MSG.notFound;
    if (input.status === 400 || input.status === 422) return UX_MSG.validation;
    if (input.status >= 500) return UX_MSG.serverError;
    if (!input.ok) return fallback;
    return fallback;
  }
  const status = typeof input === 'object' && input != null && 'status' in input
    ? Number((input as { status?: number }).status)
    : undefined;
  const message = typeof input === 'object' && input != null && 'message' in input
    ? String((input as { message?: string }).message ?? '')
    : typeof input === 'string'
      ? input
      : input instanceof Error
        ? input.message
        : '';

  if (status === 401) return UX_MSG.sessionExpired;
  if (status === 403) return UX_MSG.forbidden;
  if (status === 404) return UX_MSG.notFound;
  if (status === 400 || status === 422) return toUserError(message, UX_MSG.validation);
  if (status != null && status >= 500) return UX_MSG.serverError;

  const lower = message.toLowerCase();
  if (/network|fetch failed|failed to fetch|econnrefused|enotfound/i.test(lower)) {
    return UX_MSG.network;
  }
  if (/permission|forbidden|unauthorized|non autoris/i.test(lower)) return UX_MSG.forbidden;
  if (/not found|introuvable|404/i.test(lower)) return UX_MSG.notFound;
  if (/validation|invalid|invalide/i.test(lower)) return toUserError(message, UX_MSG.validation);
  if (/import|excel|ligne/i.test(lower) && /erreur|error|refus/i.test(lower)) {
    return toUserError(message, UX_MSG.importFailed);
  }

  return toUserError(message, fallback);
}

export const UX_MSG = {
  network: 'Connexion impossible. Vérifiez le réseau et réessayez.',
  loadFailed: 'Impossible de charger les données.',
  forbidden: 'Action non autorisée pour votre rôle.',
  sessionExpired: 'Session expirée — reconnectez-vous.',
  notFound: 'Ressource introuvable ou route indisponible.',
  validation: 'Données invalides — vérifiez le formulaire.',
  serverError: 'Erreur serveur — réessayez ou contactez l\'administrateur.',
  importFailed: 'Import Excel refusé — consultez le rapport d\'erreurs.',
  priceNotConfigured: 'Prix à configurer dans Administration avant la vente.',
  saveOk: 'Modifications enregistrées.',
  clientRequired: 'Sélectionnez un client CRM pour continuer.',
  cartEmpty: 'Ajoutez au moins un article au panier.',
  devisCreated: (numero?: string) =>
    numero ? `Devis ${numero} créé — ouvrez-le pour valider le paiement.` : 'Devis créé.',
  commandeCreated: 'Commande créée.',
  paymentOk: 'Paiement enregistré.',
  lateDeclared: 'Déclaration transmise au service RH. Accès débloqué.',
  cartItemAdded: 'Article ajouté au panier.',
  cartItemRemoved: 'Ligne retirée du panier.',
  cartItemDuplicated: 'Ligne dupliquée.',
  qtyUpdated: 'Quantité mise à jour.',
  publishOk: (version?: number) =>
    version != null ? `Configuration v${version} publiée sur le catalogue.` : 'Configuration publiée.',
  syncOk: 'Synchronisation terminée.',
  syncInProgress: 'Synchronisation en cours…',
} as const;
