'use client';

import { clearCart, dispatchCartUpdated } from '@/lib/cart-store';
import { parseClientCharte } from '@/lib/client-charte';
import { isClientFidele } from '@/lib/clients/client-display';

export type SalesClientSnapshot = {
  id: string;
  name: string;
  code?: string;
  email?: string | null;
  tel?: string | null;
  type?: string | null;
  adresse?: string | null;
  ville?: string | null;
  nif?: string | null;
  commercialName?: string | null;
  canalVente?: string | null;
  axeLivraison?: string | null;
  clientFidele?: boolean;
  totalCommandes?: number;
  nombreCommandes?: number;
  panierMoyen?: number;
};

const LEGACY_KEY = 'ans_sales_selected_client';
let _userId: string | null = null;

export function setSalesFlowUserId(userId: string | null): void {
  _userId = userId;
}

function storageKey(): string {
  return _userId ? `ans_sales_client_${_userId}` : LEGACY_KEY;
}

export function getSelectedSalesClient(): SalesClientSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? (JSON.parse(raw) as SalesClientSnapshot) : null;
  } catch {
    return null;
  }
}

export function setSelectedSalesClient(
  client: SalesClientSnapshot | null,
  options?: { skipCartClear?: boolean },
): void {
  if (typeof window === 'undefined') return;
  const prev = getSelectedSalesClient();
  if (!options?.skipCartClear && client?.id && prev?.id && client.id !== prev.id) {
    clearCart();
    dispatchCartUpdated();
  }
  if (!client) {
    localStorage.removeItem(storageKey());
  } else {
    localStorage.setItem(storageKey(), JSON.stringify(client));
  }
  window.dispatchEvent(new CustomEvent('salesClientChanged', { detail: client }));
}

export function clearSelectedSalesClient(): void {
  setSelectedSalesClient(null);
}

function extractAxeLivraison(charte: string | null | undefined): string | null {
  const data = parseClientCharte(charte);
  const main = data.addresses?.find((a) => a.label === 'Principale') ?? data.addresses?.[0];
  if (!main?.axe) return null;
  if (main.axe.startsWith('Autre')) return main.axeDetail?.trim() || main.axe;
  return main.axe;
}

export function clientSnapshotFromApi(c: {
  id: string;
  name: string;
  code?: string;
  email?: string | null;
  tel?: string | null;
  type?: string | null;
  adresse?: string | null;
  ville?: string | null;
  nif?: string | null;
  commercialName?: string | null;
  canalVente?: string | null;
  charte?: string | null;
  ca?: string | null;
  cmds?: number | null;
  statut?: string | null;
  clientFidele?: boolean;
  axeLivraison?: string | null;
  nombreCommandes?: number;
  totalInvesti?: number;
}): SalesClientSnapshot {
  const nombreCommandes = typeof c.nombreCommandes === 'number' ? c.nombreCommandes : (typeof c.cmds === 'number' ? c.cmds : 0);
  const caFromTotal = c.totalInvesti ?? 0;
  const caParsed = parseFloat(String(c.ca ?? '0').replace(/[^\d.-]/g, '')) || 0;
  const caNum = Math.max(caFromTotal, caParsed);
  const panierMoyen = nombreCommandes > 0 ? Math.round(caNum / nombreCommandes) : 0;
  const clientFidele = c.clientFidele ?? isClientFidele({ statut: c.statut, cmds: nombreCommandes, ca: c.ca });
  return {
    id: c.id,
    name: c.name,
    code: c.code,
    email: c.email,
    tel: c.tel,
    type: c.type,
    adresse: c.adresse,
    ville: c.ville,
    nif: c.nif,
    commercialName: c.commercialName,
    canalVente: c.canalVente,
    axeLivraison: c.axeLivraison ?? extractAxeLivraison(c.charte),
    clientFidele,
    totalCommandes: caNum,
    nombreCommandes,
    panierMoyen,
  };
}

export function getClientSnapshotForCart(): Pick<SalesClientSnapshot, 'id' | 'name' | 'tel' | 'email' | 'nif'> | null {
  const c = getSelectedSalesClient();
  if (!c?.id) return null;
  return { id: c.id, name: c.name, tel: c.tel, email: c.email, nif: c.nif };
}
