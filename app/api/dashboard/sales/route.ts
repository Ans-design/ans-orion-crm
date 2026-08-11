import { createDashboardSliceRoute } from '../_slice-utils';
import { getDashboardSalesSlice } from '@/lib/services/dashboard-slices';

export const dynamic = 'force-dynamic';

export const GET = createDashboardSliceRoute('sales', getDashboardSalesSlice);
