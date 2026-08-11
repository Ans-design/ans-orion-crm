'use client';

import { useSession } from 'next-auth/react';
import { hasPermission, type Permission } from '@/lib/auth/permissions';

export function useSessionRole(): string {
  const { data: session } = useSession();
  return (session?.user as { role?: string } | undefined)?.role ?? 'user';
}

export function useHasPermission(permission: Permission): boolean {
  const role = useSessionRole();
  return hasPermission(role, permission);
}

export function useHasAnyPermission(permissions: Permission[]): boolean {
  const role = useSessionRole();
  return permissions.some((p) => hasPermission(role, p));
}
