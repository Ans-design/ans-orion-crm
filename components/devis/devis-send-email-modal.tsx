'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { Mail, MessageCircle, ExternalLink } from 'lucide-react';
import { AppFormModal } from '@/components/ui/app-form-modal';
import { AppButton } from '@/components/ui/app-ui';
import { formatPrice } from '@/lib/data/catalogue';
import {
  buildWhatsAppUrl,
  COMPANY_SENDER_STORAGE_KEY,
  detectMailProvider,
  MAIL_PROVIDER_STORAGE_KEY,
  triggerPdfDownload,
  type MailProvider,
} from '@/lib/email/address';
import {
  buildDevisEmailBody,
  buildDevisEmailSubject,
  buildDevisWhatsAppText,
  launchDevisEmailCompose,
} from '@/lib/email/devis-send';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devisId: string;
  devisNumero: string;
  totalTTC: number;
  clientName: string;
  clientEmail?: string | null;
  clientWhatsapp?: string | null;
  clientTel?: string | null;
  autoLaunch?: boolean;
  onSent?: () => void;
};

const inputCls =
  'w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25';

export function DevisSendEmailModal({
  open,
  onOpenChange,
  devisId,
  devisNumero,
  totalTTC,
  clientName,
  clientEmail,
  clientWhatsapp,
  clientTel,
  autoLaunch = false,
  onSent,
}: Props) {
  const [senderEmail, setSenderEmail] = useState('');
  const [recipientEmail, setRecipientEmail] = useState(clientEmail?.trim() ?? '');
  const [message, setMessage] = useState('');
  const [companyName, setCompanyName] = useState('ANS Design Print');
  const [mailProvider, setMailProvider] = useState<MailProvider>('gmail');
  const [resendConfigured, setResendConfigured] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [sending, setSending] = useState(false);
  const [autoLaunched, setAutoLaunched] = useState(false);

  const clientPhone = clientWhatsapp?.trim() || clientTel?.trim() || '';
  const whatsAppUrl = useMemo(() => {
    if (!clientPhone) return '';
    return buildWhatsAppUrl(
      clientPhone,
      buildDevisWhatsAppText({
        devisId,
        devisNumero,
        totalTTC,
        clientName,
        recipientEmail,
        senderEmail,
        companyName,
        message,
      }),
    );
  }, [clientPhone, devisId, devisNumero, totalTTC, clientName, recipientEmail, senderEmail, companyName, message]);

  useEffect(() => {
    if (!open) {
      setAutoLaunched(false);
      return;
    }
    setRecipientEmail(clientEmail?.trim() ?? '');
    setLoadingDefaults(true);
    fetch('/api/devis/sender-defaults')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const stored = window.localStorage.getItem(COMPANY_SENDER_STORAGE_KEY);
        const sender = stored || d.companyEmail || '';
        setSenderEmail(sender);
        setCompanyName(d.companyName || 'ANS Design Print');
        setResendConfigured(Boolean(d.resendConfigured));
        const storedProvider = window.localStorage.getItem(MAIL_PROVIDER_STORAGE_KEY) as MailProvider | null;
        setMailProvider(storedProvider || detectMailProvider(sender));
      })
      .catch(() => {})
      .finally(() => setLoadingDefaults(false));
  }, [open, clientEmail]);

  const subject = buildDevisEmailSubject(devisNumero, companyName);

  const persistSender = () => {
    if (senderEmail.trim()) {
      window.localStorage.setItem(COMPANY_SENDER_STORAGE_KEY, senderEmail.trim().toLowerCase());
    }
    window.localStorage.setItem(MAIL_PROVIDER_STORAGE_KEY, mailProvider);
  };

  const launchEmail = useCallback((provider?: MailProvider) => {
    if (!recipientEmail.trim()) {
      uxToast.error('Adresse destinataire requise');
      return false;
    }
    const used = launchDevisEmailCompose({
      devisId,
      devisNumero,
      totalTTC,
      clientName,
      recipientEmail: recipientEmail.trim(),
      senderEmail,
      companyName,
      message,
      provider: provider ?? mailProvider,
    });
    setMailProvider(used);
    uxToast.success('Messagerie ouverte — PDF proforma téléchargé pour pièce jointe');
    return true;
  }, [recipientEmail, devisId, devisNumero, totalTTC, clientName, senderEmail, companyName, message, mailProvider]);

  useEffect(() => {
    if (!open || !autoLaunch || autoLaunched || loadingDefaults) return;
    if (!recipientEmail.trim()) return;
    setAutoLaunched(true);
    launchEmail();
    onOpenChange(false);
  }, [open, autoLaunch, autoLaunched, loadingDefaults, recipientEmail, launchEmail, onOpenChange]);

  const openWhatsApp = () => {
    if (!whatsAppUrl) {
      uxToast.error('Aucun numéro WhatsApp / téléphone sur la fiche client');
      return;
    }
    triggerPdfDownload(
      `/api/devis/${devisId}/pdf?doc=proforma&format=pdf`,
      `Proforma-${devisNumero}.pdf`,
    );
    window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
    uxToast.success('WhatsApp ouvert — joignez le PDF proforma si besoin');
    onOpenChange(false);
  };

  const sendViaOrion = async () => {
    if (!recipientEmail.trim()) {
      uxToast.error('Adresse destinataire requise');
      return;
    }
    persistSender();
    setSending(true);
    try {
      const res = await fetch(`/api/devis/${devisId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail.trim(),
          from: senderEmail.trim() || undefined,
          message: message.trim() || undefined,
          doc: 'proforma',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        uxToast.success(`Proforma envoyée à ${data.sentTo} (PDF joint automatiquement)`);
        onOpenChange(false);
        onSent?.();
      } else {
        uxToast.error(getApiErrorMessage(data, 'Envoi impossible'), 'Envoi impossible');
      }
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setSending(false);
    }
  };

  const emailBodyPreview = buildDevisEmailBody({
    devisId,
    devisNumero,
    totalTTC,
    clientName,
    recipientEmail,
    senderEmail,
    companyName,
    message,
  });

  return (
    <AppFormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Envoyer la proforma"
      description="Ouverture automatique de votre messagerie avec expéditeur, destinataire et objet préremplis."
      maxWidthClass="max-w-lg"
      footer={
        <>
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </AppButton>
          {resendConfigured ? (
            <AppButton type="button" onClick={sendViaOrion} disabled={sending || loadingDefaults}>
              {sending ? 'Envoi…' : 'ORION (PDF joint auto)'}
            </AppButton>
          ) : null}
          <AppButton
            type="button"
            onClick={() => { persistSender(); if (launchEmail('gmail')) onOpenChange(false); }}
            disabled={sending || loadingDefaults}
          >
            <Mail size={14} /> Gmail
          </AppButton>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Expéditeur société
          </span>
          <input
            type="email"
            value={senderEmail}
            onChange={(e) => {
              setSenderEmail(e.target.value);
              setMailProvider(detectMailProvider(e.target.value));
            }}
            placeholder="ans.designprint.annexe@gmail.com"
            className={inputCls}
            disabled={loadingDefaults}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Destinataire (client CRM)
          </span>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="email@client.mg"
            className={inputCls}
          />
          {!clientEmail && (
            <span className="text-[11px] text-amber-600">
              Aucun email sur la fiche client — saisissez l&apos;adresse du destinataire.
            </span>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Message (facultatif)
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder={`Proforma ${devisNumero} — ${formatPrice(totalTTC)} Ar TTC`}
            className={inputCls}
          />
        </label>

        <div className="rounded-[7px] border border-border/80 bg-muted/10 px-3 py-2 text-xs text-muted-foreground space-y-1">
          <p><span className="font-semibold text-foreground">Objet :</span> {subject}</p>
          <p className="line-clamp-2">{emailBodyPreview.split('\n').slice(0, 2).join(' ')}</p>
        </div>

        <div className="rounded-[7px] border border-border/80 p-3 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Autres messageries
          </p>
          <div className="flex flex-wrap gap-2">
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { persistSender(); if (launchEmail('outlook')) onOpenChange(false); }}
              disabled={loadingDefaults}
              className="border-[#0078d4]/40 bg-[#0078d4]/10 text-[#0078d4] hover:bg-[#0078d4]/20"
            >
              <ExternalLink size={13} /> Outlook
            </AppButton>
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { persistSender(); if (launchEmail('mailto')) onOpenChange(false); }}
              disabled={loadingDefaults}
            >
              <Mail size={13} /> Messagerie locale
            </AppButton>
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              onClick={openWhatsApp}
              disabled={!clientPhone}
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              <MessageCircle size={13} /> WhatsApp client
              {clientPhone ? ` (${clientPhone})` : ''}
            </AppButton>
          </div>
          {!clientPhone && (
            <p className="text-[11px] text-amber-600">WhatsApp / téléphone absent de la fiche client CRM.</p>
          )}
        </div>
      </div>
    </AppFormModal>
  );
}
