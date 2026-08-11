import { redirect } from 'next/navigation';

type Props = { searchParams: { statut?: string } };

export default function StudioBriefsRedirect({ searchParams }: Props) {
  const statut = searchParams.statut;
  if (statut) {
    redirect(`/studio?tab=briefs&statut=${encodeURIComponent(statut)}`);
  }
  redirect('/studio?tab=briefs');
}
