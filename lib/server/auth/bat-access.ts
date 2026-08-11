import { requireAnyPermission, type RequireAuthOptions } from '@/lib/auth-utils';

/**
 * Lecture BAT — designer (bat:read) ou production (production:read).
 * Ne pas élargir production:write au designer.
 */
export async function requireBatRead(options?: RequireAuthOptions) {
  return options
    ? requireAnyPermission('bat:read', 'production:read', options)
    : requireAnyPermission('bat:read', 'production:read');
}

/**
 * Mutations BAT — designer (bat:write) ou production (production:write).
 */
export async function requireBatWrite(options?: RequireAuthOptions) {
  return options
    ? requireAnyPermission('bat:write', 'production:write', options)
    : requireAnyPermission('bat:write', 'production:write');
}
