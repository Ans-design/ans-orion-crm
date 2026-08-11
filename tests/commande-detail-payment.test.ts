import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/modules/commandes/commandes.repository', () => ({
  commandesRepository: {
    findByIdWithDetail: vi.fn(),
  },
}));

vi.mock('@/lib/server/modules/commandes/commandes-payment-totals', () => ({
  batchCommandePaymentTotals: vi.fn(),
  applyPaymentTotalsToCommande: vi.fn((row, totals) => {
    const t = totals.get(row.id);
    return t ? { ...row, acompte: t.acompte, reste: t.reste } : row;
  }),
}));

import { commandesRepository } from '@/lib/server/modules/commandes/commandes.repository';
import { batchCommandePaymentTotals } from '@/lib/server/modules/commandes/commandes-payment-totals';
import { getCommandeDetail } from '@/lib/server/modules/commandes/commandes.service';

describe('getCommandeDetail payment totals', () => {
  it('applique les totaux live depuis batchCommandePaymentTotals', async () => {
    vi.mocked(commandesRepository.findByIdWithDetail).mockResolvedValueOnce({
      id: 'cmd-1',
      numero: 'CMD-001',
      total: 100_000,
      acompte: 0,
      reste: 100_000,
    } as never);

    const totalsMap = new Map([['cmd-1', { acompte: 40_000, reste: 60_000 }]]);
    vi.mocked(batchCommandePaymentTotals).mockResolvedValueOnce(totalsMap);

    const detail = await getCommandeDetail('cmd-1');
    expect(detail?.acompte).toBe(40_000);
    expect(detail?.reste).toBe(60_000);
  });
});
