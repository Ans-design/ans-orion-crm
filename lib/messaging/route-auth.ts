import type { Session } from 'next-auth';
import { NextResponse } from 'next/server';
import { requireAuth, type RequireAuthOptions } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { isReadOnlyRole } from '@/lib/auth/permissions';

export type MessagingAuth = {
  session: Session;
  userId: string;
  role: string;
  userName: string;
};

export type MessagingAuthResult =
  | { error: NextResponse }
  | MessagingAuth;

export async function requireMessagingAuth(options?: RequireAuthOptions): Promise<MessagingAuthResult> {
  const result = await requireAuth(options);
  if ('error' in result) {
    return { error: result.error! };
  }
  const userId = result.userId;
  if (!userId) {
    return { error: apiError('Utilisateur introuvable', 401) };
  }
  return {
    session: result.session,
    userId,
    role: result.role,
    userName: result.userName,
  };
}

/** Bloque le rôle lecture seule sur les mutations Talk. */
export async function requireMessagingWrite(options?: RequireAuthOptions): Promise<MessagingAuthResult> {
  const auth = await requireMessagingAuth(options);
  if ('error' in auth) return auth;
  if (isReadOnlyRole(auth.role)) {
    return { error: apiError('Accès lecture seule — modification interdite', 403) };
  }
  return auth;
}
