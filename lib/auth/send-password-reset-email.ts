import { getBrandingConfig } from '@/lib/branding-config';

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
  userName?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return { sent: false as const, reason: 'no_resend' };

  const branding = await getBrandingConfig();
  const from = process.env.RESEND_FROM || 'ORION <onboarding@resend.dev>';

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#FF174D">Réinitialisation mot de passe — ${branding.companyName || 'ANS ORION'}</h2>
      <p>Bonjour${params.userName ? ` ${params.userName}` : ''},</p>
      <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe (valide 30 minutes) :</p>
      <p><a href="${params.resetUrl}" style="color:#FF174D;font-weight:600">${params.resetUrl}</a></p>
      <p style="color:#64748b;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
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
      subject: `[ORION] Réinitialisation de votre mot de passe`,
      html,
      text: `Réinitialisez votre mot de passe : ${params.resetUrl} (lien valide 30 min)`,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('[password-reset-email]', res.status, err);
    return { sent: false as const, reason: 'resend_error' };
  }

  return { sent: true as const };
}
