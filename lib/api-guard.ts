import { NextResponse } from 'next/server';
import { safeErrorMessage } from '@/lib/api-response';
import { fromError } from '@/lib/server/http/api-response';
import { logger } from '@/lib/server/logger/logger';
import { ApiError } from '@/lib/server/http/errors';

type ApiGuardOptions = {
  /** Corps JSON complet en cas d'erreur (ex. tableau vide) */
  fallbackResponse?: unknown;
  /** Champs additionnels fusionnés dans { ok, error } */
  fallback?: Record<string, unknown>;
  status?: number;
  requestId?: string;
};

function standardErrorBody(message: string, code = 'SERVER_ERROR', details?: unknown) {
  return {
    ok: false as const,
    error: {
      message,
      code,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

/**
 * Exécute un handler API avec try/catch uniforme.
 * Utiliser après les gardes auth (retours 401/403 hors try).
 */
export async function runApiHandler(
  label: string,
  handler: () => Promise<Response>,
  options?: ApiGuardOptions,
): Promise<Response> {
  const logCtx = options?.requestId ? { route: label, requestId: options.requestId } : { route: label };
  try {
    return await handler();
  } catch (error) {
    logger.apiError(label, error, logCtx);
    if (error instanceof ApiError) {
      return fromError(error);
    }
    if (options?.fallbackResponse !== undefined) {
      return NextResponse.json(options.fallbackResponse, { status: options?.status ?? 503 });
    }
    return NextResponse.json(
      {
        ...standardErrorBody(safeErrorMessage(error)),
        ...(options?.fallback ?? {}),
      },
      { status: options?.status ?? 503 },
    );
  }
}
