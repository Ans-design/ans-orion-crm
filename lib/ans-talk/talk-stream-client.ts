/** Client SSE ANS Talk — badge non lus + reconnexion automatique. */

export type TalkStreamPayload =
  | { type: 'unread'; count: number; ts: number }
  | { type: 'heartbeat'; ts: number }
  | { type: 'error'; ts: number };

export type TalkStreamHandlers = {
  onUnread: (count: number) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
};

const RECONNECT_MS = [2_000, 5_000, 10_000, 20_000, 30_000];

/** Ouvre EventSource `/api/messaging/stream`. Retourne une fonction de cleanup. */
export function connectTalkStream(handlers: TalkStreamHandlers): () => void {
  if (typeof EventSource === 'undefined') {
    handlers.onDisconnected?.();
    return () => {};
  }

  let es: EventSource | null = null;
  let closed = false;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  const connect = () => {
    if (closed) return;
    try {
      es = new EventSource('/api/messaging/stream', { withCredentials: true });
    } catch {
      handlers.onDisconnected?.();
      scheduleReconnect();
      return;
    }

    es.onopen = () => {
      attempt = 0;
      handlers.onConnected?.();
    };

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as TalkStreamPayload;
        if (data.type === 'unread') handlers.onUnread(data.count);
      } catch {
        /* ignore malformed */
      }
    };

    es.onerror = () => {
      handlers.onDisconnected?.();
      es?.close();
      es = null;
      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (closed) return;
    const delay = RECONNECT_MS[Math.min(attempt, RECONNECT_MS.length - 1)]!;
    attempt += 1;
    reconnectTimer = setTimeout(connect, delay);
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    es?.close();
    es = null;
  };
}
