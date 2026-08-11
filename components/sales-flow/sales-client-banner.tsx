'use client';

import { User, Star, RefreshCw, ShoppingBag } from 'lucide-react';
import type { SalesClientSnapshot } from '@/lib/sales-flow/sales-client-store';

type Props = {
  client: SalesClientSnapshot;
  onChangeClient?: () => void;
  onNewOrder?: () => void;
  compact?: boolean;
};

export function SalesClientBanner({ client, onChangeClient, onNewOrder, compact }: Props) {
  const adresseLine = [client.adresse, client.ville].filter(Boolean).join(', ');

  return (
    <div className="orion-client-banner">
      <div className="orion-client-banner__main">
        <div className="orion-client-banner__avatar" aria-hidden>
          <User size={18} strokeWidth={2} />
        </div>
        <div className="orion-client-banner__info min-w-0">
          <div className="orion-client-banner__title-row">
            <span className="orion-client-banner__kicker">Client</span>
            <p className="orion-client-banner__name truncate">{client.name}</p>
            {client.clientFidele ? (
              <span className="orion-client-banner__fidele">
                <Star size={10} aria-hidden /> Client fidèle
              </span>
            ) : null}
          </div>
          <div className="orion-client-banner__meta">
            {client.tel ? <span>{client.tel}</span> : null}
            {client.email ? <span className="truncate">{client.email}</span> : null}
            {adresseLine ? <span>{adresseLine}</span> : null}
            {client.axeLivraison ? <span>Axe : {client.axeLivraison}</span> : null}
            {!compact && client.nif ? <span>NIF : {client.nif}</span> : null}
          </div>
        </div>
      </div>
      <div className="orion-client-banner__actions">
        {onNewOrder ? (
          <button type="button" onClick={onNewOrder} className="orion-client-banner__btn orion-client-banner__btn--primary">
            <ShoppingBag size={13} aria-hidden /> Nouvelle commande
          </button>
        ) : null}
        {onChangeClient ? (
          <button type="button" onClick={onChangeClient} className="orion-client-banner__btn orion-client-banner__btn--ghost">
            <RefreshCw size={13} aria-hidden /> Changer client
          </button>
        ) : null}
      </div>
    </div>
  );
}
