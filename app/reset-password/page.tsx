'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft, Printer, Eye, EyeOff } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordStrengthHints } from '@/components/auth/password-strength-hints';
import { validatePassword } from '@/lib/auth/password-policy';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      uxToast.error('Lien invalide — demandez un nouveau lien');
      return;
    }
    if (password !== confirm) {
      uxToast.error('Les mots de passe ne correspondent pas');
      return;
    }
    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) {
      uxToast.error(pwCheck.error);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        uxToast.error(data.error, 'Erreur');
        setLoading(false);
        return;
      }
      uxToast.success('Mot de passe mis à jour');
      router.replace('/login');
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
          <h1 className="font-display text-xl font-bold">Nouveau mot de passe</h1>
          <p className="text-muted-foreground text-sm mt-1">ANS ORION</p>
        </div>
        <div className="bg-card/90 backdrop-blur-md border border-border rounded-[7px] p-6 shadow-xl">
          {!token ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Lien invalide ou expiré.</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Retour à la connexion</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nouveau mot de passe</label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    disabled={loading}
                    className="pl-10 pr-10"
                    autoComplete="new-password"
                  />
                  <Lock size={14} className="absolute left-3 top-3 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password.length > 0 && <div className="mt-2"><PasswordStrengthHints password={password} /></div>}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Confirmer</label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    minLength={8}
                    required
                    disabled={loading}
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={loading || !validatePassword(password).ok || password !== confirm}
              >
                Enregistrer le mot de passe
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
