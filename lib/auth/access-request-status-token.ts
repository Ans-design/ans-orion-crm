import crypto from 'crypto';
import { getNextAuthSecret } from '@/lib/auth-secret';

const TTL_MS = 90 * 24 * 60 * 60 * 1000;

function sign(payload: string): string {
  return crypto.createHmac('sha256', getNextAuthSecret()).update(payload).digest('base64url');
}

export function createAccessRequestStatusToken(requestId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${requestId}.${exp}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`, 'utf8').toString('base64url');
}

export function verifyAccessRequestStatusToken(token: string): { requestId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 3) return null;
    const [requestId, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!requestId || !Number.isFinite(exp) || exp < Date.now()) return null;
    const payload = `${requestId}.${expStr}`;
    const expected = sign(payload);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    return { requestId };
  } catch {
    return null;
  }
}
