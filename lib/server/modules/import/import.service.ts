import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/db/prisma';
import { nextSequenceSafe } from '@/lib/services/SequenceService';
import { syncCommandePaymentSnapshot } from '@/lib/server/modules/snapshots/snapshot.service';
import { normalizeFactureStatut, normalizePaiementType } from '@/lib/server/data/enum-normalize';
import {
  clientStatutFromLabel,
  commandeStatutFromLabel,
  devisStatutFromLabel,
  factureStatutFromLabel,
} from '@/lib/server/data/prisma-statut-bridge';
import { ClientStatut } from '@prisma/client';
import { DEFAULT_FISCAL } from '@/lib/fiscal-config';
import { htToTtcMga, roundMga } from '@/lib/pricing/mga-round';
import type { ImportPreviewInput, ImportPreviewResult, ImportRowError } from './import.validation';

function previewClients(data: Record<string, unknown>[]) {
  const errors: ImportRowError[] = [];
  const preview: Record<string, unknown>[] = [];
  data.forEach((row, i) => {
    if (!row.code || !row.name) {
      errors.push({ row: i, message: 'code et name requis' });
      return;
    }
    if (preview.length < 10) preview.push(row);
  });
  return { errors, preview, validRows: data.length - errors.length };
}

function previewTarifs(data: Record<string, unknown>[]) {
  const errors: ImportRowError[] = [];
  const preview: Record<string, unknown>[] = [];
  data.forEach((row, i) => {
    if (!row.articleId) {
      errors.push({ row: i, message: 'articleId requis' });
      return;
    }
    if (preview.length < 10) preview.push(row);
  });
  return { errors, preview, validRows: data.length - errors.length };
}

function normalizeLignes(row: Record<string, unknown>) {
  if (Array.isArray(row.lignes) && row.lignes.length > 0) return row.lignes as Record<string, unknown>[];
  if (Array.isArray(row.items) && row.items.length > 0) return row.items as Record<string, unknown>[];
  return [];
}

function previewDevis(data: Record<string, unknown>[]) {
  const errors: ImportRowError[] = [];
  const preview: Record<string, unknown>[] = [];
  data.forEach((row, i) => {
    const lignes = normalizeLignes(row);
    if (lignes.length === 0) {
      errors.push({ row: i, message: 'lignes[] ou items[] requis (au moins 1 ligne)' });
      return;
    }
    const invalidLine = lignes.findIndex((l) => !l.articleId || !l.articleLabel);
    if (invalidLine >= 0) {
      errors.push({ row: i, message: `ligne ${invalidLine + 1} : articleId et articleLabel requis` });
      return;
    }
    if (preview.length < 10) preview.push({ ...row, ligneCount: lignes.length });
  });
  return { errors, preview, validRows: data.length - errors.length };
}

function previewCommandes(data: Record<string, unknown>[]) {
  const errors: ImportRowError[] = [];
  const preview: Record<string, unknown>[] = [];
  data.forEach((row, i) => {
    const article = row.article || row.articleLabel;
    if (!article) {
      errors.push({ row: i, message: 'article ou articleLabel requis' });
      return;
    }
    if (preview.length < 10) preview.push(row);
  });
  return { errors, preview, validRows: data.length - errors.length };
}

function previewFactures(data: Record<string, unknown>[]) {
  const errors: ImportRowError[] = [];
  const preview: Record<string, unknown>[] = [];
  data.forEach((row, i) => {
    const hasAmount = row.totalTTC != null || row.totalHT != null || row.sousTotal != null;
    const hasLignes = Array.isArray(row.lignes) && row.lignes.length > 0;
    if (!hasAmount && !hasLignes) {
      errors.push({ row: i, message: 'totalTTC, totalHT ou lignes[] requis' });
      return;
    }
    if (preview.length < 10) preview.push(row);
  });
  return { errors, preview, validRows: data.length - errors.length };
}

function previewPaiements(data: Record<string, unknown>[]) {
  const errors: ImportRowError[] = [];
  const preview: Record<string, unknown>[] = [];
  data.forEach((row, i) => {
    if (row.montant == null || Number(row.montant) <= 0) {
      errors.push({ row: i, message: 'montant positif requis' });
      return;
    }
    if (!row.factureId && !row.commandeId && !row.clientId) {
      errors.push({ row: i, message: 'factureId, commandeId ou clientId requis' });
      return;
    }
    if (preview.length < 10) preview.push(row);
  });
  return { errors, preview, validRows: data.length - errors.length };
}

export function previewImport(input: ImportPreviewInput): ImportPreviewResult {
  const data = input.data as Record<string, unknown>[];
  const base =
    input.type === 'clients' ? previewClients(data)
    : input.type === 'tarifs' ? previewTarifs(data)
    : input.type === 'devis' ? previewDevis(data)
    : input.type === 'commandes' ? previewCommandes(data)
    : input.type === 'factures' ? previewFactures(data)
    : previewPaiements(data);

  return {
    type: input.type,
    mode: input.mode,
    totalRows: data.length,
    validRows: base.validRows,
    invalidRows: base.errors.length,
    errors: base.errors.slice(0, 50),
    preview: base.preview,
  };
}

function buildDevisLigneRows(lignes: Record<string, unknown>[]) {
  let sousTotal = 0;
  const rows = lignes.map((l, i) => {
    const quantity = Number(l.quantity ?? 1);
    const prixUnitaireAuto = Number(l.prixUnitaireAuto ?? l.pu ?? 0);
    const totalLigne = Number(l.totalLigne ?? l.total ?? prixUnitaireAuto * quantity);
    sousTotal += totalLigne;
    return {
      articleId: String(l.articleId),
      articleLabel: String(l.articleLabel),
      category: String(l.category ?? 'general'),
      configSnapshot: (l.configSnapshot ?? {}) as Prisma.InputJsonValue,
      quantity,
      unite: String(l.unite ?? 'ex.'),
      prixUnitaireAuto,
      prixUnitaireForce: l.prixUnitaireForce != null ? Number(l.prixUnitaireForce) : null,
      totalForce: l.totalForce != null ? Number(l.totalForce) : null,
      totalLigne,
      pricingMode: String(l.pricingMode ?? 'auto'),
      priceReason: l.priceReason ? String(l.priceReason) : null,
      remarks: l.remarks ? String(l.remarks) : null,
      sortOrder: i,
    };
  });
  const remise = 0;
  const totalHT = roundMga(sousTotal);
  const totalTTC = htToTtcMga(totalHT, DEFAULT_FISCAL.tvaRate);
  return { rows, sousTotal: totalHT, remise, totalHT, totalTTC };
}

async function importDevisRow(row: Record<string, unknown>, mode: string) {
  const lignes = normalizeLignes(row);
  const { rows, sousTotal, remise, totalHT, totalTTC } = buildDevisLigneRows(lignes);
  const numero = row.numero ? String(row.numero) : await nextSequenceSafe('DEV', () => prisma.devis.count());
  const clientId = row.clientId ? String(row.clientId) : null;
  const statut = devisStatutFromLabel(row.statut ? String(row.statut) : 'Brouillon');
  const notes = row.notes ? String(row.notes) : null;

  const existing = await prisma.devis.findUnique({ where: { numero } });
  if (existing && mode === 'merge') {
    await prisma.devis.update({
      where: { numero },
      data: { clientId, statut, notes, sousTotal, remise, totalHT, totalTTC },
    });
    return;
  }

  if (existing && mode === 'replace') {
    await prisma.devisLigne.deleteMany({ where: { devisId: existing.id } });
    await prisma.devis.update({
      where: { id: existing.id },
      data: {
        clientId,
        statut,
        notes,
        sousTotal,
        remise,
        totalHT,
        totalTTC,
        lignes: { create: rows },
      },
    });
    return;
  }

  if (!existing) {
    await prisma.devis.create({
      data: {
        numero,
        clientId,
        statut,
        notes,
        sousTotal,
        remise,
        totalHT,
        totalTTC,
        lignes: { create: rows },
      },
    });
  }
}

async function importCommandeRow(row: Record<string, unknown>, mode: string) {
  const article = String(row.article || row.articleLabel);
  const numero = row.numero ? String(row.numero) : await nextSequenceSafe('CMD', () => prisma.commande.count());
  const total = Number(row.total ?? 0);
  // FIN-02 : acompte CSV n’est plus écrit en projection — ledger only (0 puis sync si paiements).
  const acompteHint = Number(row.acompte ?? 0);
  const payload = {
    clientId: row.clientId ? String(row.clientId) : null,
    devisId: row.devisId ? String(row.devisId) : null,
    article,
    qty: Number(row.qty ?? row.quantity ?? 1),
    total,
    acompte: 0,
    reste: Math.max(0, total),
    statut: commandeStatutFromLabel(row.statut ? String(row.statut) : 'À planifier'),
    priorite: row.priorite ? String(row.priorite) : 'Normal',
    note: row.note ? String(row.note) : null,
    site: row.site ? String(row.site) : 'AX0',
  };

  const existing = await prisma.commande.findUnique({ where: { numero } });
  let commandeId: string;
  if (existing) {
    await prisma.commande.update({
      where: { numero },
      data: mode === 'replace'
        ? { ...payload, acompte: existing.acompte, reste: existing.reste }
        : { statut: payload.statut, note: payload.note, priorite: payload.priorite },
    });
    commandeId = existing.id;
  } else {
    const created = await prisma.commande.create({ data: { numero, ...payload } });
    commandeId = created.id;
  }

  // Si l’import fournit un acompte historique sans lignes paiement : créer 1 paiement ledger.
  if (acompteHint > 0 && mode === 'replace') {
    const { paymentIdempotencyKey } = await import('@/lib/server/outbox');
    const idemp = paymentIdempotencyKey({
      provider: 'import',
      reference: `import-acompte:${numero}`,
      commandeId,
      montant: acompteHint,
    });
    const existsPay = await prisma.paiement.findUnique({ where: { idempotencyKey: idemp } });
    if (!existsPay) {
      const payNum = await nextSequenceSafe('PAY', () => prisma.paiement.count());
      await prisma.paiement.create({
        data: {
          numero: payNum,
          commandeId,
          montant: Math.round(acompteHint),
          mode: 'Import',
          reference: `import-acompte:${numero}`,
          idempotencyKey: idemp,
          type: 'Acompte',
          statut: 'Valide',
          notes: 'Import CSV — acompte historique via ledger',
        },
      });
      await syncCommandePaymentSnapshot(commandeId);
    }
  }
}

function computeFactureTotals(row: Record<string, unknown>) {
  const lignes = Array.isArray(row.lignes) ? (row.lignes as Record<string, unknown>[]) : [];
  const remise = Number(row.remise ?? 0);
  const tva = Number(row.tva ?? 20);
  const sousTotal = lignes.length > 0
    ? lignes.reduce((s, l) => s + Number(l.total ?? Number(l.qty ?? 1) * Number(l.pu ?? 0)), 0)
    : Number(row.sousTotal ?? row.totalHT ?? row.totalTTC ?? 0);
  const totalHT = sousTotal - (remise / 100) * sousTotal;
  const totalTTC = row.totalTTC != null ? Number(row.totalTTC) : totalHT * (1 + tva / 100);
  return {
    lignes: lignes.length > 0 ? lignes : null,
    remise,
    tva,
    sousTotal,
    totalHT,
    totalTTC,
  };
}

async function importFactureRow(row: Record<string, unknown>, mode: string) {
  const numero = row.numero ? String(row.numero) : await nextSequenceSafe('FAC', () => prisma.facture.count());
  const { lignes, remise, tva, sousTotal, totalHT, totalTTC } = computeFactureTotals(row);
  const payload = {
    commandeId: row.commandeId ? String(row.commandeId) : null,
    clientId: row.clientId ? String(row.clientId) : null,
    ...(lignes ? { lignes: lignes as Prisma.InputJsonValue } : {}),
    sousTotal,
    remise,
    tva,
    totalHT,
    totalTTC,
    statut: factureStatutFromLabel(normalizeFactureStatut(row.statut ? String(row.statut) : 'Brouillon')),
    notes: row.notes ? String(row.notes) : null,
    dateEcheance: row.dateEcheance ? new Date(String(row.dateEcheance)) : null,
  };

  const existing = await prisma.facture.findUnique({ where: { numero } });
  if (existing) {
    await prisma.facture.update({
      where: { numero },
      data: mode === 'replace' ? payload : { statut: payload.statut, notes: payload.notes },
    });
    return;
  }

  await prisma.facture.create({ data: { numero, ...payload } });
}

async function importPaiementRow(row: Record<string, unknown>, mode: string) {
  const numero = row.numero ? String(row.numero) : await nextSequenceSafe('PAY', () => prisma.paiement.count());
  const payload = {
    factureId: row.factureId ? String(row.factureId) : null,
    commandeId: row.commandeId ? String(row.commandeId) : null,
    clientId: row.clientId ? String(row.clientId) : null,
    montant: Number(row.montant),
    mode: row.mode ? String(row.mode) : 'Espèces',
    reference: row.reference ? String(row.reference) : null,
    type: normalizePaiementType(row.type ? String(row.type) : 'Acompte'),
    datePaiement: row.datePaiement ? new Date(String(row.datePaiement)) : new Date(),
    notes: row.notes ? String(row.notes) : null,
  };

  const existing = await prisma.paiement.findUnique({ where: { numero } });
  if (existing) {
    await prisma.paiement.update({
      where: { numero },
      data: mode === 'replace' ? payload : { montant: payload.montant, mode: payload.mode, reference: payload.reference },
    });
  } else {
    await prisma.paiement.create({ data: { numero, ...payload } });
  }

  if (payload.commandeId) {
    await syncCommandePaymentSnapshot(payload.commandeId);
  }
}

export async function runImport(
  input: ImportPreviewInput,
  auth: { userId: string; userName: string },
) {
  const preview = previewImport(input);
  if (preview.validRows === 0) {
    return { ok: false as const, message: 'Aucune ligne valide', preview };
  }

  let imported = 0;
  const { type, data, mode } = input;

  if (type === 'clients') {
    for (const row of data as Record<string, unknown>[]) {
      if (!row.code || !row.name) continue;
      await prisma.client.upsert({
        where: { code: String(row.code) },
        create: {
          code: String(row.code),
          name: String(row.name),
          tel: row.tel ? String(row.tel) : null,
          email: row.email ? String(row.email) : null,
          type: row.type ? String(row.type) : null,
          statut: row.statut ? clientStatutFromLabel(String(row.statut)) : ClientStatut.Actif,
          notes: row.notes ? String(row.notes) : null,
        },
        update:
          mode === 'replace'
            ? {
                name: String(row.name),
                tel: row.tel ? String(row.tel) : null,
                email: row.email ? String(row.email) : null,
                type: row.type ? String(row.type) : null,
                statut: row.statut ? clientStatutFromLabel(String(row.statut)) : ClientStatut.Actif,
                notes: row.notes ? String(row.notes) : null,
              }
            : { name: String(row.name) },
      });
      imported++;
    }
  } else if (type === 'tarifs') {
    for (const row of data as Record<string, unknown>[]) {
      if (!row.articleId) continue;
      const palier = Number(row.palier || 1);
      await prisma.tarif.upsert({
        where: { articleId_palier: { articleId: String(row.articleId), palier } },
        create: {
          articleId: String(row.articleId),
          articleLabel: String(row.articleLabel || row.articleId),
          palier,
          prixUnitaire: Number(row.prixUnitaire || 0),
          prixBase: row.prixBase != null ? Number(row.prixBase) : null,
          actif: row.actif !== false,
          modifiePar: auth.userName,
        },
        update: {
          prixUnitaire: Number(row.prixUnitaire || 0),
          prixBase: row.prixBase != null ? Number(row.prixBase) : null,
          actif: row.actif !== false,
          modifiePar: auth.userName,
        },
      });
      imported++;
    }
  } else if (type === 'devis') {
    for (const row of data as Record<string, unknown>[]) {
      const lignes = normalizeLignes(row);
      if (lignes.length === 0) continue;
      if (lignes.some((l) => !l.articleId || !l.articleLabel)) continue;
      await importDevisRow(row, mode);
      imported++;
    }
  } else if (type === 'commandes') {
    for (const row of data as Record<string, unknown>[]) {
      if (!row.article && !row.articleLabel) continue;
      await importCommandeRow(row, mode);
      imported++;
    }
  } else if (type === 'factures') {
    for (const row of data as Record<string, unknown>[]) {
      const hasAmount = row.totalTTC != null || row.totalHT != null || row.sousTotal != null;
      const hasLignes = Array.isArray(row.lignes) && row.lignes.length > 0;
      if (!hasAmount && !hasLignes) continue;
      await importFactureRow(row, mode);
      imported++;
    }
  } else if (type === 'paiements') {
    for (const row of data as Record<string, unknown>[]) {
      if (!row.montant || Number(row.montant) <= 0) continue;
      if (!row.factureId && !row.commandeId && !row.clientId) continue;
      await importPaiementRow(row, mode);
      imported++;
    }
  }

  return { ok: true as const, imported, preview };
}
