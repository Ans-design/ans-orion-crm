import { prisma } from '@/lib/prisma';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeTel(tel: string): string {
  return tel.replace(/\D/g, '');
}

/** Détecte un fournisseur existant par email ou téléphone (évite doublons). */
export async function findDuplicateSupplier(params: {
  email?: string | null;
  tel?: string | null;
  excludeId?: string;
}) {
  const or: { email?: string; tel?: { contains: string } }[] = [];

  if (params.email?.trim()) {
    or.push({ email: normalizeEmail(params.email) });
  }
  if (params.tel?.trim()) {
    const digits = normalizeTel(params.tel);
    if (digits.length >= 8) {
      or.push({ tel: { contains: digits.slice(-8) } });
    }
  }

  if (!or.length) return null;

  return prisma.supplier.findFirst({
    where: {
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      OR: or,
    },
  });
}

export async function assertSupplierUnique(params: {
  email?: string | null;
  tel?: string | null;
  excludeId?: string;
}) {
  const dup = await findDuplicateSupplier(params);
  if (dup) {
    throw new Error(`Fournisseur déjà existant : ${dup.name} (${dup.code})`);
  }
}
