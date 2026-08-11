/** Vérifie que le serveur voit bien le cookie session (pas le cache client NextAuth). */
export async function verifyServerSession(maxAttempts = 15): Promise<boolean> {
  const session = await fetchServerSession(maxAttempts);
  return !!session?.user;
}

export type ClientSessionUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string;
};

/** Récupère la session serveur (rôle pour redirection post-login). */
export async function fetchServerSession(maxAttempts = 15): Promise<{ user?: ClientSessionUser } | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) return data;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}
