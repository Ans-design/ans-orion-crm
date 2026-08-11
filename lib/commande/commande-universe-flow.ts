/**
 * Bandeau hub commande — étapes univers alignées sur le parcours métier.
 * Pas de second workflow : miroir de la sidebar + deep links `?commande=`.
 * « Fait » = critères métier réels (pas seulement un index linéaire).
 */

import type { UniverseId } from '@/lib/navigation/sidebar-universes';
import { COMMANDE_HUB_UNIVERSE_ORDER } from '@/lib/navigation/sidebar-universes';
import { normalizeCommandeStatut } from '@/lib/data/status-registry';

export type CommandeUniverseStepId = (typeof COMMANDE_HUB_UNIVERSE_ORDER)[number];

export type CommandeUniverseStepState = 'done' | 'active' | 'upcoming';

export type CommandeUniverseFlowStep = {
  id: CommandeUniverseStepId;
  label: string;
  href: string;
  state: CommandeUniverseStepState;
};

const STEP_LABELS: Record<CommandeUniverseStepId, string> = {
  commercial: 'Commercial',
  stock: 'Stock',
  studio: 'Studio & BAT',
  production: 'Production',
  communication: 'Communication',
  logistique: 'Logistique',
  finance: 'Finance',
};

export type CommandeUniverseFlowInput = {
  commandeId: string;
  statut: string;
  reste: number;
  hasBatPending?: boolean;
  hasDossierGpaO?: boolean;
  hasLivraison?: boolean;
  hasFacture?: boolean;
  talkConversationId?: string | null;
  devisId?: string | null;
  /** Si fourni, prioritaire pour l’étape active (aligné rail de vie commande). */
  lifeRailStepId?:
    | 'creee'
    | 'acompte'
    | 'bat'
    | 'impression'
    | 'faconnage'
    | 'emballage'
    | 'prete'
    | 'livree';
  avancement?: number;
};

function stepHref(id: CommandeUniverseStepId, input: CommandeUniverseFlowInput): string {
  const c = input.commandeId;
  switch (id) {
    case 'commercial':
      return input.devisId ? `/devis?id=${encodeURIComponent(input.devisId)}` : `/commandes/${c}`;
    case 'stock':
      return `/stock?commande=${c}`;
    case 'studio':
      return `/commandes/${c}?tab=bat`;
    case 'production':
      return `/production/dossiers?commande=${c}`;
    case 'communication':
      return input.talkConversationId
        ? `/messagerie?conv=${input.talkConversationId}`
        : `/messagerie?commande=${c}`;
    case 'logistique':
      return `/livraisons?commande=${c}`;
    case 'finance':
      return `/factures?commande=${c}`;
    default:
      return `/commandes/${c}`;
  }
}

function idxOf(id: CommandeUniverseStepId): number {
  return COMMANDE_HUB_UNIVERSE_ORDER.indexOf(id);
}

/** Critères « fait » métier — jamais uniquement « on a dépassé l’étape dans le flux ». */
export function isUniverseStepComplete(
  id: CommandeUniverseStepId,
  input: CommandeUniverseFlowInput,
): boolean {
  const raw = String(input.statut ?? '').trim();
  const s = normalizeCommandeStatut(raw);

  switch (id) {
    case 'commercial':
      return Boolean(input.commandeId);
    case 'stock':
      return s !== 'En attente stock' && raw !== 'Stock à vérifier';
    case 'studio':
      return !input.hasBatPending && raw !== 'BAT requis' && raw !== 'BAT en cours';
    case 'production': {
      if (s === 'Prête' || s === 'Livré' || raw === 'En livraison' || raw === 'Clôturé' || raw === 'Archivé') {
        return true;
      }
      return (input.avancement ?? 0) >= 100;
    }
    case 'communication':
      return isUniverseStepComplete('production', input) || Boolean(input.hasLivraison);
    case 'logistique':
      return Boolean(input.hasLivraison) && (s === 'Livré' || raw === 'Clôturé' || raw === 'Archivé');
    case 'finance':
      return input.reste <= 0 && Boolean(input.hasFacture);
    default:
      return false;
  }
}

/** Miroir du rail de vie → univers sidebar (Stock → Studio → Prod → Com → Log → Finance). */
function resolveFromLifeRail(input: CommandeUniverseFlowInput): number | null {
  const rail = input.lifeRailStepId;
  if (!rail) return null;
  const s = normalizeCommandeStatut(String(input.statut ?? ''));

  if (s === 'En attente stock') return idxOf('stock');
  if (input.hasBatPending && (rail === 'creee' || rail === 'acompte' || rail === 'bat')) {
    return idxOf('studio');
  }

  switch (rail) {
    case 'creee':
    case 'acompte':
      return idxOf('commercial');
    case 'bat':
      return idxOf('studio');
    case 'impression':
      return idxOf('production');
    case 'faconnage':
    case 'emballage':
      return idxOf('communication');
    case 'prete':
      return idxOf('logistique');
    case 'livree':
      return idxOf('finance');
    default:
      return null;
  }
}

/**
 * Index de l’étape active (0-based) selon statut commande + flags.
 * Ordre : Commercial → Stock → Studio → Production → Communication → Logistique → Finance
 */
export function resolveActiveUniverseStepIndex(input: CommandeUniverseFlowInput): number {
  const fromRail = resolveFromLifeRail(input);
  if (fromRail != null) return fromRail;

  const raw = String(input.statut ?? '').trim();
  const s = normalizeCommandeStatut(raw);

  if (raw === 'Clôturé' || raw === 'Archivé' || (s === 'Livré' && input.hasFacture && input.reste <= 0)) {
    return idxOf('finance');
  }
  if (s === 'Livré') {
    return idxOf('finance');
  }

  if (s === 'Prête' || raw === 'En livraison') {
    return idxOf('logistique');
  }

  if (s === 'En production' || s === 'En retard') {
    const av = input.avancement ?? 0;
    if (av > 0 && av < 40) return idxOf('production');
    return idxOf('communication');
  }
  if (s === 'En finition' || raw === 'Contrôle qualité' || raw === 'En CQ') {
    return idxOf('communication');
  }

  if (input.hasBatPending || raw === 'BAT requis' || raw === 'BAT en cours') {
    return idxOf('studio');
  }

  if (s === 'En attente stock' || raw === 'Stock à vérifier') {
    return idxOf('stock');
  }

  if (s === 'À planifier' || raw === 'Confirmée' || raw === 'Confirmé') {
    if (input.hasBatPending) return idxOf('studio');
    return idxOf('production');
  }

  if (raw === 'Brouillon' || raw === 'Devis' || !raw) {
    return idxOf('commercial');
  }

  if (input.reste > 0 && input.hasLivraison) {
    return idxOf('finance');
  }

  return idxOf('commercial');
}

/**
 * États honnêtes : done seulement si critères métier OK ;
 * active = suggestion flux, ramenée au premier prérequis incomplet.
 */
export function buildCommandeUniverseFlowSteps(
  input: CommandeUniverseFlowInput,
): CommandeUniverseFlowStep[] {
  const suggested = resolveActiveUniverseStepIndex(input);
  let activeIdx = suggested;
  for (let i = 0; i <= suggested; i++) {
    const id = COMMANDE_HUB_UNIVERSE_ORDER[i];
    if (!isUniverseStepComplete(id, input)) {
      activeIdx = i;
      break;
    }
  }

  return COMMANDE_HUB_UNIVERSE_ORDER.map((id, idx) => {
    const complete = isUniverseStepComplete(id, input);
    return {
      id,
      label: STEP_LABELS[id],
      href: stepHref(id, input),
      state: complete ? 'done' : idx === activeIdx ? 'active' : 'upcoming',
    };
  });
}

export function isCommandeHubUniverse(id: UniverseId): id is CommandeUniverseStepId {
  return (COMMANDE_HUB_UNIVERSE_ORDER as readonly string[]).includes(id);
}
