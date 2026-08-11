'use client';

import { useMemo } from 'react';
import { ChevronDown, Download, FileBarChart, FileSpreadsheet, Landmark } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { uxToast } from '@/lib/ux/feedback';
import {
  buildComptableExportUrl,
  resolveComptableExportRange,
} from '@/lib/finance/comptable-export-url';
import type { ModuleDateFilter } from '@/lib/date-filter';
import type { ComptableExportFormat } from '@/lib/finance/comptable-dgi-export';

type Props = {
  filter?: ModuleDateFilter | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showDgi?: boolean;
  /** menu = 1 bouton (recommandé) · buttons = anciens boutons côte à côte */
  layout?: 'menu' | 'buttons';
  /** Option rapport pilotage CSV (page Rapports) */
  onReportCsv?: () => void;
  reportCsvLabel?: string;
};

function launchExport(range: { from: string; to: string }, format: ComptableExportFormat) {
  window.open(buildComptableExportUrl(range, format), '_blank', 'noopener,noreferrer');
  const label = format === 'dgi' ? 'DGI / SYSCOHADA' : 'comptable';
  uxToast.success(`Export ${label} ${range.from} → ${range.to}`);
}

/** Lance l'export CSV comptable (standard + option DGI Madagascar). */
export function ComptableExportButton({
  filter,
  variant = 'default',
  size = 'sm',
  className,
  showDgi = true,
  layout = 'menu',
  onReportCsv,
  reportCsvLabel = 'Rapport période (CSV)',
}: Props) {
  const range = useMemo(() => resolveComptableExportRange(filter), [filter]);
  const rangeHint = `${range.from} → ${range.to}`;

  if (layout === 'buttons') {
    return (
      <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
        <AppButton
          type="button"
          variant="outline"
          size={size}
          onClick={() => launchExport(range, 'standard')}
          className="gap-2"
          title={`Exporter factures et paiements du ${range.from} au ${range.to}`}
        >
          <FileSpreadsheet size={14} />
          Export comptable
        </AppButton>
        {showDgi ? (
          <AppButton
            type="button"
            variant="outline"
            size={size}
            onClick={() => launchExport(range, 'dgi')}
            className="gap-2"
            title="Export écritures SYSCOHADA — non certifié DGI, validation expert requise"
          >
            <Landmark size={14} />
            Export DGI
          </AppButton>
        ) : null}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AppButton
          type="button"
          variant={variant}
          size={size}
          className={`gap-1.5 whitespace-nowrap ${className ?? ''}`}
          aria-label="Exporter les données"
        >
          <Download size={14} aria-hidden />
          Exporter
          <ChevronDown size={14} className="opacity-70" aria-hidden />
        </AppButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[15.5rem]">
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Période {rangeHint}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onReportCsv ? (
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onSelect={() => onReportCsv()}
          >
            <FileBarChart size={14} className="shrink-0 text-[var(--primary)]" aria-hidden />
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="font-medium leading-tight">{reportCsvLabel}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                Indicateurs pilotage
              </span>
            </span>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onSelect={() => launchExport(range, 'standard')}
        >
          <FileSpreadsheet size={14} className="shrink-0 text-[var(--primary)]" aria-hidden />
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className="font-medium leading-tight">Comptable</span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              Factures & paiements
            </span>
          </span>
        </DropdownMenuItem>
        {showDgi ? (
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onSelect={() => launchExport(range, 'dgi')}
            title="Non certifié DGI — validation expert requise"
          >
            <Landmark size={14} className="shrink-0 text-[var(--primary)]" aria-hidden />
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="font-medium leading-tight">DGI / SYSCOHADA</span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                Écritures Madagascar
              </span>
            </span>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
