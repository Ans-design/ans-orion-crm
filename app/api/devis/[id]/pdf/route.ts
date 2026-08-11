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
  loadDevisForDocument,
  renderDevisDocumentHtml,
} from '@/lib/services/facture-document-service';
import { runApiHandler } from '@/lib/api-guard';

export async function GET(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('devis:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('devis/[id]/pdf GET', async () => {
    const devis = await loadDevisForDocument(id);
    if (!devis) {
      return apiError(
        'Devis introuvable — verifiez l identifiant ou synchronisez la base locale (npm run db:sync)',
        404,
      );
    }

    const doc = req.nextUrl.searchParams.get('doc');
    const template = req.nextUrl.searchParams.get('template');
    const acompteRaw = req.nextUrl.searchParams.get('acompte');
    const acompte = acompteRaw ? Number(acompteRaw) : undefined;
    const kind = doc === 'proforma' ? 'proforma' : 'devis';
    const format = resolveDocumentFormat(req.nextUrl.searchParams, req.headers.get('accept'));
    const download = req.nextUrl.searchParams.get('download') === '1';

    const html = await renderDevisDocumentHtml(devis, {
      kind,
      template: template === 'preprinted' ? 'preprinted' : 'full',
      acompte: Number.isFinite(acompte) && (acompte ?? 0) > 0 ? acompte : undefined,
    });

    const prefix = kind === 'proforma' ? 'PROFORMA' : 'DEVIS';
    return buildCommercialDocumentResponse({
      html,
      filename: `${prefix}-${devis.numero}.pdf`,
      format,
      download,
    });
  });
}
