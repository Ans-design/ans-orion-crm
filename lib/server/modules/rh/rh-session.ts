import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getRhSessionMatricule(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { matricule?: string | null })?.matricule ?? null;
}
