/**
 * Accès lazy aux enums Prisma — évite CommandeStatut/DevisStatut undefined
 * lors des imports circulaires (cockpit / dashboard Next.js).
 */
import type {
  ClientStatut,
  CommandeStatut,
  DevisStatut,
  FactureStatut,
  LivraisonStatut,
} from '@prisma/client';

type PrismaEnumBundle = {
  ClientStatut: typeof ClientStatut;
  CommandeStatut: typeof CommandeStatut;
  DevisStatut: typeof DevisStatut;
  FactureStatut: typeof FactureStatut;
  LivraisonStatut: typeof LivraisonStatut;
};

let cached: PrismaEnumBundle | null = null;

function bundleReady(bundle: PrismaEnumBundle): boolean {
  return Boolean(
    bundle.CommandeStatut?.Livre
    && bundle.DevisStatut?.Accepte
    && bundle.ClientStatut?.Actif
    && bundle.FactureStatut?.Emise
    && bundle.LivraisonStatut?.Livre,
  );
}

export async function prismaEnums(): Promise<PrismaEnumBundle> {
  if (cached && bundleReady(cached)) return cached;
  const client = await import('@prisma/client');
  const bundle: PrismaEnumBundle = {
    ClientStatut: client.ClientStatut,
    CommandeStatut: client.CommandeStatut,
    DevisStatut: client.DevisStatut,
    FactureStatut: client.FactureStatut,
    LivraisonStatut: client.LivraisonStatut,
  };
  if (bundleReady(bundle)) cached = bundle;
  return bundle;
}
