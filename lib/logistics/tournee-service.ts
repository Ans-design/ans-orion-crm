import { prisma } from '@/lib/prisma';
import { LivraisonStatut } from '@prisma/client';
import { serializeLivraisonForApi } from '@/lib/server/data/prisma-statut-bridge';
import {
  TOURNEE_CONFIG_KEY,
  type TourneeLivraison,
  type TourneeLivraisonEnriched,
  type TourneeStatut,
} from '@/lib/logistics/tournee-types';

const ACTIVE_STATUTS: LivraisonStatut[] = [
  LivraisonStatut.Preparation,
  LivraisonStatut.Pret,
  LivraisonStatut.En_livraison,
];

function dayBounds(isoDate: string) {
  const start = new Date(`${isoDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function readSavedTournees(): Promise<TourneeLivraison[]> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { configKey: TOURNEE_CONFIG_KEY } });
    if (row?.data && Array.isArray(row.data)) return row.data as TourneeLivraison[];
  } catch {
    /* fallback */
  }
  return [];
}

async function writeSavedTournees(tournees: TourneeLivraison[], userId?: string) {
  await prisma.systemConfig.upsert({
    where: { configKey: TOURNEE_CONFIG_KEY },
    create: { configKey: TOURNEE_CONFIG_KEY, data: tournees as object, updatedBy: userId },
    update: { data: tournees as object, updatedBy: userId },
  });
}

function groupKey(livreur: string, dateIso: string) {
  return `${livreur.trim().toLowerCase()}::${dateIso}`;
}

/** Tournées auto-générées depuis livraisons DB (livreur + date prévue). */
export async function buildAutoTournees(dateIso = todayIso()): Promise<TourneeLivraison[]> {
  const { start, end } = dayBounds(dateIso);
  const rows = await prisma.livraison.findMany({
    where: {
      livreur: { not: null },
      datePrevue: { gte: start, lt: end },
      statut: { in: ACTIVE_STATUTS },
    },
    include: {
      client: { select: { name: true } },
      commande: { select: { client: { select: { name: true } } } },
    },
    orderBy: [{ datePrevue: 'asc' }, { createdAt: 'asc' }],
  });

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const livreur = row.livreur?.trim();
    if (!livreur) continue;
    const key = groupKey(livreur, dateIso);
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const now = new Date().toISOString();
  let idx = 0;
  const tournees: TourneeLivraison[] = [];
  for (const [key, items] of groups) {
    const livreur = items[0].livreur!.trim();
    const allEnRoute = items.some((i) => i.statut === LivraisonStatut.En_livraison)
      && items.every((i) => i.statut === LivraisonStatut.En_livraison || i.statut === LivraisonStatut.Livre);
    tournees.push({
      id: `auto-${key}`,
      numero: `TOUR-AUTO-${dateIso.replace(/-/g, '')}-${String(++idx).padStart(2, '0')}`,
      livreur,
      zone: 'Antananarivo',
      dateTournee: dateIso,
      statut: allEnRoute ? 'En cours' : 'Planifiée',
      livraisonIds: items.map((i) => i.id),
      createdAt: now,
      updatedAt: now,
    });
  }
  return tournees;
}

async function enrichTournee(t: TourneeLivraison): Promise<TourneeLivraisonEnriched> {
  if (t.livraisonIds.length === 0) {
    return { ...t, livraisons: [], colisTotal: 0, stopsCount: 0 };
  }
  const rows = await prisma.livraison.findMany({
    where: { id: { in: t.livraisonIds } },
    include: {
      client: { select: { name: true } },
      commande: { select: { client: { select: { name: true } } } },
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = t.livraisonIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((row) => {
      const serialized = serializeLivraisonForApi(row!);
      return {
        id: serialized.id,
        numero: serialized.numero,
        statut: serialized.statut,
        adresseLiv: serialized.adresseLiv,
        colisCount: serialized.colisCount,
        clientName: serialized.client?.name ?? serialized.commande?.client?.name ?? 'Client',
      };
    });

  return {
    ...t,
    livraisons: ordered,
    colisTotal: ordered.reduce((s, l) => s + (l.colisCount ?? 1), 0),
    stopsCount: ordered.length,
  };
}

export async function listTournees(dateIso?: string): Promise<TourneeLivraisonEnriched[]> {
  const date = dateIso ?? todayIso();
  const saved = (await readSavedTournees()).filter((t) => t.dateTournee === date);
  const auto = await buildAutoTournees(date);

  const merged = new Map<string, TourneeLivraison>();
  for (const t of auto) merged.set(groupKey(t.livreur, t.dateTournee), t);
  for (const t of saved) merged.set(t.id, t);

  const list = [...merged.values()].sort((a, b) => a.livreur.localeCompare(b.livreur, 'fr'));
  return Promise.all(list.map(enrichTournee));
}

export async function createTournee(input: {
  livreur: string;
  dateTournee: string;
  livraisonIds: string[];
  zone?: string;
  userId?: string;
}): Promise<TourneeLivraisonEnriched> {
  const ids = [...new Set(input.livraisonIds)];
  if (ids.length === 0) throw new Error('Aucune livraison sélectionnée');

  const savedCount = (await readSavedTournees()).length;
  const numero = `TOUR-${String(savedCount + 1).padStart(4, '0')}`;

  const now = new Date().toISOString();
  const tournee: TourneeLivraison = {
    id: `tour-${Date.now()}`,
    numero: `TOUR-${numero}`,
    livreur: input.livreur.trim(),
    zone: input.zone?.trim() || 'Antananarivo',
    dateTournee: input.dateTournee,
    statut: 'Planifiée',
    livraisonIds: ids,
    createdAt: now,
    updatedAt: now,
  };

  await prisma.livraison.updateMany({
    where: { id: { in: ids } },
    data: { livreur: tournee.livreur, datePrevue: new Date(`${input.dateTournee}T09:00:00.000Z`) },
  });

  const saved = await readSavedTournees();
  saved.push(tournee);
  await writeSavedTournees(saved, input.userId);

  return enrichTournee(tournee);
}

async function updateTourneeStatut(
  id: string,
  statut: TourneeStatut,
  userId?: string,
): Promise<TourneeLivraisonEnriched | null> {
  const saved = await readSavedTournees();
  const idx = saved.findIndex((t) => t.id === id);
  if (idx < 0) {
    if (!id.startsWith('auto-')) return null;
    const autoList = await buildAutoTournees();
    const auto = autoList.find((t) => t.id === id);
    if (!auto) return null;
    const created = await createTournee({
      livreur: auto.livreur,
      dateTournee: auto.dateTournee,
      livraisonIds: auto.livraisonIds,
      zone: auto.zone,
      userId,
    });
    return updateTourneeStatut(created.id, statut, userId);
  }

  const tournee = { ...saved[idx], statut, updatedAt: new Date().toISOString() };
  saved[idx] = tournee;
  await writeSavedTournees(saved, userId);
  return enrichTournee(tournee);
}

export async function startTournee(id: string, userId?: string) {
  const enriched = await updateTourneeStatut(id, 'En cours', userId);
  if (!enriched) return null;

  await prisma.livraison.updateMany({
    where: {
      id: { in: enriched.livraisonIds },
      statut: { in: [LivraisonStatut.Preparation, LivraisonStatut.Pret] },
    },
    data: { statut: LivraisonStatut.En_livraison },
  });

  return listTournees(enriched.dateTournee).then((all) => all.find((t) => t.id === enriched.id) ?? enriched);
}

export async function completeTournee(id: string, userId?: string) {
  const enriched = await updateTourneeStatut(id, 'Terminée', userId);
  return enriched;
}
