/** Client Prisma obsolète ou délégué pricing absent (cache dev Next.js). */
export function isPrismaDelegateMissingError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
  return (
    msg.includes("reading 'findmany'") ||
    msg.includes("reading 'findunique'") ||
    msg.includes("reading 'findfirst'") ||
    msg.includes("reading 'create'") ||
    msg.includes("reading 'update'")
  );
}

/** Détecte erreur Prisma table/colonne manquante (migration non appliquée). */
export function isPrismaMissingTableError(error: unknown): boolean {
  if (isPrismaDelegateMissingError(error)) return true;
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code === 'P2021' || e.code === 'P2022') return true;
  const msg = String(e.message ?? '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes("n'existe pas") ||
    msg.includes('no such table') ||
    msg.includes('basematerial')
  );
}
