export type FetchWithTimeoutInit = RequestInit & {
  timeout?: number;
};

/** fetch client avec AbortController — ne bloque pas l'UI indéfiniment. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {},
): Promise<Response> {
  const { timeout = 15_000, signal: externalSignal, ...rest } = init;
  const controller = new AbortController();

  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { ...rest, signal: controller.signal });
    if (typeof window !== 'undefined') {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const { handleApiUnauthorized } = await import('@/lib/session-api-fetch');
      handleApiUnauthorized(res.status, url);
    }
    return res;
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Délai dépassé (${Math.round(timeout / 1000)}s)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}
