import { NextResponse } from 'next/server';
import { safeErrorMessage } from '@/lib/api-response';

type RouteContext = { params?: Record<string, string> };

/**
 * Enveloppe handler API — try/catch + log + réponse JSON stable.
 */
export function withApiHandler<T extends RouteContext = RouteContext>(
  label: string,
  handler: (req: Request, ctx: T) => Promise<Response>,
  options?: { fallback?: Record<string, unknown>; status?: number },
) {
  return async (req: Request, ctx: T): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      console.error(`[${label}]`, error);
      const body = {
        ok: false,
        error: safeErrorMessage(error),
        ...(options?.fallback ?? {}),
      };
      return NextResponse.json(body, { status: options?.status ?? 503 });
    }
  };
}
