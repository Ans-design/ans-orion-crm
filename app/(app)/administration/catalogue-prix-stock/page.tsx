'use client';

import { Suspense } from 'react';
import { CataloguePrixStockWorkspace } from '@/components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace';
import '@/components/backoffice-v2/admin-backoffice.css';

export default function CataloguePrixStockPage() {
  return (
    <div className="w-full max-w-none min-w-0">
      <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--text-muted,#94a3b8)]">Chargement…</div>}>
        <CataloguePrixStockWorkspace />
      </Suspense>
    </div>
  );
}
