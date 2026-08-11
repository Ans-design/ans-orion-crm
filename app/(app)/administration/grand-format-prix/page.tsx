'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { PriceTableWorkspace } from '@/components/administration/direct-sale/PriceTableWorkspace';
import { GfBacheFinishingsAdminPanel } from '@/components/administration/grand-format/GfBacheFinishingsAdminPanel';
import { GfCuttingMarginsAdminPanel } from '@/components/administration/grand-format/GfCuttingMarginsAdminPanel';
import { GRAND_FORMAT_EXCEL_COLUMNS } from '@/lib/backoffice/pricing-tables-excel-format';
import '@/components/backoffice-v2/admin-backoffice.css';

export default function GrandFormatPrixPage() {
  return (
    <div className="ab2-shell max-w-[1600px] mx-auto px-4 py-4">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement…</div>}>
        <Content />
      </Suspense>
    </div>
  );
}

function Content() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';
  return (
    <>
      <GfBacheFinishingsAdminPanel canEdit={canEdit} />
      <GfCuttingMarginsAdminPanel canEdit={canEdit} />
      <PriceTableWorkspace
        title="Grand format — tarification"
        description="Prix m² / A0, laizes. Finitions bâche et marges découpe A0–A5 : panneaux ci-dessus. Les formats/paliers bâche, Roll-up, X-Banner et PVC petit format sont archivés (fusionnés vers les configurateurs)."
        apiPath="/api/admin-backoffice/direct-sale/grand-format"
        excelColumns={GRAND_FORMAT_EXCEL_COLUMNS}
        excelSheetName="Grand format"
        exportFileStem="grand-format-prix"
        nameKey="name"
        priceKey="pricePerM2"
        canEdit={canEdit}
        enableBackfillFromPos
        backfillLabel="Compléter Grand Format depuis POS"
      />
    </>
  );
}
