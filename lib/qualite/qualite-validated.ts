/** Statuts qualité autorisant la suite workflow (livraison / clôture). */
export function isQualiteStatutValide(statut?: string | null): boolean {
  if (!statut) return false;
  return statut === 'Conforme' || statut === 'Accepte avec reserve';
}
