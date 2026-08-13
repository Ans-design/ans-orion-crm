import { describe, expect, it } from 'vitest';
import { createClientSchema, quickCreateClientSchema, updateClientSchema } from '@/lib/validators/crm';
import { validateNif } from '@/lib/clients/client-display';

describe('NIF / STAT optionnels', () => {
  it('validateNif — vide autorisé', () => {
    expect(validateNif('')).toBeNull();
    expect(validateNif('   ')).toBeNull();
  });

  it('validateNif — chiffres OK, lettres refusées', () => {
    expect(validateNif('5007757659')).toBeNull();
    expect(validateNif('ABC')).toBe('Le NIF ne doit contenir que des chiffres');
  });

  it('création — nom seul sans NIF ni STAT', () => {
    const r = createClientSchema.safeParse({ name: 'Jean Rakoto' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.nif ?? null).toBeNull();
      expect(r.data.statNumber ?? null).toBeNull();
    }
  });

  it('création — NIF et STAT vides / null', () => {
    for (const payload of [
      { name: 'Marie', nif: '', statNumber: '' },
      { name: 'Marie', nif: null, statNumber: null },
      { name: 'Marie', nif: '   ', statNumber: '  ' },
    ]) {
      const r = createClientSchema.safeParse(payload);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.nif ?? null).toBeNull();
        expect(r.data.statNumber ?? null).toBeNull();
      }
    }
  });

  it('création — NIF chiffres conservé', () => {
    const r = createClientSchema.safeParse({ name: 'SARL Demo', nif: '123456789', statNumber: 'STAT-1' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.nif).toBe('123456789');
      expect(r.data.statNumber).toBe('STAT-1');
    }
  });

  it('création — NIF lettres rejeté', () => {
    const r = createClientSchema.safeParse({ name: 'Marie', nif: 'ABC12' });
    expect(r.success).toBe(false);
  });

  it('update partiel sans NIF (notes seules) — ne doit pas vider le NIF', () => {
    const r = updateClientSchema.safeParse({ notes: 'ok' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.nif).toBeUndefined();
      expect(r.data.statNumber).toBeUndefined();
    }
  });

  it('update peut vider le NIF', () => {
    const r = updateClientSchema.safeParse({ nif: '', statNumber: '' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.nif ?? null).toBeNull();
      expect(r.data.statNumber ?? null).toBeNull();
    }
  });

  it('quick-create POS — NIF optionnel', () => {
    const empty = quickCreateClientSchema.safeParse({ name: 'Client POS' });
    expect(empty.success).toBe(true);
    const blank = quickCreateClientSchema.safeParse({ name: 'Client POS', nif: '' });
    expect(blank.success).toBe(true);
    const bad = quickCreateClientSchema.safeParse({ name: 'Client POS', nif: 'xx' });
    expect(bad.success).toBe(false);
  });
});
