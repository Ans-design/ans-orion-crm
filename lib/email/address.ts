/** Extrait l'adresse d'un en-tête type `ORION <alert@ansdesign.mg>`. */
export function extractEmailFromFromHeader(from?: string | null): string | null {
  if (!from) return null;
  const bracket = from.match(/<([^>]+)>/);
  if (bracket) return bracket[1].trim().toLowerCase();
  if (from.includes('@')) return from.trim().toLowerCase();
  return null;
}

export function formatEmailFrom(name: string, email: string): string {
  const clean = email.trim().toLowerCase();
  return `${name.trim()} <${clean}>`;
}

export function buildMailtoUrl(params: { to: string; subject: string; body: string }): string {
  const q = new URLSearchParams();
  q.set('subject', params.subject);
  q.set('body', params.body);
  return `mailto:${encodeURIComponent(params.to.trim())}?${q.toString()}`;
}

/** Compose Gmail (compte société souvent connecté dans le navigateur). */
export function buildGmailComposeUrl(params: { to: string; subject: string; body: string }): string {
  const q = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: params.to.trim(),
    su: params.subject,
    body: params.body,
  });
  return `https://mail.google.com/mail/?${q.toString()}`;
}

/** Compose Outlook Web (Live / Hotmail). */
export function buildOutlookComposeUrl(params: { to: string; subject: string; body: string }): string {
  const q = new URLSearchParams({
    to: params.to.trim(),
    subject: params.subject,
    body: params.body,
  });
  return `https://outlook.live.com/mail/0/deeplink/compose?${q.toString()}`;
}

export type MailProvider = 'gmail' | 'outlook' | 'mailto';

export const MAIL_PROVIDER_STORAGE_KEY = 'orion-mail-provider';
export const COMPANY_SENDER_STORAGE_KEY = 'orion-company-sender-email';

export function detectMailProvider(senderEmail: string): MailProvider {
  const e = senderEmail.toLowerCase();
  if (e.includes('@gmail.') || e.includes('@googlemail.')) return 'gmail';
  if (
    e.includes('@outlook.')
    || e.includes('@hotmail.')
    || e.includes('@live.')
    || e.includes('@office365.')
    || e.includes('@msn.')
  ) {
    return 'outlook';
  }
  return 'mailto';
}

export function openMailCompose(
  provider: MailProvider,
  params: { to: string; subject: string; body: string },
): void {
  const url =
    provider === 'gmail'
      ? buildGmailComposeUrl(params)
      : provider === 'outlook'
        ? buildOutlookComposeUrl(params)
        : buildMailtoUrl(params);
  if (provider === 'mailto') {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/** Normalise un numéro pour wa.me (Madagascar : 0xx → 261xx). */
export function normalizeWhatsAppPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('0')) return `261${digits.slice(1)}`;
  if (digits.startsWith('261')) return digits;
  return digits;
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  const n = normalizeWhatsAppPhone(phone);
  if (!n) return '';
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function triggerPdfDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
