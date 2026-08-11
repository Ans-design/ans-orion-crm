/** Règles ANS Talk sans Prisma — safe pour import client. */

export function canEditMessage(senderId: string | null | undefined, userId: string, role: string): boolean {
  if (senderId === userId) return true;
  return role === 'admin' || role === 'manager';
}

export function canDeleteMessage(senderId: string | null | undefined, userId: string, role: string): boolean {
  return canEditMessage(senderId, userId, role);
}

export function canPinMessage(role: string): boolean {
  return role === 'admin' || role === 'manager';
}

export function canChangeAttachmentStatus(role: string, status: string): boolean {
  if (status === 'final' || status === 'validé') {
    return role === 'admin' || role === 'manager';
  }
  return ['admin', 'manager', 'designer', 'production', 'commercial', 'livraison', 'faconnage', 'conducteur'].includes(role);
}
