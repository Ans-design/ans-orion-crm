'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uxToast } from '@/lib/ux/feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type DepRow = {
  id: string;
  articleId: string;
  sourceField: string;
  sourceValue: string;
  targetField: string;
  allowedValues: string;
  action: string;
  active: boolean;
  details: string | null;
};

type Props = {
  articleId: string;
  canEdit: boolean;
  /** fieldKeys connus (chips) pour faciliter la saisie */
  fieldKeys?: string[];
};

const emptyForm = {
  sourceField: '',
  sourceValue: '',
  targetField: '',
  allowedValues: '',
  action: 'filter',
  details: '',
};

export function OptionDependenciesPanel({ articleId, canEdit, fieldKeys = [] }: Props) {
  const [rows, setRows] = useState<DepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/admin-backoffice/option-dependencies?articleId=${encodeURIComponent(articleId)}`,
        { cache: 'no-store' },
      );
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows(d.data?.rows ?? []);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Chargement dépendances impossible');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!canEdit) return;
    if (!form.sourceField.trim() || !form.targetField.trim() || !form.sourceValue.trim()) {
      uxToast.error('Champs source, valeur source et cible requis');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/admin-backoffice/option-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId ?? undefined,
          articleId,
          sourceField: form.sourceField.trim(),
          sourceValue: form.sourceValue.trim(),
          targetField: form.targetField.trim(),
          allowedValues: form.allowedValues
            .split(/[|,;]/)
            .map((s) => s.trim())
            .filter(Boolean),
          action: form.action || 'filter',
          details: form.details.trim() || null,
          active: true,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Enregistrement impossible');
      uxToast.success(editingId ? 'Dépendance mise à jour' : 'Dépendance créée — POS synchronisé');
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function executeRemove(id: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin-backoffice/option-dependencies?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Suppression impossible');
      uxToast.success('Dépendance désactivée');
      await load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  function askRemove(id: string) {
    if (!canEdit) return;
    setPendingRemoveId(id);
  }

  function startEdit(row: DepRow) {
    setEditingId(row.id);
    setForm({
      sourceField: row.sourceField,
      sourceValue: row.sourceValue,
      targetField: row.targetField,
      allowedValues: row.allowedValues,
      action: row.action || 'filter',
      details: row.details ?? '',
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 text-sm space-y-1">
        <p className="font-medium">Dépendances d’options (POS)</p>
        <p className="text-muted-foreground text-xs">
          Ex. : si <code>type</code> = « téléphone », n’afficher que les tailles téléphone.
          Action <code>filter</code> = valeurs autorisées · <code>hide</code> / <code>disable</code> selon config POS.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" disabled={loading || busy} onClick={() => void load()}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {canEdit && (
        <div className="rounded-lg border p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Option source"
            value={form.sourceField}
            onChange={(v) => setForm((f) => ({ ...f, sourceField: v }))}
            listId={`dep-src-${articleId}`}
            options={fieldKeys}
            placeholder="ex. type"
          />
          <Field
            label="Valeur source"
            value={form.sourceValue}
            onChange={(v) => setForm((f) => ({ ...f, sourceValue: v }))}
            placeholder="ex. téléphone"
          />
          <Field
            label="Option cible"
            value={form.targetField}
            onChange={(v) => setForm((f) => ({ ...f, targetField: v }))}
            listId={`dep-tgt-${articleId}`}
            options={fieldKeys}
            placeholder="ex. taille"
          />
          <Field
            label="Valeurs autorisées"
            value={form.allowedValues}
            onChange={(v) => setForm((f) => ({ ...f, allowedValues: v }))}
            placeholder="iPhone 14 | iPhone 15 | …"
            className="sm:col-span-2"
          />
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Action</span>
            <select
              className="w-full border rounded-lg px-2 py-1.5 text-sm bg-background"
              value={form.action}
              onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
            >
              <option value="filter">filter (filtrer)</option>
              <option value="show">show</option>
              <option value="hide">hide</option>
              <option value="disable">disable</option>
            </select>
          </label>
          <Field
            label="Détail"
            value={form.details}
            onChange={(v) => setForm((f) => ({ ...f, details: v }))}
            className="sm:col-span-2 lg:col-span-3"
          />
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {editingId ? 'Mettre à jour' : 'Ajouter'}
            </Button>
            {editingId && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Annuler
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border overflow-auto max-h-[50vh]">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 sticky top-0">
            <tr className="text-left">
              <th className="p-2">Source</th>
              <th className="p-2">Valeur</th>
              <th className="p-2">Cible</th>
              <th className="p-2">Autorisées</th>
              <th className="p-2">Action</th>
              <th className="p-2 w-24"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">Chargement…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Aucune dépendance — le POS affichera toutes les options sans filtre.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border/40">
                  <td className="p-2 font-mono text-xs">{row.sourceField}</td>
                  <td className="p-2">{row.sourceValue}</td>
                  <td className="p-2 font-mono text-xs">{row.targetField}</td>
                  <td className="p-2 text-xs max-w-[200px] truncate" title={row.allowedValues}>
                    {row.allowedValues || '—'}
                  </td>
                  <td className="p-2 text-xs">{row.action}</td>
                  <td className="p-2">
                    {canEdit && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="text-xs underline text-muted-foreground hover:text-foreground"
                          onClick={() => startEdit(row)}
                        >
                          Éditer
                        </button>
                        <button
                          type="button"
                          className="text-primary p-1"
                          title="Désactiver"
                          onClick={() => askRemove(row.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={Boolean(pendingRemoveId)}
        onOpenChange={(next) => {
          if (!next) setPendingRemoveId(null);
        }}
        title="Désactiver cette dépendance ?"
        description="Elle disparaîtra du POS."
        confirmLabel="Désactiver"
        variant="destructive"
        onConfirm={() => {
          const id = pendingRemoveId;
          setPendingRemoveId(null);
          if (id) void executeRemove(id);
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  listId,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  listId?: string;
  options?: string[];
  className?: string;
}) {
  return (
    <label className={`text-xs space-y-1 ${className ?? ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <input
        className="w-full border rounded-lg px-2 py-1.5 text-sm bg-background"
        value={value}
        placeholder={placeholder}
        list={listId}
        onChange={(e) => onChange(e.target.value)}
      />
      {listId && options && options.length > 0 ? (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      ) : null}
    </label>
  );
}
