'use client';

export type ConvFilterTab =
  | 'all'
  | 'unread'
  | 'private'
  | 'group'
  | 'client'
  | 'team'
  | 'order'
  | 'bat'
  | 'production'
  | 'livraison'
  | 'factures'
  | 'paiements'
  | 'stock'
  | 'planning';

export const TALK_FILTER_TABS: { id: ConvFilterTab; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'unread', label: 'Non lus' },
  { id: 'private', label: 'Privés' },
  { id: 'group', label: 'Groupes' },
  { id: 'order', label: 'Commandes' },
  { id: 'bat', label: 'BAT' },
  { id: 'production', label: 'Production' },
  { id: 'livraison', label: 'Livraison' },
];

type Props = {
  active: ConvFilterTab;
  onChange: (tab: ConvFilterTab) => void;
};

export function TalkFilters({ active, onChange }: Props) {
  return (
    <div className="talk-filters flex gap-1 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
      {TALK_FILTER_TABS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={`orion-surface-chip orion-surface-chip--pill ${
            active === f.id ? 'orion-surface-chip--active talk-filter-active' : ''
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export function matchesTalkFilter(
  c: {
    type: string;
    name: string;
    label?: string | null;
    serviceKey?: string | null;
    commandeId?: string | null;
    unreadCount: number;
    noResponse: boolean;
  },
  filter: ConvFilterTab,
): boolean {
  const name = c.name.toLowerCase();
  const label = (c.label ?? '').toLowerCase();
  const isClient =
    Boolean(c.commandeId) ||
    c.type === 'order' ||
    c.type === 'dossier' ||
    c.type === 'devis' ||
    label.includes('bat') ||
    name.includes('bat') ||
    name.includes('devis') ||
    name.includes('commande') ||
    name.includes('gpao') ||
    name.includes('livraison') ||
    name.includes('facture');
  const isAnnounce = name.includes('annonce');

  switch (filter) {
    case 'unread':
      return c.unreadCount > 0;
    case 'private':
      return c.type === 'private';
    case 'group':
      return c.type === 'group';
    case 'client':
    case 'order':
      return isClient;
    case 'team':
      return !isClient && !isAnnounce;
    case 'bat':
      return label.includes('bat') || name.includes('bat');
    case 'production':
      return c.type === 'dossier' || c.serviceKey === 'production' || name.includes('production');
    case 'livraison':
      return c.serviceKey === 'livraison' || name.includes('livraison');
    case 'factures':
      return name.includes('facture') || label.includes('facture') || c.serviceKey === 'finance';
    case 'paiements':
      return name.includes('paiement') || label.includes('paiement') || name.includes('règlement');
    case 'stock':
      return c.serviceKey === 'stock' || name.includes('stock') || label.includes('stock');
    case 'planning':
      return name.includes('planning') || label.includes('planning') || c.serviceKey === 'planning';
    default:
      return true;
  }
}

/** Filtre conversations par recherche + onglet. */
export function filterConversations<T extends Parameters<typeof matchesTalkFilter>[0]>(
  conversations: T[],
  filter: ConvFilterTab,
  search: string,
): T[] {
  const q = search.trim().toLowerCase();
  return conversations.filter((c) => {
    if (q) {
      const inName = c.name.toLowerCase().includes(q);
      const inMsg = (c as { lastMessage?: { body?: string } | null }).lastMessage?.body?.toLowerCase().includes(q);
      const inMembers = (c as { members?: { name?: string | null }[] }).members?.some(
        (m) => (m.name ?? '').toLowerCase().includes(q),
      );
      if (!inName && !inMsg && !inMembers) return false;
    }
    return matchesTalkFilter(c, filter);
  });
}
