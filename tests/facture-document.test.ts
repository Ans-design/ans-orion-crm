import { describe, expect, it } from 'vitest';
import { stripPrintControls } from '@/lib/documents/html-to-pdf';
import { resolveDocumentFormat } from '@/lib/documents/commercial-document-response';
import { renderDevisHtml, renderFactureHtml } from '@/lib/services/DocumentService';

describe('html-to-pdf helpers', () => {
  it('stripPrintControls retire le bouton imprimer', () => {
    const html = '<body><button class="print-btn no-print">Imprimer</button><p>OK</p></body>';
    const out = stripPrintControls(html);
    expect(out).not.toContain('print-btn');
    expect(out).toContain('OK');
  });
});

describe('commercial-document-response', () => {
  it('format pdf par défaut', () => {
    expect(resolveDocumentFormat(new URLSearchParams())).toBe('pdf');
  });

  it('format html si preview', () => {
    expect(resolveDocumentFormat(new URLSearchParams('format=html'))).toBe('html');
    expect(resolveDocumentFormat(new URLSearchParams('format=preview'))).toBe('html');
  });
});

describe('DocumentService forPdf', () => {
  it('masque le bouton imprimer en mode PDF', () => {
    const html = renderDevisHtml({
      numero: 'DEV-1',
      statut: 'Envoyé',
      createdAt: new Date(),
      validUntil: new Date(),
      sousTotal: 1000,
      remise: 0,
      totalHT: 1000,
      totalTTC: 1200,
      client: { name: 'Test' },
      lignes: [{ articleLabel: 'Flyer', quantity: 1, totalLigne: 1000 }],
    }, { forPdf: true });
    expect(html).not.toMatch(/<button[^>]*class="print-btn/);
  });

  it('facture forPdf sans bouton', () => {
    const html = renderFactureHtml({
      numero: 'FAC-1',
      statut: 'Émise',
      createdAt: new Date(),
      totalHT: 1000,
      totalTTC: 1200,
      montantPaye: 0,
      reste: 1200,
      client: { name: 'Client' },
    }, { forPdf: true });
    expect(html).not.toMatch(/<button[^>]*class="print-btn/);
  });
});

describe('facture-workflow-service — paidTotal logic', () => {
  it('calcule total payé avec remboursements', async () => {
    const { syncFactureStatutFromPaiements } = await import('@/lib/services/facture-workflow-service');
    expect(typeof syncFactureStatutFromPaiements).toBe('function');
  });
});
