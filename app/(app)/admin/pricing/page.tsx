import { redirect } from 'next/navigation';

/** Legacy `/admin/pricing` → hub Administration prix. */
export default function AdminPricingLegacyRedirect() {
  redirect('/administration/prix');
}
