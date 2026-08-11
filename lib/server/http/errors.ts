/** Erreurs API typées — codes stables pour le client et les logs. */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(
    message: string,
    options: { status?: number; code?: ApiErrorCode; details?: unknown } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 500;
    this.code = options.code ?? 'SERVER_ERROR';
    this.details = options.details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(message, { status: 400, code: 'BAD_REQUEST', details });
  }

  static unauthorized(message = 'Non autorisé') {
    return new ApiError(message, { status: 401, code: 'UNAUTHORIZED' });
  }

  static forbidden(message = 'Permission insuffisante') {
    return new ApiError(message, { status: 403, code: 'FORBIDDEN' });
  }

  static notFound(message = 'Ressource introuvable') {
    return new ApiError(message, { status: 404, code: 'NOT_FOUND' });
  }

  static validation(message: string, details?: unknown) {
    return new ApiError(message, { status: 400, code: 'VALIDATION_ERROR', details });
  }

  static conflict(message: string, details?: unknown) {
    return new ApiError(message, { status: 409, code: 'CONFLICT', details });
  }
}
