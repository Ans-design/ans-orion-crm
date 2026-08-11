export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { resolveParams } from '@/lib/api/route-params';
import {
  buildCommercialDocumentResponse,
  resolveDocumentFormat,
} from '@/lib/documents/commercial-document-response';
import {
  loadFactureForDocument,
  renderFactureDocumentHtml,
  resolveFacturePrintFormat,
} from '@/lib/services/facture-document-service';
import { runApiHandler } from '@/lib/api-guard';

export async function GET(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('factures:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('factures/[id]/pdf GET', async () => {
    const loaded = await loadFactureForDocument(id);
    if (!loaded) return apiError('Facture introuvable', 404);

    const template = req.nextUrl.searchParams.get('template');
    const printParam = req.nextUrl.searchParams.get('print') || req.nextUrl.searchParams.get('doc');
    const format = resolveDocumentFormat(req.nextUrl.searchParams, req.headers.get('accept'));
    const download = req.nextUrl.searchParams.get('download') === '1';

    const printFormat = resolveFacturePrintFormat(
      (loaded.facture as { printFormat?: string }).printFormat,
      printParam,
    );
    const html = renderFactureDocumentHtml(
      loaded.htmlPayload,
      template === 'preprinted' ? 'preprinted' : 'full',
      printFormat,
    );

    const prefix = printFormat === 'ticket' ? 'Ticket' : 'Facture';
    return buildCommercialDocumentResponse({
      html,
      filename: `${prefix}-${loaded.facture.numero}.pdf`,
      format,
      download,
    });
  });
}
