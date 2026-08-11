import type { Client } from '@prisma/client';
import { clientStatutLabel } from '@/lib/server/data/prisma-statut-bridge';

export type ClientListItemDto = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  tel: string | null;
  statut: string;
  archived: boolean;
  updatedAt: string;
};

export function mapClientListItem(row: Client): ClientListItemDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email,
    tel: row.tel,
    statut: clientStatutLabel(row.statut),
    archived: row.archived,
    updatedAt: row.updatedAt.toISOString(),
  };
}
