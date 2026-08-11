import { prisma } from '@/lib/prisma';
import { renderDevisHtml, renderFactureHtml, renderFactureTicketHtml, renderProformaHtml } from '@/lib/services/DocumentService';
import type { DocumentTemplateMode } from '@/lib/services/DocumentService';
import { htmlToPdfBuffer } from '@/lib/documents/html-to-pdf';
import {
  buildCommandePublicUrl,
  renderCommandeQrBlockHtml,
  resolveCommandeQrSrc,
} from '@/lib/documents/commande-qr';

export type FacturePrintFormat = 'ticket' | 'facture';

export function resolveFacturePrintFormat(
  value?: string | null,
  queryOverride?: string | null,
): FacturePrintFormat {
  const q = (queryOverride || '').toLowerCase();
  if (q === 'ticket' || q === 'recu' || q === 'reçu') return 'ticket';
  if (q === 'facture' || q === 'full') return 'facture';
  const v = (value || '').toLowerCase();
  if (v === 'ticket' || v === 'recu' || v === 'reçu') return 'ticket';
  return 'facture';
}
async function buildScanQrHtml(commandeId: string | null | undefined, numero?: string | null) {
  if (!commandeId) return null;
  const targetUrl = buildCommandePublicUrl(commandeId);
  const qrSrc = await resolveCommandeQrSrc(targetUrl, 160);
  return renderCommandeQrBlockHtml({
    qrSrc,
    targetUrl,
    label: numero ? `Cmd ${numero}` : 'Dossier commande',
    caption: 'Scanner pour ouvrir',
  });
}

export async function loadFactureForDocument(factureId: string) {
  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { client: true, commande: true, paiements: true },
  });
  if (!facture) return null;

  const montantPaye = facture.paiements.reduce(
    (s, p) => s + (p.type === 'Remboursement' ? -p.montant : p.montant),
    0,
  );

  const lignes = Array.isArray(facture.lignes) ? facture.lignes : null;
  const scanQrHtml = await buildScanQrHtml(facture.commandeId, facture.commande?.numero);

  return {
    facture,
    montantPaye,
    htmlPayload: {
      numero: facture.numero,
      statut: facture.statut,
      createdAt: facture.dateEmission ?? facture.createdAt,
      echeance: facture.dateEcheance,
      sousTotal: facture.sousTotal,
      remise: facture.remise,
      tva: facture.tva,
      totalHT: facture.totalHT,
      totalTTC: facture.totalTTC,
      montantPaye,
      reste: Math.max(0, facture.totalTTC - montantPaye),
      notes: facture.notes,
      lignes: lignes as Array<{ description?: string; qty?: number; pu?: number; total?: number }> | null,
      client: facture.client,
      commande: facture.commande
        ? {
            id: facture.commande.id,
            numero: facture.commande.numero,
            article: facture.commande.article,
          }
        : null,
      scanQrHtml,
      printFormat: resolveFacturePrintFormat(
        (facture as { printFormat?: string | null }).printFormat,
      ),
    },
  };
}

export function renderFactureDocumentHtml(
  payload: NonNullable<Awaited<ReturnType<typeof loadFactureForDocument>>>['htmlPayload'],
  template: DocumentTemplateMode = 'full',
  printFormat?: FacturePrintFormat | string | null,
) {
  const format = resolveFacturePrintFormat(
    printFormat ?? (payload as { printFormat?: string }).printFormat,
  );
  if (format === 'ticket') {
    return renderFactureTicketHtml(payload, { forPdf: true });
  }
  return renderFactureHtml(payload, { template, forPdf: true });
}

export async function loadDevisForDocument(devisId: string) {
  return prisma.devis.findUnique({
    where: { id: devisId },
    include: {
      client: true,
      lignes: { orderBy: { sortOrder: 'asc' } },
      commandes: { select: { id: true, numero: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
}

export async function renderDevisDocumentHtml(
  devis: NonNullable<Awaited<ReturnType<typeof loadDevisForDocument>>>,
  options?: { kind?: 'devis' | 'proforma'; template?: DocumentTemplateMode; acompte?: number },
) {
  const kind = options?.kind ?? 'devis';
  const linked = devis.commandes?.[0];
  const scanQrHtml = await buildScanQrHtml(linked?.id, linked?.numero);
  const payload = { ...devis, scanQrHtml };

  if (kind === 'proforma') {
    return renderProformaHtml(payload, { template: options?.template, acompte: options?.acompte, forPdf: true });
  }
  return renderDevisHtml(payload, { ...options, kind: 'devis', forPdf: true });
}

export async function generateFacturePdfBuffer(
  factureId: string,
  template: DocumentTemplateMode = 'full',
  printFormat?: FacturePrintFormat | null,
) {
  const loaded = await loadFactureForDocument(factureId);
  if (!loaded) return { ok: false as const, error: 'Facture introuvable' };
  const format = resolveFacturePrintFormat(
    printFormat,
    (loaded.facture as { printFormat?: string }).printFormat,
  );
  const html = renderFactureDocumentHtml(loaded.htmlPayload, template, format);
  const pdf = await htmlToPdfBuffer(html);
  if (!pdf.ok) return { ok: false as const, error: pdf.error };
  return { ok: true as const, buffer: pdf.buffer, numero: loaded.facture.numero, printFormat: format };
}

export async function generateDevisPdfBuffer(
  devisId: string,
  options?: { kind?: 'devis' | 'proforma'; template?: DocumentTemplateMode; acompte?: number },
) {
  const devis = await loadDevisForDocument(devisId);
  if (!devis) return { ok: false as const, error: 'Devis introuvable' };
  const html = await renderDevisDocumentHtml(devis, options);
  const pdf = await htmlToPdfBuffer(html);
  if (!pdf.ok) return { ok: false as const, error: pdf.error };
  const prefix = options?.kind === 'proforma' ? 'PROFORMA' : 'DEVIS';
  return { ok: true as const, buffer: pdf.buffer, numero: devis.numero, prefix };
}
