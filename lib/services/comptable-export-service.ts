import { prisma } from '@/lib/prisma';
import {
  buildDgiExportLines,
  dgiLinesToCsv,
  type ComptableExportFormat,
} from '@/lib/finance/comptable-dgi-export';
import { madaExportDisclaimerBlock } from '@/lib/finance/mada-compliance-meta';

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cols: (string | number | null | undefined)[]): string {
  return cols.map(csvEscape).join(';');
}

export type ComptableExportOptions = {
  from: Date;
  to: Date;
  format?: ComptableExportFormat;
};

async function loadExportData(from: Date, to: Date) {
  const [factures, paiements] = await Promise.all([
    prisma.facture.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        statut: { not: 'Annulee' },
      },
      include: {
        client: { select: { name: true, code: true, nif: true } },
        commande: { select: { numero: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.paiement.findMany({
      where: { datePaiement: { gte: from, lte: to } },
      include: {
        client: { select: { name: true, code: true } },
        facture: { select: { numero: true } },
        commande: { select: { numero: true } },
      },
      orderBy: { datePaiement: 'asc' },
    }),
  ]);
  return { factures, paiements };
}

function buildStandardCsv(
  factures: Awaited<ReturnType<typeof loadExportData>>['factures'],
  paiements: Awaited<ReturnType<typeof loadExportData>>['paiements'],
): string {
  const lines: string[] = [
    ...madaExportDisclaimerBlock().split('\n'),
    '',
    csvRow(['Type', 'Numero', 'Date', 'Client', 'Code client', 'NIF', 'Commande', 'Statut', 'Montant HT', 'Montant TTC', 'Mode', 'Reference']),
  ];

  for (const f of factures) {
    lines.push(
      csvRow([
        'FACTURE',
        f.numero,
        f.createdAt.toISOString().slice(0, 10),
        f.client?.name ?? '',
        f.client?.code ?? '',
        f.client?.nif ?? '',
        f.commande?.numero ?? '',
        f.statut,
        Math.round(f.totalHT),
        Math.round(f.totalTTC),
        '',
        '',
      ]),
    );
  }

  for (const p of paiements) {
    lines.push(
      csvRow([
        'PAIEMENT',
        p.numero,
        p.datePaiement.toISOString().slice(0, 10),
        p.client?.name ?? '',
        p.client?.code ?? '',
        '',
        p.commande?.numero ?? p.facture?.numero ?? '',
        p.type,
        '',
        Math.round(p.montant),
        p.mode,
        p.reference ?? '',
      ]),
    );
  }

  return `\uFEFF${lines.join('\n')}`;
}

/** Export comptable CSV — standard ou format DGI/SYSCOHADA (Madagascar / Ar). */
export async function buildComptableExportCsv(opts: ComptableExportOptions): Promise<string> {
  const { from, to, format = 'standard' } = opts;
  const { factures, paiements } = await loadExportData(from, to);

  if (format === 'dgi') {
    const lines = buildDgiExportLines(factures, paiements);
    return dgiLinesToCsv(lines, {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
  }

  return buildStandardCsv(factures, paiements);
}
