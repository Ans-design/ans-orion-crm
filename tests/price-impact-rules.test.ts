import { describe, expect, it } from 'vitest';
import { resolveFieldPriceImpact } from '@/lib/pricing/price-impact-rules';
import { computePlvPrice } from '@/lib/pricing/plv-pricing';
import { formatCartConfigSummaryLine } from '@/lib/cart-config-display';
import { orderPaymentStatusLabel } from '@/lib/commande/order-status-labels';
import {
  encodePaymentMeta,
  parsePaymentMeta,
  paymentReferenceRequired,
  resolvePaymentDate,
} from '@/lib/server/modules/paiements/paiement-payment-meta';

describe('price impact rules', () => {
  it('neutralise orientation globalement', () => {
    const status = resolveFieldPriceImpact({
      articleId: 'fly-a4',
      fieldKey: 'orientation',
      defaultImpactsPrice: true,
      defaultIsInformational: false,
    });
    expect(status.impactsPrice).toBe(false);
    expect(status.isInformational).toBe(true);
    expect(status.badge).toBe('Descriptif');
  });

  it('neutralise couleur pour goodies', () => {
    const status = resolveFieldPriceImpact({
      articleId: 'gd-mug',
      fieldKey: 'couleur',
      defaultImpactsPrice: true,
      defaultIsInformational: false,
    });
    expect(status.impactsPrice).toBe(false);
    expect(status.ruleId).toBe('goodies-color');
  });

  it('neutralise type PLV chevalet sans casser format tarifaire', () => {
    const typeStatus = resolveFieldPriceImpact({
      articleId: 'plv-chevalet',
      fieldKey: 'type',
      defaultImpactsPrice: true,
    });
    const formatStatus = resolveFieldPriceImpact({
      articleId: 'plv-chevalet',
      fieldKey: 'format',
      defaultImpactsPrice: true,
    });
    expect(typeStatus.impactsPrice).toBe(false);
    expect(formatStatus.impactsPrice).toBe(true);
  });

  it('conserve quantité tarifaire', () => {
    const status = resolveFieldPriceImpact({
      articleId: 'fly-a4',
      fieldKey: 'quantite',
      defaultImpactsPrice: true,
    });
    expect(status.impactsPrice).toBe(true);
  });

  /** Checklist audit 360 — échantillon 10 articles : variables descriptives sans impact prix */
  const DESCRIPTIVE_SAMPLES: { articleId: string; fieldKey: string; label: string }[] = [
    { articleId: 'fly-a4', fieldKey: 'orientation', label: 'Flyer A4 orientation' },
    { articleId: 'gd-mug', fieldKey: 'couleur', label: 'Mug couleur' },
    { articleId: 'plv-chevalet', fieldKey: 'type', label: 'Chevalet type' },
    { articleId: 'plv-oriflamme', fieldKey: 'type', label: 'Oriflamme type' },
    { articleId: 'bk-livres', fieldKey: 'type', label: 'Livres type' },
    { articleId: 'ph-cadre', fieldKey: 'couleur', label: 'Cadre photo couleur' },
    { articleId: 'evt-bracelet', fieldKey: 'type', label: 'Bracelet type' },
    { articleId: 'fin-coins', fieldKey: 'cornerRounding', label: 'Coins arrondis' },
    { articleId: 'gf-acrylic', fieldKey: 'type', label: 'Acrylique type' },
    { articleId: 'doc-facturier', fieldKey: 'type', label: 'Facturier type' },
  ];

  it.each(DESCRIPTIVE_SAMPLES)(
    'audit sample — $label ($articleId.$fieldKey) reste descriptif',
    ({ articleId, fieldKey }) => {
      const status = resolveFieldPriceImpact({
        articleId,
        fieldKey,
        defaultImpactsPrice: true,
        defaultIsInformational: false,
      });
      expect(status.impactsPrice).toBe(false);
      expect(status.isInformational).toBe(true);
    },
  );
});

describe('legacy PLV pricing neutralization', () => {
  it('ignore le supplément type chevalet', () => {
    const withType = computePlvPrice('plv-chevalet', {
      format: 'A3',
      face: 'Recto seul',
      matiere: 'Carton ondulé',
      type: 'Chevalet premium',
    }, 1);
    const withoutType = computePlvPrice('plv-chevalet', {
      format: 'A3',
      face: 'Recto seul',
      matiere: 'Carton ondulé',
      type: 'Chevalet standard',
    }, 1);
    expect(withType.prixUnitaire).toBe(withoutType.prixUnitaire);
  });
});

describe('cart summary badges', () => {
  it('affiche descriptif sans surcharger', () => {
    const line = formatCartConfigSummaryLine({
      label: 'Orientation',
      value: 'Paysage',
      priceImpactBadge: 'Descriptif',
    });
    expect(line).toBe('Orientation: Paysage (descriptif)');
  });
});

describe('order payment helpers', () => {
  it('calcule les statuts Non payé / Acompte / Partiel / Soldé', () => {
    expect(orderPaymentStatusLabel(100_000, 0, 100_000)).toBe('Non payé');
    expect(orderPaymentStatusLabel(100_000, 20_000, 80_000)).toBe('Acompte');
    expect(orderPaymentStatusLabel(100_000, 60_000, 40_000)).toBe('Partiel');
    expect(orderPaymentStatusLabel(100_000, 100_000, 0)).toBe('Soldé');
  });

  it('encode et relit les métadonnées paiement', () => {
    const notes = encodePaymentMeta({
      mobileMoneyProvider: 'Mvola',
      paymentTime: '2026-07-04T10:30',
      payerName: 'Client Test',
      note: 'Acompte showroom',
    }, 'Acompte showroom');
    const parsed = parsePaymentMeta(notes);
    expect(parsed.meta?.mobileMoneyProvider).toBe('Mvola');
    expect(parsed.meta?.payerName).toBe('Client Test');
    expect(parsed.userNotes).toContain('Acompte showroom');
  });

  it('exige une référence pour mobile money et virement', () => {
    expect(paymentReferenceRequired('Mobile Money')).toBe(true);
    expect(paymentReferenceRequired('Mvola')).toBe(true);
    expect(paymentReferenceRequired('Virement')).toBe(true);
    expect(paymentReferenceRequired('Espèces')).toBe(false);
  });

  it('utilise paymentTime pour la date effective', () => {
    const d = resolvePaymentDate('2026-07-04T14:30', null);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(4);
  });
});
