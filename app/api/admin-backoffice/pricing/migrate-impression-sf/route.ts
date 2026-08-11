export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  IMPRESSION_SF_MIGRATION_GROUPS,
  listImpressionSfMigrationPilots,
  migrateImpressionSfBatchToDb,
  resolveMigrationPilots,
  type ImpressionSfMigrationGroupId,
  type ImpressionSfMigrationPilot,
} from '@/lib/server/modules/pricing/impression-sf-base-printing-migration.service';

export async function GET() {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  return NextResponse.json({
    ok: true,
    data: {
      groups: IMPRESSION_SF_MIGRATION_GROUPS,
      pilots: listImpressionSfMigrationPilots(),
    },
  });
}

export async function POST(req: Request) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      pilot?: string;
      pilots?: string[];
      group?: ImpressionSfMigrationGroupId;
      publish?: boolean;
      referenceQty?: number;
    };

    const pilots = resolveMigrationPilots({
      pilot: body.pilot as ImpressionSfMigrationPilot | undefined,
      pilots: body.pilots as ImpressionSfMigrationPilot[] | undefined,
      group: body.group,
    });

    const result = await migrateImpressionSfBatchToDb({
      pilots,
      publish: body.publish,
      referenceQty: body.referenceQty,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('[admin-backoffice/pricing/migrate-impression-sf]', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: safeErrorMessage(error, 'Migration ISF échouée'),
          code: 'MIGRATION_ERROR',
        },
      },
      { status: 503 },
    );
  }
}
