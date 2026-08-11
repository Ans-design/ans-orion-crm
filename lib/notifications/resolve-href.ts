type NotifLike = {
  href?: string | null;
  link?: string | null;
  entity?: string | null;
  entityId?: string | null;
  type?: string | null;
};

const ENTITY_ROUTES: Record<string, (id?: string | null) => string | null> = {
  Client: (id) => (id ? `/clients/${id}` : '/clients'),
  Devis: (id) => (id ? `/devis/${id}` : '/devis'),
  Commande: (id) => (id ? `/commandes?highlight=${id}` : '/commandes'),
  Production: () => '/production',
  Facture: (id) => (id ? `/factures/${id}` : '/factures'),
  Paiement: () => '/caisse',
  Livraison: () => '/livraisons',
  Stock: () => '/stock',
  Panier: () => '/panier',
  Audit: () => '/historique',
};

/** Résout un lien de navigation pour une notification ou une entrée audit. */
export function resolveNotificationHref(n: NotifLike): string | null {
  const direct = n.href || n.link;
  if (direct) return direct;

  const entity = String(n.entity ?? '').trim();
  if (!entity) return null;

  const resolver = ENTITY_ROUTES[entity];
  if (resolver) return resolver(n.entityId);

  return '/historique';
}
