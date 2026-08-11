/** Rate limit distribué optionnel via Upstash Redis REST (UPSTASH_REDIS_REST_URL + TOKEN). */

type RateResult = { ok: boolean; retryAfterSec?: number };

function upstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashPipeline(commands: (string | number)[][]): Promise<unknown[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(commands),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown }[];
    return data.map((d) => d.result);
  } catch {
    return null;
  }
}

export async function checkRateLimitUpstash(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateResult | null> {
  if (!upstashConfigured()) return null;
  const ttlSec = Math.max(1, Math.ceil(windowMs / 1000));
  const results = await upstashPipeline([
    ['INCR', key],
    ['EXPIRE', key, ttlSec, 'NX'],
  ]);
  if (!results || results.length < 1) return null;
  const count = Number(results[0]);
  if (!Number.isFinite(count)) return null;
  if (count > limit) {
    return { ok: false, retryAfterSec: ttlSec };
  }
  return { ok: true };
}
