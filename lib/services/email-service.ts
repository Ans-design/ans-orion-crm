import { Resend } from 'resend';

let client: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export type SendAlertResult =
  | { ok: true }
  | { ok: false; skipped?: boolean; error?: string };

export async function sendAlertEmail(params: {
  to: string;
  subject: string;
  title: string;
  message: string;
  link?: string;
}): Promise<SendAlertResult> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM;
  if (!resend || !from) return { ok: false, skipped: true };

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const href = params.link ? `${appUrl.replace(/\/$/, '')}${params.link}` : appUrl;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">ANS ORION ERP</p>
      <h2 style="color:#0f172a;margin:0 0 12px;font-size:18px">${escapeHtml(params.title)}</h2>
      <p style="color:#334155;line-height:1.5;margin:0 0 20px">${escapeHtml(params.message)}</p>
      <a href="${href}" style="display:inline-block;background:#FF174D;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Ouvrir dans ORION</a>
      <p style="color:#94a3b8;font-size:11px;margin-top:24px">Alerte automatique — préférences dans Paramètres → Notifications</p>
    </div>`;

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html,
    });
    if (error) {
      console.error('Resend error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error('Email send failed:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendDevisEmail(params: {
  to: string;
  clientName: string;
  devisNumero: string;
  totalTTC: number;
  validUntil?: string | null;
  devisId: string;
  message?: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
  docKind?: 'devis' | 'proforma';
  from?: string;
}): Promise<SendAlertResult> {
  const resend = getResend();
  const from = params.from?.trim() || process.env.EMAIL_FROM;
  if (!resend || !from) return { ok: false, skipped: true };

  const appUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
  const docQuery = params.docKind === 'proforma' ? '&doc=proforma' : '';
  const pdfUrl = `${appUrl}/api/devis/${params.devisId}/pdf?format=pdf${docQuery}`;
  const docLabel = params.docKind === 'proforma' ? 'Proforma' : 'Devis';
  const validLine = params.validUntil
    ? `<p style="color:#64748b;font-size:13px;margin:0 0 16px">Valable jusqu'au ${escapeHtml(new Date(params.validUntil).toLocaleDateString('fr-FR'))}</p>`
    : '';
  const bodyText = params.message
    || `Montant total TTC : ${params.totalTTC.toLocaleString('fr-FR')} Ar.`;

  const attachments = params.pdfBuffer
    ? [{ filename: params.pdfFilename || `${docLabel}-${params.devisNumero}.pdf`, content: params.pdfBuffer.toString('base64') }]
    : undefined;

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `${docLabel} ${params.devisNumero} — ANS Design Print`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">ANS ORION ERP</p>
          <h2 style="color:#0f172a;margin:0 0 12px;font-size:18px">${docLabel} ${escapeHtml(params.devisNumero)}</h2>
          <p style="color:#334155;line-height:1.5;margin:0 0 8px">Bonjour ${escapeHtml(params.clientName)},</p>
          <p style="color:#334155;line-height:1.5;margin:0 0 16px">${escapeHtml(bodyText)}</p>
          ${validLine}
          <a href="${pdfUrl}" style="display:inline-block;background:#FF174D;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-right:8px">Télécharger le PDF</a>
          <a href="${appUrl}/devis" style="display:inline-block;background:#FF174D;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Voir dans ORION</a>
        </div>`,
      attachments,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendFactureEmail(params: {
  to: string;
  clientName: string;
  factureNumero: string;
  totalTTC: number;
  factureId: string;
  message?: string;
  pdfBuffer?: Buffer;
}): Promise<SendAlertResult> {
  const appUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
  const pdfUrl = `${appUrl}/api/factures/${params.factureId}/pdf?format=pdf`;

  const resend = getResend();
  const from = process.env.EMAIL_FROM;
  if (!resend || !from) return { ok: false, skipped: true };

  const attachments = params.pdfBuffer
    ? [{ filename: `Facture-${params.factureNumero}.pdf`, content: params.pdfBuffer.toString('base64') }]
    : undefined;

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `Facture ${params.factureNumero} — ANS Design Print`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">ANS ORION ERP</p>
          <h2 style="color:#0f172a;margin:0 0 12px;font-size:18px">Facture ${escapeHtml(params.factureNumero)}</h2>
          <p style="color:#334155;line-height:1.5;margin:0 0 8px">Bonjour ${escapeHtml(params.clientName)},</p>
          <p style="color:#334155;line-height:1.5;margin:0 0 16px">${escapeHtml(params.message || `Montant TTC : ${params.totalTTC.toLocaleString('fr-FR')} Ar.`)}</p>
          <a href="${pdfUrl}" style="display:inline-block;background:#FF174D;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-right:8px">Télécharger le PDF</a>
          <a href="${appUrl}/factures" style="display:inline-block;background:#FF174D;color:#fff;padding:10px 18px;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px">Voir dans ORION</a>
        </div>`,
      attachments,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
