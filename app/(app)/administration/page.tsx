import { redirect } from 'next/navigation';
import { DEFAULT_ADMIN_SECTION } from '@/lib/administration/routes';

export default function AdministrationIndexPage() {
  redirect(`/administration/${DEFAULT_ADMIN_SECTION}`);
}
