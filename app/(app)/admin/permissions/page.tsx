'use client';

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw, Save, Users, RefreshCw, Search, Shield } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import {
  permissionRowToExcel,
  usersToExcelRows,
  validatePermissionsExcelRows,
} from '@/lib/backoffice/permissions-excel-format';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';
import { PERMISSION_MATRIX_COLUMNS } from '@/lib/constants/permission-flags';
import type { PermissionFlags } from '@/lib/modules/types';
import './permissions-matrix.css';

type ModuleRow = { id: string; label: string; group: string; href: string };
type RoleOption = { id: string; label: string };
type UserRow = { id: string; name: string | null; email: string; role: string };

type MatrixData = {
  modules: ModuleRow[];
  roles: RoleOption[];
  roleMatrix: Record<string, Record<string, PermissionFlags>>;
  users: UserRow[];
};

type ViewMode = 'role' | 'user';

/** Modules hors matrice permissions (doublons / navigation déjà couverte ailleurs). */
const PERMISSIONS_MATRIX_HIDDEN_MODULE_IDS = new Set([
  'cockpit',
  'operations',
  'admin_variables_nav',
  'devis',
]);

function groupLabel(group: string): string {
  const raw = group?.trim() || 'autres';
  return raw.replace(/_/g, ' ');
}

export default function AdminPermissionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role ?? 'user';
  const canEdit = role === 'admin';
  const canView = role === 'admin' || role === 'manager';

  const [data, setData] = useState<MatrixData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('role');
  const [selectedRole, setSelectedRole] = useState('commercial');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userMatrix, setUserMatrix] = useState<Record<string, PermissionFlags>>({});
  const [draft, setDraft] = useState<Record<string, Partial<PermissionFlags>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moduleQuery, setModuleQuery] = useState('');

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/permissions');
      if (res.status === 403) {
        router.push('/non-autorise');
        return;
      }
      if (!res.ok) throw new Error('Chargement impossible');
      const json = await res.json();
      setData(json);
      if (json.users?.length && !selectedUserId) {
        setSelectedUserId(json.users[0].id);
      }
    } catch {
      uxToast.error('Erreur chargement matrice permissions');
    } finally {
      setLoading(false);
    }
  }, [router, selectedUserId]);

  const loadUserMatrix = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/admin/permissions?userId=${userId}`);
      if (!res.ok) throw new Error('Utilisateur');
      const json = await res.json();
      const effective: Record<string, PermissionFlags> = {};
      for (const [modId, row] of Object.entries(json.matrix ?? {})) {
        effective[modId] = (row as { effective: PermissionFlags }).effective;
      }
      setUserMatrix(effective);
      setDraft({});
    } catch {
      uxToast.error('Erreur matrice utilisateur');
    }
  }, []);

  useEffect(() => {
    if (canView) loadMatrix();
    else router.push('/dashboard');
  }, [canView, loadMatrix, router]);

  useEffect(() => {
    if (viewMode === 'user' && selectedUserId) loadUserMatrix(selectedUserId);
  }, [viewMode, selectedUserId, loadUserMatrix]);

  const activeFlags = useMemo(() => {
    if (viewMode === 'role' && data) {
      return data.roleMatrix[selectedRole] ?? {};
    }
    return userMatrix;
  }, [viewMode, data, selectedRole, userMatrix]);

  const matrixModules = useMemo(
    () => (data?.modules ?? []).filter((m) => !PERMISSIONS_MATRIX_HIDDEN_MODULE_IDS.has(m.id)),
    [data?.modules],
  );

  const filteredModules = useMemo(() => {
    const q = moduleQuery.trim().toLowerCase();
    if (!q) return matrixModules;
    return matrixModules.filter((m) =>
      [m.label, m.id, m.group].join(' ').toLowerCase().includes(q),
    );
  }, [matrixModules, moduleQuery]);

  const moduleSections = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, ModuleRow[]>();
    for (const mod of filteredModules) {
      const key = mod.group?.trim() || 'autres';
      if (!map.has(key)) {
        order.push(key);
        map.set(key, []);
      }
      map.get(key)!.push(mod);
    }
    return order.map((group) => ({
      group,
      label: groupLabel(group),
      modules: map.get(group)!,
    }));
  }, [filteredModules]);

  const dirtyCount = Object.keys(draft).length;

  const toggleFlag = (moduleId: string, key: keyof PermissionFlags) => {
    if (!canEdit) return;
    const current = draft[moduleId]?.[key] ?? activeFlags[moduleId]?.[key] ?? false;
    setDraft((prev) => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [key]: !current },
    }));
  };

  const getFlag = (moduleId: string, key: keyof PermissionFlags): boolean => {
    if (draft[moduleId]?.[key] !== undefined) return !!draft[moduleId][key];
    return !!activeFlags[moduleId]?.[key];
  };

  const saveModule = async (moduleId: string) => {
    if (!canEdit || !draft[moduleId]) return;
    setSaving(true);
    try {
      const flags = { ...activeFlags[moduleId], ...draft[moduleId] };
      const body =
        viewMode === 'role'
          ? { action: 'update_role', role: selectedRole, moduleId, flags }
          : { action: 'update_user', userId: selectedUserId, moduleId, flags };
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Sauvegarde');
      uxToast.success('Permissions enregistrées');
      setDraft((prev) => {
        const next = { ...prev };
        delete next[moduleId];
        return next;
      });
      if (viewMode === 'role') await loadMatrix();
      else await loadUserMatrix(selectedUserId);
    } catch {
      uxToast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const saveAllDirty = async () => {
    if (!canEdit || dirtyCount === 0) return;
    const ids = Object.keys(draft);
    setSaving(true);
    try {
      for (const moduleId of ids) {
        const flags = { ...activeFlags[moduleId], ...draft[moduleId] };
        const body =
          viewMode === 'role'
            ? { action: 'update_role', role: selectedRole, moduleId, flags }
            : { action: 'update_user', userId: selectedUserId, moduleId, flags };
        const res = await fetch('/api/admin/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(moduleId);
      }
      uxToast.success(
        ids.length > 1
          ? `${ids.length} modules enregistrés`
          : 'Permissions enregistrées',
      );
      setDraft({});
      if (viewMode === 'role') await loadMatrix();
      else await loadUserMatrix(selectedUserId);
    } catch {
      uxToast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const body =
        viewMode === 'role'
          ? { action: 'reset_role', role: selectedRole, moduleId: '_' }
          : { action: 'reset_user', userId: selectedUserId, moduleId: '_' };
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Reset');
      uxToast.success('Overrides réinitialisés');
      setDraft({});
      if (viewMode === 'role') await loadMatrix();
      else await loadUserMatrix(selectedUserId);
    } catch {
      uxToast.error('Erreur réinitialisation');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="perm-page">
        <div className="perm-page__loading">
          <Loader2 className="animate-spin" size={18} /> Chargement…
        </div>
      </div>
    );
  }

  const selectedUser = data.users.find((u) => u.id === selectedUserId);
  const roleLabel =
    data.roles.find((r) => r.id === selectedRole)?.label ?? selectedRole;

  return (
    <div className="perm-page">
      <div className="perm-page__intro">
        <div className="perm-page__stats">
          <span className="perm-page__stat">
            Modules <b>{filteredModules.length}</b>
            {moduleQuery.trim() ? ` / ${matrixModules.length}` : null}
          </span>
          <span className="perm-page__stat">
            {viewMode === 'role' ? (
              <>
                Rôle <b>{roleLabel}</b>
              </>
            ) : (
              <>
                Utilisateurs <b>{data.users.length}</b>
              </>
            )}
          </span>
          {dirtyCount > 0 ? (
            <span className="perm-page__stat">
              Modifs <b>{dirtyCount}</b>
            </span>
          ) : null}
        </div>
        {!canEdit ? <span className="perm-page__badge">Lecture seule</span> : null}
      </div>

      <div className="perm-page__toolbar">
        <div className="perm-page__modes" role="tablist" aria-label="Mode matrice">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'role'}
            className={`perm-page__mode${viewMode === 'role' ? ' is-active' : ''}`}
            onClick={() => {
              setViewMode('role');
              setDraft({});
            }}
          >
            <Shield size={14} aria-hidden />
            Par rôle
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'user'}
            className={`perm-page__mode${viewMode === 'user' ? ' is-active' : ''}`}
            onClick={() => {
              setViewMode('user');
              setDraft({});
            }}
          >
            <Users size={14} aria-hidden />
            Par utilisateur
          </button>
        </div>

        {viewMode === 'role' ? (
          <label className="perm-page__field">
            Rôle
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setDraft({});
              }}
            >
              {data.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="perm-page__field">
            Utilisateur
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{ minWidth: 240 }}
            >
              {data.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email} ({u.role})
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="perm-page__search">
          <Search size={14} aria-hidden />
          <input
            type="search"
            value={moduleQuery}
            onChange={(e) => setModuleQuery(e.target.value)}
            placeholder="Filtrer un module…"
            autoComplete="off"
            aria-label="Filtrer les modules"
          />
        </div>

        {viewMode === 'user' && selectedUser ? (
          <span className="perm-page__meta">
            Rôle auth : <strong>{selectedUser.role}</strong>
          </span>
        ) : null}

        {canEdit ? (
          <div className="perm-page__actions">
            {dirtyCount > 0 ? (
              <button
                type="button"
                className="perm-page__btn perm-page__btn--primary"
                disabled={saving}
                onClick={() => void saveAllDirty()}
              >
                <Save size={14} />
                Enregistrer{dirtyCount > 1 ? ` (${dirtyCount})` : ''}
              </button>
            ) : null}
            <button
              type="button"
              className="perm-page__btn"
              disabled={loading || saving}
              onClick={() => void loadMatrix().then(() => uxToast.success('Actualisé'))}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <ExcelTableActions
              fileStem={viewMode === 'role' ? 'permissions' : 'utilisateurs'}
              sheetName={viewMode === 'role' ? 'Permissions' : 'Utilisateurs'}
              validateRows={
                viewMode === 'role'
                  ? validatePermissionsExcelRows
                  : (rows) =>
                      rows.length ? { ok: true } : { ok: false, message: 'Aucune ligne' }
              }
              getExportRows={() => {
                if (viewMode === 'user') {
                  return usersToExcelRows(data.users) as unknown as Record<string, unknown>[];
                }
                const rows: Record<string, unknown>[] = [];
                let n = 0;
                for (const mod of matrixModules) {
                  const flags = data.roleMatrix[selectedRole]?.[mod.id];
                  if (!flags) continue;
                  n += 1;
                  rows.push(
                    permissionRowToExcel(
                      selectedRole,
                      mod.id,
                      mod.label,
                      flags,
                      formatExcelRowId(n),
                    ) as unknown as Record<string, unknown>,
                  );
                }
                return rows;
              }}
              canImport={canEdit && viewMode === 'role'}
              onImportRows={async (incoming, ctx) => {
                const r = await fetch('/api/admin/permissions/import-excel', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rows: incoming, fileName: ctx?.fileName }),
                });
                const d = await r.json();
                if (!r.ok || !d.ok) {
                  throw new Error(d.error?.message ?? d.error ?? 'Import impossible');
                }
                await loadMatrix();
                return d.data;
              }}
            />
            <button
              type="button"
              className="perm-page__btn"
              disabled={saving}
              onClick={() => void resetAll()}
            >
              <RotateCcw size={14} />
              Réinit.
            </button>
          </div>
        ) : null}
      </div>

      <div className="perm-table-wrap">
        {filteredModules.length === 0 ? (
          <div className="perm-page__empty">Aucun module ne correspond au filtre.</div>
        ) : (
          <table className="perm-table">
            <thead>
              <tr>
                <th>Module</th>
                {PERMISSION_MATRIX_COLUMNS.map((col) => (
                  <th key={col.key} title={col.label}>
                    {col.label}
                  </th>
                ))}
                {canEdit ? (
                  <th>
                    <span className="sr-only">Enregistrer</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {moduleSections.map((section) => (
                <Fragment key={section.group}>
                  <tr className="perm-table__group">
                    <td colSpan={PERMISSION_MATRIX_COLUMNS.length + (canEdit ? 2 : 1)}>
                      {section.label}
                      <span className="perm-table__group-count">{section.modules.length}</span>
                    </td>
                  </tr>
                  {section.modules.map((mod) => {
                    const dirty = !!draft[mod.id];
                    return (
                      <tr
                        key={mod.id}
                        className={`perm-table__row${dirty ? ' is-dirty' : ''}`}
                      >
                        <td>
                          <div className="perm-table__mod-label">{mod.label}</div>
                          <div className="perm-table__mod-id">{mod.id}</div>
                        </td>
                        {PERMISSION_MATRIX_COLUMNS.map((col) => (
                          <td key={col.key}>
                            <input
                              type="checkbox"
                              checked={getFlag(mod.id, col.key)}
                              disabled={!canEdit}
                              onChange={() => toggleFlag(mod.id, col.key)}
                              aria-label={`${mod.label} — ${col.label}`}
                            />
                          </td>
                        ))}
                        {canEdit ? (
                          <td>
                            {dirty ? (
                              <button
                                type="button"
                                className="perm-table__save"
                                onClick={() => void saveModule(mod.id)}
                                disabled={saving}
                                title="Enregistrer cette ligne"
                              >
                                <Save size={15} />
                              </button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="perm-page__hint">
        Overrides utilisateur &gt; rôle. Admin = accès complet. Module sans « Voir » masqué
        dans la sidebar au prochain chargement.
      </p>
    </div>
  );
}
