import { prisma } from '@/lib/server/db/prisma';
import { LivraisonStatut } from '@prisma/client';
import { livraisonStatutFromLabel, serializeLivraisonForApi } from '@/lib/server/data/prisma-statut-bridge';
import { onLivraisonRetour } from '@/lib/services/sav-auto-service';
import { transitionCommandeStatut } from '@/lib/services/commande-workflow-service';
import { syncCommandeOnLivraisonCreated } from '@/lib/services/commande-module-sync';
import { ensureFactureForCommande } from '@/lib/services/facture-workflow-service';
import { nextSequenceSafe } from '@/lib/services/SequenceService';
import { buildLivraisonWhere, livraisonsRepository } from './livraisons.repository';
import type { CreateLivraisonInput, LivraisonListQuery, UpdateLivraisonInput } from './livraisons.validation';

export type LivraisonUpdateContext = {
  userId: string;
  userName: string;
};

export type LivraisonServiceError = {
  ok: false;
  code: 'NOT_FOUND' | 'COMMANDE_NOT_FOUND' | 'PROOF_REQUIRED' | 'VALIDATION' | 'COMMANDE_TRANSITION';
  message: string;
};

function encodeProofPayload(note?: string | null, signatureData?: string | null): string | null {
  const text = (note ?? '').trim();
  if (signatureData) return JSON.stringify({ note: text, signatureData });
  return text || null;
}

function hasExistingProof(existing: { proofPhotoUrl?: string | null; proofNote?: string | null }): boolean {
  if (existing.proofPhotoUrl) return true;
  if (!existing.proofNote) return false;
  try {
    const parsed = JSON.parse(existing.proofNote) as { signatureData?: string };
    return Boolean(parsed.signatureData);
  } catch {
    return Boolean(existing.proofNote.trim());
  }
}

export function parseLivraisonListQuery(searchParams: URLSearchParams): LivraisonListQuery {
  return {
    search: searchParams.get('search') || '',
    statut: searchParams.get('statut') || '',
    commandeId: searchParams.get('commande') || '',
    livreur: searchParams.get('livreur') || '',
    trash: searchParams.get('archived') === '1' || searchParams.get('trash') === '1',
  };
}

export async function listLivraisons(query: LivraisonListQuery) {
  const rows = await livraisonsRepository.findMany(buildLivraisonWhere(query));
  return rows.map(serializeLivraisonForApi);
}

export async function getLivraisonDetail(id: string) {
  const livraison = await livraisonsRepository.findByIdWithDetail(id);
  return livraison ? serializeLivraisonForApi(livraison) : null;
}

export async function createLivraisonRecord(input: CreateLivraisonInput) {
  const commande = await livraisonsRepository.findCommandeClient(input.commandeId);
  if (!commande) {
    return { ok: false as const, code: 'COMMANDE_NOT_FOUND' as const, message: 'Commande introuvable' };
  }

  const numero = await nextSequenceSafe('LIV', () => prisma.livraison.count());
  const finalClientId = input.clientId || commande.clientId;

  const livraison = await livraisonsRepository.create({
    numero,
    commandeId: input.commandeId,
    clientId: finalClientId || null,
    adresseLiv: input.adresseLiv || null,
    contactLiv: input.contactLiv || null,
    telLiv: input.telLiv || null,
    livreur: input.livreur || null,
    datePrevue: input.datePrevue ? new Date(input.datePrevue) : null,
    colisCount: input.colisCount && input.colisCount > 0 ? input.colisCount : 1,
    poidsKg: input.poidsKg ?? null,
    notes: input.notes || null,
  });

  return { ok: true as const, livraison, numero };
}

export async function syncLivraisonOnCreate(commandeId: string, auth: LivraisonUpdateContext) {
  return syncCommandeOnLivraisonCreated(commandeId, {
    userId: auth.userId,
    userName: auth.userName,
  }).catch((err) => {
    console.error('[livraisons] syncCommandeOnLivraisonCreated:', err);
    return { error: true as const };
  });
}

export async function updateLivraisonRecord(
  id: string,
  input: UpdateLivraisonInput,
  ctx: LivraisonUpdateContext,
) {
  const existing = await livraisonsRepository.findById(id);
  if (!existing) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Non trouvé' };
  }

  const data: Record<string, unknown> = {};
  if (input.statut !== undefined) {
    data.statut = livraisonStatutFromLabel(input.statut);
    if (input.statut === 'Livré') data.dateLivree = new Date();
  }
  if (input.adresseLiv !== undefined) data.adresseLiv = input.adresseLiv;
  if (input.contactLiv !== undefined) data.contactLiv = input.contactLiv;
  if (input.telLiv !== undefined) data.telLiv = input.telLiv;
  if (input.livreur !== undefined) data.livreur = input.livreur;
  if (input.datePrevue !== undefined) data.datePrevue = input.datePrevue ? new Date(input.datePrevue) : null;
  if (input.colisCount !== undefined) data.colisCount = input.colisCount;
  if (input.poidsKg !== undefined) data.poidsKg = input.poidsKg;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.proofPhotoUrl !== undefined) data.proofPhotoUrl = input.proofPhotoUrl;
  if (input.proofNote !== undefined || input.signatureData !== undefined) {
    data.proofNote = encodeProofPayload(
      input.proofNote !== undefined ? input.proofNote : '',
      input.signatureData ?? null,
    );
  }
  if (input.proofPhotoUrl || input.signatureData) data.proofAt = new Date();
  if (input.statut === 'Livré' && ctx.userName) {
    data.livreur = ctx.userName;
  }

  if (
    input.statut === 'Livré' &&
    !input.proofPhotoUrl &&
    !input.proofNote &&
    !input.signatureData &&
    !hasExistingProof(existing)
  ) {
    return {
      ok: false as const,
      code: 'PROOF_REQUIRED' as const,
      message: 'Preuve de livraison requise (photo, signature ou note)',
    };
  }

  const livraison = await livraisonsRepository.update(id, data);

  if (input.statut === 'Livré') {
    const transition = await transitionCommandeStatut(existing.commandeId, 'Livré', {
      userId: ctx.userId,
      userName: ctx.userName,
    });
    if (transition.error === 'VALIDATION') {
      await livraisonsRepository.update(id, { statut: existing.statut, dateLivree: existing.dateLivree });
      return {
        ok: false as const,
        code: 'VALIDATION' as const,
        message: transition.validation.message,
      };
    }
    if (transition.error === 'NOT_FOUND') {
      await livraisonsRepository.update(id, { statut: existing.statut, dateLivree: existing.dateLivree });
      return {
        ok: false as const,
        code: 'COMMANDE_TRANSITION' as const,
        message: 'Commande liée introuvable',
      };
    }
    await ensureFactureForCommande(existing.commandeId, {
      userId: ctx.userId,
      userName: ctx.userName,
    }).catch((err) => {
      console.error('[livraisons] ensureFactureForCommande:', err);
    });

    try {
      const { enqueueOutbox } = await import('@/lib/server/outbox');
      await enqueueOutbox({
        type: 'LivraisonCompleted',
        aggregateType: 'Livraison',
        aggregateId: id,
        idempotencyKey: `livraison-completed:${id}`,
        correlationId: existing.commandeId,
        payload: {
          livraisonId: id,
          commandeId: existing.commandeId,
          numero: livraison.numero,
        },
      });
    } catch (e) {
      console.warn('[livraisons] outbox', e);
    }
  }

  if (input.statut === 'Retour' && existing.statut !== LivraisonStatut.Retour) {
    await onLivraisonRetour(id).catch(() => {});
  }

  return {
    ok: true as const,
    livraison: serializeLivraisonForApi(livraison),
    existing: serializeLivraisonForApi(existing),
    audit: {
      oldValue: { statut: serializeLivraisonForApi(existing).statut },
      newValue: { statut: serializeLivraisonForApi(livraison).statut },
    },
  };
}

export function livraisonErrorStatus(code: LivraisonServiceError['code']) {
  return code === 'NOT_FOUND' || code === 'COMMANDE_TRANSITION' ? 404 : 400;
}
