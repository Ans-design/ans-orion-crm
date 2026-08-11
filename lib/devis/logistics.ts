import { parseClientCharte, LIVRAISON_AXES, type ClientAddress } from '@/lib/client-charte';
import { isClientFidele } from '@/lib/clients/client-display';
import type { DevisValidationMeta, QuoteLogisticsSnapshot } from '@/lib/devis-meta';

export type ClientForLogistics = {
  id: string;
  name: string;
  tel?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  adresse?: string | null;
  ville?: string | null;
  nif?: string | null;
  statNumber?: string | null;
  commercialName?: string | null;
  canalVente?: string | null;
  canalDecouverte?: string | null;
  charte?: string | null;
  statut?: string | null;
};

function mainAddressFromCharte(charte: string | null | undefined): ClientAddress | null {
  const data = parseClientCharte(charte);
  return data.addresses?.find((a) => a.label === 'Principale') ?? data.addresses?.[0] ?? null;
}

function formatAxis(addr: ClientAddress | null): string {
  if (!addr?.axe) return '';
  if (addr.axe.startsWith('Autre')) return addr.axeDetail?.trim() || addr.axe;
  return addr.axe;
}

export function buildClientLogisticsDefaults(client: ClientForLogistics): QuoteLogisticsSnapshot {
  const main = mainAddressFromCharte(client.charte);
  const repere = main?.repere?.trim() || [client.adresse, client.ville].filter(Boolean).join(', ');
  const axis = formatAxis(main);
  return {
    clientName: client.name,
    clientPhone: client.tel ?? undefined,
    clientWhatsapp: client.whatsapp ?? undefined,
    clientEmail: client.email ?? undefined,
    clientMainAddress: repere || undefined,
    clientMainAxis: axis || undefined,
    clientLandmark: main?.repere?.trim() || undefined,
    clientNif: client.nif ?? undefined,
    clientStat: client.statNumber ?? undefined,
    clientCommercial: client.commercialName ?? undefined,
    canalVente: client.canalVente ?? undefined,
    canalDecouverte: client.canalDecouverte ?? undefined,
    useClientMainAddress: true,
    deliveryAddress: repere || undefined,
    deliveryAxis: axis || undefined,
    deliveryLandmark: main?.repere?.trim() || undefined,
    saveAddressToClient: false,
  };
}

export function isClientFideleFromRecord(client: ClientForLogistics): boolean {
  return isClientFidele({ statut: client.statut });
}

export function mergeLogisticsWithClientDefaults(
  meta: DevisValidationMeta | null,
  client: ClientForLogistics | null,
): DevisValidationMeta {
  if (!client) return meta ?? {};
  const defaults = buildClientLogisticsDefaults(client);
  const existing = meta?.logistics;
  if (existing?.clientName) {
    return {
      ...meta,
      logistics: { ...defaults, ...existing, saveAddressToClient: existing.saveAddressToClient ?? false },
    };
  }
  return {
    ...meta,
    logistics: defaults,
    modeExpedition: meta?.modeExpedition ?? 'Livraison client',
    delaiExecution: meta?.delaiExecution ?? '3 jours ouvrés',
    priorite: meta?.priorite ?? 'Normale',
  };
}

export function syncDeliveryFromMain(logistics: QuoteLogisticsSnapshot, useMain: boolean): QuoteLogisticsSnapshot {
  if (!useMain) return { ...logistics, useClientMainAddress: false };
  return {
    ...logistics,
    useClientMainAddress: true,
    deliveryAddress: logistics.clientMainAddress,
    deliveryAxis: logistics.clientMainAxis,
    deliveryLandmark: logistics.clientLandmark,
  };
}

export function validateQuoteLogistics(meta: DevisValidationMeta): string[] {
  const errors: string[] = [];
  const mode = meta.modeExpedition ?? '';
  const logistics = meta.logistics;

  if (!mode) errors.push('Veuillez choisir un mode d\'expédition.');

  if (mode === 'Livraison client' || mode === 'Livraison taxi / coursier' || mode === 'Livraison transporteur') {
    const addr = logistics?.deliveryAddress?.trim();
    if (!addr) errors.push('Veuillez renseigner l\'adresse de livraison ou choisir Retrait agence.');
  }

  if (!meta.dateLivraison?.trim()) errors.push('Veuillez renseigner la date de livraison.');
  if (!meta.delaiExecution?.trim()) errors.push('Veuillez renseigner le délai d\'exécution.');
  if (meta.delaiExecution === 'Autre' && !meta.executionDelayOther?.trim()) {
    errors.push('Veuillez préciser le délai d\'exécution.');
  }
  if (mode === 'Autre' && !meta.expeditionOther?.trim()) {
    errors.push('Veuillez préciser le mode d\'expédition.');
  }

  return errors;
}

export function validateQuotePayment(meta: DevisValidationMeta, totalTTC: number, montantPaye: number): string[] {
  const errors: string[] = [];

  if (!meta.paymentMode) errors.push('Choisissez un mode de paiement.');
  if (!meta.paymentTime?.trim()) errors.push('Veuillez renseigner l\'heure du paiement.');

  if (meta.paymentMode === 'MobileMoney') {
    if (!meta.mobileMoneyProvider) errors.push('Choisissez un opérateur Mobile Money.');
    if (!meta.referencePaiement?.trim()) errors.push('Veuillez saisir la référence Mobile Money.');
  }
  if (meta.paymentMode === 'Cheque' && !meta.referencePaiement?.trim()) {
    errors.push('Veuillez renseigner la référence du chèque.');
  }
  if (meta.paymentMode === 'Virement') {
    if (!meta.bankName?.trim()) errors.push('Veuillez renseigner la banque.');
    if (!meta.referencePaiement?.trim()) errors.push('Veuillez renseigner la référence du virement.');
  }
  if (montantPaye <= 0) errors.push('Montant payé invalide.');
  if (meta.paymentChip === 'custom' && montantPaye > totalTTC) {
    errors.push('Le montant payé ne peut pas dépasser le total TTC.');
  }

  return errors;
}

export function formatLogisticsRecap(meta: DevisValidationMeta): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const l = meta.logistics;
  if (meta.modeExpedition) {
    const exp = meta.modeExpedition === 'Autre' && meta.expeditionOther
      ? meta.expeditionOther
      : meta.modeExpedition;
    rows.push({ label: 'Expédition', value: exp });
  }
  if (l?.deliveryAddress) rows.push({ label: 'Adresse livraison', value: l.deliveryAddress });
  if (l?.deliveryAxis) rows.push({ label: 'Axe', value: l.deliveryAxis });
  if (meta.dateLivraison) {
    rows.push({ label: 'Date souhaitée', value: new Date(meta.dateLivraison).toLocaleDateString('fr-FR') });
  }
  if (meta.delaiExecution) {
    const delai = meta.delaiExecution === 'Autre' && meta.executionDelayOther
      ? meta.executionDelayOther
      : meta.delaiExecution;
    rows.push({ label: 'Délai', value: delai });
  }
  if (meta.priorite && meta.priorite !== 'Normale') rows.push({ label: 'Priorité', value: meta.priorite });
  if (meta.prioriteDetails?.trim()) rows.push({ label: 'Détails priorité', value: meta.prioriteDetails.trim() });
  if (meta.expeditionDetails?.trim()) rows.push({ label: 'Détails', value: meta.expeditionDetails.trim() });
  return rows;
}

export function mapPrioriteToCommande(priorite?: string): string {
  const map: Record<string, string> = {
    Normale: 'Normal',
    Urgent: 'Urgente',
    Urgente: 'Urgente',
    'Tres urgente': 'Urgente',
    Express: 'Urgente',
    Haute: 'Haute',
    'A planifier': 'Normal',
    Bloquee: 'Normal',
  };
  return map[priorite ?? ''] ?? 'Normal';
}

export function buildCommandeNoteFromMeta(meta: DevisValidationMeta): string | null {
  const recap = formatLogisticsRecap(meta);
  if (!recap.length) return null;
  const lines = recap.map((r) => `${r.label}: ${r.value}`);
  const payment = meta.paymentMode
    ? `Paiement: ${meta.paymentMode}${meta.mobileMoneyProvider ? ` (${meta.mobileMoneyProvider})` : ''}`
  : null;
  return [lines.join(' · '), payment].filter(Boolean).join('\n') || null;
}

export { LIVRAISON_AXES };
