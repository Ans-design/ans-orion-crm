/**
 * En-têtes HTTP de durcissement — appliqués via middleware (SEC-11).
 *
 * CSP : enforce en production HTTPS sans unsafe-eval ; Report-Only en dev/local.
 */
import { isProductionDeploy } from '@/lib/auth-environment';

const CSP_BASE = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

/** Dev / hydration Next : encore besoin unsafe-inline + unsafe-eval */
export const CSP_REPORT_ONLY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

/** Prod : pas de unsafe-eval ; unsafe-inline scripts encore requis App Router */
export const CSP_ENFORCE_POLICY = [
  CSP_BASE,
  "script-src 'self' 'unsafe-inline'",
].join('; ');

function buildSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-DNS-Prefetch-Control': 'on',
  };

  if (isProductionDeploy()) {
    headers['Content-Security-Policy'] = CSP_ENFORCE_POLICY;
    // HSTS uniquement si on est clairement en HTTPS prod
    if (
      process.env.VERCEL === '1' ||
      process.env.HOSTINGER === 'true' ||
      Boolean(process.env.NEXTAUTH_URL?.startsWith('https://'))
    ) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }
  } else {
    headers['Content-Security-Policy-Report-Only'] = CSP_REPORT_ONLY_POLICY;
  }

  return headers;
}

export const SECURITY_HEADERS: Record<string, string> = buildSecurityHeaders();

export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
