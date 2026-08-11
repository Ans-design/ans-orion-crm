'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, Printer } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function ForgotPasswordForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoResetUrl, setDemoResetUrl] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !identifier.trim()) return;
    setLoading(true);
    setDemoResetUrl(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        uxToast.error(data.error, 'Erreur');
        return;
      }
      setSent(true);
      uxToast.success(data.message);
      if (data.demoResetUrl) setDemoResetUrl(data.demoResetUrl);
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="cmjn-bar fixed top-0 left-0 right-0" />
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[7px] bg-primary mb-3">
            <Printer size={28} className="text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold">Mot de passe oublié</h1>
          <p className="text-muted-foreground text-sm mt-1">ANS ORION</p>
        </div>
        <div className="bg-card/90 backdrop-blur-md border border-border rounded-[7px] p-6 shadow-xl">
          {sent ? (
            <div className="space-y-4 text-center text-sm">
              <KeyRound size={32} className="mx-auto text-primary" />
              <p className="text-muted-foreground">
                Si un compte existe avec cet identifiant, un email de réinitialisation a été envoyé.
              </p>
              {demoResetUrl && (
                <a href={demoResetUrl} className="block text-xs text-primary break-all hover:underline">
                  Lien démo (30 min) : {demoResetUrl}
                </a>
              )}
              <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
                Retour connexion
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Saisissez votre email ou matricule. Nous ne révélons jamais si le compte existe.
              </p>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email ou matricule</label>
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="email@exemple.local ou matricule"
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
              <Button type="submit" className="w-full" loading={loading}>
                Envoyer le lien
              </Button>
            </form>
          )}
          <Link href="/login" className="mt-4 flex items-center justify-center gap-1 text-xs text-primary hover:underline">
            <ArrowLeft size={12} /> Retour connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement…</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
