import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import {
  formatArchivedGoodiesValue,
  isArchivedGoodiesFieldKey,
  shouldShowFieldInNewGoodiesDocuments,
} from '@/lib/pos/goodies-pos-policy';
import { buildWorkOrderLines } from '@/lib/production/work-order-lines';

const GOODIES_IDS = [
  'gd-mug',
  'gd-tasse',
  'gd-gourde',
  'gd-tapis',
  'gd-briquet',
  'gd-usb',
  'gd-parapluie',
  'gd-stylo',
  'gd-portecles',
  'gd-pins',
  'gd-housse',
];

function sectionTitles(articleId: string): string[] {
  const cfg = filterProductConfigForPos(getProductConfig(articleId));
  return cfg?.sections.map((s) => s.title) ?? [];
}

describe('goodies POS policy', () => {
  it.each(GOODIES_IDS)('masque Zone de marquage dans le POS — %s', (articleId) => {
    expect(sectionTitles(articleId)).not.toContain('Zone de marquage');
  });

  it('masque Type de briquet, Matière et Zone sur Briquet', () => {
    const titles = sectionTitles('gd-briquet');
    expect(titles).not.toContain('Type de briquet');
    expect(titles).not.toContain('Matière');
    expect(titles).toContain('Format / taille');
    expect(titles).toContain('Couleur');
    expect(titles).toContain('Technique');
    expect(titles).toContain('Fichier & notes');
  });

  it('masque Matière sur Clé USB et conserve les blocs utiles', () => {
    const titles = sectionTitles('gd-usb');
    expect(titles).not.toContain('Matière');
    expect(titles).toEqual([
      'Type de clé USB',
      'Capacité',
      'Interface',
      'Couleur',
      'Technique',
      'Quantité',
      'Fichier & notes',
    ]);
  });

  it('masque Origine et Matière sur Housse', () => {
    const titles = sectionTitles('gd-housse');
    expect(titles).not.toContain('Origine de la housse');
    expect(titles).not.toContain('Matière');
    expect(titles).toContain('Type de housse');
    expect(titles).toContain('Format / taille');
    expect(titles).toContain('Couleur');
    expect(titles).toContain('Technique');
  });

  it('conserve les sections archivées dans le catalogue complet', () => {
    const full = getProductConfig('gd-briquet');
    const archived = full?.sections.filter((s) => s.posHidden).map((s) => s.title) ?? [];
    expect(archived).toContain('Type de briquet');
    expect(archived).toContain('Matière');
    expect(archived).toContain('Zone de marquage');
  });

  it('affiche les anciennes options avec mention archivée en fiche atelier Briquet', () => {
    const lines = buildWorkOrderLines('gd-briquet', {
      taille: 'Standard',
      couleur: 'noir',
      technique: 'Tampographie',
      type: 'Briquet jetable',
      matiere: 'Métal',
      zone_marquage: 'Face avant',
      qty: 100,
    });
    expect(lines.some((l) => l.includes('archivée'))).toBe(true);
    expect(lines.some((l) => /format \/ taille/i.test(l))).toBe(true);
    expect(lines.some((l) => /type de briquet/i.test(l))).toBe(true);
    expect(lines.some((l) => /matière/i.test(l))).toBe(true);
    expect(lines.some((l) => /zone de marquage/i.test(l))).toBe(true);
  });

  it('fiche atelier USB propre sans matière ni zone pour config neuve', () => {
    const lines = buildWorkOrderLines('gd-usb', {
      type: 'Clé classique',
      capacite: '16 Go',
      interface: 'USB 3.0',
      couleur: 'bleu',
      technique: 'Gravure laser',
      qty: 50,
    });
    expect(lines.some((l) => /type de clé usb/i.test(l))).toBe(true);
    expect(lines.some((l) => /capacité/i.test(l))).toBe(true);
    expect(lines.some((l) => /interface/i.test(l))).toBe(true);
    expect(lines.some((l) => /matière/i.test(l))).toBe(false);
    expect(lines.some((l) => /zone de marquage/i.test(l))).toBe(false);
  });

  it('masque Matière sur Mug et options type réduites', () => {
    const titles = sectionTitles('gd-mug');
    expect(titles).not.toContain('Matière / support');
    const mugSection = getProductConfig('gd-mug')?.sections.find((s) => s.title === 'Type de mug');
    expect(mugSection?.fields[0]?.options).not.toContain('Mug photo');
    expect(mugSection?.fields[0]?.options).not.toContain('Mug XXL');
  });

  it('affiche Assiette à la place de Tasse', () => {
    const titles = sectionTitles('gd-tasse');
    expect(titles).toContain('Type d\'assiette');
    expect(titles).not.toContain('Soucoupe / accessoire');
  });

  it('masque Type et Poignée sur Parapluie', () => {
    const titles = sectionTitles('gd-parapluie');
    expect(titles).not.toContain('Type de parapluie');
    expect(titles).not.toContain('Poignée / manche');
  });

  it('masque Finition et Attache sur Pin\'s', () => {
    const titles = sectionTitles('gd-pins');
    expect(titles).not.toContain('Finition / effet');
    expect(titles).not.toContain('Attache');
  });

  it('masque Finition sur Porte-clés', () => {
    expect(sectionTitles('gd-portecles')).not.toContain('Finition / effet');
  });

  it('Stylo — 6 couleurs d\'encre', () => {
    const encre = getProductConfig('gd-stylo')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'encre');
    expect(encre?.options).toEqual(['Bleu', 'Noir', 'Rouge', 'Vert', 'Violet', 'Orange']);
  });

  it('Tapis souris — formats avec tailles et sans matière/base', () => {
    const titles = sectionTitles('gd-tapis');
    expect(titles).not.toContain('Matière de surface');
    expect(titles).not.toContain('Base antidérapante');
    const format = getProductConfig('gd-tapis')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'format');
    expect(format?.options?.[0]).toMatch(/\(XS\)/);
  });

  it('n’affiche pas zone_marquage dans les nouveaux documents sans valeur historique', () => {
    expect(shouldShowFieldInNewGoodiesDocuments('zone_marquage', 'gd-mug')).toBe(false);
    expect(isArchivedGoodiesFieldKey('zone_marquage', 'gd-mug')).toBe(true);
    expect(isArchivedGoodiesFieldKey('matiere', 'gd-usb')).toBe(true);
    expect(isArchivedGoodiesFieldKey('type', 'gd-briquet')).toBe(true);
    expect(isArchivedGoodiesFieldKey('type', 'gd-usb')).toBe(false);
    expect(formatArchivedGoodiesValue('Face avant')).toContain('archivée');
  });
});
