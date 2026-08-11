'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  getSelectedSalesClient,
  setSalesFlowUserId,
  setSelectedSalesClient,
  type SalesClientSnapshot,
} from './sales-client-store';

export function useSalesClient() {
  const { data: session, status } = useSession();
  const [client, setClient] = useState<SalesClientSnapshot | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    const userId = (session?.user as { id?: string })?.id ?? null;
    setSalesFlowUserId(userId);
    setClient(getSelectedSalesClient());
    setHydrated(true);
  }, [status, session]);

  useEffect(() => {
    const onChange = () => setClient(getSelectedSalesClient());
    window.addEventListener('salesClientChanged', onChange);
    return () => window.removeEventListener('salesClientChanged', onChange);
  }, []);

  const selectClient = useCallback((next: SalesClientSnapshot | null) => {
    setSelectedSalesClient(next);
    setClient(next);
  }, []);

  return { client, selectClient, hydrated, hasClient: !!client?.id };
}
