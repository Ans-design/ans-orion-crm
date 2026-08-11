type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = {
  module?: string;
  route?: string;
  userId?: string;
  code?: string;
  requestId?: string;
  [key: string]: unknown;
};

function emit(level: LogLevel, message: string, context?: LogContext) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development' || process.env.LOCAL_DEV === 'true') {
      emit('debug', message, context);
    }
  },
  info(message: string, context?: LogContext) {
    emit('info', message, context);
  },
  warn(message: string, context?: LogContext) {
    emit('warn', message, context);
  },
  error(message: string, context?: LogContext) {
    emit('error', message, context);
  },
  apiError(label: string, error: unknown, context?: LogContext) {
    const err = error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) };
    emit('error', label, { ...context, route: label, error: err });
    if (typeof window === 'undefined') {
      void import('@/lib/monitoring/sentry-server').then(({ captureServerException }) => {
        captureServerException(error instanceof Error ? error : new Error(String(error)), {
          ...context,
          route: label,
        });
      }).catch(() => {});
    }
  },
  prismaError(label: string, error: unknown, context?: LogContext) {
    logger.apiError(`prisma:${label}`, error, { ...context, code: 'PRISMA_ERROR' });
  },
  authError(label: string, context?: LogContext) {
    emit('warn', label, { ...context, code: 'AUTH_ERROR' });
  },
  validationError(label: string, details: unknown, context?: LogContext) {
    emit('warn', label, { ...context, code: 'VALIDATION_ERROR', details });
  },
};
