export type PaymentChip = 'acompte50' | 'custom' | 'total';
export type PaymentMode = 'Especes' | 'Cheque' | 'MobileMoney' | 'Virement';
export type MobileMoneyProvider = 'Mvola' | 'Airtel Money' | 'Orange Money';

export interface QuoteLogisticsSnapshot {
  clientName?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientEmail?: string;
  clientMainAddress?: string;
  clientMainAxis?: string;
  clientLandmark?: string;
  clientNif?: string;
  clientStat?: string;
  clientCommercial?: string;
  canalVente?: string;
  canalDecouverte?: string;
  useClientMainAddress?: boolean;
  deliveryAddress?: string;
  deliveryAxis?: string;
  deliveryLandmark?: string;
  deliveryDetails?: string;
  saveAddressToClient?: boolean;
}

export interface DevisValidationMeta {
  logistics?: QuoteLogisticsSnapshot;
  modeExpedition?: string;
  expeditionOther?: string;
  expeditionDetails?: string;
  dateLivraison?: string;
  delaiExecution?: string;
  executionDelayOther?: string;
  delaiDetails?: string;
  priorite?: 'Normale' | 'Urgent' | 'Urgente' | 'Tres urgente' | 'Express' | 'A planifier' | 'Bloquee';
  prioriteDetails?: string;
  /** @deprecated ancien modèle */
  modePaiement?: string;
  paymentMode?: PaymentMode;
  paymentChip?: PaymentChip;
  montantPaye?: number;
  resteAPayer?: number;
  mobileMoneyProvider?: MobileMoneyProvider;
  referencePaiement?: string;
  paymentNote?: string;
  paymentTime?: string;
  bankName?: string;
  transferDate?: string;
  payerName?: string;
  avancePct?: number;
  canalPaiement?: string;
  statutValidation?: string;
  notesLibres?: string;
}

const META_PREFIX = '__ANS_META__';

export function serializeDevisNotes(meta: DevisValidationMeta, userNotes?: string): string {
  return `${META_PREFIX}${JSON.stringify(meta)}${userNotes ? `\n\n${userNotes}` : ''}`;
}

export function parseDevisNotes(notes: string | null | undefined): { meta: DevisValidationMeta | null; userNotes: string } {
  if (!notes) return { meta: null, userNotes: '' };
  if (!notes.startsWith(META_PREFIX)) return { meta: null, userNotes: notes };
  const rest = notes.slice(META_PREFIX.length);
  const nl = rest.indexOf('\n\n');
  const jsonPart = nl >= 0 ? rest.slice(0, nl) : rest;
  const userNotes = nl >= 0 ? rest.slice(nl + 2) : '';
  try {
    return { meta: JSON.parse(jsonPart) as DevisValidationMeta, userNotes };
  } catch {
    return { meta: null, userNotes: notes };
  }
}

export function resolvePaymentMode(meta: DevisValidationMeta | null): PaymentMode {
  if (!meta) return 'Especes';
  if (meta.paymentMode) return meta.paymentMode;
  const legacy = (meta.modePaiement || meta.canalPaiement || '').toLowerCase();
  if (legacy.includes('virement') || legacy.includes('transfer')) return 'Virement';
  if (legacy.includes('chèque') || legacy.includes('cheque')) return 'Cheque';
  if (legacy.includes('mobile') || legacy.includes('mvola') || legacy.includes('airtel') || legacy.includes('orange')) {
    return 'MobileMoney';
  }
  return 'Especes';
}

export function computeMontantPaye(meta: DevisValidationMeta, totalTTC: number): number {
  const chip = meta.paymentChip ?? (meta.modePaiement === 'Complet' ? 'total' : meta.avancePct === 50 ? 'acompte50' : 'custom');
  if (chip === 'total') return totalTTC;
  if (chip === 'acompte50') return Math.round(totalTTC * 0.5);
  const custom = Number(meta.montantPaye ?? 0);
  if (custom > 0) return Math.min(custom, totalTTC);
  if (meta.avancePct) return Math.round(totalTTC * meta.avancePct / 100);
  return 0;
}

export function enrichPaymentMeta(meta: DevisValidationMeta, totalTTC: number): DevisValidationMeta {
  const montantPaye = computeMontantPaye(meta, totalTTC);
  return {
    ...meta,
    montantPaye,
    resteAPayer: Math.max(0, totalTTC - montantPaye),
  };
}

export const DEFAULT_DEVIS_META: DevisValidationMeta = {
  modeExpedition: 'Livraison client',
  delaiExecution: '3 jours ouvrés',
  priorite: 'Normale',
  paymentMode: 'Especes',
  paymentChip: 'total',
};

export const EXPEDITION_OPTIONS = [
  'Livraison client',
  'Retrait agence',
  'Livraison taxi / coursier',
  'Livraison transporteur',
  'Autre',
] as const;

export const DELAI_OPTIONS = [
  'Standard',
  '24h',
  '48h',
  '3 jours ouvrés',
  '5 jours ouvrés',
  'Urgent',
  'Autre',
] as const;

export const PRIORITE_OPTIONS = [
  'Normale',
  'Urgente',
  'Tres urgente',
  'A planifier',
  'Bloquee',
] as const;
