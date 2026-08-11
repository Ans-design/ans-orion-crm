export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { requireMessagingAuth } from '@/lib/messaging/route-auth';
import { getUnreadMessageCount } from '@/lib/server/modules/messaging/unread.service';

/** Polling de secours borné (V14 P0-20) — événementiel léger + Last-Event-ID. */
const STREAM_TICK_MS = 15_000;
const MAX_STREAM_MS = 5 * 60_000;

export async function GET(req: Request) {
  const auth = await requireMessagingAuth();
  if ('error' in auth) return auth.error;

  const userId = auth.userId;
  const encoder = new TextEncoder();
  const lastEventIdHeader = req.headers.get('Last-Event-ID');
  let eventSeq = Number(lastEventIdHeader) || 0;

  const stream = new ReadableStream({
    start(controller) {
      let lastUnread = -1;
      let closed = false;
      const startedAt = Date.now();

      const push = (payload: Record<string, unknown>) => {
        if (closed) return;
        eventSeq += 1;
        controller.enqueue(
          encoder.encode(`id: ${eventSeq}\nevent: ${String(payload.type)}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
      };

      const tick = async () => {
        if (closed) return;
        if (Date.now() - startedAt > MAX_STREAM_MS) {
          push({ type: 'reconnect', ts: Date.now(), reason: 'stream_ttl' });
          closed = true;
          clearInterval(interval);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
          return;
        }
        try {
          const count = await getUnreadMessageCount(userId);
          if (count !== lastUnread) {
            lastUnread = count;
            push({ type: 'unread', count, ts: Date.now(), seq: eventSeq });
          } else {
            push({ type: 'heartbeat', ts: Date.now(), seq: eventSeq });
          }
        } catch {
          push({ type: 'error', ts: Date.now() });
        }
      };

      void tick();
      const interval = setInterval(() => void tick(), STREAM_TICK_MS);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* déjà fermé */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
