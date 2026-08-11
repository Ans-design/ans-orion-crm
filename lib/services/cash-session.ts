import { prisma } from '@/lib/prisma';

export type CashTotals = Record<string, number>;

export type CashPaymentLike = {
  montant: number;
  mode: string | null;
  notes?: string | null;
  type?: string | null;
};

export function emptyCashTotals(): CashTotals {
  return { especes: 0, mvola: 0, orange: 0, airtel: 0, virement: 0, cheque: 0, carte: 0, mixte: 0 };
}

/** Extrait sessionId depuis notes JSON batch caisse. */
export function extractSessionIdFromPaymentNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  try {
    const parsed = JSON.parse(notes) as { sessionId?: unknown };
    if (typeof parsed?.sessionId === 'string' && parsed.sessionId.trim()) {
      return parsed.sessionId.trim();
    }
  } catch {
    /* notes non JSON — ignore */
  }
  return null;
}

/** Agrège des paiements déjà filtrés (pur — tests V2-06). */
export function aggregateCashTotals(paiements: CashPaymentLike[]): CashTotals {
  const totals = emptyCashTotals();
  for (const p of paiements) {
    if (p.type === 'Remboursement') continue;
    const m = (p.mode || '').toLowerCase();
    if (m.includes('esp')) totals.especes += p.montant;
    else if (m.includes('mvola') || m.includes('mobile')) totals.mvola += p.montant;
    else if (m.includes('orange')) totals.orange += p.montant;
    else if (m.includes('airtel')) totals.airtel += p.montant;
    else if (m.includes('virement')) totals.virement += p.montant;
    else if (m.includes('chèque') || m.includes('cheque')) totals.cheque += p.montant;
    else if (m.includes('carte')) totals.carte += p.montant;
    else if (m.includes('mixte')) totals.mixte += p.montant;
    else totals.especes += p.montant;
  }
  return totals;
}

/**
 * Agrège les paiements de la session.
 * Priorité : notes.sessionId = session ouverte (évite contamination multi-caissier).
 * Fallback : depuis openedAt (legacy sans sessionId dans notes).
 */
export async function computeSessionTotals(
  userId: string,
  since: Date,
  sessionId?: string,
): Promise<CashTotals> {
  void userId; // réservé : Paiement n’a pas encore userId — filtrage via sessionId
  const paiements = await prisma.paiement.findMany({
    where: { createdAt: { gte: since }, type: { not: 'Remboursement' } },
    select: { montant: true, mode: true, notes: true, type: true },
  });

  const scoped = sessionId
    ? paiements.filter((p) => extractSessionIdFromPaymentNotes(p.notes) === sessionId)
    : paiements;

  // Si aucune ligne taguée session (legacy), fallback temporel pour ne pas clôturer à 0
  const effective =
    sessionId && scoped.length === 0
      ? paiements.filter((p) => !extractSessionIdFromPaymentNotes(p.notes))
      : scoped;

  return aggregateCashTotals(effective);
}

export async function getOpenSession(userId: string) {
  return prisma.cashSession.findFirst({
    where: { userId, status: 'open' },
    orderBy: { openedAt: 'desc' },
  });
}

function parseTotalsJson(json: string | null | undefined): CashTotals | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json) as Record<string, number>;
    return { ...emptyCashTotals(), ...parsed };
  } catch {
    return null;
  }
}

export type CashSessionHistoryItem = {
  id: string;
  userId: string;
  userName: string | null;
  openedAt: Date;
  closedAt: Date | null;
  openingFloat: number;
  closingCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  notes: string | null;
  totals: CashTotals | null;
  encaissements: number;
};

/** Sessions clôturées des N derniers jours (propre caissier, ou tous pour finance/admin). */
export async function listCashSessionHistory(opts: {
  userId: string;
  role: string;
  days?: number;
  take?: number;
}): Promise<CashSessionHistoryItem[]> {
  const days = opts.days ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const canSeeAll = ['admin', 'manager', 'finance'].includes(opts.role);
  const rows = await prisma.cashSession.findMany({
    where: {
      status: 'closed',
      closedAt: { gte: since },
      ...(canSeeAll ? {} : { userId: opts.userId }),
    },
    orderBy: { closedAt: 'desc' },
    take: opts.take ?? 40,
  });

  return rows.map((r) => {
    const totals = parseTotalsJson(r.totalsJson);
    const encaissements = totals
      ? Object.values(totals).reduce((s, v) => s + (Number(v) || 0), 0)
      : Math.max(0, (r.expectedCash ?? 0) - (r.openingFloat ?? 0));
    return {
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      openedAt: r.openedAt,
      closedAt: r.closedAt,
      openingFloat: r.openingFloat,
      closingCash: r.closingCash,
      expectedCash: r.expectedCash,
      variance: r.variance,
      notes: r.notes,
      totals,
      encaissements,
    };
  });
}

export function summarizeCashHistory(items: CashSessionHistoryItem[]) {
  const count = items.length;
  const encaissements = items.reduce((s, i) => s + i.encaissements, 0);
  const variance = items.reduce((s, i) => s + (i.variance ?? 0), 0);
  const withEcart = items.filter((i) => (i.variance ?? 0) !== 0).length;
  return { count, encaissements, variance, withEcart };
}
