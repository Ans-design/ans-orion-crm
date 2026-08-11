import type { NextAction } from '@/lib/flow/next-action';
import { normalizeCommandeStatut } from '@/lib/data/status-registry';

export type CommandeNextActionInput = {
  commandeId: string;
  statut: string;
  reste: number;
  total: number;
  hasFacture: boolean;
  hasLivraison: boolean;
  hasDossierGpaO: boolean;
  hasBatPending: boolean;
  blocagesActifs: number;
  factureId?: string | null;
  dossierId?: string | null;
  livraisonId?: string | null;
  /** false = pas encore de groupe Talk (propose Communication). undefined = ignorer. */
  hasTalk?: boolean;
  talkConversationId?: string | null;
};

/** Action suivante contextualisée pour une commande (hub ERP). */
export function resolveCommandeNextAction(input: CommandeNextActionInput): NextAction | null {
  const base = `/commandes/${input.commandeId}`;
  const cid = input.commandeId;
  const statut = normalizeCommandeStatut(input.statut);

  if (input.blocagesActifs > 0) {
    return {
      id: 'cmd-blocage',
      label: 'Résoudre le blocage',
      description: `${input.blocagesActifs} blocage(s) actif(s)`,
      href: `${base}?tab=production`,
      module: 'commande',
      priority: 'high',
    };
  }

  if (input.hasBatPending) {
    return {
      id: 'cmd-bat',
      label: 'Valider le BAT',
      description: 'Studio & BAT — validation client avant production',
      href: `${base}?tab=bat`,
      module: 'bat',
      priority: 'high',
    };
  }

  if (statut === 'En attente stock') {
    return {
      id: 'cmd-stock',
      label: 'Vérifier le stock',
      description: 'Stock & Achats — réservation ou achat matière',
      href: `/stock?commande=${cid}`,
      module: 'stock',
      priority: 'high',
    };
  }

  if (statut === 'À planifier' && !input.hasDossierGpaO) {
    return {
      id: 'cmd-gpao-create',
      label: 'Créer dossier GPAO',
      description: 'Production — lancer la fabrication',
      href: `/production/dossiers?commande=${cid}`,
      module: 'production',
      priority: 'high',
    };
  }

  // Après GPAO créé, solde ouvert → proposer Finance (sans bloquer la prod)
  if (
    input.reste > 0
    && input.hasDossierGpaO
    && (statut === 'À planifier' || input.statut === 'Confirmée' || input.statut === 'Confirmé')
  ) {
    return {
      id: 'cmd-acompte',
      label: 'Encaisser / vérifier le paiement',
      description: `Reste ${Math.round(input.reste).toLocaleString('fr-FR')} Ar — Finance`,
      href: `/paiements?commande=${cid}`,
      module: 'finance',
      priority: 'medium',
    };
  }

  if (statut === 'En production') {
    if (input.hasTalk === false) {
      return {
        id: 'cmd-talk',
        label: 'Ouvrir ANS Talk commande',
        description: 'Communication — groupe service lié à la commande',
        href: input.talkConversationId
          ? `/messagerie?conv=${input.talkConversationId}`
          : `/messagerie?commande=${cid}`,
        module: 'communication',
        priority: 'medium',
      };
    }
    return {
      id: 'cmd-gpao-open',
      label: 'Ouvrir dossier GPAO',
      href: input.dossierId
        ? `/production/dossiers?commande=${cid}`
        : `${base}?tab=production`,
      module: 'production',
      priority: 'medium',
    };
  }

  if (statut === 'En finition') {
    return {
      id: 'cmd-cq',
      label: 'Contrôle qualité',
      description: 'Checklist conformité avant livraison',
      href: `/production/qualite?commande=${cid}`,
      module: 'production',
      priority: 'high',
    };
  }

  if (statut === 'Prête' && !input.hasLivraison) {
    return {
      id: 'cmd-livraison-create',
      label: 'Préparer la livraison',
      description: 'Logistique — expédition',
      href: `/livraisons?commande=${cid}`,
      module: 'logistique',
      priority: 'high',
    };
  }

  if (statut === 'Livré' && !input.hasFacture) {
    return {
      id: 'cmd-facture-create',
      label: 'Générer la facture',
      description: 'Finance — facturation post-livraison',
      href: `/factures?commande=${cid}`,
      module: 'finance',
      priority: 'high',
    };
  }

  if (input.reste > 0 && statut === 'Livré') {
    return {
      id: 'cmd-encaissement',
      label: 'Encaisser le solde',
      description: `Reste ${Math.round(input.reste).toLocaleString('fr-FR')} Ar`,
      href: `/paiements?commande=${cid}`,
      module: 'finance',
      priority: 'high',
    };
  }

  if (input.hasFacture && input.reste <= 0 && statut === 'Livré') {
    return {
      id: 'cmd-close',
      label: 'Clôturer la commande',
      description: 'Pilotage / historique client',
      href: `/historique?commande=${cid}`,
      module: 'pilotage',
      priority: 'medium',
    };
  }

  if (input.statut === 'Clôturé') {
    return {
      id: 'cmd-pilotage',
      label: 'Voir l’historique / pilotage',
      href: `/historique?commande=${cid}`,
      module: 'pilotage',
      priority: 'low',
    };
  }

  const fallback: Record<string, NextAction> = {
    'À planifier': {
      id: 'cmd-plan',
      label: 'Planifier la production',
      href: `${base}?tab=production`,
      module: 'commande',
      priority: 'medium',
    },
    Prête: {
      id: 'cmd-livraison',
      label: 'Organiser la livraison',
      href: `/livraisons?commande=${cid}`,
      module: 'logistique',
      priority: 'high',
    },
  };

  return fallback[statut] ?? {
    id: 'cmd-detail',
    label: 'Voir la fiche commande',
    href: base,
    module: 'commande',
    priority: 'low',
  };
}

export function commandeNextActionLabel(input: CommandeNextActionInput): string {
  return resolveCommandeNextAction(input)?.label ?? '—';
}
