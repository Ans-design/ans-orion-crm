'use client';

import { EntityDataToolbar } from '@/components/ui/entity-data-toolbar';
import { useEntityDataIo } from '@/lib/hooks/use-entity-data-io';
import { ADMIN_UI } from '@/lib/administration/admin-ui-vocab';
import type { EntityExcelId } from '@/lib/crm/entity-excel-modules';
import { getEntityExcelModule } from '@/lib/crm/entity-excel-modules';

type Props = {
  entity: EntityExcelId;
  trash?: boolean;
  onTrashChange?: (trash: boolean) => void;
  activeHref?: string;
  trashHref?: string;
  className?: string;
  onAfterImport?: () => void;
};

/** Raccourci listes métier : Importer / Exporter / Corbeille. */
export function EntityModuleDataBar({
  entity,
  trash = false,
  onTrashChange,
  activeHref,
  trashHref,
  className,
  onAfterImport,
}: Props) {
  const mod = getEntityExcelModule(entity);
  const { fileRef, exportExcel, triggerImport, onImportFile } = useEntityDataIo(entity);
  const allowImport = Boolean(mod?.allowImport);

  return (
    <>
      <EntityDataToolbar
        className={className}
        trash={trash}
        onTrashChange={onTrashChange}
        activeHref={activeHref}
        trashHref={trashHref}
        onExport={() => void exportExcel(trash)}
        onImport={allowImport ? triggerImport : undefined}
        canImport={allowImport && !trash}
        canExport
        importLabel={ADMIN_UI.import}
        exportLabel={ADMIN_UI.export}
        trashLabel={ADMIN_UI.trash}
        activeLabel={ADMIN_UI.activeList}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          void (async () => {
            await onImportFile(e.target.files?.[0] ?? null);
            onAfterImport?.();
          })();
          e.target.value = '';
        }}
      />
    </>
  );
}
