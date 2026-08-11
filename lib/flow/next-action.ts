/**
 * Actions suivantes recommandées — flow métier ANS ORION.
 * Complète le workflow commande (hub) pour d'autres contextes.
 */
import { resolveCommandeNextAction } from '@/lib/commande/order-next-action';

export type NextAction = {
  id: string;
  label: string;
  description?: string;
  href: string;
  module: string;
  priority: 'high' | 'medium' | 'low';
};

export type NextActionContext = {
  entity: 'devis' | 'commande' | 'bat' | 'production' | 'stock' | 'livraison' | 'facture' | 'article' | 'client';
  status: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

const DEVIS_ACTIONS: Record<string, NextAction> = {
  Brouillon: {
    id: 'devis-send',
    label: 'Envoyer au client',
    href: '/devis',
    module: 'devis',
    priority: 'high',
  },
  Accepté: {
    id: 'devis-to-commande',
    label: 'Créer commande',
    description: 'Transformer le devis accepté en commande',
    href: '/commandes',
    module: 'commande',
    priority: 'high',
  },
  Refusé: {
    id: 'devis-new',
    label: 'Nouveau devis',
    href: '/devis',
    module: 'devis',
    priority: 'medium',
  },
};

/** @deprecated Lot B8 — ne plus utiliser : source canonique = resolveCommandeNextAction.
 * Conservé uniquement comme documentation historique des libellés — non référencé.
 */

const BAT_ACTIONS: Record<string, NextAction> = {
  'BAT requis': {
    id: 'bat-brief',
    label: 'Créer brief studio',
    href: '/studio?tab=briefs',
    module: 'studio',
    priority: 'high',
  },
  'Correction demandée': {
    id: 'bat-comments',
    label: 'Ouvrir corrections BAT',
    href: '/bat',
    module: 'bat',
    priority: 'high',
  },
  'BAT validé': {
    id: 'bat-prod',
    label: 'Autoriser production',
    href: '/production/dossiers',
    module: 'production',
    priority: 'high',
  },
};

const STOCK_ACTIONS: Record<string, NextAction> = {
  rupture: {
    id: 'stock-achat',
    label: 'Créer achat fournisseur',
    href: '/achats',
    module: 'stock',
    priority: 'high',
  },
  faible: {
    id: 'stock-check',
    label: 'Vérifier matière',
    href: '/stock',
    module: 'stock',
    priority: 'medium',
  },
};

const PRODUCTION_ACTIONS: Record<string, NextAction> = {
  'À planifier': {
    id: 'prod-plan',
    label: 'Planifier la production',
    href: '/planning',
    module: 'production',
    priority: 'high',
  },
  'En attente': {
    id: 'prod-start',
    label: 'Lancer les ordres en attente',
    href: '/production',
    module: 'production',
    priority: 'high',
  },
  'En cours': {
    id: 'prod-follow',
    label: 'Suivre les dossiers GPAO',
    href: '/production/dossiers',
    module: 'production',
    priority: 'medium',
  },
  'En production': {
    id: 'prod-talk',
    label: 'Coordonner via ANS Talk',
    description: 'Communication pendant la réalisation',
    href: '/messagerie',
    module: 'communication',
    priority: 'medium',
  },
  'En finition': {
    id: 'prod-cq',
    label: 'Passer au contrôle qualité',
    href: '/production/qualite',
    module: 'production',
    priority: 'high',
  },
  Terminé: {
    id: 'prod-to-livraison',
    label: 'Préparer les livraisons',
    href: '/livraisons',
    module: 'logistique',
    priority: 'high',
  },
};

const LIVRAISON_ACTIONS: Record<string, NextAction> = {
  Préparation: {
    id: 'liv-prep',
    label: 'Organiser les tournées',
    href: '/livraisons',
    module: 'logistique',
    priority: 'high',
  },
  'En préparation': {
    id: 'liv-prep-detail',
    label: 'Finaliser la préparation',
    href: '/livraisons',
    module: 'logistique',
    priority: 'high',
  },
  'En route': {
    id: 'liv-track',
    label: 'Suivre les livraisons en route',
    href: '/livraisons',
    module: 'logistique',
    priority: 'medium',
  },
  Livrée: {
    id: 'liv-facture',
    label: 'Générer la facture',
    href: '/factures',
    module: 'finance',
    priority: 'high',
  },
  Livré: {
    id: 'liv-facture-alt',
    label: 'Générer la facture',
    href: '/factures',
    module: 'finance',
    priority: 'high',
  },
};

const FACTURE_ACTIONS: Record<string, NextAction> = {
  'Non facturé': {
    id: 'facture-create',
    label: 'Générer une facture',
    href: '/factures',
    module: 'finance',
    priority: 'high',
  },
  'En retard': {
    id: 'facture-relance',
    label: 'Relancer paiement',
    href: '/cm/relances',
    module: 'finance',
    priority: 'high',
  },
  Payé: {
    id: 'dossier-close',
    label: 'Clôturer dossier',
    href: '/commandes',
    module: 'commande',
    priority: 'medium',
  },
};

const CLIENT_ACTIONS: Record<string, NextAction> = {
  CRM: {
    id: 'client-devis',
    label: 'Créer un devis',
    description: 'Démarrer la chaîne commerciale pour ce client',
    href: '/devis',
    module: 'devis',
    priority: 'high',
  },
  Prospect: {
    id: 'client-qualifier',
    label: 'Qualifier et devis',
    href: '/devis',
    module: 'devis',
    priority: 'high',
  },
  Actif: {
    id: 'client-commande',
    label: 'Nouvelle commande / POS',
    href: '/pos',
    module: 'pos',
    priority: 'high',
  },
  fidele: {
    id: 'client-fidele-pos',
    label: 'Vente POS client fidèle',
    href: '/pos',
    module: 'pos',
    priority: 'medium',
  },
  Inactif: {
    id: 'client-reactiver',
    label: 'Réactiver / qualifier le client',
    href: '/clients',
    module: 'crm',
    priority: 'medium',
  },
};

function withClientDeepLink(action: NextAction, clientId: string): NextAction {
  if (action.href.startsWith('/clients/') || action.href.includes('?')) {
    return action;
  }
  return { ...action, href: `/clients/${encodeURIComponent(clientId)}` };
}

function withCommandeDeepLink(href: string, commandeId: string): string {
  if (href.includes(`/commandes/${commandeId}`)) return href;
  if (href.includes('commande=')) return href;
  return href.includes('?') ? `${href}&commande=${commandeId}` : `${href}?commande=${commandeId}`;
}

function withDevisDeepLink(action: NextAction, devisId: string): NextAction {
  if (action.id === 'devis-to-commande') {
    return {
      ...action,
      href: `/commandes?fromDevis=${encodeURIComponent(devisId)}`,
    };
  }
  const base = action.href.split('?')[0] || '/devis';
  return {
    ...action,
    href: `${base}?id=${encodeURIComponent(devisId)}`,
  };
}

/** Retourne l'action suivante recommandée pour un contexte donné.
 * Commande : hub `/commandes/[id]` via resolveCommandeNextAction (source canonique).
 */
export function getNextAction(ctx: NextActionContext): NextAction | null {
  if (ctx.entity === 'commande' && ctx.entityId) {
    const m = ctx.metadata ?? {};
    return resolveCommandeNextAction({
      commandeId: ctx.entityId,
      statut: ctx.status,
      reste: Number(m.reste ?? 0),
      total: Number(m.total ?? 0),
      hasFacture: Boolean(m.hasFacture),
      hasLivraison: Boolean(m.hasLivraison),
      hasDossierGpaO: Boolean(m.hasDossierGpaO),
      hasBatPending: Boolean(m.hasBatPending),
      blocagesActifs: Number(m.blocagesActifs ?? 0),
      factureId: typeof m.factureId === 'string' ? m.factureId : null,
      dossierId: typeof m.dossierId === 'string' ? m.dossierId : null,
      livraisonId: typeof m.livraisonId === 'string' ? m.livraisonId : null,
      hasTalk: typeof m.hasTalk === 'boolean' ? m.hasTalk : undefined,
      talkConversationId: typeof m.talkConversationId === 'string' ? m.talkConversationId : null,
    });
  }

  const maps: Partial<Record<NextActionContext['entity'], Record<string, NextAction>>> = {
    devis: DEVIS_ACTIONS,
    bat: BAT_ACTIONS,
    stock: STOCK_ACTIONS,
    facture: FACTURE_ACTIONS,
    production: PRODUCTION_ACTIONS,
    livraison: LIVRAISON_ACTIONS,
    client: CLIENT_ACTIONS,
  };
  const map = maps[ctx.entity];
  if (!map) return null;
  const action =
    map[ctx.status] ??
    (ctx.entity === 'client' && ctx.status !== 'Inactif' ? map.CRM : undefined);
  if (!action) return null;
  if (!ctx.entityId) return action;
  if (ctx.entity === 'devis') return withDevisDeepLink(action, ctx.entityId);
  if (ctx.entity === 'client') return withClientDeepLink(action, ctx.entityId);
  if (ctx.entity === 'production' || ctx.entity === 'livraison' || ctx.entity === 'bat') {
    return { ...action, href: withCommandeDeepLink(action.href, ctx.entityId) };
  }
  return { ...action, href: action.href };
}

/** Liste des actions pour affichage cockpit / bannière. */
export function listNextActionsForStatuses(
  items: NextActionContext[],
): NextAction[] {
  const seen = new Set<string>();
  const out: NextAction[] = [];
  for (const item of items) {
    const a = getNextAction(item);
    if (!a || seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });
}
