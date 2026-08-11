"use client";


import { AppButton } from '@/components/ui/app-ui';
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { uxToast } from "@/lib/ux/feedback";
import { deriveMaterialTableFields } from "@/lib/backoffice/material-table-fields";
import type { MaterialPriceUnifiedRow } from "@/components/backoffice-v2/pricing-custom/material-prices/types";
import { OptionsEmptyState } from "@/components/backoffice-v2/options/OptionsEmptyState";
import { OptionsLoadingState } from "@/components/backoffice-v2/options/OptionsLoadingState";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExcelTableActions } from "@/components/admin/excel-table-actions";
import { AdminBulkSelectBar } from "@/components/admin/AdminBulkSelectBar";
import { AdminActionsColumnHeader } from "@/components/admin/AdminRowActions";

type UnifiedRow = MaterialPriceUnifiedRow;

type Props = {
  canEdit: boolean;
  onDataChanged?: () => void;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function MaterialsCorbeilleTable({ canEdit, onDataChanged }: Props) {
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UnifiedRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        "/api/admin-backoffice/pricing/base-material-prices?archived=1",
        {
          cache: "no-store",
        },
      );
      let d: {
        ok?: boolean;
        error?: { message?: string } | string;
        data?: { rows?: UnifiedRow[] };
      };
      try {
        d = await r.json();
      } catch {
        throw new Error(`Réponse serveur invalide (${r.status})`);
      }
      if (!r.ok || !d.ok) {
        const msg =
          typeof d.error === "string"
            ? d.error
            : (d.error?.message ?? `Erreur serveur (${r.status})`);
        throw new Error(msg);
      }
      setRows(d.data?.rows ?? []);
      setSelectedIds(new Set());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      console.error("[Stock & Matières] corbeille load", msg);
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const fields = deriveMaterialTableFields(row);
      const blob = [
        fields.materialName,
        fields.primaryReference,
        row.family,
        row.grammage,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, search]);

  const filteredIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.has(id));

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of filteredIds) next.add(id);
      return next;
    });
  };

  const deletePermanently = async (row: UnifiedRow) => {
    if (!canEdit) return;
    try {
      const r = await fetch(
        `/api/admin-backoffice/pricing/base-materials/${encodeURIComponent(row.id)}?permanent=1`,
        {
          method: "DELETE",
        },
      );
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        throw new Error(
          d.error?.message ?? d.error ?? "Suppression définitive impossible",
        );
      }
      uxToast.success(d.message ?? "Matière supprimée définitivement");
      setRows((prev) => prev.filter((x) => x.id !== row.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      void load();
      onDataChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Suppression définitive impossible";
      uxToast.error(msg, "Suppression impossible");
    }
  };

  const restoreRow = async (row: UnifiedRow) => {
    if (!canEdit) return;
    try {
      const r = await fetch(
        `/api/admin-backoffice/pricing/base-materials/${encodeURIComponent(row.id)}/restore`,
        {
          method: "POST",
        },
      );
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        throw new Error(
          d.error?.message ?? d.error ?? "Restauration impossible",
        );
      }
      uxToast.success(d.message ?? "Matière restaurée");
      setRows((prev) => prev.filter((x) => x.id !== row.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      void load();
      onDataChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Restauration impossible";
      uxToast.error(msg, "Restauration impossible");
    }
  };

  const deleteSelected = async () => {
    if (!canEdit || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const r = await fetch(
        "/api/admin-backoffice/pricing/base-materials/bulk-delete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [...selectedIds], permanent: true }),
        },
      );
      let d: {
        ok?: boolean;
        error?: { message?: string } | string;
        data?: {
          deleted?: number;
          archived?: number;
          errors?: Array<{ id: string; reason: string }>;
        };
      };
      try {
        d = await r.json();
      } catch {
        throw new Error(`Réponse serveur invalide (${r.status})`);
      }
      if (!r.ok || !d.ok) {
        const msg =
          typeof d.error === "string"
            ? d.error
            : (d.error?.message ?? `Erreur serveur (${r.status})`);
        throw new Error(msg);
      }
      const deleted = d.data?.deleted ?? 0;
      const archived = d.data?.archived ?? 0;
      const errors = d.data?.errors?.length ?? 0;
      uxToast.success(
        `${deleted} élément(s) supprimé(s) définitivement` +
          (archived ? ` · ${archived} déplacé(s) en corbeille` : "") +
          (errors ? ` · ${errors} erreur(s)` : ""),
      );
      setSelectedIds(new Set());
      await load();
      onDataChanged?.();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Suppression multiple impossible";
      console.error("[Stock & Matières] bulk-delete", msg);
      uxToast.error(msg, "Suppression multiple impossible");
    } finally {
      setBulkBusy(false);
      setBulkDeleteOpen(false);
    }
  };

  if (loading && rows.length === 0)
    return <OptionsLoadingState variant="table" rows={6} />;

  if (error && rows.length === 0) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
        <p className="mb-4 text-sm text-red-300">{error}</p>
        <AppButton type="button" variant="default" onClick={() => void load()}
        >
          <RefreshCw className="h-4 w-4" /> Réessayer
        </AppButton>
      </div>
    );
  }

  return (
    <div className="space-y-3 min-h-0 flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          className="ab2-search-input flex-1 min-w-[200px]"
          placeholder="Rechercher dans la corbeille…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <AdminBulkSelectBar
          disabled={!canEdit}
          allSelected={allFilteredSelected}
          someSelected={someFilteredSelected}
          onToggleAll={toggleSelectAll}
          selectedCount={selectedIds.size}
          busy={bulkBusy}
          onDeleteSelected={() => setBulkDeleteOpen(true)}
        />
        <ExcelTableActions
          fileStem="stock-matieres-corbeille"
          sheetName="Corbeille"
          getExportRows={() =>
            filtered.map((row) => {
              const f = deriveMaterialTableFields(row);
              return {
                Matière: f.materialName,
                Référence: f.primaryReference,
                Famille: row.family ?? "",
                Archivée: row.archivedAt ?? "",
                ID: row.id,
              };
            })
          }
        />
        <AppButton type="button" variant="outline" className="text-sm" onClick={() => void load()}
        >
          <RefreshCw className="h-4 w-4" /> Actualiser
        </AppButton>
        <span className="text-xs text-muted-foreground tabular-nums">
          {filtered.length} élément{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <OptionsEmptyState
          title="Corbeille vide"
          description="Les matières supprimées depuis la liste principale apparaissent ici."
        />
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0c1018]/80 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {canEdit ? (
                  <th className="px-3 py-2 w-10" aria-label="Sélection">
                    <span className="sr-only">Sélection</span>
                  </th>
                ) : null}
                <th className="px-3 py-2 font-medium">Matière</th>
                <th className="px-3 py-2 font-medium">Référence</th>
                <th className="px-3 py-2 font-medium">Famille</th>
                <th className="px-3 py-2 font-medium">Archivée le</th>
                <AdminActionsColumnHeader />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const fields = deriveMaterialTableFields(row);
                const checked = selectedIds.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`border-t border-white/5 hover:bg-white/[0.02]${checked ? " bg-white/[0.03]" : ""}`}
                  >
                    {canEdit ? (
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="rounded border-white/20"
                          checked={checked}
                          onChange={() => toggleRow(row.id)}
                          aria-label={`Sélectionner ${fields.materialName}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{fields.materialName}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {fields.primaryReference}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {row.family ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {formatDate(row.archivedAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit ? (
                          <>
                            <button
                              type="button"
                              className="mp-row-action-btn"
                              title="Restaurer"
                              onClick={() => void restoreRow(row)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="mp-row-action-btn is-danger"
                              title="Supprimer définitivement"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Confirmer la suppression"
        description={
          deleteTarget
            ? `Cette action va supprimer définitivement « ${deleteTarget.name} ». Cette opération est irréversible.`
            : undefined
        }
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          await deletePermanently(target);
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!bulkBusy) setBulkDeleteOpen(open);
        }}
        title="Supprimer la sélection"
        description={`Vous allez supprimer définitivement ${selectedIds.size} élément(s). Cette action est irréversible.`}
        confirmLabel={bulkBusy ? "Suppression…" : "Supprimer définitivement"}
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={async () => {
          await deleteSelected();
        }}
      />
    </div>
  );
}
