/**
 * Export / import Excel + soft-archive pour listes métier.
 */
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/server/http/errors';
import {
  archivedListFilter,
  assertSoftDeleteAllowed,
  softArchiveData,
  softRestoreData,
} from '@/lib/server/soft-archive';
import {
  getEntityExcelModule,
  type EntityExcelId,
} from '@/lib/crm/entity-excel-modules';
import type { ClientStatut } from '@prisma/client';

function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function parseClientStatut(raw: unknown, fallback: ClientStatut): ClientStatut {
  const s = cell(raw).trim();
  const allowed: ClientStatut[] = ['Actif', 'Premium', 'VIP', 'Inactif', 'Archive', 'Prospect'];
  return (allowed as string[]).includes(s) ? (s as ClientStatut) : fallback;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function boolTrash(trash: boolean) {
  return archivedListFilter(trash);
}

type ArchiveDelegate = {
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null>;
};

function delegateFor(entity: EntityExcelId): ArchiveDelegate {
  const map: Record<EntityExcelId, ArchiveDelegate> = {
    clients: prisma.client as unknown as ArchiveDelegate,
    devis: prisma.devis as unknown as ArchiveDelegate,
    reclamations: prisma.clientReclamation as unknown as ArchiveDelegate,
    suppliers: prisma.supplier as unknown as ArchiveDelegate,
    'stock-items': prisma.stockItem as unknown as ArchiveDelegate,
    'purchase-orders': prisma.purchaseOrder as unknown as ArchiveDelegate,
    machines: prisma.machine as unknown as ArchiveDelegate,
    equipments: prisma.equipment as unknown as ArchiveDelegate,
    livraisons: prisma.livraison as unknown as ArchiveDelegate,
    commandes: prisma.commande as unknown as ArchiveDelegate,
    factures: prisma.facture as unknown as ArchiveDelegate,
    paiements: prisma.paiement as unknown as ArchiveDelegate,
    employees: prisma.employee as unknown as ArchiveDelegate,
  };
  return map[entity];
}

export async function softArchiveEntity(
  entityId: EntityExcelId,
  id: string,
  userId?: string | null,
) {
  const mod = getEntityExcelModule(entityId);
  if (!mod) throw ApiError.notFound('Module inconnu');
  const decision = assertSoftDeleteAllowed(mod.prismaEntity);
  if (!decision.ok && decision.code === 'FORBIDDEN_HARD_DELETE') {
    /* ledger: archive still allowed — assert blocks hard-delete only */
  }
  const del = delegateFor(entityId);
  const existing = await del.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Enregistrement introuvable');
  await del.update({ where: { id }, data: softArchiveData(userId) });
  return { ok: true as const, id };
}

export async function restoreEntity(entityId: EntityExcelId, id: string) {
  const del = delegateFor(entityId);
  const existing = await del.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Enregistrement introuvable');
  await del.update({ where: { id }, data: softRestoreData() });
  return { ok: true as const, id };
}

export async function exportEntityRows(entityId: EntityExcelId, trash = false) {
  const mod = getEntityExcelModule(entityId);
  if (!mod) throw ApiError.notFound('Module inconnu');
  const filter = boolTrash(trash);

  let columns: string[] = [];
  let rows: Record<string, unknown>[] = [];

  switch (entityId) {
    case 'clients': {
      columns = ['code', 'name', 'email', 'tel', 'ville', 'statut', 'archived'];
      const items = await prisma.client.findMany({
        where: filter,
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      });
      rows = items.map((c) => ({
        code: c.code,
        name: c.name,
        email: c.email ?? '',
        tel: c.tel ?? '',
        ville: c.ville ?? '',
        statut: c.statut,
        archived: c.archived,
      }));
      break;
    }
    case 'devis': {
      columns = ['numero', 'clientCode', 'statut', 'totalHT', 'totalTTC', 'validUntil', 'archived'];
      const items = await prisma.devis.findMany({
        where: filter,
        include: { client: { select: { code: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });
      rows = items.map((d) => ({
        numero: d.numero,
        clientCode: d.client?.code ?? '',
        statut: d.statut,
        totalHT: d.totalHT,
        totalTTC: d.totalTTC,
        validUntil: d.validUntil?.toISOString() ?? '',
        archived: d.archived,
      }));
      break;
    }
    case 'reclamations': {
      columns = ['subject', 'clientCode', 'statut', 'priorite', 'commandeNumero', 'archived'];
      const items = await prisma.clientReclamation.findMany({
        where: filter,
        include: {
          client: { select: { code: true } },
          commande: { select: { numero: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });
      rows = items.map((r) => ({
        subject: r.subject,
        clientCode: r.client.code,
        statut: r.statut,
        priorite: r.priorite,
        commandeNumero: r.commande?.numero ?? '',
        archived: r.archived,
      }));
      break;
    }
    case 'suppliers': {
      columns = ['code', 'name', 'tel', 'email', 'ville', 'categorie', 'statut', 'archived'];
      const items = await prisma.supplier.findMany({
        where: filter,
        orderBy: { name: 'asc' },
        take: 5000,
      });
      rows = items.map((s) => ({
        code: s.code,
        name: s.name,
        tel: s.tel ?? '',
        email: s.email ?? '',
        ville: s.ville ?? '',
        categorie: s.categorie,
        statut: s.statut,
        archived: s.archived,
      }));
      break;
    }
    case 'stock-items': {
      columns = ['sku', 'label', 'category', 'quantity', 'minQty', 'unit', 'archived'];
      const items = await prisma.stockItem.findMany({
        where: filter,
        orderBy: { label: 'asc' },
        take: 5000,
      });
      rows = items.map((s) => ({
        sku: s.sku,
        label: s.label,
        category: s.category,
        quantity: s.quantity,
        minQty: s.minQty,
        unit: s.unit,
        archived: s.archived,
      }));
      break;
    }
    case 'purchase-orders': {
      columns = ['numero', 'supplierCode', 'statut', 'totalHT', 'archived'];
      const items = await prisma.purchaseOrder.findMany({
        where: filter,
        include: { supplier: { select: { code: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });
      rows = items.map((p) => ({
        numero: p.numero,
        supplierCode: p.supplier.code,
        statut: p.statut,
        totalHT: p.totalHT,
        archived: p.archived,
      }));
      break;
    }
    case 'machines': {
      columns = ['code', 'name', 'category', 'status', 'utilization', 'site', 'archived'];
      const items = await prisma.machine.findMany({
        where: filter,
        orderBy: { code: 'asc' },
        take: 5000,
      });
      rows = items.map((m) => ({
        code: m.code,
        name: m.name,
        category: m.category,
        status: m.status,
        utilization: m.utilization,
        site: m.site,
        archived: m.archived,
      }));
      break;
    }
    case 'equipments': {
      columns = ['code', 'name', 'category', 'etat', 'statut', 'site', 'archived'];
      const items = await prisma.equipment.findMany({
        where: filter,
        orderBy: { code: 'asc' },
        take: 5000,
      });
      rows = items.map((e) => ({
        code: e.code,
        name: e.name,
        category: e.category,
        etat: e.etat,
        statut: e.statut,
        site: e.site,
        archived: e.archived,
      }));
      break;
    }
    case 'livraisons': {
      columns = ['numero', 'commandeNumero', 'statut', 'adresseLiv', 'livreur', 'archived'];
      const items = await prisma.livraison.findMany({
        where: filter,
        include: { commande: { select: { numero: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });
      rows = items.map((l) => ({
        numero: l.numero,
        commandeNumero: l.commande.numero,
        statut: l.statut,
        adresseLiv: l.adresseLiv ?? '',
        livreur: l.livreur ?? '',
        archived: l.archived,
      }));
      break;
    }
    case 'commandes': {
      columns = ['numero', 'article', 'statut', 'total', 'acompte', 'reste', 'site', 'archived'];
      const items = await prisma.commande.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });
      rows = items.map((c) => ({
        numero: c.numero,
        article: c.article,
        statut: c.statut,
        total: c.total,
        acompte: c.acompte,
        reste: c.reste,
        site: c.site,
        archived: c.archived,
      }));
      break;
    }
    case 'factures': {
      columns = ['numero', 'statut', 'totalHT', 'totalTTC', 'printFormat', 'archived'];
      const items = await prisma.facture.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });
      rows = items.map((f) => ({
        numero: f.numero,
        statut: f.statut,
        totalHT: f.totalHT,
        totalTTC: f.totalTTC,
        printFormat: (f as { printFormat?: string }).printFormat ?? 'facture',
        archived: f.archived,
      }));
      break;
    }
    case 'paiements': {
      columns = ['numero', 'montant', 'mode', 'type', 'statut', 'datePaiement', 'archived'];
      const items = await prisma.paiement.findMany({
        where: filter,
        orderBy: { datePaiement: 'desc' },
        take: 5000,
      });
      rows = items.map((p) => ({
        numero: p.numero,
        montant: p.montant,
        mode: p.mode,
        type: p.type,
        statut: p.statut,
        datePaiement: p.datePaiement.toISOString(),
        archived: p.archived,
      }));
      break;
    }
    case 'employees': {
      columns = ['matricule', 'firstName', 'lastName', 'poste', 'departement', 'email', 'tel', 'statut', 'archived'];
      const items = await prisma.employee.findMany({
        where: filter,
        orderBy: { lastName: 'asc' },
        take: 5000,
      });
      rows = items.map((e) => ({
        matricule: e.matricule,
        firstName: e.firstName,
        lastName: e.lastName,
        poste: e.poste,
        departement: e.departement,
        email: e.email ?? '',
        tel: e.tel ?? '',
        statut: e.statut,
        archived: e.archived,
      }));
      break;
    }
    default:
      throw ApiError.badRequest('Entité non supportée');
  }

  const ordered = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) out[col] = row[col] ?? '';
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(ordered, { header: columns });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, mod.label.slice(0, 31));
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  return { buffer, fileStem: mod.fileStem, count: rows.length };
}

export async function importEntityRows(
  entityId: EntityExcelId,
  fileBuffer: Buffer,
): Promise<{ created: number; updated: number; ignored: number; errors: number }> {
  const mod = getEntityExcelModule(entityId);
  if (!mod) throw ApiError.notFound('Module inconnu');
  if (!mod.allowImport) {
    throw ApiError.forbidden('Import massif interdit pour cette entité (ledger)');
  }

  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  let created = 0;
  let updated = 0;
  let ignored = 0;
  let errors = 0;

  for (const row of raw) {
    try {
      switch (entityId) {
        case 'clients': {
          const code = cell(row.code).trim();
          const name = cell(row.name).trim();
          if (!code || !name) {
            ignored += 1;
            break;
          }
          const existing = await prisma.client.findUnique({ where: { code } });
          if (existing) {
            await prisma.client.update({
              where: { id: existing.id },
              data: {
                name,
                email: cell(row.email) || null,
                tel: cell(row.tel) || null,
                ville: cell(row.ville) || null,
                statut: parseClientStatut(row.statut, existing.statut),
              },
            });
            updated += 1;
          } else {
            await prisma.client.create({
              data: {
                code,
                name,
                email: cell(row.email) || null,
                tel: cell(row.tel) || null,
                ville: cell(row.ville) || null,
                statut: parseClientStatut(row.statut, 'Prospect'),
              },
            });
            created += 1;
          }
          break;
        }
        case 'suppliers': {
          const code = cell(row.code).trim();
          const name = cell(row.name).trim();
          if (!code || !name) {
            ignored += 1;
            break;
          }
          const existing = await prisma.supplier.findUnique({ where: { code } });
          const data = {
            name,
            tel: cell(row.tel) || null,
            email: cell(row.email) || null,
            ville: cell(row.ville) || null,
            categorie: cell(row.categorie) || 'Papier',
            statut: cell(row.statut) || 'Actif',
          };
          if (existing) {
            await prisma.supplier.update({ where: { id: existing.id }, data });
            updated += 1;
          } else {
            await prisma.supplier.create({ data: { code, ...data } });
            created += 1;
          }
          break;
        }
        case 'stock-items': {
          const sku = cell(row.sku).trim();
          const label = cell(row.label).trim();
          if (!sku || !label) {
            ignored += 1;
            break;
          }
          const existing = await prisma.stockItem.findUnique({ where: { sku } });
          const data = {
            label,
            category: cell(row.category) || 'Papier',
            quantity: num(row.quantity),
            minQty: num(row.minQty, 50),
            unit: cell(row.unit) || 'feuille',
          };
          if (existing) {
            await prisma.stockItem.update({ where: { id: existing.id }, data });
            updated += 1;
          } else {
            await prisma.stockItem.create({ data: { sku, ...data } });
            created += 1;
          }
          break;
        }
        case 'machines': {
          const code = cell(row.code).trim();
          const name = cell(row.name).trim();
          if (!code || !name) {
            ignored += 1;
            break;
          }
          const existing = await prisma.machine.findUnique({ where: { code } });
          const data = {
            name,
            category: cell(row.category) || 'impression',
            status: cell(row.status) || 'ok',
            utilization: num(row.utilization),
            site: cell(row.site) || 'AX0',
          };
          if (existing) {
            await prisma.machine.update({ where: { id: existing.id }, data });
            updated += 1;
          } else {
            await prisma.machine.create({ data: { code, ...data } });
            created += 1;
          }
          break;
        }
        case 'equipments': {
          const code = cell(row.code).trim();
          const name = cell(row.name).trim();
          if (!code || !name) {
            ignored += 1;
            break;
          }
          const existing = await prisma.equipment.findUnique({ where: { code } });
          const data = {
            name,
            category: cell(row.category) || 'ordinateur',
            etat: cell(row.etat) || 'disponible',
            statut: cell(row.statut) || 'Actif',
            site: cell(row.site) || 'AX0',
          };
          if (existing) {
            await prisma.equipment.update({ where: { id: existing.id }, data });
            updated += 1;
          } else {
            await prisma.equipment.create({ data: { code, ...data } });
            created += 1;
          }
          break;
        }
        case 'employees': {
          const matricule = cell(row.matricule).trim();
          const firstName = cell(row.firstName).trim();
          const lastName = cell(row.lastName).trim();
          if (!matricule || !firstName || !lastName) {
            ignored += 1;
            break;
          }
          const existing = await prisma.employee.findUnique({ where: { matricule } });
          const data = {
            firstName,
            lastName,
            poste: cell(row.poste) || 'Opérateur',
            departement: cell(row.departement) || 'Production',
            email: cell(row.email) || null,
            tel: cell(row.tel) || null,
            statut: cell(row.statut) || 'Actif',
          };
          if (existing) {
            await prisma.employee.update({ where: { id: existing.id }, data });
            updated += 1;
          } else {
            await prisma.employee.create({ data: { matricule, ...data } });
            created += 1;
          }
          break;
        }
        case 'reclamations': {
          const subject = cell(row.subject).trim();
          const clientCode = cell(row.clientCode).trim();
          if (!subject || !clientCode) {
            ignored += 1;
            break;
          }
          const client = await prisma.client.findUnique({ where: { code: clientCode } });
          if (!client) {
            errors += 1;
            break;
          }
          await prisma.clientReclamation.create({
            data: {
              clientId: client.id,
              subject,
              statut: cell(row.statut) || 'Ouverte',
              priorite: cell(row.priorite) || 'Normale',
            },
          });
          created += 1;
          break;
        }
        case 'devis':
        case 'purchase-orders':
        case 'livraisons':
          /* Upsert structure complexe — export ok ; import léger ignoré si colonnes insuffisantes */
          ignored += 1;
          break;
        default:
          ignored += 1;
      }
    } catch {
      errors += 1;
    }
  }

  return { created, updated, ignored, errors };
}
