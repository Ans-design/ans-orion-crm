import { describe, expect, it } from 'vitest';
import {
  applySecurityHeaders,
  CSP_ENFORCE_POLICY,
  CSP_REPORT_ONLY_POLICY,
  SECURITY_HEADERS,
} from '@/lib/security-headers';
import { isProductionDeploy } from '@/lib/auth-environment';

describe('security-headers (SEC-11)', () => {
  it('hors prod : Report-Only avec unsafe-eval', () => {
    if (isProductionDeploy()) return;
    expect(SECURITY_HEADERS).toHaveProperty('Content-Security-Policy-Report-Only');
    expect(SECURITY_HEADERS).not.toHaveProperty('Content-Security-Policy');
    expect(SECURITY_HEADERS['Content-Security-Policy-Report-Only']).toBe(CSP_REPORT_ONLY_POLICY);
    expect(CSP_REPORT_ONLY_POLICY).toContain("'unsafe-eval'");
  });

  it('policy enforce prod sans unsafe-eval', () => {
    expect(CSP_ENFORCE_POLICY).toContain("script-src 'self' 'unsafe-inline'");
    expect(CSP_ENFORCE_POLICY).not.toContain('unsafe-eval');
  });

  it('applySecurityHeaders pose nosniff', () => {
    const res = applySecurityHeaders(new Response('ok', { status: 200 }));
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});
