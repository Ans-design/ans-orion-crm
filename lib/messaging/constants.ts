/** Groupes de service ANS Talk */
export const TALK_SERVICE_GROUPS = [
  { key: 'direction', name: 'Direction', icon: '🏢' },
  { key: 'admin', name: 'Admin', icon: '⚙️' },
  { key: 'commercial', name: 'Commercial', icon: '💼' },
  { key: 'graphistes', name: 'Graphistes', icon: '🎨' },
  { key: 'impression', name: 'Impression', icon: '🖨️' },
  { key: 'conducteurs', name: 'Conducteurs machine', icon: '🎛️' },
  { key: 'faconnage', name: 'Façonnage', icon: '✂️' },
  { key: 'livraison', name: 'Logistique / Livraison', icon: '🚚' },
  { key: 'stock', name: 'Stock', icon: '📦' },
  { key: 'finance', name: 'Finance', icon: '💰' },
  { key: 'rh', name: 'RH', icon: '👥' },
  { key: 'techniciens', name: 'Techniciens', icon: '🔧' },
] as const;

export type TalkServiceKey = (typeof TALK_SERVICE_GROUPS)[number]['key'];

export const TALK_ATTACHMENT_STATUSES = [
  'reçu',
  'à vérifier',
  'non conforme',
  'corrigé',
  'validé',
  'final',
] as const;

export const TALK_FILE_VERSIONS = ['V1', 'V2', 'V3', 'final'] as const;

export const TALK_ALLOWED_EXTENSIONS = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp', 'svg', 'ai', 'psd', 'eps',
  'indd', 'cdr', 'xd', 'fig', 'zip', 'rar', '7z', 'doc', 'docx', 'xls', 'xlsx',
  'ppt', 'pptx', 'txt', 'csv', 'mp4', 'mov', 'avi', 'webm', 'mp3', 'wav', 'ogg',
]);

export const TALK_BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'msi', 'scr', 'com', 'vbs', 'js', 'jar', 'sh', 'ps1',
]);

export const TALK_MENTION_TAGS = [
  '@graphistes', '@impression', '@faconnage', '@livraison', '@commercial', '@direction',
] as const;

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  zip: 'application/zip',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  webm: 'audio/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  csv: 'text/csv',
};

export function detectMimeType(ext: string): string {
  return MIME_MAP[ext.toLowerCase()] || 'application/octet-stream';
}

export function maxTalkUploadBytes(): number {
  const mb = Number(process.env.MESSAGING_MAX_MB || process.env.TALK_MAX_MB || 250);
  return Math.max(1, mb) * 1024 * 1024;
}

export function roleToServiceKeys(role: string): string[] {
  const map: Record<string, string[]> = {
    admin: ['admin', 'direction'],
    manager: ['direction', 'admin'],
    commercial: ['commercial'],
    designer: ['graphistes'],
    production: ['impression', 'faconnage'],
    conducteur: ['conducteurs', 'impression'],
    livraison: ['livraison', 'stock'],
    logistique: ['livraison', 'stock'],
    faconnage: ['faconnage'],
    finance: ['finance'],
    rh: ['rh'],
    technicien: ['techniciens'],
    cm: ['commercial'],
    caisse: ['admin'],
    accueil: ['commercial'],
    demo: TALK_SERVICE_GROUPS.map((s) => s.key),
    lecture: ['commercial'],
    user: ['commercial'],
  };
  return map[role] ?? [];
}

/** Rôles auto-ajoutés aux groupes commande à la création */
export const TALK_ORDER_MEMBER_ROLES = [
  'admin', 'manager', 'commercial', 'designer', 'production',
  'livraison', 'conducteur', 'faconnage', 'technicien', 'cm', 'accueil', 'caisse',
] as const;

export function isTalkOrderMemberRole(role: string): boolean {
  return (TALK_ORDER_MEMBER_ROLES as readonly string[]).includes(role);
}
