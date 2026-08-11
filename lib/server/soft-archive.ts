/**
 * Soft-archive / tombstone helpers (V12 Lot 8 + plan CRUD).
 * Pas de purge physique ici — dry-run + super-admin uniquement ailleurs.
 */

export type ArchiveDecision =
  | { ok: true; mode: 'archive' }
  | { ok: false; reason: string; code: 'FORBIDDEN_HARD_DELETE' | 'HAS_REFERENCES' | 'LEDGER_PROTECTED' };

/** Entités jamais hard-delete en UI métier. */
const HARD_DELETE_BLOCKED = new Set([
  'Commande',
  'Facture',
  'Paiement',
  'StockMovement',
  'Proof',
  'ProductionDossier',
]);

export function assertSoftDeleteAllowed(entity: string): ArchiveDecision {
  if (HARD_DELETE_BLOCKED.has(entity)) {
    return {
      ok: false,
      code: 'FORBIDDEN_HARD_DELETE',
      reason: `${entity} : archive/tombstone uniquement (pas de suppression physique UI)`,
    };
  }
  return { ok: true, mode: 'archive' };
}

export function isLedgerProtectedEntity(entity: string): boolean {
  return HARD_DELETE_BLOCKED.has(entity);
}

/** Filtre liste active vs corbeille pour modèles avec `archived: boolean`. */
export function archivedListFilter(trash: boolean): { archived: boolean } {
  return { archived: trash };
}

/** Filtre deletedAt pour modèles soft-delete timestamp. */
export function deletedAtListFilter(trash: boolean):
  | { deletedAt: null }
  | { deletedAt: { not: null } } {
  return trash ? { deletedAt: { not: null } } : { deletedAt: null };
}

export type SoftArchiveFields = {
  archived: true;
  archivedAt: Date;
  archivedBy?: string | null;
};

export type SoftRestoreFields = {
  archived: false;
  archivedAt: null;
  archivedBy: null;
};

export function softArchiveData(userId?: string | null): SoftArchiveFields {
  return {
    archived: true,
    archivedAt: new Date(),
    archivedBy: userId ?? null,
  };
}

export function softRestoreData(): SoftRestoreFields {
  return {
    archived: false,
    archivedAt: null,
    archivedBy: null,
  };
}

export function softDeleteAtData(): { deletedAt: Date } {
  return { deletedAt: new Date() };
}

export function softRestoreDeletedAtData(): { deletedAt: null } {
  return { deletedAt: null };
}
