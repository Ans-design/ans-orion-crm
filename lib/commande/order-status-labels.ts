/** Libellés métier pour éviter les KPI « 0 » sans signification. */

export type OrderPaymentStatusLabel = 'Non payé' | 'Acompte' | 'Partiel' | 'Soldé';

export function orderPaymentStatusLabel(total: number, paid: number, reste: number): OrderPaymentStatusLabel {
  if (reste <= 0 || paid >= total) return 'Soldé';
  if (paid <= 0) return 'Non payé';
  if (paid < total * 0.5) return 'Acompte';
  return 'Partiel';
}

export function paymentSummaryLabel(reste: number, acompte: number, total = 0): string {
  const status = orderPaymentStatusLabel(total || acompte + reste, acompte, reste);
  if (status === 'Soldé') return 'Soldé';
  if (status === 'Non payé') return 'Non payé';
  return `${status} · reste ${Math.round(reste).toLocaleString('fr-FR')} Ar`;
}

export function livraisonStatusLabel(livraisons: number, statut: string): { label: string; tone: 'muted' | 'warn' | 'ok' } {
  if (livraisons > 0) return { label: `${livraisons} en cours`, tone: 'ok' };
  if (statut === 'Livré') return { label: 'Livrée', tone: 'ok' };
  if (statut === 'Prête') return { label: 'À expédier', tone: 'warn' };
  return { label: 'À planifier', tone: 'muted' };
}

export function factureStatusLabel(factures: number, statut: string, reste: number): { label: string; tone: 'muted' | 'warn' | 'ok' } {
  if (factures > 0) return { label: 'Émise', tone: 'ok' };
  if (statut === 'Livré' || reste <= 0) return { label: 'À générer', tone: 'warn' };
  return { label: 'Après livraison', tone: 'muted' };
}

export function batStatusLabel(totalBAT: number, batValides: number): { label: string; tone: 'muted' | 'warn' | 'ok' } {
  if (batValides > 0) return { label: 'Validé', tone: 'ok' };
  if (totalBAT > 0) return { label: 'En attente', tone: 'warn' };
  return { label: 'À créer', tone: 'muted' };
}

export function stockStatusLabel(reservations: number, statut: string): { label: string; tone: 'muted' | 'warn' | 'ok' } {
  if (reservations > 0) return { label: 'Réservé', tone: 'ok' };
  if (statut === 'En attente stock') return { label: 'À vérifier', tone: 'warn' };
  return { label: 'Non vérifié', tone: 'muted' };
}

export function productionStatusLabel(dossiers: number, avancement: number): { label: string; tone: 'muted' | 'warn' | 'ok' } {
  if (dossiers === 0) return { label: 'Non lancée', tone: 'muted' };
  if (avancement >= 100) return { label: 'Terminée', tone: 'ok' };
  return { label: `${avancement}%`, tone: 'warn' };
}
