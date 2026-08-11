import { prisma } from '@/lib/prisma';
import { isBatValidated } from '@/lib/constants/file-assets';
import type { GpaoEtapeNom } from '@/lib/constants/gpao-dossier';
import type { CommandeStatut } from '@/lib/data/commande-status';
import { advanceCommandeJalon, transitionCommandeStatut } from '@/lib/services/commande-workflow-service';
import { ensureFactureForCommande } from '@/lib/services/facture-workflow-service';
import { createNotification } from '@/lib/services/notification-service';

type SyncOpts = { userId?: string; userName?: string; force?: boolean };

async function tryAdvance(commandeId: string, jalonId: string, opts?: SyncOpts): Promise<boolean> {
  const r = await advanceCommandeJalon(commandeId, jalonId, opts);
  return !r.error;
}

async function tryTransition(commandeId: string, statut: CommandeStatut, opts?: SyncOpts): Promise<boolean> {
  const r = await transitionCommandeStatut(commandeId, statut, opts);
  return !r.error;
}

/** BAT → jalon commande (envoyé / approuvé). */
export async function syncCommandeOnProofStatus(
  commandeId: string | null | undefined,
  statut: string,
  opts?: SyncOpts,
): Promise<void> {
  if (!commandeId) return;

  if (statut === 'Envoyé' || statut === 'En attente validation client') {
    await tryAdvance(commandeId, 'bat_envoye', opts);
    return;
  }

  if (isBatValidated(statut) || statut === 'Verrouillé') {
    await tryAdvance(commandeId, 'bat_approuve', opts);
  }
}

const GPAO_ETAPE_COMMANDE: Partial<Record<GpaoEtapeNom, { jalonId?: string; statut?: CommandeStatut }>> = {
  'BAT validé': { jalonId: 'bat_approuve' },
  'Planification production': { statut: 'En production' },
  'Préparation graphique': { statut: 'En production' },
  Impression: { jalonId: 'en_impression', statut: 'En production' },
  'Séchage / attente': { statut: 'En finition' },
  Façonnage: { jalonId: 'faconnage', statut: 'En finition' },
  Emballage: { statut: 'En finition' },
  'Contrôle qualité': { jalonId: 'pret_a_livrer', statut: 'Prête' },
  'Prêt livraison': { jalonId: 'pret_a_livrer', statut: 'Prête' },
  Livré: { statut: 'Livré' },
};

/** GPAO étape terminée → statut / jalon commande. */
export async function syncCommandeOnGpaoEtapeComplete(
  commandeId: string,
  etapeNom: string,
  opts?: SyncOpts,
): Promise<void> {
  const mapping = GPAO_ETAPE_COMMANDE[etapeNom as GpaoEtapeNom];
  if (!mapping) return;

  if (mapping.jalonId) {
    const ok = await tryAdvance(commandeId, mapping.jalonId, opts);
    if (ok) return;
  }
  if (mapping.statut) {
    await tryTransition(commandeId, mapping.statut, opts);
  }
}

/**
 * Livraison créée → proposer facture si déjà Prête/Livré.
 * Ne force pas « Prête » depuis En production (évite contournement finition/CQ).
 */
export async function syncCommandeOnLivraisonCreated(commandeId: string, opts?: SyncOpts): Promise<void> {
  const cmd = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { statut: true },
  });
  if (!cmd) return;
  const { commandeStatutLabel } = await import('@/lib/server/data/prisma-statut-bridge');
  const { normalizeCommandeStatut } = await import('@/lib/data/status-registry');
  const statut = normalizeCommandeStatut(commandeStatutLabel(cmd.statut));

  if (statut === 'Prête' || statut === 'Livré') {
    await ensureFactureForCommande(commandeId, opts);
    return;
  }

  if (statut === 'En finition') {
    await tryTransition(commandeId, 'Prête', opts);
    await ensureFactureForCommande(commandeId, opts);
  }
}
/** Paiement soldé → notification cockpit / fiche commande. */
export async function syncCockpitOnPaiementComplete(commandeId: string): Promise<void> {
  const cmd = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { reste: true, numero: true, statut: true },
  });
  if (!cmd || cmd.reste > 0.01) return;

  await createNotification({
    title: 'Commande soldée',
    message: `${cmd.numero} — solde réglé, livraison possible`,
    link: `/commandes/${commandeId}?tab=logistique`,
    type: 'success',
    category: 'paiements',
  });
}
