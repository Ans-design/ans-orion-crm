import { describe, expect, it } from 'vitest';
import {
  buildTopOrderedArticles,
  buildMachinesByStatus,
  truncateLabel,
} from '@/lib/dashboard/chart-aggregations';
import { formatChartAxisAmount } from '@/lib/dashboard/chart-theme';

describe('chart-aggregations', () => {
  it('truncateLabel tronque les noms longs', () => {
    expect(truncateLabel('Bâche PVC standard 440g laize 160', 24)).toBe('Bâche PVC standard 440g …');
  });

  it('agrège les lignes de commande par article', () => {
    const result = buildTopOrderedArticles([
      {
        id: 'cmd-1',
        lignes: [
          { articleId: 'gf-bache', articleLabel: 'Bâche', quantity: 10, totalLigne: 200000 },
          { articleId: 'flyer-a4', articleLabel: 'Flyer A4', quantity: 500, totalLigne: 150000 },
        ],
      },
      {
        id: 'cmd-2',
        lignes: [
          { articleId: 'gf-bache', articleLabel: 'Bâche', quantity: 5, totalLigne: 100000 },
        ],
      },
    ]);

    const bache = result.find((r) => r.articleId === 'gf-bache');
    expect(bache?.quantity).toBe(15);
    expect(bache?.revenue).toBe(300000);
    expect(bache?.ordersCount).toBe(2);
    expect(result[0]?.articleId).toBe('flyer-a4');
  });

  it('fallback sur en-tête commande sans lignes', () => {
    const result = buildTopOrderedArticles([
      { id: 'cmd-3', article: 'Carte de visite', qty: 2, total: 5000 },
    ]);
    expect(result[0]?.articleName).toBe('Carte de visite');
    expect(result[0]?.quantity).toBe(2);
  });

  it('formatChartAxisAmount évite les 0k pour petits montants', () => {
    expect(formatChartAxisAmount(450)).toBe('450');
    expect(formatChartAxisAmount(12_500)).toBe('13k');
    expect(formatChartAxisAmount(2_400_000)).toBe('2M');
  });

  it('agrège les machines par état sémantique', () => {
    const { data, totalMachines } = buildMachinesByStatus([
      { id: '1', name: 'Presse 1', status: 'running' },
      { id: '2', name: 'Presse 2', status: 'ok' },
      { id: '3', name: 'Coupe', status: 'down' },
    ]);
    expect(totalMachines).toBe(3);
    expect(data.find((d) => d.status === 'en_production')?.count).toBe(1);
    expect(data.find((d) => d.status === 'disponible')?.count).toBe(1);
    expect(data.find((d) => d.status === 'hors_service')?.count).toBe(1);
  });
});
