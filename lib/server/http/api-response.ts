import { NextResponse } from 'next/server';
import { safeErrorMessage } from '@/lib/api-response';
import { ApiError } from '@/lib/server/http/errors';

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiFailure = {
  ok: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
};

export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  const body: ApiSuccess<T> = meta ? { ok: true, data, meta } : { ok: true, data };
  return NextResponse.json(body, { status });
}

export function created<T>(data: T, meta?: Record<string, unknown>) {
  return ok(data, meta, 201);
}

export function badRequest(message: string, details?: unknown) {
  return fail(message, 'BAD_REQUEST', 400, details);
}

export function unauthorized(message = 'Non autorisé') {
  return fail(message, 'UNAUTHORIZED', 401);
}

export function forbidden(message = 'Permission insuffisante') {
  return fail(message, 'FORBIDDEN', 403);
}

export function notFound(message = 'Ressource introuvable') {
  return fail(message, 'NOT_FOUND', 404);
}

export function serverError(message = 'Erreur serveur', code = 'SERVER_ERROR', status = 500) {
  return fail(message, code, status);
}

function fail(message: string, code: string, status: number, details?: unknown) {
  const body: ApiFailure = {
    ok: false,
    error: { message, code, ...(details !== undefined ? { details } : {}) },
  };
  return NextResponse.json(body, { status });
}

/** Convertit ApiError ou erreur inconnue en NextResponse JSON standard. */
export function fromError(error: unknown, fallback = 'Erreur serveur') {
  if (error instanceof ApiError) {
    return fail(error.message, error.code, error.status, error.details);
  }
  return serverError(safeErrorMessage(error, fallback));
}
