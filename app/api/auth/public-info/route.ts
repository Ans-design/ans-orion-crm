export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getBrandingConfig, toPublicBranding } from '@/lib/branding-config';
import { isSecureAuthCookie } from '@/lib/auth-cookies';
import { posCatalogueCount } from '@/lib/data/catalogue-meta';
import { getLoginSecurityFlags } from '@/lib/auth-environment';
import { runApiHandler } from '@/lib/api-guard';

const APP_VERSION = '2.9.0';

/** Infos publiques page login — sans email de contact */
export async function GET() {
  return runApiHandler('auth/public-info GET', async () => {
    const branding = await getBrandingConfig();
    return NextResponse.json({
      branding: toPublicBranding(branding),
      appVersion: APP_VERSION,
      articleCount: posCatalogueCount(),
      secureSession: isSecureAuthCookie(),
      loginSecurity: getLoginSecurityFlags(false),
    });
  });
}
