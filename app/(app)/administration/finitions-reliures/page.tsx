'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { PriceTableWorkspace } from '@/components/administration/direct-sale/PriceTableWorkspace';
import { FINISHING_EXCEL_COLUMNS } from '@/lib/backoffice/pricing-tables-excel-format';
import '@/components/backoffice-v2/admin-backoffice.css';

export default function FinitionsReliuresPage() {
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
    <PriceTableWorkspace
      title="Finitions & Reliures"
      description="Pelliculage, reliure, plastification, rainage — tarifs séparés des articles vente directe. Synchronisation vers profils POS (articles fin-*)."
      apiPath="/api/admin-backoffice/direct-sale/finishing"
      excelColumns={FINISHING_EXCEL_COLUMNS}
      excelSheetName="Finitions"
      exportFileStem="finitions-reliures"
      nameKey="name"
      priceKey="unitPrice"
      canEdit={canEdit}
      enableBackfillFromPos
      backfillLabel="Compléter Finitions depuis catalogue"
    />
  );
}
