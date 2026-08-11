'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { canAccessPage } from '@/lib/page-access';

/** Redirige vers /non-autorise si le rôle n'a pas accès à la page courante. */
export function PageRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'user';

  useEffect(() => {
    if (status !== 'authenticated' || !pathname) return;
    if (pathname.startsWith('/non-autorise')) return;
    if (canAccessPage(role, pathname)) return;

    const qs = new URLSearchParams({ from: pathname });
    router.replace(`/non-autorise?${qs.toString()}`);
  }, [status, role, pathname, router]);

  return null;
}
