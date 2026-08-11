import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { resolveAuthUserFromDb, type AuthProfile } from '@/lib/resolve-auth-user';
import { withTimeout } from '@/lib/with-timeout';

const DB_ENSURE_MS = 4_000;

export type EnsureUserOptions = {
  /**
   * AUTH-002 : sur requêtes protégées, ne jamais créer/upsert depuis JWT.
   * true = lecture seule (fail si absent).
   */
  readOnly?: boolean;
};

/**
 * Résout un utilisateur DB pour une session.
 * Par défaut (readOnly) : pas d’upsert — provision réservée au login/admin.
 */
export async function ensureUserInDb(
  profile: AuthProfile,
  options: EnsureUserOptions = { readOnly: true },
): Promise<AuthProfile | null> {
  try {
    return await withTimeout(ensureUserInDbInner(profile, options), DB_ENSURE_MS, 'ensureUserInDb');
  } catch (err) {
    console.error('[ensureUserInDb] timeout ou erreur:', err);
    return null;
  }
}

async function ensureUserInDbInner(
  profile: AuthProfile,
  options: EnsureUserOptions,
): Promise<AuthProfile | null> {
  const existing = await resolveAuthUserFromDb(profile);
  if (existing?.id) {
    // Utilisateur inactif / soft-delete géré dans resolveAuthUserFromDb si présent
    return existing;
  }

  if (options.readOnly !== false) {
    return null;
  }

  const email = profile.email?.trim().toLowerCase();
  if (!email) return null;

  try {
    const placeholder = await bcrypt.hash(`orion-provision-${email}`, 12);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: profile.name ?? undefined,
      },
      create: {
        email,
        name: profile.name ?? email.split('@')[0],
        role: profile.role || 'commercial',
        password: placeholder,
      },
      select: { id: true, email: true, name: true, role: true },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch (err) {
    console.error('[ensureUserInDb]', email, err);
    return null;
  }
}

/** Provision explicite (flux login / admin uniquement). */
export async function provisionUserFromTrustedLogin(profile: AuthProfile): Promise<AuthProfile | null> {
  return ensureUserInDb(profile, { readOnly: false });
}
