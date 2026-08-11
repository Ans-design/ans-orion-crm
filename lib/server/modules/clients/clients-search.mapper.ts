import { parseClientCharte } from '@/lib/client-charte';
import { isClientFidele } from '@/lib/clients/client-display';
import { clientStatutLabel } from '@/lib/server/data/prisma-statut-bridge';
import type { ClientStatut } from '@prisma/client';

function extractAxeLivraison(charte: string | null | undefined): string | null {
  const data = parseClientCharte(charte);
  const main = data.addresses?.find((a) => a.label === 'Principale') ?? data.addresses?.[0];
  if (!main?.axe) return null;
  if (main.axe.startsWith('Autre')) return main.axeDetail?.trim() || main.axe;
  return main.axe;
}

export type ClientSearchRow = {
  id: string;
  code: string;
  name: string;
  tel: string | null;
  email: string | null;
  nif: string | null;
  commercialName: string | null;
  adresse: string | null;
  ville: string | null;
  charte: string | null;
  ca: string | null;
  cmds: number;
  statut: string | ClientStatut;
  type: string | null;
};

export function mapClientSearchResult(c: ClientSearchRow) {
  const caNum = parseFloat(String(c.ca ?? '0').replace(/[^\d.-]/g, '')) || 0;
  const statutLabel = clientStatutLabel(c.statut);
  const clientFidele = isClientFidele({ statut: statutLabel, cmds: c.cmds, ca: c.ca });
  const axeLivraison = extractAxeLivraison(c.charte);
  const adressePrincipale = [c.adresse, c.ville].filter(Boolean).join(', ') || null;
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    tel: c.tel,
    email: c.email,
    nif: c.nif,
    commercialName: c.commercialName,
    type: c.type,
    adresse: c.adresse,
    ville: c.ville,
    adressePrincipale,
    axeLivraison,
    clientFidele,
    nombreCommandes: c.cmds,
    totalInvesti: caNum,
    statut: statutLabel,
  };
}
