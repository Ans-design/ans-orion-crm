import { describe, expect, it } from 'vitest';
import { summarizeCommercialTechLines } from '@/lib/documents/commercial-tech-summary';
import { renderProformaHtml } from '@/lib/services/DocumentService';
import { serializeDevisNotes } from '@/lib/devis-meta';

describe('summarizeCommercialTechLines', () => {
  it('garde un résumé court et ignore stock / formules', () => {
    const summary = summarizeCommercialTechLines([
      'Type : Bâche PVC standard',
      'Format : A0',
      'Dimensions : 841×1189 mm',
      'Dimension client : 84 × 119 cm',
      'Laize : N/A',
      'Dos : Noir',
      'Aspect : Mat',
      'Impression : Recto seul',
      'Orientation : normale',
      'Surface réelle : 25.00 m²',
      'Surface facturable : 84 x 119 cm ÷ 10 000 = 25.00 m²',
      'Quantité : 25',
      'Stock consommé estimé : 27.00 m²',
      'Prix sur devis — configuration bâche incomplète',
    ]);
    expect(summary.length).toBeLessThanOrEqual(4);
    expect(summary.some((l) => /type/i.test(l))).toBe(true);
    expect(summary.some((l) => /surface facturable/i.test(l))).toBe(true);
    expect(summary.join(' ')).not.toMatch(/stock|÷|laize|orientation/i);
    expect(summary.find((l) => /surface facturable/i.test(l))).toMatch(/25\.00/);
  });
});

describe('proforma compact', () => {
  it('affiche conditions/paiement en duo et notes sans JSON meta', () => {
    const html = renderProformaHtml({
      numero: 'DEV-2026-000005',
      statut: 'Brouillon',
      createdAt: new Date('2026-06-01'),
      validUntil: new Date('2026-07-01'),
      sousTotal: 100000,
      remise: 0,
      totalHT: 100000,
      totalTTC: 120000,
      notes: serializeDevisNotes({
        modeExpedition: 'Livraison',
        delaiExecution: '3 jours ouvrés',
        priorite: 'Normale',
        avancePct: 30,
      }),
      client: { name: 'Groupe Ylang' },
      lignes: [
        {
          articleId: 'fly-std',
          articleLabel: 'Flyer',
          quantity: 100,
          prixUnitaireAuto: 1000,
          totalLigne: 100000,
          configSnapshot: { format: 'A6', face: 'Recto seul' },
        },
      ],
    });
    expect(html).toContain('info-duo');
    expect(html).toContain('Conditions');
    expect(html).toContain('Paiement');
    expect(html).toContain('pay-modalities');
    expect(html).toContain('Expédition');
    expect(html).toContain('Livraison');
    expect(html).toContain('notes-list');
    expect(html).not.toContain('__ANS_META__');
    expect(html).toContain('Résumé');
  });
});
