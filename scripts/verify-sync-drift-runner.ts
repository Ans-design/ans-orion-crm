/**
 * Logique vérifiable drift sync — utilisée par CLI et tests CI.
 */
import { patchPostgresSchema, restorePostgresSchema } from './lib/postgres-prisma-patch';

export class DriftVerifyError extends Error {
  constructor(
    message: string,
    readonly code: 'DRIFT_CRITICAL' | 'DB_UNAVAILABLE' | 'MISSING_DATABASE_URL',
  ) {
    super(message);
    this.name = 'DriftVerifyError';
  }
}

type DriftAnalyzeResult = {
  totalScore: number;
  alerts: Array<{ severity: string; title: string; message: string }>;
  catalogueDb?: { missingInDb?: number } | null;
  pricing?: { published?: number } | null;
  dbUnavailable?: boolean;
};

export default async function runVerifySyncDrift(opts?: {
  analyze?: () => Promise<DriftAnalyzeResult>;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    await import('dotenv/config');
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new DriftVerifyError('DATABASE_URL requis', 'MISSING_DATABASE_URL');
  }

  const usePostgres = !opts?.analyze && url.startsWith('postgres');
  if (usePostgres) patchPostgresSchema();

  try {
    const report = opts?.analyze
      ? await opts.analyze()
      : await (await import('@/lib/services/sync-drift-service')).runFullSyncDriftAnalysis();

    console.log('\n📡 Vérification drift sync ANS ORION\n');

    console.log(`  Score drift   : ${report.totalScore}`);
    console.log(`  Alertes       : ${report.alerts.length}`);
    console.log(`  Catalogue/DB  : ${report.catalogueDb?.missingInDb ?? '—'} manquants DB`);
    console.log(`  Prix publiés  : ${report.pricing?.published ?? '—'}`);

    for (const alert of report.alerts) {
      const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warn' ? '🟡' : 'ℹ️';
      console.log(`  ${icon} [${alert.severity}] ${alert.title} — ${alert.message}`);
    }

    const critical = report.alerts.filter((a) => a.severity === 'critical');
    if (report.dbUnavailable) {
      console.log('\n⚠️  Base de données indisponible — drift métier non calculable (code sortie 2)');
      throw new DriftVerifyError('DB unavailable', 'DB_UNAVAILABLE');
    }
    if (critical.length > 0) {
      console.log('\n❌ Drift critique — corriger avant publication opérationnelle');
      throw new DriftVerifyError('Critical drift', 'DRIFT_CRITICAL');
    }

    console.log('\n✅ Aucun drift critique détecté');
  } finally {
    if (usePostgres) restorePostgresSchema();
  }
}
