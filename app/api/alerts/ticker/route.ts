export const dynamic = 'force-dynamic';

import { ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { getTickerAlerts } from '@/lib/services/ops-alerts';
import { hasPermission, type Permission } from '@/lib/auth/permissions';

const ALWAYS_VISIBLE = new Set(['task-mine', 'broadcast', 'custom', 'info', 'machine-down']);

const TICKER_PERM_BY_TYPE: Record<string, Permission | Permission[]> = {
  retard: 'commandes:read',
  urgent: 'commandes:read',
  facture: 'factures:read',
  devis: 'devis:read',
  bat: 'bat:read',
  stock: 'stock:read',
  reclamation: 'clients:read',
  'task-blocked': 'production:read',
  'retard-prod': 'planning:read',
  'machine-down': 'production:read',
  maintenance: 'production:read',
  'sync-drift': 'config:view',
  'sync-drift-critical': 'config:view',
  custom: 'commandes:read',
  info: 'commandes:read',
  broadcast: 'commandes:read',
  'task-mine': 'commandes:read',
};

function canSeeTickerType(role: string, type: string): boolean {
  if (ALWAYS_VISIBLE.has(type)) return true;
  if (role === 'admin' || role === 'manager') return true;
  const req = TICKER_PERM_BY_TYPE[type] ?? 'commandes:read';
  const perms = Array.isArray(req) ? req : [req];
  return perms.some((p) => hasPermission(role, p));
}

export const GET = withAuthApi(
  'alerts ticker GET',
  async (auth: AuthApiContext) => {
    const all = await getTickerAlerts({
      userId: auth.userId,
      userName: auth.userName,
      role: auth.role,
    });
    const alertes = all.filter((a) => canSeeTickerType(auth.role, a.type));
    return ok({ alertes, updatedAt: new Date().toISOString(), quality: 'OK' });
  },
  {
    fallbackResponse: {
      ok: false,
      error: { message: 'Ticker indisponible', code: 'UNAVAILABLE' },
      meta: { quality: 'ERROR' },
    },
  },
);
