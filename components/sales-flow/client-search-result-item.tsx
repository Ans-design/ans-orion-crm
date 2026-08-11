'use client';

import { Star, User } from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import type { ClientSearchResult } from '@/hooks/use-client-search';

type Props = {
  client: ClientSearchResult;
  onSelect: (client: ClientSearchResult) => void;
};

export function ClientSearchResultItem({ client, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(client)}
      className="w-full text-left rounded-[7px] border border-border bg-card hover:bg-muted/40 px-4 py-3 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User size={16} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm truncate">{client.name}</span>
            {client.clientFidele && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--orion-yellow)]/15 text-[var(--orion-yellow)]">
                <Star size={10} /> Client fidèle
              </span>
            )}
          </div>
          {client.commercialName && (
            <p className="text-xs text-muted-foreground mt-0.5">{client.commercialName}</p>
          )}
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            {client.tel && <p>{client.tel}</p>}
            {client.email && <p className="truncate">{client.email}</p>}
            {client.nif && <p>NIF : {client.nif}</p>}
            {client.adressePrincipale && <p className="line-clamp-1">{client.adressePrincipale}</p>}
            {client.axeLivraison && <p>Axe : {client.axeLivraison}</p>}
          </div>
          {client.nombreCommandes > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {client.nombreCommandes} commande(s) · {formatPrice(client.totalInvesti)} investi
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
