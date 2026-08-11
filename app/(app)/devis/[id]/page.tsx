import { redirect } from 'next/navigation';

type Props = { params: { id: string } | Promise<{ id: string }> };

/** Alias canonique — détail devis via query historique `/devis?id=` (Lot B7 V4). */
export default async function DevisByIdPage({ params }: Props) {
  const { id } = await Promise.resolve(params);
  redirect(`/devis?id=${encodeURIComponent(id)}`);
}
