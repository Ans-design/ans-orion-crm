import { getBrandingConfig } from '@/lib/branding-config';

export async function sendPasswordChangedEmail(params: {
  to: string;
  userName?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return { sent: false as const, reason: 'no_resend' };

  const branding = await getBrandingConfig();
  const from = process.env.RESEND_FROM || 'ORION <onboarding@resend.dev>';

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#FF174D">Mot de passe modifié — ${branding.companyName || 'ANS ORION'}</h2>
      <p>Bonjour${params.userName ? ` ${params.userName}` : ''},</p>
      <p>Votre mot de passe ANS ORION a été réinitialisé avec succès.</p>
      <p style="color:#64748b;font-size:13px">Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement l'administrateur.</p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: `[ORION] Confirmation — mot de passe modifié`,
      html,
      text: 'Votre mot de passe ANS ORION a été modifié. Si ce n\'était pas vous, contactez l\'administrateur.',
    }),
  });

  if (!res.ok) return { sent: false as const, reason: 'resend_error' };
  return { sent: true as const };
}
