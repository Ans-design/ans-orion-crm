import crypto from 'crypto';
import { getNextAuthSecret } from '@/lib/auth-secret';

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', getNextAuthSecret()).update(payload).digest('base64url');
}

/** Token signé pour validation BAT client (lien magique, 30 jours). */
export function createBatClientAccessToken(proofId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${proofId}.${exp}`;
  const sig = signPayload(payload);
  return Buffer.from(`${payload}.${sig}`, 'utf8').toString('base64url');
}

export function verifyBatClientAccessToken(token: string): { proofId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 3) return null;
    const [proofId, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!proofId || !Number.isFinite(exp) || exp < Date.now()) return null;
    const payload = `${proofId}.${expStr}`;
    const expected = signPayload(payload);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    return { proofId };
  } catch {
    return null;
  }
}

export function batClientValidationPath(token: string): string {
  return `/bat/valider/${token}`;
}
