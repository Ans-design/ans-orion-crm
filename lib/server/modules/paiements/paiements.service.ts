import { prisma } from '@/lib/server/db/prisma';
import { DevisStatut, FactureStatut } from '@prisma/client';
import { normalizePaiementType } from '@/lib/server/data/enum-normalize';
import { afterPaiementRecorded } from '@/lib/services/facture-workflow-service';
import { ensureFactureForCommande } from '@/lib/services/facture-workflow-service';
import { resolveFacturePrintFormat, type FacturePrintFormat } from '@/lib/services/facture-document-service';
import { PAIEMENT_AUDIT_FIELDS, buildAuditDiff, toAuditRecord } from '@/lib/server/audit/entity-snapshot';
import {
  encodePaymentMeta,
  normalizePaymentModeInput,
  paymentReferenceRequired,
  resolvePaymentDate,
} from './paiement-payment-meta';
import {
  encodeDevisPaymentNote,
  tryAutoConvertDevisOnAcompte,
} from '@/lib/services/devis-acompte-service';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';
import { nextSequenceSafe } from '@/lib/services/SequenceService';
import { paymentIdempotencyKey } from '@/lib/server/outbox';
import { buildPaiementWhere, paidTotal, paiementsRepository, findCommandeRelatedPaiements, commandeRemainingAmount } from './paiements.repository';
import type {
  BatchPaiementInput,
  CreatePaiementInput,
  PaiementListQuery,
  UpdatePaiementInput,
} from './paiements.validation';

export type PaiementServiceError = {
  ok: false;
  code:
    | 'OVERPAY'
    | 'OVERPAY_CMD'
    | 'FACTURE_NOT_FOUND'
    | 'FACTURE_CANCELLED'
    | 'COMMANDE_NOT_FOUND'
    | 'DEVIS_NOT_FOUND'
    | 'DEVIS_EXPIRED'
    | 'REFERENCE_CONFLICT'
    | 'NOT_FOUND'
    | 'FORBIDDEN';
  message: string;
};

export function parsePaiementListQuery(searchParams: URLSearchParams): PaiementListQuery {
  return {
    search: searchParams.get('search') || '',
    mode: searchParams.get('mode') || '',
    commandeId: searchParams.get('commande') || searchParams.get('commandeId') || '',
    trash: searchParams.get('archived') === '1' || searchParams.get('trash') === '1',
  };
}

export async function listPaiements(query: PaiementListQuery) {
  return paiementsRepository.findMany(buildPaiementWhere(query));
}

export async function getPaiementDetail(id: string) {
  return paiementsRepository.findById(id);
}

export async function updatePaiementRecord(id: string, input: UpdatePaiementInput) {
  const before = await paiementsRepository.findById(id);
  if (!before) return { ok: false as const, code: 'NOT_FOUND' as const };

  // Ledger : pas de modification de montant sur un paiement validé — annuler + nouveau.
  if (input.montant !== undefined && input.montant !== before.montant) {
    if (before.statut === 'Valide' || before.statut === 'Rembourse_partiel') {
      return {
        ok: false as const,
        code: 'FORBIDDEN' as const,
        message:
          'Montant d’un paiement validé non modifiable — annulez puis créez un nouvel encaissement (ledger).',
      };
    }
  }

  const data: Record<string, unknown> = {};
  if (input.montant !== undefined) data.montant = input.montant;
  if (input.mode !== undefined) data.mode = input.mode;
  if (input.reference !== undefined) data.reference = input.reference;
  if (input.type !== undefined) data.type = input.type;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.datePaiement !== undefined) data.datePaiement = new Date(input.datePaiement);

  try {
    const paiement = await prisma.$transaction(async (tx) => {
      const payType = input.type ?? before.type;
      const montant = input.montant ?? before.montant;

      if (payType !== 'Remboursement' && input.montant !== undefined) {
        const factureId = before.factureId;
        const commandeId = before.commandeId;

        if (factureId) {
          const facture = await tx.facture.findUnique({
            where: { id: factureId },
            include: { paiements: true },
          });
          if (!facture) throw new Error('FACTURE_NOT_FOUND');
          if (facture.statut === FactureStatut.Annulee) throw new Error('FACTURE_CANCELLED');
          if (facture.commandeId) {
            const cmd = await tx.commande.findUnique({ where: { id: facture.commandeId } });
            if (cmd) {
              const existing = await findCommandeRelatedPaiements(facture.commandeId, tx);
              const others = existing.filter((p) => p.id !== id);
              const resteCmd = commandeRemainingAmount(cmd.total, others);
              if (montant > resteCmd + 1) throw new Error('OVERPAY_CMD');
            }
          } else {
            const others = facture.paiements.filter((p) => p.id !== id);
            const reste = facture.totalTTC - paidTotal(others);
            if (montant > reste + 1) throw new Error('OVERPAY');
          }
        } else if (commandeId) {
          const cmd = await tx.commande.findUnique({ where: { id: commandeId } });
          if (!cmd) throw new Error('COMMANDE_NOT_FOUND');
          const existing = await findCommandeRelatedPaiements(commandeId, tx);
          const others = existing.filter((p) => p.id !== id);
          const resteCmd = commandeRemainingAmount(cmd.total, others);
          if (montant > resteCmd + 1) throw new Error('OVERPAY_CMD');
        }
      }

      const updated = await tx.paiement.update({
        where: { id },
        data,
        include: { facture: { select: { commandeId: true } } },
      });
      const linkedCommandeId = updated.commandeId ?? updated.facture?.commandeId ?? null;
      const linkedFactureId = updated.factureId ?? null;
      if (linkedCommandeId || linkedFactureId) {
        await afterPaiementRecorded({ factureId: linkedFactureId, commandeId: linkedCommandeId }, tx);
      }
      return updated;
    });

    const audit = buildAuditDiff(
      toAuditRecord(before, PAIEMENT_AUDIT_FIELDS),
      toAuditRecord(paiement, PAIEMENT_AUDIT_FIELDS),
      PAIEMENT_AUDIT_FIELDS,
    );

    invalidateKpiCaches();
    return { ok: true as const, paiement, audit };
  } catch (error) {
    const mapped = mapTransactionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

function mapTransactionError(error: unknown): PaiementServiceError | null {
  if (!(error instanceof Error)) return null;
  const map: Record<string, PaiementServiceError> = {
    OVERPAY: { ok: false, code: 'OVERPAY', message: 'Montant supérieur au reste dû de la facture' },
    OVERPAY_CMD: { ok: false, code: 'OVERPAY_CMD', message: 'Montant supérieur au reste dû de la commande' },
    FACTURE_NOT_FOUND: { ok: false, code: 'FACTURE_NOT_FOUND', message: 'Facture introuvable' },
    FACTURE_CANCELLED: { ok: false, code: 'FACTURE_CANCELLED', message: 'Facture annulée — paiement impossible' },
    COMMANDE_NOT_FOUND: { ok: false, code: 'COMMANDE_NOT_FOUND', message: 'Commande introuvable' },
    DEVIS_NOT_FOUND: { ok: false, code: 'DEVIS_NOT_FOUND', message: 'Devis introuvable' },
    DEVIS_EXPIRED: { ok: false, code: 'DEVIS_EXPIRED', message: 'Devis expiré — paiement acompte impossible' },
    REFERENCE_CONFLICT: {
      ok: false,
      code: 'REFERENCE_CONFLICT',
      message: 'Référence déjà utilisée pour un autre paiement (montant ou cible différent)',
    },
  };
  return map[error.message] ?? null;
}

export async function createPaiementRecord(
  input: CreatePaiementInput,
  auth?: { userId: string; userName: string },
) {
  const {
    factureId,
    commandeId,
    devisId,
    clientId,
    montant,
    mode: payMode,
    mobileMoneyProvider,
    bankName,
    paymentTime,
    payerName,
    reference,
    type: payType,
    datePaiement,
    notes,
    printFormat: printFormatRaw,
  } = input;

  const printFormat: FacturePrintFormat = resolveFacturePrintFormat(printFormatRaw);

  let resolvedFactureId = factureId || null;
  if (!resolvedFactureId && commandeId) {
    const ensured = await ensureFactureForCommande(commandeId, {
      userId: auth?.userId,
      userName: auth?.userName,
    });
    if ('error' in ensured) {
      return {
        ok: false as const,
        code: 'FORBIDDEN' as const,
        message: ('message' in ensured && ensured.message) || 'Impossible de créer/lier une facture pour la commande',
      };
    }
    resolvedFactureId = ensured.facture.id;
  }

  const effectiveMode = normalizePaymentModeInput(
    payMode === 'Especes' ? 'Espèces' : payMode === 'Cheque' ? 'Chèque' : payMode,
    mobileMoneyProvider,
  );

  if (paymentReferenceRequired(effectiveMode) && !reference?.trim()) {
    return { ok: false as const, code: 'FORBIDDEN' as const, message: 'Référence obligatoire pour ce mode de paiement' };
  }

  try {
    const paiement = await prisma.$transaction(async (tx) => {
      const idempKey = paymentIdempotencyKey({
        provider: effectiveMode,
        reference,
        factureId: resolvedFactureId || null,
        commandeId: commandeId || devisId || null,
        montant,
      });

      const existingByKey = await tx.paiement.findUnique({
        where: { idempotencyKey: idempKey },
        include: { facture: true, commande: true, client: true },
      });
      if (existingByKey) return existingByKey;

      const refKey = reference?.trim() || '';
      if (refKey) {
        const existingByRef = await tx.paiement.findFirst({
          where: { reference: refKey },
          include: { facture: true, commande: true, client: true },
          orderBy: { createdAt: 'asc' },
        });
        if (existingByRef) {
          const sameTarget =
            (!!resolvedFactureId && existingByRef.factureId === resolvedFactureId) ||
            (!!commandeId && existingByRef.commandeId === commandeId) ||
            (!!devisId && existingByRef.commandeId === devisId);
          const sameAmount = Math.abs(Number(existingByRef.montant) - montant) < 0.01;
          if (sameTarget && sameAmount) {
            return existingByRef;
          }
          throw new Error('REFERENCE_CONFLICT');
        }
      }

      let resolvedClientId = clientId || null;
      let paymentNotes = encodePaymentMeta(
        { mobileMoneyProvider, bankName, paymentTime, payerName },
        notes,
      );

      if (devisId) {
        const devis = await tx.devis.findUnique({
          where: { id: devisId },
          select: { id: true, clientId: true, statut: true },
        });
        if (!devis) throw new Error('DEVIS_NOT_FOUND');
        if (devis.statut === DevisStatut.Expire) throw new Error('DEVIS_EXPIRED');
        resolvedClientId = resolvedClientId ?? devis.clientId;
        paymentNotes = encodeDevisPaymentNote(devisId, notes);
      }

      if (resolvedFactureId) {
        const facture = await tx.facture.findUnique({
          where: { id: resolvedFactureId },
          include: { paiements: true },
        });
        if (!facture) throw new Error('FACTURE_NOT_FOUND');
        if (facture.statut === FactureStatut.Annulee) throw new Error('FACTURE_CANCELLED');
        if (payType !== 'Remboursement') {
          if (facture.commandeId) {
            const cmd = await tx.commande.findUnique({ where: { id: facture.commandeId } });
            if (cmd) {
              const existing = await findCommandeRelatedPaiements(facture.commandeId, tx);
              const resteCmd = commandeRemainingAmount(cmd.total, existing);
              if (montant > resteCmd + 1) throw new Error('OVERPAY_CMD');
            }
          } else {
            const reste = facture.totalTTC - paidTotal(facture.paiements);
            if (montant > reste + 1) throw new Error('OVERPAY');
          }
        }
      }

      if (commandeId && payType !== 'Remboursement') {
        const cmd = await tx.commande.findUnique({ where: { id: commandeId } });
        if (!cmd) throw new Error('COMMANDE_NOT_FOUND');
        const existing = await findCommandeRelatedPaiements(commandeId, tx);
        const resteCmd = commandeRemainingAmount(cmd.total, existing);
        if (montant > resteCmd + 1) throw new Error('OVERPAY_CMD');
      }

      const numero = await nextSequenceSafe('PAY', () => tx.paiement.count(), tx);
      const effectiveDate = resolvePaymentDate(paymentTime, datePaiement);

      let created;
      try {
        created = await tx.paiement.create({
          data: {
            numero,
            factureId: resolvedFactureId || null,
            commandeId: commandeId || null,
            clientId: resolvedClientId,
            montant: Math.round(montant),
            mode: effectiveMode,
            reference: reference || null,
            idempotencyKey: idempKey,
            type: normalizePaiementType(payType),
            statut: 'Valide',
            datePaiement: effectiveDate,
            notes: paymentNotes,
            createdBy: auth?.userId ?? null,
            createdByName: auth?.userName ?? null,
          },
          include: { facture: true, commande: true, client: true },
        });
      } catch (err) {
        const racedByKey = await tx.paiement.findUnique({
          where: { idempotencyKey: idempKey },
          include: { facture: true, commande: true, client: true },
        });
        if (racedByKey) return racedByKey;
        if (refKey) {
          const raced = await tx.paiement.findFirst({
            where: { reference: refKey },
            include: { facture: true, commande: true, client: true },
            orderBy: { createdAt: 'asc' },
          });
          if (raced) return raced;
        }
        throw err;
      }

      if (resolvedFactureId) {
        await tx.facture.update({
          where: { id: resolvedFactureId },
          data: { printFormat },
        });
      }

      if (commandeId) {
        await afterPaiementRecorded({ factureId: resolvedFactureId || null, commandeId }, tx);
      } else if (resolvedFactureId) {
        await afterPaiementRecorded({ factureId: resolvedFactureId, commandeId: null }, tx);
      }

      const { enqueueOutbox } = await import('@/lib/server/outbox');
      await enqueueOutbox({
        tx,
        type: 'PaiementRecorded',
        aggregateType: 'Paiement',
        aggregateId: created.id,
        idempotencyKey: `paiement-recorded:${idempKey}`,
        correlationId: commandeId || resolvedFactureId || created.id,
        payload: {
          paiementId: created.id,
          montant: created.montant,
          factureId: created.factureId,
          commandeId: created.commandeId,
          printFormat,
        },
      });

      return created;
    });

    let devisConversion: Awaited<ReturnType<typeof tryAutoConvertDevisOnAcompte>> | undefined;
    if (devisId && payType === 'Acompte' && auth) {
      devisConversion = await tryAutoConvertDevisOnAcompte({
        devisId,
        montant,
        userId: auth.userId,
        userName: auth.userName,
      });
    }

    invalidateKpiCaches();
    return {
      ok: true as const,
      paiement,
      devisConversion,
      commandeId: commandeId || paiement.facture?.commandeId || paiement.commandeId || null,
      printFormat,
      factureId: paiement.factureId || resolvedFactureId || null,
    };
  } catch (error) {
    const mapped = mapTransactionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function createBatchPaiements(
  input: BatchPaiementInput,
  ctx: { role: string },
): Promise<
  | { ok: true; receiptNum: string; paiements: Awaited<ReturnType<typeof prisma.paiement.create>>[]; total: number }
  | PaiementServiceError
  | { ok: false; code: 'FORBIDDEN'; message: string }
> {
  const { factureId, commandeId, clientId, sessionId, source, totalAttendu, lines, notes } = input;
  const sum = lines.reduce((s, l) => s + l.montant, 0);

  if (totalAttendu != null && sum > totalAttendu + 1) {
    const canDebt = ctx.role === 'admin' || ctx.role === 'manager';
    if (!canDebt) {
      return {
        ok: false,
        code: 'FORBIDDEN',
        message: 'Montant supérieur au total — validation manager requise',
      };
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (factureId) {
        const facture = await tx.facture.findUnique({ where: { id: factureId }, include: { paiements: true } });
        if (!facture) throw new Error('FACTURE_NOT_FOUND');
        const reste = facture.totalTTC - paidTotal(facture.paiements);
        if (sum > reste + 1) throw new Error('OVERPAY');
      }
      if (commandeId) {
        const cmd = await tx.commande.findUnique({ where: { id: commandeId } });
        if (!cmd) throw new Error('COMMANDE_NOT_FOUND');
        const existing = await findCommandeRelatedPaiements(commandeId, tx);
        if (sum > commandeRemainingAmount(cmd.total, existing) + 1) throw new Error('OVERPAY_CMD');
      }

      const baseCount = await tx.paiement.count();
      const receiptNum = `REC-${String(baseCount + 1).padStart(5, '0')}`;
      const created = [];
      const { enqueueOutbox } = await import('@/lib/server/outbox');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const numero = lines.length > 1 ? `${receiptNum}-${i + 1}` : receiptNum;
        const idempKey = paymentIdempotencyKey({
          provider: line.mode,
          reference: line.reference || receiptNum,
          factureId: factureId || null,
          commandeId: commandeId || null,
          montant: line.montant,
        });
        const existingByKey = await tx.paiement.findUnique({ where: { idempotencyKey: idempKey } });
        if (existingByKey) {
          created.push(existingByKey);
          continue;
        }
        const p = await tx.paiement.create({
          data: {
            numero,
            factureId: factureId || null,
            commandeId: commandeId || null,
            clientId: clientId || null,
            montant: Math.round(line.montant),
            mode: line.mode,
            reference: line.reference || receiptNum,
            idempotencyKey: idempKey,
            type: 'Solde',
            statut: 'Valide',
            notes: JSON.stringify({
              receiptNum,
              sessionId,
              source,
              batchIndex: i + 1,
              batchTotal: sum,
              extra: notes,
            }),
          },
        });
        created.push(p);
        await enqueueOutbox({
          tx,
          type: 'PaiementRecorded',
          aggregateType: 'Paiement',
          aggregateId: p.id,
          idempotencyKey: `paiement-recorded:${idempKey}`,
          correlationId: commandeId || factureId || p.id,
          payload: {
            paiementId: p.id,
            montant: p.montant,
            factureId: p.factureId,
            commandeId: p.commandeId,
          },
        });
      }

      if (commandeId || factureId) {
        await afterPaiementRecorded({ factureId: factureId || null, commandeId: commandeId || null }, tx);
      }

      return { receiptNum, paiements: created, total: sum };
    });

    invalidateKpiCaches();
    return { ok: true, ...result };
  } catch (error) {
    const mapped = mapTransactionError(error);
    if (mapped) {
      if (mapped.code === 'OVERPAY') {
        return { ok: false, code: 'OVERPAY', message: 'Montant supérieur au reste dû' };
      }
      if (mapped.code === 'OVERPAY_CMD') {
        return { ok: false, code: 'OVERPAY_CMD', message: 'Montant supérieur au reste commande' };
      }
      return mapped;
    }
    throw error;
  }
}

export function paiementErrorStatus(code: PaiementServiceError['code']) {
  switch (code) {
    case 'NOT_FOUND':
    case 'FACTURE_NOT_FOUND':
    case 'COMMANDE_NOT_FOUND':
    case 'DEVIS_NOT_FOUND':
      return 404;
    case 'FORBIDDEN':
      return 403;
    case 'FACTURE_CANCELLED':
    case 'DEVIS_EXPIRED':
      return 409;
    default:
      return 400;
  }
}

/** Annulation ledger — historique conservé (statut Annule), projections recalculées. */
export async function cancelPaiementRecord(
  id: string,
  auth?: { userId: string; userName: string },
) {
  const { canCancelPaiement } = await import('@/lib/finance/paiement-ledger');
  try {
    const paiement = await prisma.$transaction(async (tx) => {
      const before = await tx.paiement.findUnique({
        where: { id },
        include: { facture: { select: { commandeId: true } } },
      });
      if (!before) throw new Error('NOT_FOUND');
      if (!canCancelPaiement(before.statut)) {
        throw new Error('FORBIDDEN');
      }
      if (before.statut === 'Annule') return before;

      const updated = await tx.paiement.update({
        where: { id },
        data: {
          statut: 'Annule',
          cancelledAt: new Date(),
          cancelledBy: auth?.userId ?? null,
        },
        include: { facture: { select: { commandeId: true } } },
      });

      const linkedCommandeId = updated.commandeId ?? updated.facture?.commandeId ?? null;
      const linkedFactureId = updated.factureId ?? null;
      await afterPaiementRecorded({ factureId: linkedFactureId, commandeId: linkedCommandeId }, tx);

      const { enqueueOutbox } = await import('@/lib/server/outbox');
      await enqueueOutbox({
        tx,
        type: 'PaiementCancelled',
        aggregateType: 'Paiement',
        aggregateId: updated.id,
        idempotencyKey: `paiement-cancelled:${updated.id}`,
        payload: { paiementId: updated.id, previousStatut: before.statut },
      });

      return updated;
    });

    invalidateKpiCaches();
    return { ok: true as const, paiement };
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Paiement introuvable' };
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return {
        ok: false as const,
        code: 'FORBIDDEN' as const,
        message: 'Ce paiement ne peut pas être annulé dans son statut actuel',
      };
    }
    throw error;
  }
}
