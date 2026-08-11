import { describe, expect, it } from 'vitest';
import { readMga, commandeMoneyFields } from '@/lib/money/amounts';
import { computePaidTotal } from '@/lib/finance/payment-totals';
import { commandeRemainingAmount } from '@/lib/server/modules/paiements/paiements.repository';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('FIN-01 Int MGA schema', () => {
  it('schema Prisma : Commande/Paiement/Facture/Devis en Int monétaire', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    const commandeBlock = schema.slice(schema.indexOf('model Commande {'), schema.indexOf('model CommandeBlocage'));
    expect(commandeBlock).toMatch(/total\s+Int/);
    expect(commandeBlock).toMatch(/acompte\s+Int/);
    expect(commandeBlock).not.toMatch(/total\s+Float/);
    expect(commandeBlock).not.toMatch(/totalAriary/);

    const paiementStart = schema.indexOf('model Paiement {');
    const paiementEnd = schema.indexOf('model Livraison {', paiementStart);
    const paiementBlock = schema.slice(paiementStart, paiementEnd);
    expect(paiementBlock).toMatch(/montant\s+Int/);
    expect(paiementBlock).not.toMatch(/montant\s+Float/);
    expect(paiementBlock).not.toMatch(/montantAriary/);
  });

  it('readMga / ledger', () => {
    expect(readMga(100.4)).toBe(100);
    expect(commandeMoneyFields({ total: 1000, acompte: 400 })).toEqual({
      total: 1000,
      acompte: 400,
      reste: 600,
    });
    expect(
      computePaidTotal([
        { montant: 200, type: 'Acompte' },
        { montant: 50, type: 'Remboursement' },
      ]),
    ).toBe(150);
    expect(commandeRemainingAmount(1000, [{ montant: 200, type: 'Acompte' }])).toBe(800);
  });
});
