/** Champs suivis pour l'audit before/after des modules migrés */
export const CLIENT_AUDIT_FIELDS = [
  'name', 'email', 'tel', 'whatsapp', 'statut', 'categorie', 'type', 'ville', 'nif',
] as const;

export const FACTURE_AUDIT_FIELDS = [
  'statut', 'totalHT', 'totalTTC', 'remise', 'tva', 'notes', 'dateEcheance', 'clientId',
] as const;

export const PAIEMENT_AUDIT_FIELDS = [
  'montant', 'mode', 'type', 'reference', 'notes', 'datePaiement', 'factureId', 'commandeId',
] as const;

export const STOCK_AUDIT_FIELDS = [
  'label', 'quantity', 'minQty', 'category', 'unitCost', 'supplier', 'reservedQty',
] as const;

export function buildAuditDiff<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: readonly (keyof T)[],
) {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  for (const field of fields) {
    const key = String(field);
    const prev = before[field];
    const next = after[field];
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      oldValue[key] = prev;
      newValue[key] = next;
    }
  }
  return { oldValue, newValue, hasChanges: Object.keys(oldValue).length > 0 };
}

export function toAuditRecord<T extends object>(row: T, fields: readonly (keyof T)[]) {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    out[String(field)] = row[field as keyof T];
  }
  return out;
}
