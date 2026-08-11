import { CAT_LABELS, CATALOGUE } from '@/lib/data/catalogue';
import {
  MACHINE_STATUS_LABELS,
  PRISMA_MACHINE_STATUS_MAP,
} from '@/lib/dashboard/chart-theme';

export type TopArticleData = {
  articleId: string;
  articleName: string;
  shortName: string;
  category: string;
  quantity: number;
  revenue: number;
  ordersCount: number;
};

export type MachineStatusData = {
  status: string;
  label: string;
  count: number;
  percentage: number;
  machineNames: string[];
};

export type OrderLineInput = {
  articleId?: string | null;
  articleLabel: string;
  quantity: number;
  totalLigne: number;
  configSnapshot?: unknown;
};

export type OrderForTopArticles = {
  id: string;
  article?: string;
  qty?: number;
  total?: number;
  lignes?: OrderLineInput[];
};

export type MachineInput = {
  id: string;
  name: string;
  status: string;
};

const catalogueCategoryById = new Map(
  CATALOGUE.map((a) => [a.id, CAT_LABELS[a.category] ?? a.category]),
);

export function truncateLabel(label: string, max = 24): string {
  const t = label.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function resolveCategory(articleId?: string | null, configSnapshot?: unknown): string {
  if (articleId && catalogueCategoryById.has(articleId)) {
    return catalogueCategoryById.get(articleId)!;
  }
  if (configSnapshot && typeof configSnapshot === 'object' && configSnapshot !== null) {
    const cat = (configSnapshot as Record<string, unknown>).category;
    if (typeof cat === 'string' && cat) {
      return CAT_LABELS[cat] ?? cat;
    }
  }
  return 'Autre';
}

export function buildTopOrderedArticles(
  orders: OrderForTopArticles[],
  opts?: {
    limit?: number;
    sortBy?: 'quantity' | 'revenue';
  },
): TopArticleData[] {
  const limit = opts?.limit ?? 8;
  const sortBy = opts?.sortBy ?? 'quantity';
  const map = new Map<
    string,
    TopArticleData & { _orderIds: Set<string> }
  >();

  for (const order of orders) {
    const lines =
      order.lignes && order.lignes.length > 0
        ? order.lignes
        : [
            {
              articleId: null,
              articleLabel: order.article?.trim() || 'Autre',
              quantity: Math.max(1, Number(order.qty ?? 1)),
              totalLigne: Number(order.total ?? 0),
            },
          ];

    for (const item of lines) {
      const key = item.articleId || item.articleLabel.trim() || 'Autre';
      if (!map.has(key)) {
        map.set(key, {
          articleId: item.articleId ?? key,
          articleName: item.articleLabel.trim() || 'Autre',
          shortName: truncateLabel(item.articleLabel.trim() || 'Autre'),
          category: resolveCategory(item.articleId, item.configSnapshot),
          quantity: 0,
          revenue: 0,
          ordersCount: 0,
          _orderIds: new Set(),
        });
      }
      const current = map.get(key)!;
      current.quantity += Math.max(0, Number(item.quantity || 1));
      current.revenue += Math.max(0, Number(item.totalLigne || 0));
      if (!current._orderIds.has(order.id)) {
        current._orderIds.add(order.id);
        current.ordersCount += 1;
      }
    }
  }

  return Array.from(map.values())
    .map(({ _orderIds: _, ...rest }) => rest)
    .sort((a, b) =>
      sortBy === 'revenue' ? b.revenue - a.revenue : b.quantity - a.quantity,
    )
    .slice(0, limit);
}

export function buildMachinesByStatus(machines: MachineInput[]): {
  data: MachineStatusData[];
  totalMachines: number;
} {
  const buckets: Record<string, { count: number; names: string[] }> = {
    hors_service: { count: 0, names: [] },
    maintenance: { count: 0, names: [] },
    disponible: { count: 0, names: [] },
    en_production: { count: 0, names: [] },
    en_attente: { count: 0, names: [] },
  };

  for (const machine of machines) {
    const semantic = PRISMA_MACHINE_STATUS_MAP[machine.status] ?? 'disponible';
    if (!buckets[semantic]) {
      buckets.disponible.count += 1;
      buckets.disponible.names.push(machine.name);
      continue;
    }
    buckets[semantic].count += 1;
    buckets[semantic].names.push(machine.name);
  }

  const total = machines.length;
  const order = ['disponible', 'en_production', 'maintenance', 'en_attente', 'hors_service'];

  const data = order
    .filter((status) => buckets[status].count > 0)
    .map((status) => ({
      status,
      label: MACHINE_STATUS_LABELS[status] ?? status,
      count: buckets[status].count,
      percentage: total > 0 ? Math.round((buckets[status].count / total) * 100) : 0,
      machineNames: buckets[status].names,
    }));

  return { data, totalMachines: total };
}

export type CaByCommercialRow = { name: string; value: number };

export function buildCaByCommercial(
  commandes: { total: number; client?: { commercialName?: string | null; name?: string } | null }[],
): CaByCommercialRow[] {
  const map = new Map<string, number>();
  for (const c of commandes) {
    const key = c.client?.commercialName?.trim() || 'Non assigné';
    map.set(key, (map.get(key) ?? 0) + c.total);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}
