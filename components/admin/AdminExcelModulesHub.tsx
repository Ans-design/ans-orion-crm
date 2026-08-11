'use client';

import Link from 'next/link';
import { FileSpreadsheet, ExternalLink } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { ADMIN_EXCEL_MODULES, type AdminExcelModule } from '@/lib/admin/excel-import-export';

const MODULE_WORKSPACE: Record<string, string> = {
  materials: '/administration/matieres',
  chips: '/administration/catalogue-pos?studio=chips',
  'production-flux': '/administration/production-flux',
  'pricing-articles': '/administration/backoffice?macro=catalogue&module=pricing&tab=pricing-custom',
  tiers: '/administration/backoffice?macro=catalogue&module=pricing&tab=tiers',
  audit: '/administration/vue-ensemble',
  catalogue: '/administration/catalogue-pos',
  users: '/admin/permissions',
  permissions: '/admin/permissions',
  suppliers: '/fournisseurs',
  'business-rules': '/parametres/regles',
  variables: '/administration/backoffice?macro=catalogue&module=pricing&tab=pricing-custom',
  anomalies: '/administration/backoffice?macro=catalogue&module=audit&tab=anomalies',
  'article-templates': '/administration/modeles-articles',
  annexes: '/admin/annexes',
  'sync-diagnostics': '/administration/synchronisation',
  carriers: '/administration/logistique',
};

const MODE_LABEL: Record<AdminExcelModule['mode'], string> = {
  full: 'Import complet',
  upsert: 'Import / export',
  'export-only': 'Export seul',
};

type Props = {
  canEdit?: boolean;
};

export function AdminExcelModulesHub({ canEdit = false }: Props) {
  return (
    <div className="pta-panel space-y-3">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <h3 className="orion-section-title mb-0">Modules Excel standardisés</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Chaque module dispose de sa toolbar Excel (export `.xlsx`, import MODE B ou complet selon le référentiel).
        Les exports JSON ci-dessous restent disponibles pour sauvegardes techniques.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_EXCEL_MODULES.map((mod) => {
          const href = MODULE_WORKSPACE[mod.id] ?? '/administration/vue-ensemble';
          const importable = mod.mode !== 'export-only' && canEdit;
          return (
            <div
              key={mod.id}
              className="rounded-lg border border-border/70 bg-card/50 p-3 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{mod.label}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    ans-orion-{mod.fileStem}-YYYY-MM-DD.xlsx
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                  {MODE_LABEL[mod.mode]}
                </span>
              </div>
              <AppButton asChild variant="ghost" size="sm" className="w-fit text-xs">
                <Link href={href}>
                  <ExternalLink className="h-3 w-3" />
                  Ouvrir le module
                </Link>
              </AppButton>
              {importable && mod.importEndpoint && (
                <p className="text-[10px] text-muted-foreground">
                  Import via toolbar du module — pas de seed automatique.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
