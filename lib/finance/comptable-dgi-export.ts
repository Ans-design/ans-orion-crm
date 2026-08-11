/**
 * Plan comptable SYSCOHADA — mapping simplifié export Madagascar.
 * NON CERTIFIE DGI — à valider par expert-comptable local avant déclaration.
 */

import { madaExportDisclaimerBlock } from '@/lib/finance/mada-compliance-meta';
import { ANS_DESIGN_PRINT } from '@/lib/company/ans-design-print';
import { roundMga } from '@/lib/money/mga';

/** NIF société (export fiscal) — identité centralisée. */
export function companyNifForDgi(): string {
  return ANS_DESIGN_PRINT.nif;
}

export const SYSCOHADA_ACCOUNTS = {
  clients: '411100',
  ventesServices: '706100',
  tvaCollectee: '445710',
  caisse: '531100',
  banque: '512100',
  mobileMoney: '512200',
} as const;

export type ComptableExportFormat = 'standard' | 'dgi';

export type DgiExportLine = {
  compte: string;
  libelle: string;
  date: string;
  piece: string;
  debit: number;
  credit: number;
  tiers: string;
  nif: string;
  reference: string;
  journal: string;
};

export function paymentAccountForMode(mode: string): string {
  const m = mode.toLowerCase();
  if (m.includes('mobile') || m.includes('mvola') || m.includes('orange') || m.includes('airtel')) {
    return SYSCOHADA_ACCOUNTS.mobileMoney;
  }
  if (m.includes('virement') || m.includes('carte') || m.includes('cheque') || m.includes('chèque')) {
    return SYSCOHADA_ACCOUNTS.banque;
  }
  return SYSCOHADA_ACCOUNTS.caisse;
}

type FactureRow = {
  numero: string;
  createdAt: Date;
  totalHT: number;
  totalTTC: number;
  tva: number;
  client?: { name?: string | null; code?: string | null; nif?: string | null } | null;
};

type PaiementRow = {
  numero: string;
  datePaiement: Date;
  montant: number;
  mode: string;
  type: string;
  reference?: string | null;
  client?: { name?: string | null; code?: string | null } | null;
};

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function tvaAmount(totalHT: number, totalTTC: number, tvaRate: number): number {
  const diff = Math.round(totalTTC - totalHT);
  if (diff > 0) return diff;
  return Math.round(totalHT * (tvaRate / 100));
}

/** Écritures double-partie inspirées SYSCOHADA pour factures et paiements. */
export function buildDgiExportLines(
  factures: FactureRow[],
  paiements: PaiementRow[],
): DgiExportLine[] {
  const lines: DgiExportLine[] = [];

  for (const f of factures) {
    const date = fmtDate(f.createdAt);
    const tiers = f.client?.code ?? '';
    const nif = f.client?.nif ?? '';
    const clientName = f.client?.name ?? 'Client';
    const ht = roundMga(f.totalHT);
    const ttc = roundMga(f.totalTTC);
    const tva = tvaAmount(ht, ttc, f.tva || 20);
    const companyNif = companyNifForDgi();

    lines.push({
      compte: SYSCOHADA_ACCOUNTS.clients,
      libelle: `Client ${clientName}`,
      date,
      piece: f.numero,
      debit: ttc,
      credit: 0,
      tiers,
      nif,
      reference: f.numero,
      journal: 'VT',
    });
    lines.push({
      compte: SYSCOHADA_ACCOUNTS.ventesServices,
      libelle: 'Ventes impression / services',
      date,
      piece: f.numero,
      debit: 0,
      credit: ht,
      tiers,
      nif,
      reference: f.numero,
      journal: 'VT',
    });
    if (tva > 0) {
      lines.push({
        compte: SYSCOHADA_ACCOUNTS.tvaCollectee,
        libelle: 'TVA collectée 20%',
        date,
        piece: f.numero,
        debit: 0,
        credit: tva,
        tiers: '',
        nif: companyNif,
        reference: f.numero,
        journal: 'VT',
      });
    }
  }

  for (const p of paiements) {
    const date = fmtDate(p.datePaiement);
    const tiers = p.client?.code ?? '';
    const montant = roundMga(p.montant);
    const companyNif = companyNifForDgi();
    const isRefund = p.type === 'Remboursement';
    const cashAccount = paymentAccountForMode(p.mode);

    if (isRefund) {
      lines.push({
        compte: SYSCOHADA_ACCOUNTS.clients,
        libelle: `Remboursement ${p.client?.name ?? ''}`.trim(),
        date,
        piece: p.numero,
        debit: montant,
        credit: 0,
        tiers,
        nif: companyNif,
        reference: p.reference ?? p.numero,
        journal: 'BQ',
      });
      lines.push({
        compte: cashAccount,
        libelle: `Remboursement ${p.mode}`,
        date,
        piece: p.numero,
        debit: 0,
        credit: montant,
        tiers,
        nif: companyNif,
        reference: p.reference ?? p.numero,
        journal: 'BQ',
      });
    } else {
      lines.push({
        compte: cashAccount,
        libelle: `Encaissement ${p.mode}`,
        date,
        piece: p.numero,
        debit: montant,
        credit: 0,
        tiers,
        nif: companyNif,
        reference: p.reference ?? p.numero,
        journal: 'BQ',
      });
      lines.push({
        compte: SYSCOHADA_ACCOUNTS.clients,
        libelle: `Règlement ${p.client?.name ?? ''}`.trim(),
        date,
        piece: p.numero,
        debit: 0,
        credit: montant,
        tiers,
        nif: companyNif,
        reference: p.reference ?? p.numero,
        journal: 'BQ',
      });
    }
  }

  return lines;
}

export function dgiLinesToCsv(
  lines: DgiExportLine[],
  meta: { from: string; to: string },
): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (cols: (string | number)[]) => cols.map(escape).join(';');

  const header = [
    ...madaExportDisclaimerBlock().split('\n'),
    `# Société: ${ANS_DESIGN_PRINT.legalName}`,
    `# NIF: ${companyNifForDgi()}`,
    `# STAT: ${ANS_DESIGN_PRINT.stat}`,
    `# Période: ${meta.from} → ${meta.to}`,
    '# Devise: MGA (Ariary) — TVA indicative 20%',
    '',
    row(['Compte', 'Libelle', 'Date', 'Piece', 'Debit', 'Credit', 'Tiers', 'NIF', 'Reference', 'Journal']),
  ];

  for (const line of lines) {
    header.push(
      row([
        line.compte,
        line.libelle,
        line.date,
        line.piece,
        line.debit,
        line.credit,
        line.tiers,
        line.nif,
        line.reference,
        line.journal,
      ]),
    );
  }

  return `\uFEFF${header.join('\n')}`;
}
