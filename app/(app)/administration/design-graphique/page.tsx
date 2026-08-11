'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { PriceTableWorkspace } from '@/components/administration/direct-sale/PriceTableWorkspace';
import { DESIGN_EXCEL_COLUMNS } from '@/lib/backoffice/pricing-tables-excel-format';
import '@/components/backoffice-v2/admin-backoffice.css';

export default function DesignGraphiquePage() {
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
      title="Design / Conception graphique"
      description="Prestations logo, maquettes, BAT, retouches — prix unitaire par prestation, synchronisées POS."
      apiPath="/api/admin-backoffice/direct-sale/design"
      excelColumns={DESIGN_EXCEL_COLUMNS}
      excelSheetName="Design"
      exportFileStem="design-graphique"
      nameKey="name"
      priceKey="unitPrice"
      canEdit={canEdit}
    />
  );
}
