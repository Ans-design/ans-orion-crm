const META_PREFIX = '__ANS_PAYMENT_META__';

export type StoredPaymentMeta = {
  mobileMoneyProvider?: string | null;
  bankName?: string | null;
  paymentTime?: string | null;
  payerName?: string | null;
  note?: string | null;
};

export function encodePaymentMeta(meta: StoredPaymentMeta, userNotes?: string | null): string | null {
  const payload: StoredPaymentMeta = {};
  if (meta.mobileMoneyProvider?.trim()) payload.mobileMoneyProvider = meta.mobileMoneyProvider.trim();
  if (meta.bankName?.trim()) payload.bankName = meta.bankName.trim();
  if (meta.paymentTime?.trim()) payload.paymentTime = meta.paymentTime.trim();
  if (meta.payerName?.trim()) payload.payerName = meta.payerName.trim();
  if (meta.note?.trim()) payload.note = meta.note.trim();

  const hasMeta = Object.keys(payload).length > 0;
  const cleanNotes = userNotes?.trim() ?? '';
  if (!hasMeta) return cleanNotes || null;
  return `${META_PREFIX}${JSON.stringify(payload)}${cleanNotes ? `\n\n${cleanNotes}` : ''}`;
}

export function parsePaymentMeta(notes: string | null | undefined): {
  meta: StoredPaymentMeta | null;
  userNotes: string;
} {
  if (!notes) return { meta: null, userNotes: '' };
  if (!notes.startsWith(META_PREFIX)) return { meta: null, userNotes: notes };
  const rest = notes.slice(META_PREFIX.length);
  const splitAt = rest.indexOf('\n\n');
  const jsonPart = splitAt >= 0 ? rest.slice(0, splitAt) : rest;
  const userNotes = splitAt >= 0 ? rest.slice(splitAt + 2) : '';
  try {
    return { meta: JSON.parse(jsonPart) as StoredPaymentMeta, userNotes };
  } catch {
    return { meta: null, userNotes: notes };
  }
}

export function normalizePaymentModeInput(mode: string, mobileMoneyProvider?: string | null): string {
  if (mode === 'Mobile Money' && mobileMoneyProvider?.trim()) {
    return mobileMoneyProvider.trim();
  }
  if (mode === 'Mvola' || mode === 'Orange Money' || mode === 'Airtel Money') {
    return mode;
  }
  return mode;
}

export function paymentReferenceRequired(mode: string): boolean {
  const normalized = mode.toLowerCase();
  return (
    normalized.includes('mobile')
    || normalized.includes('mvola')
    || normalized.includes('orange')
    || normalized.includes('airtel')
    || normalized.includes('virement')
    || normalized.includes('cheque')
    || normalized.includes('chèque')
    || normalized.includes('carte')
  );
}

export function resolvePaymentDate(
  paymentTime?: string | null,
  datePaiement?: string | Date | null,
): Date {
  if (paymentTime?.trim()) {
    const fromTime = new Date(paymentTime);
    if (Number.isFinite(fromTime.getTime())) return fromTime;
  }
  if (datePaiement) {
    const fromInput = new Date(datePaiement);
    if (Number.isFinite(fromInput.getTime())) return fromInput;
  }
  return new Date();
}
