import { prisma } from '@/lib/prisma';
import { nextSequenceSafe } from '@/lib/services/SequenceService';

/** Code client atomique — préfixe initiales + suffixe séquence CLI (évite collision count+1). */
export async function generateClientCode(name: string): Promise<string> {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2) || 'CL';
  const seq = await nextSequenceSafe('CLI', () => prisma.client.count());
  const suffix = seq.split('-').pop() ?? String(Date.now()).slice(-6);
  return `${initials}-${suffix}`;
}
