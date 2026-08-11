import { redirect } from 'next/navigation';

/** Legacy hub Base Prix & Matières → module unique Catalogue, Prix & Stock. */
export default function BasePrixMatieresRedirectPage() {
  redirect('/administration/catalogue-prix-stock?tab=vue');
}
