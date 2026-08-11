import { parsePagination, paginatedResult, wantsPagination, type PaginationParams } from '@/lib/api-pagination';
import { findPotentialClientDuplicates } from '@/lib/clients/duplicate-detection';
import { serializeClientCharte } from '@/lib/client-charte';
import { parseApiDateRange } from '@/lib/date-filter';
import { mergeClients } from '@/lib/services/client-merge-service';
import { buildClientDetail, computeClientSolde } from '@/lib/services/client-detail';
import { generateClientCode } from '@/lib/services/client-code';
import {
  clientStatutFromCategorie,
  clientStatutFromLabel,
  serializeClientForApi,
} from '@/lib/server/data/prisma-statut-bridge';
import { CLIENT_AUDIT_FIELDS, buildAuditDiff, toAuditRecord } from '@/lib/server/audit/entity-snapshot';
import { mapClientSearchResult } from './clients-search.mapper';
import { buildClientWhere, clientsRepository } from './clients.repository';
import type {
  CreateClientInput,
  MergeClientsInput,
  QuickCreateClientInput,
  UpdateClientInput,
} from './clients.validation';

export type ClientsSummary = {
  total: number;
  actifs: number;
  vip: number;
  nouveauxMois: number;
  reclamations: number;
};

export type ClientListQuery = {
  search: string;
  statut: string;
  showArchived: boolean;
  from?: Date;
  to?: Date;
  paginate: boolean;
  pagination: PaginationParams;
  summary: boolean;
};

export function parseClientListQuery(searchParams: URLSearchParams): ClientListQuery {
  const { from, to } = parseApiDateRange(searchParams);
  return {
    search: searchParams.get('search') || '',
    statut: searchParams.get('statut') || '',
    showArchived: searchParams.get('archived') === 'true',
    from,
    to,
    paginate: wantsPagination(searchParams),
    pagination: parsePagination(searchParams),
    summary: searchParams.get('summary') === '1',
  };
}

export async function getClientsSummary(): Promise<ClientsSummary> {
  return clientsRepository.getSummary();
}

export async function listClients(query: Omit<ClientListQuery, 'summary'>) {
  const where = buildClientWhere({
    search: query.search || undefined,
    statut: query.statut || undefined,
    showArchived: query.showArchived,
    updatedFrom: query.from,
    updatedTo: query.to,
  });

  const clients = await clientsRepository.findManyEnriched(
    where,
    query.paginate ? { skip: query.pagination.skip, take: query.pagination.take } : undefined,
  );

  const caMap = await clientsRepository.getCaTotalsByClientIds(clients.map((c) => c.id));

  const withSolde = clients.map(({ factures, commandes, _count, ...rest }) => ({
    ...serializeClientForApi(rest),
    solde: computeClientSolde({ factures, commandes }),
    caTotal: caMap[rest.id] ?? 0,
    reclamationsOuvertes: _count?.reclamations ?? 0,
  }));

  if (query.paginate) {
    const total = await clientsRepository.count(where);
    return paginatedResult(withSolde, total, query.pagination);
  }
  return withSolde;
}

export type CreateClientDuplicate = Awaited<ReturnType<typeof findPotentialClientDuplicates>>[number];

export type CreateClientOutcome =
  | { status: 'created'; client: Awaited<ReturnType<typeof clientsRepository.create>> }
  | { status: 'duplicate'; duplicates: CreateClientDuplicate[] };

export async function createClientRecord(input: CreateClientInput): Promise<CreateClientOutcome> {
  const {
    name,
    tel,
    whatsapp,
    email,
    type,
    adresse,
    ville,
    canalVente,
    canalDecouverte,
    canalCommande,
    notes,
    tags,
    charte,
    nif,
    statNumber,
    commercialName,
    categorie,
    relanceAt,
    forceDuplicate,
  } = input;

  if (!forceDuplicate) {
    const duplicates = await findPotentialClientDuplicates({ name, email, tel, whatsapp });
    if (duplicates.length > 0) {
      return { status: 'duplicate', duplicates };
    }
  }

  const code = await generateClientCode(name);
  const client = await clientsRepository.create({
    code,
    name: name.trim(),
    tel: tel || null,
    whatsapp: whatsapp || null,
    email: email || null,
    type: type || 'Particulier',
    adresse: adresse || null,
    ville: ville || null,
    canalVente: canalVente || null,
    canalDecouverte: canalDecouverte || null,
    canalCommande: canalCommande || null,
    notes: notes || null,
    tags: tags ? JSON.stringify(tags) : null,
    charte: charte || null,
    nif: nif || null,
    statNumber: statNumber || null,
    commercialName: commercialName || null,
    categorie: categorie || 'Client',
    statut: clientStatutFromCategorie(categorie || 'Client'),
    relanceAt: relanceAt ? new Date(relanceAt) : null,
  });

  return { status: 'created', client: serializeClientForApi(client) };
}

export async function getClientDetail(id: string) {
  const client = await clientsRepository.findByIdWithDetail(id);
  if (!client) return null;
  const { summary, timeline } = buildClientDetail(client);
  return { ...client, statut: serializeClientForApi(client).statut, summary, timeline };
}

function buildClientUpdateData(input: UpdateClientInput) {
  const {
    name,
    tel,
    whatsapp,
    email,
    type,
    adresse,
    ville,
    canalVente,
    canalDecouverte,
    canalCommande,
    notes,
    tags,
    statut,
    charte,
    nif,
    statNumber,
    commercialName,
    categorie,
    relanceAt,
  } = input;

  return {
    ...(name !== undefined && { name }),
    ...(tel !== undefined && { tel: tel || null }),
    ...(whatsapp !== undefined && { whatsapp: whatsapp || null }),
    ...(email !== undefined && { email: email || null }),
    ...(type !== undefined && { type }),
    ...(adresse !== undefined && { adresse: adresse || null }),
    ...(ville !== undefined && { ville: ville || null }),
    ...(canalVente !== undefined && { canalVente: canalVente || null }),
    ...(canalDecouverte !== undefined && { canalDecouverte: canalDecouverte || null }),
    ...(canalCommande !== undefined && { canalCommande: canalCommande || null }),
    ...(notes !== undefined && { notes: notes || null }),
    ...(tags !== undefined && { tags: tags ? JSON.stringify(tags) : null }),
    ...(statut !== undefined && { statut: clientStatutFromLabel(statut) }),
    ...(charte !== undefined && { charte: charte || null }),
    ...(nif !== undefined && { nif: nif || null }),
    ...(statNumber !== undefined && { statNumber: statNumber || null }),
    ...(commercialName !== undefined && { commercialName: commercialName || null }),
    ...(categorie !== undefined && { categorie, statut: clientStatutFromCategorie(categorie) }),
    ...(relanceAt !== undefined && { relanceAt: relanceAt ? new Date(relanceAt) : null }),
  };
}

export async function updateClientRecord(id: string, input: UpdateClientInput) {
  const before = await clientsRepository.findById(id);
  if (!before) return { status: 'not_found' as const };
  const client = await clientsRepository.update(id, buildClientUpdateData(input));
  const audit = buildAuditDiff(
    toAuditRecord(before, CLIENT_AUDIT_FIELDS),
    toAuditRecord(client, CLIENT_AUDIT_FIELDS),
    CLIENT_AUDIT_FIELDS,
  );
  return { status: 'updated' as const, client: serializeClientForApi(client), audit };
}

export async function archiveClient(id: string) {
  const linked = await clientsRepository.findByIdWithLinkCounts(id);
  if (!linked) return { status: 'not_found' as const };
  const client = await clientsRepository.archive(id);
  return { status: 'archived' as const, client: serializeClientForApi(client), linkedCounts: linked._count };
}

export type RestoreClientOutcome =
  | { status: 'not_found' }
  | { status: 'already_active' }
  | { status: 'restored'; client: Awaited<ReturnType<typeof clientsRepository.restore>> };

export async function restoreClient(id: string): Promise<RestoreClientOutcome> {
  const existing = await clientsRepository.findById(id);
  if (!existing) return { status: 'not_found' };
  if (!existing.archived) return { status: 'already_active' };
  const client = await clientsRepository.restore(id, clientStatutFromCategorie(existing.categorie || 'Client'));
  return { status: 'restored', client: serializeClientForApi(client) };
}

export async function quickCreateClientRecord(input: QuickCreateClientInput) {
  const { name, tel, email, nif, adresse, axeLivraison } = input;
  const code = await generateClientCode(name);

  const charte = serializeClientCharte({
    addresses: [
      {
        label: 'Principale',
        axe: axeLivraison?.trim() || '',
        repere: adresse?.trim() || '',
      },
    ],
  });

  const client = await clientsRepository.create({
    code,
    name: name.trim(),
    tel: tel || null,
    email: email || null,
    nif: nif || null,
    adresse: adresse || null,
    type: 'Particulier',
    categorie: 'Client',
    statut: clientStatutFromCategorie('Client'),
    canalCommande: 'POS',
    charte,
  });

  return serializeClientForApi(client);
}

export async function searchClients(query: string) {
  const q = query.trim();
  if (q.length < 1) return [];
  const rows = await clientsRepository.searchActive(q);
  return rows.map(mapClientSearchResult);
}

export async function checkClientDuplicates(criteria: {
  name: string;
  email?: string | null;
  tel?: string | null;
  whatsapp?: string | null;
}) {
  if (!criteria.name.trim()) {
    return { duplicates: [], hasDuplicates: false };
  }
  const duplicates = await findPotentialClientDuplicates(criteria);
  return { duplicates, hasDuplicates: duplicates.length > 0 };
}

export async function mergeClientRecords(
  input: MergeClientsInput,
  opts: { userId?: string; userName?: string },
) {
  return mergeClients(input.sourceId, input.targetId, opts);
}
