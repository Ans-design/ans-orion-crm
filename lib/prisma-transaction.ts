/** Options transaction Prisma — Vercel serverless + SQLite démo peuvent dépasser 5 s par défaut. */
export const PRISMA_TX_OPTIONS = {
  timeout: 30_000,
  maxWait: 10_000,
} as const;
