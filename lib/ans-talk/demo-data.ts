import type { TalkConversation, TalkMessage, TalkUser } from '@/lib/hooks/use-ans-talk';

const NOW = Date.now();
const ago = (mins: number) => new Date(NOW - mins * 60_000).toISOString();

export const DEMO_USERS: TalkUser[] = [
  { id: 'demo-u1', name: 'Marie Rakoto', email: 'marie@ans.mg', role: 'commercial', image: null },
  { id: 'demo-u2', name: 'Jean Studio', email: 'studio@ans.mg', role: 'designer', image: null },
  { id: 'demo-u3', name: 'Paul Production', email: 'prod@ans.mg', role: 'production', image: null },
  { id: 'demo-u4', name: 'Solo Livraison', email: 'livraison@ans.mg', role: 'logistique', image: null },
];

export const DEMO_CONVERSATIONS: TalkConversation[] = [
  {
    id: 'demo-announce',
    name: 'Annonces équipe',
    type: 'service',
    serviceKey: 'annonces',
    description: 'Fil d\'actualité interne — priorités et infos direction',
    label: 'Annonce',
    pinned: true,
    noResponse: false,
    unreadCount: 2,
    lastMessage: {
      id: 'dm-a1',
      body: '📢 Réunion production vendredi 14h — présence obligatoire atelier',
      senderName: 'Direction',
      createdAt: ago(12),
    },
    members: DEMO_USERS.map((u) => ({ userId: u.id, name: u.name ?? '', role: u.role })),
    updatedAt: ago(12),
  },
  {
    id: 'demo-studio',
    name: 'Studio Graphique',
    type: 'group',
    description: 'Équipe créa — fichiers, BAT et retouches',
    label: 'Groupe',
    pinned: true,
    noResponse: false,
    unreadCount: 1,
    lastMessage: {
      id: 'dm-s1',
      body: 'BAT v2 envoyé au client — en attente de validation',
      senderName: 'Jean Studio',
      createdAt: ago(28),
    },
    members: DEMO_USERS.slice(0, 3).map((u) => ({ userId: u.id, name: u.name ?? '', role: u.role })),
    updatedAt: ago(28),
  },
  {
    id: 'demo-cmd-001',
    name: 'Commande CMD-001 — Carte de visite',
    type: 'order',
    commandeId: 'demo-cmd-001',
    description: 'Client Rakoto — 500 ex. pelliculage mat',
    label: 'Commande',
    pinned: false,
    noResponse: true,
    unreadCount: 3,
    lastMessage: {
      id: 'dm-c1',
      body: 'Fichiers print OK — lancement presse demain 8h ?',
      senderName: 'Paul Production',
      createdAt: ago(45),
    },
    members: DEMO_USERS.map((u) => ({ userId: u.id, name: u.name ?? '', role: u.role })),
    updatedAt: ago(45),
  },
  {
    id: 'demo-bat',
    name: 'BAT — Client Rakoto',
    type: 'order',
    commandeId: 'demo-bat-001',
    description: 'Validation BAT carte de visite — version 2',
    label: 'BAT',
    pinned: false,
    noResponse: false,
    unreadCount: 0,
    lastMessage: {
      id: 'dm-b1',
      body: 'Client demande correction du logo — fichier AI joint',
      senderName: 'Marie Rakoto',
      createdAt: ago(90),
    },
    members: DEMO_USERS.slice(0, 3).map((u) => ({ userId: u.id, name: u.name ?? '', role: u.role })),
    updatedAt: ago(90),
  },
  {
    id: 'demo-prod',
    name: 'Production urgente',
    type: 'dossier',
    productionDossierId: 'demo-gpao-1',
    commandeId: 'demo-cmd-urgent',
    description: 'Dossier GPAO — offset 4 couleurs, priorité haute',
    label: 'Urgent',
    pinned: false,
    noResponse: false,
    unreadCount: 1,
    lastMessage: {
      id: 'dm-p1',
      body: 'Machine Heidelberg libre à 15h — on enchaîne ?',
      senderName: 'Paul Production',
      createdAt: ago(120),
    },
    members: DEMO_USERS.slice(1, 4).map((u) => ({ userId: u.id, name: u.name ?? '', role: u.role })),
    updatedAt: ago(120),
  },
  {
    id: 'demo-livraison',
    name: 'Livraison du jour',
    type: 'service',
    serviceKey: 'livraison',
    description: 'Tournée Antananarivo — 4 arrêts prévus',
    label: 'Livraison',
    pinned: false,
    noResponse: false,
    unreadCount: 0,
    lastMessage: {
      id: 'dm-l1',
      body: 'CMD-001 prête — enlèvement client 16h confirmé',
      senderName: 'Solo Livraison',
      createdAt: ago(180),
    },
    members: DEMO_USERS.map((u) => ({ userId: u.id, name: u.name ?? '', role: u.role })),
    updatedAt: ago(180),
  },
];

const DEMO_MESSAGES: Record<string, TalkMessage[]> = {
  'demo-announce': [
    msg('da1', 'demo-announce', 'demo-admin', 'Direction', 'admin', '📢 Réunion production vendredi 14h — présence obligatoire atelier', ago(12), { pinned: true }),
    msg('da2', 'demo-announce', 'demo-u3', 'Paul Production', 'production', 'OK, je préviens l\'équipe impression.', ago(60)),
  ],
  'demo-studio': [
    msg('ds1', 'demo-studio', 'demo-u2', 'Jean Studio', 'designer', 'BAT v2 envoyé au client — en attente de validation', ago(28)),
    msg('ds2', 'demo-studio', 'demo-u1', 'Marie Rakoto', 'commercial', '@graphistes merci pour la retouche rapide 👍', ago(35), { reactions: { '👍': 2 } }),
  ],
  'demo-cmd-001': [
    msg('dc1', 'demo-cmd-001', 'demo-u3', 'Paul Production', 'production', 'Fichiers print OK — lancement presse demain 8h ?', ago(45)),
    msg('dc2', 'demo-cmd-001', 'demo-u1', 'Marie Rakoto', 'commercial', 'Client valide — go production.', ago(50)),
    msg('dc3', 'demo-cmd-001', 'demo-u2', 'Jean Studio', 'designer', 'PDF HD + AI dans la galerie.', ago(55), {
      attachments: [{
        id: 'att-demo-1',
        fileName: 'carte-visite-hd.pdf',
        originalFileName: 'carte-visite-hd.pdf',
        extension: 'pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2_450_000,
        checksumSha256: 'demo',
        version: 'v1',
        status: 'validé',
        uploadedByName: 'Jean Studio',
        createdAt: ago(55),
      }],
    }),
  ],
  'demo-bat': [
    msg('db1', 'demo-bat', 'demo-u1', 'Marie Rakoto', 'commercial', 'Client demande correction du logo — fichier AI joint', ago(90)),
  ],
  'demo-prod': [
    msg('dp1', 'demo-prod', 'demo-u3', 'Paul Production', 'production', 'Machine Heidelberg libre à 15h — on enchaîne ?', ago(120)),
  ],
  'demo-livraison': [
    msg('dl1', 'demo-livraison', 'demo-u4', 'Solo Livraison', 'logistique', 'CMD-001 prête — enlèvement client 16h confirmé', ago(180)),
  ],
};

function msg(
  id: string,
  conversationId: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  body: string,
  createdAt: string,
  extra?: Partial<TalkMessage>,
): TalkMessage {
  return {
    id,
    conversationId,
    senderId,
    senderName,
    senderRole,
    body,
    createdAt,
    editedAt: null,
    pinned: false,
    replyToId: null,
    replyTo: null,
    reads: [],
    ackedBy: [],
    isMine: false,
    reactions: {},
    attachments: [],
    tasks: [],
    ...extra,
  };
}

export function getDemoMessages(convId: string, currentUserId = 'local-admin'): TalkMessage[] {
  const list = DEMO_MESSAGES[convId] ?? [];
  return list.map((m) => ({
    ...m,
    isMine: m.senderId === currentUserId || m.senderId === 'demo-admin',
  }));
}

export function getDemoUnreadTotal(): number {
  return DEMO_CONVERSATIONS.reduce((n, c) => n + c.unreadCount, 0);
}
