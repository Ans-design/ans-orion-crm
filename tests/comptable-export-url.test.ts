import { describe, expect, it } from 'vitest';
import {
  buildComptableExportUrl,
  defaultComptableExportRange,
  resolveComptableExportRange,
} from '@/lib/finance/comptable-export-url';

describe('comptable export url', () => {
  it('construit l’URL avec from/to et format', () => {
    const url = buildComptableExportUrl({ from: '2026-01-01', to: '2026-01-31' }, 'dgi');
    expect(url).toContain('from=2026-01-01');
    expect(url).toContain('format=dgi');
  });

  it('résout une plage preset mois', () => {
    const range = resolveComptableExportRange({ period: 'month', dateFrom: '', dateTo: '' });
    expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('fallback mois courant si période all', () => {
    const range = resolveComptableExportRange({ period: 'all', dateFrom: '', dateTo: '' });
    const fallback = defaultComptableExportRange();
    expect(range.from).toBe(fallback.from);
    expect(range.to).toBe(fallback.to);
  });
});
