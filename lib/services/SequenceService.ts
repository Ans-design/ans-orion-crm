import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const PREFIXES = {
  DEV: 'DEV',
  CMD: 'CMD',
  FAC: 'FAC',
  PAY: 'PAY',
  LIV: 'LIV',
  CLI: 'CLI',
  BAT: 'BAT',
  ACH: 'ACH',
  FOU: 'FOU',
} as const;

export type SequenceKey = keyof typeof PREFIXES;

export type PrismaTx = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

async function bumpSequence(tx: PrismaTx, seqKey: string) {
  // DATA-005 : upsert atomique (évite course create/create sur première séquence)
  return tx.sequenceCounter.upsert({
    where: { key: seqKey },
    create: { key: seqKey, value: 1 },
    update: { value: { increment: 1 } },
  });
}

function formatSequence(key: SequenceKey, value: number): string {
  const year = new Date().getFullYear();
  return `${PREFIXES[key]}-${year}-${String(value).padStart(6, '0')}`;
}

/** Numérotation atomique DEV-2026-000001, CMD-2026-000001, etc. */
export async function nextSequence(key: SequenceKey, tx?: PrismaTx): Promise<string> {
  const year = new Date().getFullYear();
  const seqKey = `${PREFIXES[key]}-${year}`;

  if (tx) {
    const row = await bumpSequence(tx, seqKey);
    return formatSequence(key, row.value);
  }

  const row = await prisma.$transaction(async (innerTx) => bumpSequence(innerTx, seqKey));
  return formatSequence(key, row.value);
}

/** Fallback si table SequenceCounter absente (migration en cours) — interdit en prod. */
export async function nextSequenceSafe(
  key: SequenceKey,
  fallbackCount: () => Promise<number>,
  tx?: PrismaTx,
): Promise<string> {
  try {
    return await nextSequence(key, tx);
  } catch (err) {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.USE_PRODUCTION_DB === 'true' ||
      process.env.HOSTINGER === 'true'
    ) {
      throw err;
    }
    const year = new Date().getFullYear();
    const n = await fallbackCount();
    return `${PREFIXES[key]}-${year}-${String(n + 1).padStart(6, '0')}`;
  }
}
