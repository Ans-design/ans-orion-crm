import { AdminRoutesHubShell } from '@/components/administration/AdminRoutesHubShell';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminRoutesHubShell>{children}</AdminRoutesHubShell>;
}
