import { ensureAuthRuntimeEnv } from '@/lib/auth-runtime-url';
import { isProductionDeploy } from '@/lib/auth-environment';

/** Cookies session NextAuth — nom aligné entre authOptions et middleware getToken. */
export function isSecureAuthCookie(): boolean {
  ensureAuthRuntimeEnv();
  // E2E ne peut pas forcer secure:false sur un déploiement production réel.
  if (process.env.E2E_MODE === 'true' && !isProductionDeploy()) {
    return false;
  }
  const url = process.env.NEXTAUTH_URL ?? '';
  return url.startsWith('https://') || process.env.NODE_ENV === 'production';
}

export function getAuthSessionCookieName(): string {
  return isSecureAuthCookie()
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
}

export function getAuthSessionCookieOptions() {
  const secure = isSecureAuthCookie();
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure,
  };
}
