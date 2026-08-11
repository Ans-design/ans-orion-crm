'use client';

import { useCallback, useRef } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import type { EntityExcelId } from '@/lib/crm/entity-excel-modules';

/** Helpers UI : export / import Excel + corbeille via /api/entity-data */
export function useEntityDataIo(entity: EntityExcelId) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const exportExcel = useCallback(async (trash = false) => {
    try {
      const qs = trash ? '?trash=1' : '';
      const res = await fetch(`/api/entity-data/${entity}/export${qs}`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(err, 'Export impossible'));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      uxToast.success('Export Excel téléchargé');
    } catch {
      uxToast.error('Erreur réseau export');
    }
  }, [entity]);

  const triggerImport = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const onImportFile = useCallback(async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`/api/entity-data/${entity}/import`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        uxToast.error(getApiErrorMessage(body, 'Import impossible'));
        return;
      }
      const d = body.data ?? body;
      uxToast.success(
        `Import : ${d.created ?? 0} créés, ${d.updated ?? 0} maj, ${d.ignored ?? 0} ignorés`,
      );
    } catch {
      uxToast.error('Erreur réseau import');
    }
  }, [entity]);

  const archiveOne = useCallback(async (id: string) => {
    const res = await fetch(`/api/entity-data/${entity}/${id}?action=archive`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      uxToast.error(getApiErrorMessage(err, 'Archivage impossible'));
      return false;
    }
    uxToast.success('Mis en corbeille');
    return true;
  }, [entity]);

  const restoreOne = useCallback(async (id: string) => {
    const res = await fetch(`/api/entity-data/${entity}/${id}?action=restore`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      uxToast.error(getApiErrorMessage(err, 'Restauration impossible'));
      return false;
    }
    uxToast.success('Restauré');
    return true;
  }, [entity]);

  return {
    fileRef,
    exportExcel,
    triggerImport,
    onImportFile,
    archiveOne,
    restoreOne,
  };
}
