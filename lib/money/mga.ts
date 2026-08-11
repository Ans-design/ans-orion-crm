/**
 * Politique monétaire ANS ORION — MGA (Ariary).
 *
 * Devise opérationnelle : MGA. Précision : entier d’ariary (pas de centimes).
 * Source de vérité calculs runtime : ce module (+ `lib/money/amounts.ts`).
 *
 * Choix de type Prisma : `Int` (32 bits signé) pour les montants opérationnels.
 * Plafond théorique : 2_147_483_647 Ar. Plafond observé local ≈ 1,25 M Ar.
 * Si un préflight détecte un risque de dépassement → migrer vers Decimal(18,0)
 * (préféré à BigInt pour la sérialisation JSON). Ne pas utiliser Float pour un montant.
 *
 * Interdit : parseFloat opérationnel, comparaison approximative, arrondi silencieux
 * hors helpers, calcul financier dispersé dans React.
 */
export const MGA_CURRENCY = 'MGA' as const;
export const MGA_DECIMALS = 0 as const;

/** Max Int32 Prisma — au-delà, préflight doit refuser ou proposer Decimal(18,0). */
export const MGA_INT32_MAX = 2_147_483_647 as const;
export const MGA_INT32_MIN = -2_147_483_648 as const;

/** Seuil d’alerte préflight (50 % du plafond Int32). */
export const MGA_INT32_WARN = 1_000_000_000 as const;

export class MgaIntegrityError extends Error {
  readonly code: string;
  readonly value: unknown;
  constructor(code: string, message: string, value?: unknown) {
    super(message);
    this.name = 'MgaIntegrityError';
    this.code = code;
    this.value = value;
  }
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const n = Number(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Arrondi bancaire vers ariary entier (half-up). */
export function roundMga(value: number | string | null | undefined): number {
  const n = toFiniteNumber(value);
  if (n == null) return 0;
  return Math.round(n);
}

/**
 * Parse strict pour migration / API : refuse NaN, refuse fractionnaire si `requireInteger`.
 * N’arrondit jamais silencieusement.
 */
export function parseMgaStrict(
  value: number | string | null | undefined,
  opts: { requireInteger?: boolean; allowNegative?: boolean; field?: string } = {},
): number {
  const n = toFiniteNumber(value);
  if (n == null) {
    throw new MgaIntegrityError('non_finite', `Montant invalide${opts.field ? ` (${opts.field})` : ''}`, value);
  }
  if (!opts.allowNegative && n < 0) {
    throw new MgaIntegrityError('negative_forbidden', `Montant négatif interdit${opts.field ? ` (${opts.field})` : ''}`, n);
  }
  if (opts.requireInteger !== false && !Number.isInteger(n)) {
    throw new MgaIntegrityError('fractional', `Montant fractionnaire refusé${opts.field ? ` (${opts.field})` : ''}`, n);
  }
  if (n > MGA_INT32_MAX || n < MGA_INT32_MIN) {
    throw new MgaIntegrityError('out_of_int32', `Hors plage Int32 Prisma${opts.field ? ` (${opts.field})` : ''}`, n);
  }
  return n;
}

/** Assert entier MGA déjà normalisé (comparaison exacte, pas d’epsilon). */
export function assertMgaInt(value: number, field?: string): asserts value is number {
  if (!Number.isInteger(value) || !Number.isFinite(value)) {
    throw new MgaIntegrityError('not_int', `Attendu Int MGA${field ? ` (${field})` : ''}`, value);
  }
  if (value > MGA_INT32_MAX || value < MGA_INT32_MIN) {
    throw new MgaIntegrityError('out_of_int32', `Hors plage Int32${field ? ` (${field})` : ''}`, value);
  }
}

export function eqMga(a: number | string | null | undefined, b: number | string | null | undefined): boolean {
  return roundMga(a) === roundMga(b);
}

export function addMga(...parts: Array<number | string | null | undefined>): number {
  return roundMga(parts.reduce<number>((s, p) => s + roundMga(p), 0));
}

export function subMga(a: number | string | null | undefined, b: number | string | null | undefined): number {
  return roundMga(roundMga(a) - roundMga(b));
}

/** Remise pourcentage 0–100 sur base MGA. */
export function applyRemiseMga(base: number, remisePercent: number): number {
  const b = roundMga(base);
  const p = Number(remisePercent);
  if (!Number.isFinite(p) || p <= 0) return b;
  if (p >= 100) return 0;
  return roundMga(b * (1 - p / 100));
}

/** Remise fixe en ariary (plafonnée à la base). */
export function applyRemiseFixedMga(base: number, remiseAr: number): number {
  const b = roundMga(base);
  const r = roundMga(remiseAr);
  if (r <= 0) return b;
  return Math.max(0, subMga(b, r));
}

/** TVA : taux en % (ex. 20). Retourne { ht, tva, ttc }. */
export function splitTvaMga(ttcOrHt: number, tvaPercent: number, mode: 'from-ttc' | 'from-ht' = 'from-ht') {
  const rate = Number(tvaPercent);
  const r = Number.isFinite(rate) && rate > 0 ? rate : 0;
  if (mode === 'from-ttc') {
    const ttc = roundMga(ttcOrHt);
    if (r <= 0) return { ht: ttc, tva: 0, ttc };
    const ht = roundMga(ttc / (1 + r / 100));
    const tva = subMga(ttc, ht);
    return { ht, tva, ttc };
  }
  const ht = roundMga(ttcOrHt);
  const tva = roundMga(ht * (r / 100));
  return { ht, tva, ttc: addMga(ht, tva) };
}

/** Acompte / paiements cumulés → solde restant (jamais négatif). */
export function soldeMga(total: number, paidOrAcompte: number): number {
  return Math.max(0, subMga(total, paidOrAcompte));
}

/** Trop-perçu si encaissements > total. */
export function tropPercuMga(total: number, paid: number): number {
  return Math.max(0, subMga(paid, total));
}

/** Remboursement plafonné au déjà encaissé. */
export function remboursementMga(paid: number, refundRequest: number): number {
  const p = roundMga(paid);
  const r = roundMga(refundRequest);
  if (r <= 0) return 0;
  return Math.min(p, r);
}

/** Marge monétaire = vente − coût (peut être négative). */
export function margeMga(vente: number, cout: number): number {
  return subMga(vente, cout);
}

/** Marge % (ratio décimal métier côté affichage — pas un montant). */
export function margePercent(vente: number, cout: number): number | null {
  const v = roundMga(vente);
  if (v <= 0) return null;
  return ((v - roundMga(cout)) / v) * 100;
}

export function formatMga(amount: number | string | null | undefined): string {
  const n = roundMga(amount);
  return `${n.toLocaleString('fr-FR')} Ar`;
}

/** Parse saisie utilisateur (espaces, « Ar », virgule) → ariary entier. */
export function parseMgaInput(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return roundMga(raw);
  if (!raw) return 0;
  const cleaned = String(raw)
    .replace(/[^\d,.\-]/g, '')
    .replace(/\s/g, '')
    .replace(',', '.');
  return roundMga(cleaned);
}

/**
 * Sérialisation JSON sûre pour montants Int (et BigInt si un jour retenu).
 * Ne jamais renvoyer un Number non entier pour un montant API.
 */
export function serializeMgaForJson(amount: number | bigint): number {
  if (typeof amount === 'bigint') {
    if (amount > BigInt(Number.MAX_SAFE_INTEGER) || amount < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new MgaIntegrityError('bigint_unsafe_json', 'BigInt hors Number.MAX_SAFE_INTEGER — sérialiser en string', amount);
    }
    return Number(amount);
  }
  assertMgaInt(roundMga(amount));
  return roundMga(amount);
}
