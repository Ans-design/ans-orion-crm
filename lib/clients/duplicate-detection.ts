import { prisma } from '@/lib/prisma';
import { isPostgresDatabase } from '@/lib/database-url';

export type ClientDuplicateMatch = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  tel: string | null;
  ville: string | null;
  score: number;
  reasons: string[];
};

function normalizePhone(v?: string | null): string {
  return (v ?? '').replace(/\D/g, '').slice(-9);
}

function normalizeName(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Détection anti-doublon à la création client (§7 ultra prompt). */
export async function findPotentialClientDuplicates(input: {
  name: string;
  email?: string | null;
  tel?: string | null;
  whatsapp?: string | null;
}): Promise<ClientDuplicateMatch[]> {
  const nameNorm = normalizeName(input.name);
  const emailNorm = input.email?.trim().toLowerCase() || null;
  const phones = [input.tel, input.whatsapp].map(normalizePhone).filter((p) => p.length >= 8);

  const emailFilter = emailNorm
    ? isPostgresDatabase()
      ? { email: { equals: emailNorm, mode: 'insensitive' as const } }
      : { email: emailNorm }
    : null;
  const nameFilter = isPostgresDatabase()
    ? { name: { contains: input.name.trim().slice(0, 12), mode: 'insensitive' as const } }
    : { name: { contains: input.name.trim().slice(0, 12) } };

  const candidates = await prisma.client.findMany({
    where: {
      archived: false,
      OR: [
        ...(emailFilter ? [emailFilter] : []),
        ...(phones.length ? phones.flatMap((p) => [{ tel: { contains: p.slice(-8) } }, { whatsapp: { contains: p.slice(-8) } }]) : []),
        nameFilter,
      ],
    },
    select: { id: true, code: true, name: true, email: true, tel: true, ville: true, whatsapp: true },
    take: 15,
  });

  const matches: ClientDuplicateMatch[] = [];

  for (const c of candidates) {
    const reasons: string[] = [];
    let score = 0;

    if (emailNorm && c.email?.toLowerCase() === emailNorm) {
      reasons.push('Email identique');
      score += 100;
    }

    const cPhones = [c.tel, c.whatsapp].map(normalizePhone);
    for (const p of phones) {
      if (cPhones.some((cp) => cp && (cp === p || cp.endsWith(p) || p.endsWith(cp)))) {
        reasons.push('Téléphone similaire');
        score += 80;
        break;
      }
    }

    if (normalizeName(c.name) === nameNorm) {
      reasons.push('Nom identique');
      score += 70;
    } else if (normalizeName(c.name).includes(nameNorm) || nameNorm.includes(normalizeName(c.name))) {
      reasons.push('Nom proche');
      score += 40;
    }

    if (score >= 40) {
      matches.push({ id: c.id, code: c.code, name: c.name, email: c.email, tel: c.tel, ville: c.ville, score, reasons });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
