import { createDashboardSliceRoute } from '../_slice-utils';
import { getDashboardProductionSlice } from '@/lib/services/dashboard-slices';

export const dynamic = 'force-dynamic';

export const GET = createDashboardSliceRoute('production', getDashboardProductionSlice);
