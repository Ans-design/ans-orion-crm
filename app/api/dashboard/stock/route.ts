import { createDashboardSliceRoute } from '../_slice-utils';
import { getDashboardStockSlice } from '@/lib/services/dashboard-slices';

export const dynamic = 'force-dynamic';

export const GET = createDashboardSliceRoute('stock', getDashboardStockSlice);
