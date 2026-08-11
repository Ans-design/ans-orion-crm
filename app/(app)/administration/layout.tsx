import { AdministrationSectionHubShell } from '@/components/administration/AdministrationSectionHubShell';

export default function AdministrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdministrationSectionHubShell>{children}</AdministrationSectionHubShell>;
}
