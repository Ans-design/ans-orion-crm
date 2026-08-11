import { describe, expect, it } from 'vitest';
import {
  applyFinitionSurcharge,
  collectFinitionLabels,
  isRectoVerso,
  resolveConfigFace,
  resolveConfigQty,
  resolveForcedUnitPrice,
} from '@/lib/pricing/config-normalize';

describe('config-normalize', () => {
  it('detects recto-verso variants', () => {
    expect(isRectoVerso('Recto-verso')).toBe(true);
    expect(isRectoVerso('Recto-Verso')).toBe(true);
    expect(isRectoVerso('Recto seul')).toBe(false);
  });

  it('resolveConfigFace préfère face_interieur', () => {
    expect(resolveConfigFace({ face: 'Recto', face_interieur: 'Recto-verso' })).toBe('Recto-verso');
    expect(resolveConfigFace({ face: 'Recto' })).toBe('Recto');
  });

  it('collects string and array finitions', () => {
    expect(collectFinitionLabels({ finition: 'Pelliculage mat' })).toEqual(['Pelliculage mat']);
    expect(collectFinitionLabels({ finitions: ['Dorure', 'Sans finition'] })).toEqual(['Dorure']);
  });

  it('applies finition surcharge per option', () => {
    expect(applyFinitionSurcharge(1000, { finitions: ['A', 'B'] })).toBe(1240);
    expect(applyFinitionSurcharge(1000, { finition: 'Sans finition' })).toBe(1000);
    expect(applyFinitionSurcharge(1000, { type: 'Mat' }, 'fin-vernis')).toBe(1000);
    expect(applyFinitionSurcharge(1000, { finitions: ['A'] }, undefined, 15)).toBe(1150);
  });

  it('resolves forced price from prix_unitaire', () => {
    expect(resolveForcedUnitPrice({ prix_unitaire: 3500 })).toBe(3500);
    expect(resolveForcedUnitPrice({ _prix_force: 2000 })).toBe(2000);
  });

  it('resolves qty from config keys', () => {
    expect(resolveConfigQty({ qty: 500 })).toBe(500);
    expect(resolveConfigQty({ quantite: 25 })).toBe(25);
    expect(resolveConfigQty({})).toBe(1);
  });
});
