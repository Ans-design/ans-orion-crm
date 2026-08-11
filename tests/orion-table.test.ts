import { describe, expect, it } from 'vitest';
import { toOrionColumnDefs } from '@/lib/orion/table-columns';

type Row = { id: string; name: string; amount: number };

describe('toOrionColumnDefs', () => {
  it('mappe les colonnes simples vers ColumnDef TanStack', () => {
    const defs = toOrionColumnDefs<Row>([
      { id: 'name', accessorKey: 'name', header: 'Nom', cell: (r) => r.name, enableSorting: true },
      { id: 'amount', accessorKey: 'amount', header: 'Montant', cell: (r) => r.amount },
    ]);

    expect(defs).toHaveLength(2);
    expect(defs[0]?.id).toBe('name');
    expect(defs[0]?.enableSorting).toBe(true);
    expect(defs[1]?.id).toBe('amount');
  });

  it('conserve les meta className pour le rendu', () => {
    const defs = toOrionColumnDefs<Row>([
      {
        id: 'amount',
        header: 'Montant',
        cell: () => null,
        className: 'text-right',
        headerClassName: 'text-right',
      },
    ]);

    expect(defs[0]?.meta).toEqual({ className: 'text-right', headerClassName: 'text-right' });
  });
});
