import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '@/lib/data/catalogue';
import { ARTICLE_MOCKUP_REGISTRY } from '@/lib/data/article-mockup-registry';
import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import { resolveMockupKind, auditMockupDistinctness } from '@/lib/data/mockup-resolver';

describe('mockup quality', () => {
  it('assigns flyer kind to flyers', () => {
    expect(resolveMockupKind('fly-std', 'flyers')).toBe('flyer');
    expect(resolveMockupKind('fly-a3', 'flyers')).toBe('flyer');
  });

  it('assigns distinct kinds per product family', () => {
    const flyer = resolveMockupKind('fly-std', 'flyers');
    const poster = resolveMockupKind('evt-affiche', 'evenementiel');
    const vinyl = resolveMockupKind('gf-vinyl-blanc', 'grand_format');
    const card = resolveMockupKind('cv-std', 'carterie');
    const rollup = resolveMockupKind('plv-rollup', 'plv');

    expect(flyer).toBe('flyer');
    expect(poster).toBe('poster');
    expect(vinyl).toBe('vinyl_sheet');
    expect(card).toBe('card');
    expect(rollup).toBe('rollup');

    const kinds = new Set([flyer, poster, vinyl, card, rollup]);
    expect(kinds.size).toBe(5);
  });

  it('maps impression and document articles to recognizable mockups', () => {
    expect(resolveMockupKind('doc-entete', 'document')).toBe('letterhead');
    expect(resolveMockupKind('imp-offset', 'impression')).toBe('letterhead');
    expect(resolveMockupKind('ph-tirage', 'photo')).toBe('photo_print');
    expect(resolveMockupKind('evt-carte-voeux', 'evenementiel')).toBe('invitation');
    expect(resolveMockupKind('bk-menu', 'livres')).toBe('menu');
  });

  it('major catalogue articles avoid generic flat mockup', () => {
    const majorIds = [
      'fly-std', 'fly-a4', 'evt-affiche', 'gf-photo', 'gf-vinyl-blanc',
      'ph-tirage', 'doc-entete', 'cv-std', 'plv-rollup', 'tx-tshirt',
      'pkg-boite', 'bk-menu', 'gf-bache', 'imp-offset',
    ];
    for (const id of majorIds) {
      const item = CATALOGUE.find((c) => c.id === id);
      if (!item) continue;
      const kind = resolveMockupKind(id, item.category);
      expect(kind, `${id} should not use flat`).not.toBe('flat');
    }
  });

  it('registry entries for former flat articles are updated', () => {
    const formerFlat = [
      'fly-std', 'evt-affiche', 'gf-photo', 'ph-tirage', 'doc-entete', 'imp-offset',
    ];
    for (const id of formerFlat) {
      const def = ARTICLE_MOCKUP_REGISTRY[id];
      expect(def?.kind, `${id} registry kind`).not.toBe('flat');
    }
  });

  it('textile articles have distinct mockup kinds', () => {
    const pairs: [string, string][] = [
      ['tx-tshirt', 'tshirt'],
      ['tx-polo', 'polo'],
      ['tx-bob', 'bob'],
      ['tx-casquette', 'cap'],
      ['tx-gilet', 'gilet'],
      ['tx-maillot', 'maillot'],
      ['tx-combinaison', 'combinaison'],
      ['tx-survetement', 'survetement'],
      ['tx-lambahoany', 'lambahoany'],
    ];
    const kinds = pairs.map(([id, expected]) => {
      const kind = resolveMockupKind(id, 'textile');
      expect(kind, id).toBe(expected);
      return kind;
    });
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it('registry covers every POS catalogue article', () => {
    for (const item of POS_CATALOGUE) {
      expect(ARTICLE_MOCKUP_REGISTRY[item.id], item.id).toBeDefined();
    }
  });

  it('passes anti-redundancy audit for key families', () => {
    const { issues } = auditMockupDistinctness();
    const critical = issues.filter(
      (i) => i.includes('fly-') || i.includes('gf-') || i.includes('evt-') || i.includes('flat'),
    );
    expect(critical).toEqual([]);
  });
});
