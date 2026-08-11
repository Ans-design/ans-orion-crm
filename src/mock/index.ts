import { mockDashboard } from '@/src/mock/dashboard';
import { mockFinance } from '@/src/mock/finance';
import { mockOrders } from '@/src/mock/orders';
import { mockPermissions } from '@/src/mock/permissions';
import { mockPricing } from '@/src/mock/pricing';
import { mockProduction } from '@/src/mock/production';
import { mockProducts } from '@/src/mock/products';
import { mockRoles } from '@/src/mock/roles';
import { mockSettings } from '@/src/mock/settings';
import { mockStock } from '@/src/mock/stock';
import { mockTasks } from '@/src/mock/tasks';
import { mockUsers } from '@/src/mock/users';

export const MOCK_DATASETS = {
  tasks: mockTasks,
  users: mockUsers,
  roles: mockRoles,
  permissions: mockPermissions,
  products: mockProducts,
  pricing: mockPricing,
  orders: mockOrders,
  stock: mockStock,
  production: mockProduction,
  dashboard: mockDashboard,
  finance: mockFinance,
  settings: mockSettings,
} as const;

export type MockDatasetKey = keyof typeof MOCK_DATASETS;

export function getMockDataset(key: string): unknown {
  if (key in MOCK_DATASETS) return MOCK_DATASETS[key as MockDatasetKey];
  return null;
}
