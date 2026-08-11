import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUnauthorizedPageRedirect } from '@/lib/page-access';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import AppShell from './_components/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login?reason=session_expired');

  const role = (session.user as { role?: string } | undefined)?.role ?? 'user';
  const pathname = headers().get('x-pathname');
  if (pathname) {
    const denied = getUnauthorizedPageRedirect(pathname, role);
    if (denied) redirect(denied);
  }

  return <AppShell>{children}</AppShell>;
}
