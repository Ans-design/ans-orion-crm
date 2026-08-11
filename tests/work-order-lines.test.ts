import { describe, expect, it } from 'vitest';
import { BACHE_CANONICAL_ID } from '@/lib/pos/bache-catalog';
import { buildProductionLineSpec, buildWorkOrderLines, hasWorkOrderBlock } from '@/lib/production/work-order-lines';
import { renderDevisHtml, renderProductionWorkOrderHtml } from '@/lib/services/DocumentService';

const BACHE_CONFIG = {
  type_bache: 'Bâche PVC standard',
  grammage: '440g',
  laize: '1m60',
  dos: 'Dos blanc',
  aspect: 'Mat',
  format: 'Format personnalisé',
  longueur_cm: 200,
  largeur_cm: 120,
  qty: 2,
  face: 'Recto seul',
};

describe('work-order-lines', () => {
  it('génère une fiche bâche avec dimensions et impression', () => {
    const lines = buildWorkOrderLines(BACHE_CANONICAL_ID, BACHE_CONFIG);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((l) => l.includes('200') && l.includes('120'))).toBe(true);
    expect(lines.some((l) => /impression/i.test(l))).toBe(true);
    expect(hasWorkOrderBlock(BACHE_CANONICAL_ID, BACHE_CONFIG)).toBe(true);
  });

  it('génère une fiche GF hors bâche', () => {
    const config = {
      largeur_cm: 100,
      hauteur_cm: 70,
      laize: '1m60',
      qty: 1,
      face: 'Recto seul',
      _gfBillable: {
        clientLargeurCm: 100,
        clientHauteurCm: 70,
        surfaceReelleM2: 0.7,
        surfaceLaizeM2: 0.7,
        surfaceFactureeM2: 0.7,
        laizeLabel: '1m60',
        assemblageRequired: false,
        strips: 1,
      },
    };
    const lines = buildWorkOrderLines('gf-vinyle', config);
    expect(lines.some((l) => l.includes('100') && l.includes('70'))).toBe(true);
    expect(lines.some((l) => /surface réelle/i.test(l))).toBe(true);
  });

  it('ignore les articles sans config', () => {
    expect(buildWorkOrderLines('fly-std', {})).toEqual([]);
    expect(hasWorkOrderBlock('fly-std', {})).toBe(false);
  });

  it('génère une fiche flyer (print)', () => {
    const lines = buildWorkOrderLines('fly-std', {
      format: 'A6',
      paperType: 'Couché 135g',
      face: 'Recto seul',
      qty: 500,
    });
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.some((l) => /format|A6/i.test(l))).toBe(true);
    expect(hasWorkOrderBlock('fly-std', { format: 'A6', qty: 1 })).toBe(true);
  });

  it('génère une fiche finition dorure', () => {
    const lines = buildWorkOrderLines('fin-dorure', {
      type: 'Dorure Or',
      procede: 'Hot stamping',
      dim: 'A5',
      face: 'Recto',
      qty: 100,
    });
    expect(lines.some((l) => /dorure/i.test(l))).toBe(true);
  });

  it('génère une fiche packaging boîte', () => {
    const lines = buildWorkOrderLines('pkg-boite', {
      structure: 'Fourreau',
      longueur: 200,
      hauteur: 150,
      profondeur: 80,
      qty: 50,
    });
    expect(lines.some((l) => /surface matière/i.test(l))).toBe(true);
    expect(lines.some((l) => /fourreau/i.test(l))).toBe(true);
  });

  it('génère une fiche textile avec tailles', () => {
    const lines = buildWorkOrderLines('tx-tshirt', {
      tailles: { S: 2, M: 5, L: 3 },
      technique: 'DTF',
      qty: 10,
    });
    expect(lines.some((l) => /répartition tailles/i.test(l))).toBe(true);
    expect(lines.some((l) => /M×5/.test(l))).toBe(true);
  });
});

describe('DocumentService — fiche fabrication PDF devis', () => {
  it('inclut le bloc fiche fabrication pour une ligne bâche', () => {
    const html = renderDevisHtml({
      numero: 'DEV-TEST-001',
      statut: 'Brouillon',
      createdAt: new Date('2026-06-01'),
      validUntil: new Date('2026-07-01'),
      sousTotal: 100000,
      remise: 0,
      totalHT: 100000,
      totalTTC: 120000,
      client: { name: 'Client Test' },
      lignes: [
        {
          articleId: BACHE_CANONICAL_ID,
          articleLabel: 'Bâche',
          quantity: 2,
          unite: 'ex.',
          prixUnitaireAuto: 50000,
          totalLigne: 100000,
          configSnapshot: BACHE_CONFIG,
        },
      ],
    });

    expect(html).toContain('Résumé');
    expect(html).toContain('200 × 120 cm');
    expect(html).toMatch(/Impression|Recto/i);
  });
});

describe('DocumentService — fiche fabrication GPAO dossier', () => {
  it('inclut specs GF, workflow et métadonnées dossier', () => {
    const html = renderProductionWorkOrderHtml({
      dossierId: 'dossier-test-001',
      statutGlobal: 'En production',
      priorite: 'Haute',
      avancement: 35,
      tempsEstimeMin: 480,
      tempsReelMin: 120,
      delai: new Date('2026-07-01'),
      commande: {
        numero: 'CMD-2026-042',
        article: 'Bâche + Flyer',
        statut: 'En production',
        qty: 3,
        client: { name: 'Client GPAO', code: 'CL-001' },
        lignes: [
          {
            articleId: BACHE_CANONICAL_ID,
            articleLabel: 'Bâche',
            quantity: 2,
            configSnapshot: BACHE_CONFIG,
          },
        ],
      },
      etapes: [
        { ordre: 1, nom: 'Réception commande', statut: 'Terminé', dureeMin: 15 },
        { ordre: 2, nom: 'PAO', statut: 'En cours', dureeMin: null },
      ],
      openIncidents: [{ title: 'Laize indisponible', severity: 'Haute' }],
    });

    expect(html).toContain('FICHE FABRICATION');
    expect(html).toContain('CMD-2026-042');
    expect(html).toContain('200 × 120 cm');
    expect(html).toContain('Workflow GPAO');
    expect(html).toContain('Réception commande');
    expect(html).toContain('Laize indisponible');
    expect(html).toContain('Visa QC');
  });
});

describe('buildProductionLineSpec', () => {
  it('couvre les articles print via configurateur produit', () => {
    const spec = buildProductionLineSpec({
      articleId: 'fly-std',
      articleLabel: 'Flyer',
      quantity: 500,
      configSnapshot: { format: 'A6', paperType: 'Couché 135g', face: 'Recto seul', qty: 500 },
    });
    expect(spec.specLines.some((l) => /format/i.test(l))).toBe(true);
    expect(spec.specLines.some((l) => /500/.test(l))).toBe(true);
  });

  it('inclut fiche devis flyer', () => {
    const html = renderDevisHtml({
      numero: 'DEV-FLY-001',
      statut: 'Brouillon',
      createdAt: new Date('2026-06-01'),
      validUntil: new Date('2026-07-01'),
      sousTotal: 50000,
      remise: 0,
      totalHT: 50000,
      totalTTC: 60000,
      client: { name: 'Client Print' },
      lignes: [
        {
          articleId: 'fly-std',
          articleLabel: 'Flyer',
          quantity: 500,
          unite: 'ex.',
          prixUnitaireAuto: 100,
          totalLigne: 50000,
          configSnapshot: { format: 'A6', paperType: 'Couché 135g', face: 'Recto seul' },
        },
      ],
    });
    expect(html).toContain('Résumé');
    expect(html).toContain('A6');
  });
});
