export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession, requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { ok } from '@/lib/server/http/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import {
  permissionUpdateSchema,
  patchPermissionSchema,
} from '@/lib/server/modules/permissions/permissions.validation';
import {
  getEffectiveModuleAccess,
  getPermissionAdminMatrix,
  getPermissionSyncStats,
  getUserPermissionMatrix,
  resetRolePermissions,
  resetUserOverrides,
  upsertRoleModulePermission,
  upsertUserModuleOverride,
} from '@/lib/services/permission-admin-service';
import type { PermissionFlags } from '@/lib/modules/types';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  if (searchParams.get('stats') === '1' || searchParams.get('effective') === '1') {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    if (searchParams.get('stats') === '1') {
      return runApiHandler('admin/permissions stats GET', async () => {
        try {
          return ok(await getPermissionSyncStats());
        } catch (error) {
          return ok({ roles: 0, modules: 0, overrides: 0, degraded: true }, { warning: safeErrorMessage(error) });
        }
      });
    }

    return runApiHandler('admin/permissions effective GET', async () => {
      try {
        const access = await getEffectiveModuleAccess(auth.role, auth.userId);
        const moduleAccess: Record<string, Partial<PermissionFlags>> = {};
        for (const [id, flags] of Object.entries(access)) {
          if (!flags.canView) moduleAccess[id] = { canView: false };
        }
        return ok({ moduleAccess, access });
      } catch (error) {
        console.error('Effective permissions error:', error);
        return ok({ moduleAccess: {}, access: {} }, { degraded: true });
      }
    });
  }

  const auth = await requirePermission('users:manage');
  if ('error' in auth) return auth.error;

  const userId = searchParams.get('userId');
  if (userId) {
    return runApiHandler('admin/permissions user matrix GET', async () => {
      return NextResponse.json(await getUserPermissionMatrix(userId));
    });
  }

  return runApiHandler('admin/permissions matrix GET', async () => {
    return NextResponse.json(await getPermissionAdminMatrix());
  });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('users:manage');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/permissions POST', async (): Promise<Response> => {
    const parsed = parseBody(permissionUpdateSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const { action, role, userId, moduleId, flags } = parsed.data;

    if (action === 'reset_role') {
      if (!role) return apiError('role requis', 400);
      return NextResponse.json(await resetRolePermissions(role));
    }

    if (action === 'reset_user') {
      if (!userId) return apiError('userId requis', 400);
      return NextResponse.json(await resetUserOverrides(userId));
    }

    if (action === 'update_role') {
      if (!role) return apiError('role requis', 400);
      return NextResponse.json(await upsertRoleModulePermission(role, moduleId, flags ?? {}));
    }

    if (action === 'update_user') {
      if (!userId) return apiError('userId requis', 400);
      return NextResponse.json(await upsertUserModuleOverride(userId, moduleId, flags ?? {}));
    }

    return apiError('Action inconnue', 400);
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('users:manage');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/permissions PATCH', async (): Promise<Response> => {
    const parsed = parseBody(patchPermissionSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { role, moduleId, flags } = parsed.data;
    return NextResponse.json(await upsertRoleModulePermission(role, moduleId, flags));
  });
}
