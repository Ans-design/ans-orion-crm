export const dynamic = 'force-dynamic';



import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';

import { getBrandingConfig } from '@/lib/branding-config';

import { extractEmailFromFromHeader } from '@/lib/email/address';

import { isEmailConfigured } from '@/lib/services/email-service';

import { apiError, safeErrorMessage } from '@/lib/api-response';



/** Expéditeur société par défaut pour l'envoi de devis / proforma. */

export async function GET() {

  const auth = await requirePermission('devis:read');

  if ('error' in auth) return auth.error;



  try {

    const branding = await getBrandingConfig();

    const envEmail = extractEmailFromFromHeader(process.env.EMAIL_FROM);

    const companyEmail = envEmail || branding.contactEmail;



    return NextResponse.json({

      companyEmail,

      companyName: branding.companyName,

      resendConfigured: isEmailConfigured(),

    });

  } catch (error) {

    console.error('[devis/sender-defaults]', error);

    return apiError(safeErrorMessage(error), 500);

  }

}

