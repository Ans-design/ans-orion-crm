'use client';

/**
 * SEC-01 — première connexion après bootstrap : changement MDP obligatoire.
 */
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  OrionAuthLayout,
  OrionLogoBlock,
  OrionLoginCard,
  OrionAlert,
  OrionAuthFormField,
  OrionPasswordInput,
  OrionButton,
} from '@/components/orion/auth';

export default function ChangePasswordPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 12) {
      setError('Le nouveau mot de passe doit faire au moins 12 caractères.');
      return;
    }
    if (newPassword !== confirm) {
      setError('La confirmation ne correspond pas.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Échec du changement');
        return;
      }
      await update?.();
      await signOut({ redirect: false });
      router.replace('/login?reason=password_changed');
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  const form = (
    <OrionLoginCard title="Changement de mot de passe" subtitle="Obligatoire après initialisation du compte.">
      {session?.user?.email ? (
        <p className="mb-3 text-sm text-[var(--text-muted)]">{session.user.email}</p>
      ) : null}
      {error ? <OrionAlert variant="error">{error}</OrionAlert> : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <OrionAuthFormField label="Mot de passe actuel">
          <OrionPasswordInput
            label=""
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            required
          />
        </OrionAuthFormField>
        <OrionAuthFormField label="Nouveau mot de passe (≥ 12)">
          <OrionPasswordInput
            label=""
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            required
            minLength={12}
          />
        </OrionAuthFormField>
        <OrionAuthFormField label="Confirmation">
          <OrionPasswordInput
            label=""
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            required
            minLength={12}
          />
        </OrionAuthFormField>
        <OrionButton type="submit" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer et se reconnecter'}
        </OrionButton>
      </form>
    </OrionLoginCard>
  );

  return <OrionAuthLayout brand={<OrionLogoBlock />} form={form} />;
}
