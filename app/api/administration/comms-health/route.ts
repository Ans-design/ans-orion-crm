export const dynamic = 'force-dynamic';

import { ok } from '@/lib/server/http/api-response';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { getCommsHealth } from '@/lib/comms/comms-health';

/** Centre admin santé communications — V14 Vague 3 */
export const GET = withAuthApi(
  'admin comms-health GET',
  async () => {
    const report = await getCommsHealth();
    return ok(report, { quality: report.quality });
  },
  {
    adminOrManager: true,
    fallbackResponse: {
      ok: false,
      error: { message: 'Santé communications indisponible', code: 'UNAVAILABLE' },
      meta: { quality: 'ERROR' },
    },
  },
);
