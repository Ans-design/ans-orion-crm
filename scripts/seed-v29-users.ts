import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getOrionV29Accounts } from '@/lib/orion-v29-accounts';

/** Comptes User DB pour matricules HTML v29 — exige ORION_V29_PASSWORDS_JSON. */
export async function seedV29Users(prisma: PrismaClient) {
  const accounts = getOrionV29Accounts();
  if (accounts.length === 0) {
    console.warn('seedV29Users: ORION_V29_PASSWORDS_JSON absent — aucun compte v29 créé');
    return;
  }
  let created = 0;
  for (const acc of accounts) {
    const hashed = await bcrypt.hash(acc.password, 12);
    const user = await prisma.user.upsert({
      where: { email: acc.email.toLowerCase() },
      update: { name: acc.name, role: acc.role, password: hashed },
      create: {
        email: acc.email.toLowerCase(),
        name: acc.name,
        role: acc.role,
        password: hashed,
      },
    });
    // userId unique : détacher tous les liens, puis rattacher la fiche matricule
    await prisma.$executeRawUnsafe(
      `UPDATE "Employee" SET "userId" = NULL WHERE "userId" = ?`,
      user.id,
    );
    const emp = await prisma.employee.findUnique({ where: { matricule: acc.matricule } });
    if (emp) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { userId: user.id, email: acc.email.toLowerCase() },
      });
    }
    created += 1;
  }
  console.log(`${created} utilisateurs v29 HTML upsertés (matricules + emails)`);
}
