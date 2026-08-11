import { createDashboardSliceRoute } from '../_slice-utils';
import { getDashboardFinanceSlice } from '@/lib/services/dashboard-slices';

export const dynamic = 'force-dynamic';

export const GET = createDashboardSliceRoute('finance', getDashboardFinanceSlice);
