'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { AppConfirmDialog } from '@/components/ui/app-ui';
import { ClientSearchModal } from './client-search-modal';
import { PosNewOrderDialog } from './pos-new-order-dialog';
import type { ClientSearchResult } from '@/hooks/use-client-search';
import { useSalesClient } from '@/lib/sales-flow/use-sales-client';
import {
  applyClientSelection,
  needsClientChangeConfirmation,
  startNewOrderForCurrentClient,
  startNewOrderForOtherClient,
} from '@/lib/sales-flow/pos-order-actions';
import { clientSnapshotFromApi, type SalesClientSnapshot } from '@/lib/sales-flow/sales-client-store';

type PosOrderFlowContextValue = {
  openClientSearch: () => void;
  requestClientChange: () => void;
  requestNewOrder: () => void;
  selectClientFromSearch: (result: ClientSearchResult) => void;
};

const PosOrderFlowContext = createContext<PosOrderFlowContextValue | null>(null);

export function usePosOrderFlow(): PosOrderFlowContextValue {
  const ctx = useContext(PosOrderFlowContext);
  if (!ctx) {
    throw new Error('usePosOrderFlow must be used within PosOrderFlowProvider');
  }
  return ctx;
}

function searchResultToSnapshot(r: ClientSearchResult): SalesClientSnapshot {
  return clientSnapshotFromApi({
    id: r.id,
    name: r.name,
    code: r.code,
    email: r.email,
    tel: r.tel,
    nif: r.nif,
    commercialName: r.commercialName,
    adresse: r.adressePrincipale,
    clientFidele: r.clientFidele,
    nombreCommandes: r.nombreCommandes,
    totalInvesti: r.totalInvesti,
    axeLivraison: r.axeLivraison,
    cmds: r.nombreCommandes,
    ca: String(r.totalInvesti),
  });
}

export function PosOrderFlowProvider({ children }: { children: ReactNode }) {
  const { selectClient } = useSalesClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingClient, setPendingClient] = useState<SalesClientSnapshot | null>(null);
  const [changeConfirmOpen, setChangeConfirmOpen] = useState(false);
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const commitClient = useCallback(
    (snapshot: SalesClientSnapshot | null) => {
      applyClientSelection(snapshot);
      selectClient(snapshot);
      if (snapshot) {
        void import('@/lib/commercial/commercial-journey-store').then(({ emitCommercialJourney }) => {
          emitCommercialJourney('client_selected', { clientId: snapshot.id });
        });
        uxToast.success(`Client : ${snapshot.name}`);
      }
    },
    [selectClient],
  );

  const selectClientFromSearch = useCallback(
    (result: ClientSearchResult) => {
      const snapshot = searchResultToSnapshot(result);
      if (needsClientChangeConfirmation(snapshot)) {
        setPendingClient(snapshot);
        setChangeConfirmOpen(true);
        return;
      }
      commitClient(snapshot);
    },
    [commitClient],
  );

  const openClientSearch = useCallback(() => setSearchOpen(true), []);

  const requestClientChange = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const requestNewOrder = useCallback(() => {
    setNewOrderOpen(true);
  }, []);

  const confirmClientChange = useCallback(() => {
    commitClient(pendingClient);
    setPendingClient(null);
    setChangeConfirmOpen(false);
  }, [commitClient, pendingClient]);

  return (
    <PosOrderFlowContext.Provider
      value={{ openClientSearch, requestClientChange, requestNewOrder, selectClientFromSearch }}
    >
      {children}

      <ClientSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={selectClientFromSearch}
      />

      <AppConfirmDialog
        open={changeConfirmOpen}
        onOpenChange={setChangeConfirmOpen}
        title="Changer de client"
        description="Changer de client va réinitialiser le panier en cours. Continuer ?"
        confirmLabel="Continuer"
        variant="destructive"
        onConfirm={confirmClientChange}
      />

      <PosNewOrderDialog
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        onSameClient={() => {
          startNewOrderForCurrentClient();
          uxToast.success('Nouvelle commande pour ce client');
        }}
        onOtherClient={() => {
          startNewOrderForOtherClient();
          uxToast.success('Sélectionnez un client pour la nouvelle commande');
          setSearchOpen(true);
        }}
      />
    </PosOrderFlowContext.Provider>
  );
}
