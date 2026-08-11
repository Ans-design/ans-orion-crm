import { describe, expect, it } from 'vitest';
import {
  deriveMaterialGroupKey,
  flattenMasterDataGroups,
  groupMasterDataRows,
  filterMasterDataRows,
} from '@/lib/backoffice/master-data-grouping';

describe('master-data-grouping', () => {
  it('regroupe les variantes PCB par materialKey', () => {
    const rows = [
      { id: '1', name: 'PCB 130 G', materialKey: 'pcb', grammage: '130g' },
      { id: '2', name: 'PCB 300 G', materialKey: 'pcb', grammage: '300g' },
      { id: '3', name: 'Acrylic 3mm', materialKey: 'acrylic', thickness: '3mm' },
    ];
    const groups = groupMasterDataRows(rows);
    expect(groups).toHaveLength(2);
    const pcb = groups.find((g) => g.key === 'pcb');
    expect(pcb?.rows).toHaveLength(2);
    const flat = flattenMasterDataGroups(groups);
    expect(flat.filter((i) => i.kind === 'group')).toHaveLength(2);
    expect(flat.filter((i) => i.kind === 'row')).toHaveLength(3);
  });

  it('dérive la clé sans materialKey', () => {
    expect(deriveMaterialGroupKey({ id: 'x', name: 'Akilux 3mm', grammage: '3mm' })).toBe('akilux');
  });

  it('filtre en live sur nom et réf', () => {
    const rows = [
      { id: 'ref-abc', name: 'Vinyle', family: 'Grand format', materialKey: 'vinyl' },
      { id: 'ref-xyz', name: 'PCB 130G', family: 'Petit format', materialKey: 'pcb' },
    ];
    expect(filterMasterDataRows(rows, 'pcb')).toHaveLength(1);
    expect(filterMasterDataRows(rows, 'ref-abc')).toHaveLength(1);
  });

  it('filtre multi-mots — tous les tokens doivent matcher', () => {
    const rows = [
      { id: '1', name: 'PCB 130 G', family: 'Petit format', materialKey: 'pcb', grammage: '130g' },
      { id: '2', name: 'PCB 300 G', family: 'Petit format', materialKey: 'pcb', grammage: '300g' },
      { id: '3', name: 'Vinyle blanc', family: 'Grand format', materialKey: 'vinyl' },
    ];
    expect(filterMasterDataRows(rows, 'pcb 130')).toHaveLength(1);
    expect(filterMasterDataRows(rows, 'pcb 300')).toHaveLength(1);
    expect(filterMasterDataRows(rows, 'grand vinyle')).toHaveLength(1);
    expect(filterMasterDataRows(rows, 'pcb grand')).toHaveLength(0);
  });
});
