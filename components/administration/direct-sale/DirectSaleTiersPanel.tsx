"use client";


import { AppButton } from '@/components/ui/app-ui';
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { uxToast } from "@/lib/ux/feedback";
import { formatPrice } from "@/lib/data/catalogue";
import {
  formatTierDiscount,
  formatTierQtyRange,
  TIER_DISCOUNT_TYPE_OPTIONS,
} from "@/lib/direct-sale/tier-labels";

type TierRow = {
  id: string;
  minQty: number;
  maxQty: number | null;
  discountType: string;
  discountValue: number;
  finalUnitPrice: number | null;
  label: string | null;
};

type Props = {
  articleId: string;
  articleName: string;
  baseUnitPrice: number;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  onChanged?: () => void;
};

export function DirectSaleTiersPanel({
  articleId,
  articleName,
  baseUnitPrice,
  open,
  onClose,
  canEdit,
  onChanged,
}: Props) {
  const [rows, setRows] = useState<TierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    minQty: "1",
    maxQty: "",
    discountType: "unit_price",
    discountValue: "",
    finalUnitPrice: "",
    label: "",
  });

  const load = useCallback(async () => {
    if (!open || !articleId) return;
    setLoading(true);
    try {
      const r = await fetch(
        `/api/admin-backoffice/direct-sale/articles/${articleId}/tiers`,
        { cache: "no-store" },
      );
      const d = await r.json();
      if (!r.ok || !d.ok)
        throw new Error(d.error?.message ?? "Chargement impossible");
      setRows(d.data.rows ?? []);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [articleId, open]);

  useEffect(() => {
    void load();
  }, [load]);

  const addTier = async () => {
    const minQty = Number(form.minQty);
    if (!Number.isFinite(minQty) || minQty < 1) {
      uxToast.error("Quantité minimum invalide");
      return;
    }
    try {
      const r = await fetch(
        `/api/admin-backoffice/direct-sale/articles/${articleId}/tiers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            minQty,
            maxQty: form.maxQty ? Number(form.maxQty) : null,
            discountType: form.discountType,
            discountValue: Number(form.discountValue) || 0,
            finalUnitPrice: form.finalUnitPrice
              ? Number(form.finalUnitPrice)
              : null,
            label: form.label.trim() || null,
          }),
        },
      );
      const d = await r.json();
      if (!r.ok || !d.ok)
        throw new Error(d.error?.message ?? "Ajout impossible");
      uxToast.success("Palier ajouté et synchronisé POS");
      setForm({
        minQty: String(minQty + 100),
        maxQty: "",
        discountType: "unit_price",
        discountValue: "",
        finalUnitPrice: "",
        label: "",
      });
      void load();
      onChanged?.();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const updateTierField = async (
    tierId: string,
    patch: Record<string, unknown>,
  ) => {
    try {
      const r = await fetch(
        `/api/admin-backoffice/direct-sale/articles/${articleId}/tiers/${tierId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      const d = await r.json();
      if (!r.ok || !d.ok)
        throw new Error(d.error?.message ?? "Mise à jour impossible");
      uxToast.success("Palier mis à jour");
      void load();
      onChanged?.();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const removeTier = async (tierId: string) => {
    try {
      const r = await fetch(
        `/api/admin-backoffice/direct-sale/articles/${articleId}/tiers/${tierId}`,
        {
          method: "DELETE",
        },
      );
      const d = await r.json();
      if (!r.ok || !d.ok)
        throw new Error(d.error?.message ?? "Suppression impossible");
      uxToast.success("Palier retiré");
      void load();
      onChanged?.();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-[7px] border border-border bg-card shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
          <div>
            <p className="font-bold text-sm">
              Tableau de prix — paliers quantité
            </p>
            <p className="text-xs text-muted-foreground">
              {articleName} · prix de base {formatPrice(baseUnitPrice)} Ar
            </p>
          </div>
          <AppButton
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-accent"
          >
            <X size={16} />
          </AppButton>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground animate-pulse">
              Chargement…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun palier — le prix unitaire de base s&apos;applique à toutes
              les quantités.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-accent/50 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left">Quantité</th>
                    <th className="px-2 py-2 text-left">Type</th>
                    <th className="px-2 py-2 text-right">Valeur</th>
                    <th className="px-2 py-2 text-right">Prix final</th>
                    <th className="px-2 py-2 text-left">Libellé</th>
                    {canEdit && (
                      <th className="px-2 py-2" aria-label="Actions">
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((tier) => (
                    <tr key={tier.id} className="border-t border-border">
                      <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">
                        {formatTierQtyRange(tier.minQty, tier.maxQty)}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {TIER_DISCOUNT_TYPE_OPTIONS.find(
                          (o) => o.id === tier.discountType,
                        )?.label ?? tier.discountType}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-xs">
                        {canEdit ? (
                          <input
                            type="number"
                            defaultValue={tier.discountValue}
                            className="w-20 text-right rounded border border-border bg-background px-1.5 py-1 text-xs"
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== tier.discountValue)
                                void updateTierField(tier.id, {
                                  discountValue: v,
                                });
                            }}
                          />
                        ) : (
                          tier.discountValue
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-xs text-primary">
                        {canEdit && tier.discountType === "unit_price" ? (
                          <input
                            type="number"
                            defaultValue={
                              tier.finalUnitPrice ?? tier.discountValue
                            }
                            className="w-24 text-right rounded border border-border bg-background px-1.5 py-1 text-xs"
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              const current =
                                tier.finalUnitPrice ?? tier.discountValue;
                              if (v !== current)
                                void updateTierField(tier.id, {
                                  finalUnitPrice: v,
                                });
                            }}
                          />
                        ) : (
                          formatTierDiscount(tier, baseUnitPrice)
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        {tier.label ?? "—"}
                      </td>
                      {canEdit && (
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => void removeTier(tier.id)}
                            className="text-red-500 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canEdit && (
            <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                Ajouter un palier
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Qté min"
                  value={form.minQty}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minQty: e.target.value }))
                  }
                  className="rounded border border-border px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Qté max (vide = illimité)"
                  value={form.maxQty}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxQty: e.target.value }))
                  }
                  className="rounded border border-border px-2 py-1.5 text-sm"
                />
                <select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountType: e.target.value }))
                  }
                  className="rounded border border-border px-2 py-1.5 text-sm bg-background"
                >
                  {TIER_DISCOUNT_TYPE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder={
                    form.discountType === "percent" ? "Remise %" : "Valeur Ar"
                  }
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountValue: e.target.value }))
                  }
                  className="rounded border border-border px-2 py-1.5 text-sm"
                />
                {form.discountType === "unit_price" && (
                  <input
                    type="number"
                    placeholder="Prix unitaire final"
                    value={form.finalUnitPrice}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, finalUnitPrice: e.target.value }))
                    }
                    className="rounded border border-border px-2 py-1.5 text-sm"
                  />
                )}
                <input
                  type="text"
                  placeholder="Libellé (optionnel)"
                  value={form.label}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, label: e.target.value }))
                  }
                  className="rounded border border-border px-2 py-1.5 text-sm md:col-span-2"
                />
              </div>
              <AppButton
                type="button"
                variant="default"
                className="text-sm"
                onClick={() => void addTier()}
              >
                <Plus size={14} /> Ajouter palier
              </AppButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
