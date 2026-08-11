/**
 * Règle métier : statut commande « En attente stock »
 * uniquement si une réservation stock a échoué pour insuffisance réelle.
 * Un mapping introuvable ne doit pas bloquer injustement la production.
 */

export type StockReservationStatusLike = {
  status: 'reserved' | 'skipped' | string;
  reason?: string | null;
};

export function shouldSetEnAttenteStock(
  reservations: StockReservationStatusLike[],
): boolean {
  return reservations.some(
    (r) => r.status === 'skipped' && /insuffisant/i.test(String(r.reason ?? '')),
  );
}
