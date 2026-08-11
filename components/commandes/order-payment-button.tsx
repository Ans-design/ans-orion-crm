'use client';

import { useState } from 'react';
import { Banknote } from 'lucide-react';
import { EncaissementModal, type EncaissementTarget } from '@/components/encaissement-modal';

type Props = {
  commandeId: string;
  numero: string;
  label: string;
  total: number;
  dejaPaye: number;
  clientId?: string | null;
  disabled?: boolean;
  onSuccess: () => void;
};

export function OrderPaymentButton({
  commandeId,
  numero,
  label,
  total,
  dejaPaye,
  clientId,
  disabled,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const reste = Math.max(0, total - dejaPaye);
  const target: EncaissementTarget | null = open
    ? {
        id: commandeId,
        numero,
        label,
        totalTTC: total,
        dejaPaye,
        commandeId,
        clientId: clientId ?? undefined,
      }
    : null;

  if (reste <= 0) return null;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold hover:opacity-90 disabled:opacity-50"
      >
        <Banknote size={12} /> Enregistrer paiement
      </button>
      <EncaissementModal
        target={target}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          onSuccess();
          setOpen(false);
        }}
      />
    </>
  );
}
