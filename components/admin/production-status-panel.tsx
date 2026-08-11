'use client';

import { SectionBlock, StatusGrid, StatusPill } from '@/components/ui/section-layout';

export type ProductionStatusData = {
  app?: { ok?: boolean; runtime?: string };
  db?: { ok?: boolean; database?: string; latencyMs?: number; error?: string };
  seed?: { ready?: boolean; score?: string; counts?: Record<string, number> };
};

type Props = {
  prodStatus: ProductionStatusData;
  showSeed?: boolean;
};

/** Santé runtime / base — statuts plats, sans carte dans carte */
export function ProductionStatusPanel({ prodStatus, showSeed = false }: Props) {
  return (
    <SectionBlock
      title="Environnement & base de données"
      description="Runtime local ou Vercel, connexion Prisma / PostgreSQL"
    >
      <StatusGrid columns={showSeed ? 3 : 2}>
        <StatusPill
          label={`Runtime ${prodStatus.app?.runtime ?? 'nodejs'}`}
          ok={prodStatus.app?.ok}
          warn={!prodStatus.app?.ok}
          detail={prodStatus.app?.ok ? 'Application opérationnelle' : 'Vérifier le serveur'}
        />
        <StatusPill
          label={`Base ${prodStatus.db?.database ?? '—'}`}
          ok={prodStatus.db?.ok}
          warn={!prodStatus.db?.ok}
          detail={
            prodStatus.db?.ok
              ? `Connectée${prodStatus.db?.latencyMs != null ? ` · ${prodStatus.db.latencyMs} ms` : ''}`
              : prodStatus.db?.error ?? 'Connexion indisponible'
          }
        />
        {showSeed && (
          <StatusPill
            label={`Seed ${prodStatus.seed?.score ?? '—'}`}
            ok={prodStatus.seed?.ready}
            warn={!prodStatus.seed?.ready}
            detail={prodStatus.seed?.ready ? 'Données de référence OK' : 'npm run seed:incremental'}
          />
        )}
      </StatusGrid>
    </SectionBlock>
  );
}
