import { describe, expect, it } from 'vitest';
import { buildClientWhere } from '@/lib/server/modules/clients/clients.repository';
import { fideleClientStatuts } from '@/lib/server/data/prisma-statut-bridge';
import { parseClientListQuery } from '@/lib/server/modules/clients/clients.service';
import type { UpdateClientInput } from '@/lib/server/modules/clients/clients.validation';

describe('clients service', () => {
  it('parseClientListQuery — summary et archived', () => {
    const q = parseClientListQuery(new URLSearchParams('summary=1&archived=true&search=acme'));
    expect(q.summary).toBe(true);
    expect(q.showArchived).toBe(true);
    expect(q.search).toBe('acme');
  });

  it('buildClientWhere — statut fidele → VIP/Premium', () => {
    const where = buildClientWhere({ statut: 'fidele', showArchived: false });
    expect(where).toMatchObject({
      archived: false,
      statut: { in: fideleClientStatuts() },
    });
  });

  it('buildClientWhere — recherche multi-champs', () => {
    const where = buildClientWhere({ search: 'john', showArchived: false });
    expect(where.OR).toHaveLength(5);
  });

  it('updateClientInputSchema — notes partielles autorisées', async () => {
    const { updateClientInputSchema } = await import('@/lib/server/modules/clients/clients.validation');
    const result = updateClientInputSchema.safeParse({ notes: 'test' });
    expect(result.success).toBe(true);
    expect((result.data as UpdateClientInput).notes).toBe('test');
  });

  it('checkClientDuplicates — nom vide → aucun doublon', async () => {
    const { checkClientDuplicates } = await import('@/lib/server/modules/clients/clients.service');
    const result = await checkClientDuplicates({ name: '   ' });
    expect(result).toEqual({ duplicates: [], hasDuplicates: false });
  });

  it('searchClients — requête vide → tableau vide', async () => {
    const { searchClients } = await import('@/lib/server/modules/clients/clients.service');
    expect(await searchClients('')).toEqual([]);
    expect(await searchClients('  ')).toEqual([]);
  });
});
