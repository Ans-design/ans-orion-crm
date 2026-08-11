import { formatPrice } from '@/lib/data/catalogue';
import {
  COMPANY_SENDER_STORAGE_KEY,
  detectMailProvider,
  MAIL_PROVIDER_STORAGE_KEY,
  openMailCompose,
  triggerPdfDownload,
  type MailProvider,
} from '@/lib/email/address';

export type DevisSendPayload = {
  devisId: string;
  devisNumero: string;
  totalTTC: number;
  clientName: string;
  recipientEmail: string;
  senderEmail: string;
  companyName: string;
  message?: string;
  provider?: MailProvider;
};

export function buildDevisEmailSubject(devisNumero: string, companyName: string): string {
  return `Proforma ${devisNumero} — ${companyName}`;
}

export function buildDevisEmailBody(payload: DevisSendPayload): string {
  const intro =
    payload.message?.trim()
    || `Veuillez trouver ci-joint notre proforma ${payload.devisNumero} pour un montant de ${formatPrice(payload.totalTTC)} Ar TTC.`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pdfPath = `/api/devis/${payload.devisId}/pdf?doc=proforma&format=pdf`;
  const pdfLink = origin ? `${origin}${pdfPath}` : pdfPath;
  return [
    `Bonjour ${payload.clientName},`,
    '',
    intro,
    '',
    `Télécharger la proforma (PDF) : ${pdfLink}`,
    '',
    'Cordialement,',
    payload.companyName,
    payload.senderEmail || '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildDevisWhatsAppText(payload: DevisSendPayload): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pdfPath = `/api/devis/${payload.devisId}/pdf?doc=proforma&format=pdf`;
  const pdfLink = origin ? `${origin}${pdfPath}` : pdfPath;
  return [
    `Bonjour ${payload.clientName},`,
    '',
    payload.message?.trim()
      || `Voici notre proforma ${payload.devisNumero} — ${formatPrice(payload.totalTTC)} Ar TTC.`,
    '',
    pdfLink,
  ].join('\n');
}

export function launchDevisEmailCompose(payload: DevisSendPayload): MailProvider {
  const subject = buildDevisEmailSubject(payload.devisNumero, payload.companyName);
  const body = buildDevisEmailBody(payload);
  const storedProvider = typeof window !== 'undefined'
    ? (window.localStorage.getItem(MAIL_PROVIDER_STORAGE_KEY) as MailProvider | null)
    : null;
  const provider = payload.provider
    || storedProvider
    || detectMailProvider(payload.senderEmail);

  if (payload.senderEmail.trim()) {
    window.localStorage.setItem(COMPANY_SENDER_STORAGE_KEY, payload.senderEmail.trim().toLowerCase());
  }
  window.localStorage.setItem(MAIL_PROVIDER_STORAGE_KEY, provider);

  triggerPdfDownload(
    `/api/devis/${payload.devisId}/pdf?doc=proforma&format=pdf`,
    `Proforma-${payload.devisNumero}.pdf`,
  );
  openMailCompose(provider, { to: payload.recipientEmail, subject, body });
  return provider;
}
