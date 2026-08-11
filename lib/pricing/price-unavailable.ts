/**
 * Erreur métier prix — jamais de fallback silencieux (PRIX-002 V10).
 */
export class PriceUnavailableError extends Error {
  readonly code = 'PRICE_UNAVAILABLE' as const;
  constructor(
    message = 'Tarif non publié ou base indisponible',
    public readonly articleId?: string,
    public readonly adminHref?: string,
  ) {
    super(message);
    this.name = 'PriceUnavailableError';
  }
}

export function isPriceUnavailable(err: unknown): err is PriceUnavailableError {
  return err instanceof PriceUnavailableError || (err as { code?: string })?.code === 'PRICE_UNAVAILABLE';
}
