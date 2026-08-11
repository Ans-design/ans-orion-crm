import crypto from 'crypto';

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min (ultra prompt §3)

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function buildResetUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/reset-password?token=${token}`;
}
