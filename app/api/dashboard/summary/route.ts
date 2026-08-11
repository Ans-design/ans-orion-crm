import { createDashboardSliceRoute } from '../_slice-utils';
import { getDashboardSummary } from '@/lib/services/dashboard-slices';

export const dynamic = 'force-dynamic';

export const GET = createDashboardSliceRoute('summary', getDashboardSummary);
