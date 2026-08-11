import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import {
  formatArchivedTextileValue,
  isArchivedTextileFieldKey,
  shouldShowFieldInNewTextileDocuments,
} from '@/lib/pos/textile-pos-policy';
import { buildWorkOrderLines } from '@/lib/production/work-order-lines';

function sectionTitles(articleId: string): string[] {
  const cfg = filterProductConfigForPos(getProductConfig(articleId));
  return cfg?.sections.map((s) => s.title) ?? [];
}

function fieldKeys(articleId: string): string[] {
  const cfg = filterProductConfigForPos(getProductConfig(articleId));
  return cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
}

describe('textile POS policy', () => {
  it('masque Zone de marquage et Coupe / genre sur Polo', () => {
    const titles = sectionTitles('tx-polo');
    expect(titles).not.toContain('Zone de marquage');
    expect(titles).not.toContain('Coupe / genre');
    expect(titles).toContain('Taille du marquage');
  });

  it('masque les champs archivés sur Trousse', () => {
    const titles = sectionTitles('tx-trousse');
    expect(titles).not.toContain('Modèle de trousse');
    expect(titles).not.toContain('Fermeture');
    expect(titles).not.toContain('Zone de marquage');
    expect(titles).toContain('Format / dimensions');
    expect(titles).toContain('Doublure intérieure');
    expect(titles).toContain('Taille du marquage');
  });

  it('masque les champs archivés sur Tote bag et inclut Soga', () => {
    const titles = sectionTitles('tx-totebag');
    const keys = fieldKeys('tx-totebag');
    expect(titles).not.toContain('Modèle de tote bag');
    expect(titles).not.toContain('Anses / poignées');
    expect(titles).not.toContain('Soufflet / fond');
    expect(titles).not.toContain('Fermeture');
    expect(titles).not.toContain('Zone de marquage');
    const matiereField = getProductConfig('tx-totebag')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'matiere');
    expect(matiereField?.options).toContain('Soga');
  });

  it('conserve les options archivées dans le catalogue complet', () => {
    const full = getProductConfig('tx-trousse');
    const archived = full?.sections.filter((s) => s.posHidden).map((s) => s.title) ?? [];
    expect(archived).toContain('Modèle de trousse');
    expect(archived).toContain('Zone de marquage');
  });

  it('affiche les anciennes zones avec mention archivée en fiche atelier', () => {
    const lines = buildWorkOrderLines('tx-polo', {
      technique: 'DTF',
      format_marquage: 'A4 — 210×297 mm',
      zone_marquage: 'Poitrine centre',
      qty: 10,
    });
    expect(lines.some((l) => l.includes('archivée'))).toBe(true);
    expect(lines.some((l) => /zone de marquage/i.test(l))).toBe(true);
    expect(lines.some((l) => /taille du marquage/i.test(l))).toBe(true);
  });

  it('n’affiche pas zone_marquage dans les nouveaux documents sans valeur historique', () => {
    expect(shouldShowFieldInNewTextileDocuments('zone_marquage', 'tx-polo')).toBe(false);
    expect(isArchivedTextileFieldKey('zone_marquage', 'tx-polo')).toBe(true);
    expect(formatArchivedTextileValue('Dos centre')).toContain('archivée');
  });
});
