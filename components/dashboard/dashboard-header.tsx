/** Monté depuis app/(app)/dashboard/page.tsx (use client) — pas d'entrée client locale (évite ts71007). */
import Link from "next/link";
import { RefreshCw, Bell, LayoutGrid, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DashboardView = "executive" | "operations" | "finance" | "board";

const VIEWS: { id: DashboardView; label: string }[] = [
  { id: "executive", label: "Vue Exécutive" },
  { id: "operations", label: "Ops (synthèse)" },
  { id: "finance", label: "Finance" },
  { id: "board", label: "Synthèse Board" },
];

type Props = {
  view: DashboardView;
  onViewChange: (v: DashboardView) => void;
  onRefresh: () => void;
  loading?: boolean;
  alertCount?: number;
};

export function DashboardHeader({
  view,
  onViewChange,
  onRefresh,
  loading,
  alertCount = 0,
}: Props) {
  return (
    <header className="dashboard-header relative z-20 mb-1 rounded-[7px] bg-[var(--bg-card)] p-4 sm:p-5 shadow-[var(--shadow-card)] dark:shadow-none dark:border dark:border-[var(--border-soft)]">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-active,#FFE4EC)] text-[var(--accent-primary,#FF174D)]">
              <LayoutGrid size={18} aria-hidden />
            </span>
            <div>
              <h1 className="font-display orion-text-page-title font-bold tracking-tight text-[var(--text-main)]">
                Cockpit Principal
              </h1>
              <p className="text-detail text-[var(--text-muted)] mt-0.5">
                ANS ORION · CRM · GPAO · Direction 360°
              </p>
            </div>
            {alertCount > 0 && (
              <span className="inline-flex items-center gap-1 text-meta font-bold uppercase px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                <Bell size={12} aria-hidden />
                {alertCount} alerte{alertCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex flex-wrap gap-1 rounded-[var(--radius-ui,12px)] bg-[var(--bg-hover,#EEF2F7)] p-1 dark:bg-[var(--bg-surface)]"
            role="tablist"
            aria-label="Vues cockpit"
          >
            {VIEWS.map((v) => {
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onViewChange(v.id)}
                  className={
                    active
                      ? "min-h-[40px] rounded-[7px] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--accent-primary,#FF174D)] shadow-sm"
                      : "min-h-[40px] rounded-[7px] px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }
                >
                  {v.label}
                </button>
              );
            })}
          </div>
          <Button asChild variant="outline" size="sm" className="min-h-[40px] rounded-[7px] gap-1.5">
            <Link href="/operations">
              Voir les opérations
              <ExternalLink size={13} aria-hidden />
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="min-h-[40px] rounded-[7px] gap-1.5"
            aria-label="Actualiser le cockpit"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualiser
          </Button>
        </div>
      </div>
    </header>
  );
}
