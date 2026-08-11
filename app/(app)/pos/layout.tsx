'use client';

import '@/styles/pos-soft-ui.css';
import '@/styles/pos-catalog-editorial.css';
import { PosOrderFlowProvider } from '@/components/sales-flow/pos-order-flow-provider';
import { DemoPricingFallbackBanner } from '@/components/pricing/demo-pricing-fallback-banner';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <PosOrderFlowProvider>
      <DemoPricingFallbackBanner />
      {children}
    </PosOrderFlowProvider>
  );
}
