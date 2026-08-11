import { describe, expect, it } from 'vitest';

describe('tournee-types', () => {
  it('clé de groupe livreur+date stable', () => {
    const key = (livreur: string, date: string) =>
      `${livreur.trim().toLowerCase()}::${date}`;

    expect(key('ANS DESIGN — livraison interne', '2026-07-05')).toBe(
      'ans design — livraison interne::2026-07-05',
    );
    expect(key(' Taxi ', '2026-07-05')).toBe('taxi::2026-07-05');
  });
});
