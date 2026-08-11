import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { shouldShowTypedCustomBlock } from '@/lib/pos/custom-field-ui';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import { resolveDisplayFormatLabel } from '@/lib/pos/generated-format-label';
import { injectCustomFormatDimensionFields } from '@/lib/pos/inject-custom-format-fields';
import { buildWorkOrderLines } from '@/lib/production/work-order-lines';

const TEXTILE_WITH_MARKING = [
  'tx-tshirt',
  'tx-polo',
  'tx-sweat',
  'tx-gilet',
  'tx-combinaison',
  'tx-survetement',
  'tx-casquette',
  'tx-bob',
  'tx-maillot',
  'tx-totebag',
  'tx-trousse',
] as const;

function posFieldKeys(articleId: string): string[] {
  const raw = getProductConfig(articleId);
  const cfg = filterProductConfigForPos(injectCustomFormatDimensionFields(raw));
  return cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
}

function posFieldLabels(articleId: string): string[] {
  const raw = getProductConfig(articleId);
  const cfg = filterProductConfigForPos(injectCustomFormatDimensionFields(raw));
  return cfg?.sections.flatMap((s) => s.fields.map((f) => f.label)) ?? [];
}

describe('textile rectifications — taille du marquage', () => {
  it.each(TEXTILE_WITH_MARKING)('%s : L×l numériques visibles, pas de champs texte redondants', (articleId) => {
    const keys = posFieldKeys(articleId);
    expect(keys).toContain('format_marquage');
    expect(keys).toContain('longueur');
    expect(keys).toContain('largeur');
    expect(keys).not.toContain('format_marquage_custom_text');
    expect(keys).not.toContain('format_marquage_custom_detail');
    expect(keys.filter((k) => k.includes('format_marquage') && k.includes('custom'))).toHaveLength(0);
  });

  it.each(TEXTILE_WITH_MARKING)(
    '%s : pas de bloc texte « Taille personnalisée » dans Taille du marquage',
    (articleId) => {
      const labels = posFieldLabels(articleId);
      expect(labels).not.toContain('Taille personnalisée');
      expect(labels).not.toContain('Décrivez votre taille souhaitée…');
      expect(labels).not.toContain('Autres précisions utiles à la production…');
    },
  );

  it('masque le bloc texte format personnalisé quand L×l dédiés existent (Polo)', () => {
    const pc = injectCustomFormatDimensionFields(getProductConfig('tx-polo'));
    const field = pc?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'format_marquage');
    expect(field).toBeDefined();
    expect(
      shouldShowTypedCustomBlock(field!, 'Format personnalisé', {
        productConfig: pc,
        articleId: 'tx-polo',
      }),
    ).toBe(false);
  });

  it('génère le libellé format depuis L×l (mm)', () => {
    const label = resolveDisplayFormatLabel(
      { format_marquage: 'Format personnalisé', longueur: 120, largeur: 80 },
      ['format_marquage'],
    );
    expect(label).toBe('120 × 80 mm');
  });

  it('fiche production : dimensions personnalisées et note unique', () => {
    const lines = buildWorkOrderLines('tx-tshirt', {
      technique: 'DTF',
      format_marquage: 'Format personnalisé',
      longueur: 210,
      largeur: 297,
      fichier_joint: 'Dépôt via BAT / commande',
      remarques: 'Logo poitrine gauche, fichier ref ABC',
      qty: 5,
    });
    expect(lines.some((l) => /taille du marquage.*210 × 297 mm/i.test(l))).toBe(true);
    expect(lines.some((l) => /fichier \/ visuel/i.test(l))).toBe(true);
    expect(lines.some((l) => /notes & remarques/i.test(l))).toBe(true);
    expect(lines.some((l) => /logo poitrine gauche/i.test(l))).toBe(true);
  });

  it('fiche production : notes archivées avec mention historique', () => {
    const lines = buildWorkOrderLines('tx-polo', {
      technique: 'DTF',
      format_marquage: 'A4 — 210×297 mm',
      note_production: 'Broderie fil métallique',
      qty: 1,
    });
    expect(lines.some((l) => /note production.*archivée/i.test(l))).toBe(true);
  });
});

describe('textile rectifications — fichier & notes', () => {
  it.each(TEXTILE_WITH_MARKING)('%s : une seule zone Notes & remarques visible au POS', (articleId) => {
    const raw = getProductConfig(articleId);
    const cfg = filterProductConfigForPos(injectCustomFormatDimensionFields(raw));
    const notesSection = cfg?.sections.find((s) => s.title === 'Fichier & notes');
    expect(notesSection).toBeDefined();
    const fields = notesSection!.fields;
    expect(fields.map((f) => f.key)).toEqual(['fichier_joint', 'remarques']);
    expect(fields.find((f) => f.key === 'remarques')?.label).toBe('Notes & remarques');
    expect(fields.find((f) => f.key === 'fichier_joint')?.label).toBe('Fichier / visuel à joindre');
  });

  it.each(TEXTILE_WITH_MARKING)('%s : anciens champs notes masqués au POS', (articleId) => {
    const keys = posFieldKeys(articleId);
    expect(keys).not.toContain('fichier_visuel');
    expect(keys).not.toContain('note_emplacement_marquage');
    expect(keys).not.toContain('note_production');
  });

  it('conserve les champs archivés dans le catalogue complet (historique)', () => {
    const full = getProductConfig('tx-tshirt');
    const archived = full?.sections.find((s) => s.title === 'Notes (archivé)');
    expect(archived?.posHidden).toBe(true);
    expect(archived?.fields.map((f) => f.key)).toEqual([
      'fichier_visuel',
      'note_emplacement_marquage',
      'note_production',
    ]);
  });
});
