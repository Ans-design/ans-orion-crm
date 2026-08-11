/** Intervalles polling ANS Talk — évite surcharge serveur. */
export const ANS_TALK_POLL_MS = {
  /** Bulle fermée : badge non lus uniquement */
  unreadOnly: 90_000,
  /** Bulle ouverte / page messagerie */
  active: 12_000,
  /** Backoff initial après erreur */
  backoffMin: 30_000,
  /** Plafond backoff */
  backoffMax: 300_000,
} as const;

export function nextTalkPollDelayMs(currentMs: number, failed: boolean, active: boolean): number {
  const base = active ? ANS_TALK_POLL_MS.active : ANS_TALK_POLL_MS.unreadOnly;
  if (!failed) return base;
  const seed = Math.max(currentMs, ANS_TALK_POLL_MS.backoffMin);
  return Math.min(seed * 2, ANS_TALK_POLL_MS.backoffMax);
}
