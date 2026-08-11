import {
  createDossierConversation,
  createOrderConversation,
} from '@/lib/messaging/messaging-service';
import type {
  CreateDossierConversationInput,
  CreateOrderConversationInput,
} from './conversations.validation';

export async function createConversationFromOrder(
  input: CreateOrderConversationInput,
  auth: { userId: string; userName: string },
) {
  return createOrderConversation(input.commandeId, auth);
}

export async function createConversationFromDossier(
  input: CreateDossierConversationInput,
  auth: { userId: string; userName: string },
) {
  return createDossierConversation(input.dossierId, auth);
}

export function mapOrderConversationError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === 'COMMANDE_NOT_FOUND') return { status: 404, message: 'Commande introuvable' };
  return null;
}

export function mapDossierConversationError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === 'DOSSIER_NOT_FOUND') return { status: 404, message: 'Dossier GPAO introuvable' };
  return null;
}
