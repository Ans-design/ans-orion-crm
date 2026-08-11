import type { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { runApiHandler } from '@/lib/api-guard';
import {
  requireAdmin,
  requireAdminOrManager,
  requireAnyPermission,
  requireAuth,
  requirePermission,
  type Permission,
  type RequireAuthOptions,
} from '@/lib/auth-utils';
import { requireMessagingAuth, requireMessagingWrite } from '@/lib/messaging/route-auth';
import { forbidden, unauthorized } from '@/lib/server/http/api-response';
import { logger } from '@/lib/server/logger/logger';

export type AuthApiContext = {
  session: Session;
  userId: string;
  role: string;
  userName: string;
};

export type WithAuthApiOptions = {
  permission?: Permission;
  /** Au moins une permission requise (workspaces multi-rôles). */
  anyPermissions?: Permission[];
  /** Ne pas bloquer sur gate retard RH (route late-arrival). */
  skipRhAttendance?: boolean;
  admin?: boolean;
  adminOrManager?: boolean;
  messaging?: boolean;
  messagingWrite?: boolean;
  fallbackResponse?: unknown;
  fallback?: Record<string, unknown>;
  status?: number;
  requestId?: string;
};

type AuthHandler = (ctx: AuthApiContext) => Promise<Response>;
type AuthHandlerWithReq = (ctx: AuthApiContext, req: NextRequest) => Promise<Response>;

async function legacyAuthError(res: NextResponse): Promise<Response> {
  const status = res.status;
  let message = status === 403 ? 'Permission insuffisante' : 'Non autorisé';
  try {
    const body = await res.clone().json();
    if (typeof body?.error === 'string') message = body.error;
    else if (typeof body?.error?.message === 'string') message = body.error.message;
  } catch { /* ignore */ }
  logger.authError(message, { status });
  return status === 403 ? forbidden(message) : unauthorized(message);
}

async function resolveAuthContext(
  options: WithAuthApiOptions,
  req?: NextRequest,
): Promise<{ ctx: AuthApiContext } | { response: Response }> {
  const authOptions: RequireAuthOptions = {
    skipRhAttendance: options.skipRhAttendance,
    requestPath: req ? new URL(req.url).pathname : undefined,
  };
  if (options.messagingWrite) {
    const auth = await requireMessagingWrite(authOptions);
    if ('error' in auth) return { response: await legacyAuthError(auth.error!) };
    return {
      ctx: {
        session: auth.session,
        userId: auth.userId,
        role: auth.role,
        userName: auth.userName,
      },
    };
  }

  if (options.messaging) {
    const auth = await requireMessagingAuth(authOptions);
    if ('error' in auth) return { response: await legacyAuthError(auth.error!) };
    return {
      ctx: {
        session: auth.session,
        userId: auth.userId,
        role: auth.role,
        userName: auth.userName,
      },
    };
  }

  if (options.admin) {
    const auth = await requireAdmin(authOptions);
    if ('error' in auth) return { response: await legacyAuthError(auth.error!) };
    if (!auth.userId) return { response: unauthorized('Utilisateur introuvable') };
    return {
      ctx: {
        session: auth.session,
        userId: auth.userId,
        role: auth.role,
        userName: auth.userName,
      },
    };
  }

  if (options.adminOrManager) {
    const auth = await requireAdminOrManager(authOptions);
    if ('error' in auth) return { response: await legacyAuthError(auth.error!) };
    if (!auth.userId) return { response: unauthorized('Utilisateur introuvable') };
    return {
      ctx: {
        session: auth.session,
        userId: auth.userId,
        role: auth.role,
        userName: auth.userName,
      },
    };
  }

  if (options.anyPermissions?.length) {
    const auth = await requireAnyPermission(...options.anyPermissions, authOptions);
    if ('error' in auth) return { response: await legacyAuthError(auth.error!) };
    if (!auth.userId) return { response: unauthorized('Utilisateur introuvable') };
    return {
      ctx: {
        session: auth.session,
        userId: auth.userId,
        role: auth.role,
        userName: auth.userName,
      },
    };
  }

  if (options.permission) {
    const auth = await requirePermission(options.permission, authOptions);
    if ('error' in auth) return { response: await legacyAuthError(auth.error!) };
    if (!auth.userId) return { response: unauthorized('Utilisateur introuvable') };
    return {
      ctx: {
        session: auth.session,
        userId: auth.userId,
        role: auth.role,
        userName: auth.userName,
      },
    };
  }

  const auth = await requireAuth(authOptions);
  if ('error' in auth) return { response: await legacyAuthError(auth.error!) };
  if (!auth.userId) return { response: unauthorized('Session invalide — reconnectez-vous') };
  return {
    ctx: {
      session: auth.session,
      userId: auth.userId,
      role: auth.role,
      userName: auth.userName,
    },
  };
}

function readRequestId(req?: NextRequest, options?: WithAuthApiOptions): string | undefined {
  return (
    options?.requestId
    ?? req?.headers.get('x-request-id')
    ?? req?.headers.get('x-vercel-id')
    ?? undefined
  );
}

/**
 * Enveloppe un route handler avec auth centralisée + try/catch uniforme.
 */
export function withAuthApi(
  label: string,
  handler: AuthHandler | AuthHandlerWithReq,
  options: WithAuthApiOptions = {},
) {
  return async (req: NextRequest) => {
    const requestId = readRequestId(req, options);
    const authResult = await resolveAuthContext(options, req);
    if ('response' in authResult) return authResult.response;

    return runApiHandler(
      label,
      async () => {
        if (handler.length >= 2 && req) {
          return (handler as AuthHandlerWithReq)(authResult.ctx, req);
        }
        return (handler as AuthHandler)(authResult.ctx);
      },
      {
        fallbackResponse: options.fallbackResponse,
        fallback: options.fallback,
        status: options.status,
        requestId,
      },
    );
  };
}
