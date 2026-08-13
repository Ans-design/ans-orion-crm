/**
 * Profils démo ANS ORION HTML v29 — métadonnées sans secrets.
 * Mots de passe UNIQUEMENT via ORION_V29_PASSWORDS_JSON (objet matricule → mot de passe).
 * Exemple (local only) : {"ADM01":"********","COM01":"********"}
 */

export type OrionV29Profile = {
  matricule: string;
  name: string;
  role: string;
  id: string;
  poste: string;
  departement: string;
  profile: string;
  email: string;
};

export type OrionV29Account = OrionV29Profile & { password: string };

/** Profils publics (sans mot de passe). */
export const ORION_V29_PROFILES: readonly OrionV29Profile[] = [
  {
    matricule: 'DIRECTEUR',
    name: 'Liantsoa A.',
    role: 'admin',
    id: 'v29-directeur',
    poste: 'Directeur',
    departement: 'Direction',
    profile: 'Direction',
    email: 'liantsoa@ansdesign.mg',
  },
  {
    matricule: 'DIR01',
    name: 'Sarobidy N.',
    role: 'manager',
    id: 'v29-dir01',
    poste: 'Directeur adjoint',
    departement: 'Direction',
    profile: 'Direction',
    email: 'sarobidy@ansdesign.mg',
  },
  {
    matricule: 'ADM01',
    name: 'Laingo T.',
    role: 'admin',
    id: 'v29-adm01',
    poste: 'Administrateur',
    departement: 'Direction',
    profile: 'Admin',
    email: 'laingo@ansdesign.mg',
  },
  {
    matricule: 'ADM02',
    name: 'Fitahiana',
    role: 'admin',
    id: 'v29-adm02',
    poste: 'Administrateur',
    departement: 'Direction',
    profile: 'Admin',
    email: 'fitahiana@ansdesign.mg',
  },
  {
    matricule: 'GRA01',
    name: 'Thomas A.',
    role: 'designer',
    id: 'v29-graphiste',
    poste: 'Graphiste',
    departement: 'Studio Création',
    profile: 'Graphiste',
    email: 'thomas@ansdesign.mg',
  },
  {
    matricule: 'COM01',
    name: 'Tsiory R.',
    role: 'commercial',
    id: 'v29-commercial',
    poste: 'Commercial',
    departement: 'Commercial',
    profile: 'Commercial',
    email: 'tsiory@ansdesign.mg',
  },
  {
    matricule: 'FAC01',
    name: 'Linah T.',
    role: 'faconnage',
    id: 'v29-faconnage',
    poste: 'Opérateur façonnage',
    departement: 'Production',
    profile: 'Façonnage',
    email: 'linah@ansdesign.mg',
  },
  {
    matricule: 'LOG01',
    name: 'Mamitiana O.',
    role: 'livraison',
    id: 'v29-logistique',
    poste: 'Logistique',
    departement: 'Logistique',
    profile: 'Logistique',
    email: 'mamitiana@ansdesign.mg',
  },
  {
    matricule: 'OPE01',
    name: 'Hery R.',
    role: 'production',
    id: 'v29-operateur',
    poste: 'Opérateur presse',
    departement: 'Production',
    profile: 'Opérateur',
    email: 'hery@ansdesign.mg',
  },
  {
    matricule: 'CM01',
    name: 'Sitraka M.',
    role: 'cm',
    id: 'v29-cm',
    poste: 'Community Manager',
    departement: 'Commercial',
    profile: 'CM Social',
    email: 'sitraka@ansdesign.mg',
  },
  {
    matricule: 'TECH01',
    name: 'Rija T.',
    role: 'technicien',
    id: 'v29-tech',
    poste: 'Technicien maintenance',
    departement: 'Production',
    profile: 'Technicien',
    email: 'rija@ansdesign.mg',
  },
  {
    matricule: 'ACC01',
    name: 'Nirina R.',
    role: 'accueil',
    id: 'v29-accueil',
    poste: "Agent d'accueil",
    departement: 'Administration',
    profile: 'Accueil',
    email: 'nirina@ansdesign.mg',
  },
  {
    matricule: 'COND01',
    name: 'Fidy M.',
    role: 'conducteur',
    id: 'v29-conducteur',
    poste: 'Conducteur machine',
    departement: 'Production',
    profile: 'Conducteur',
    email: 'fidy@ansdesign.mg',
  },
  {
    matricule: 'STOCK01',
    name: 'Haja L.',
    role: 'production',
    id: 'v29-magasin',
    poste: 'Responsable stock',
    departement: 'Logistique',
    profile: 'Magasinier',
    email: 'haja@ansdesign.mg',
  },
  {
    matricule: 'CAISSE01',
    name: 'Voahangy R.',
    role: 'caisse',
    id: 'v29-caisse',
    poste: 'Caissière',
    departement: 'Finance',
    profile: 'Caisse',
    email: 'caisse@ansdesign.mg',
  },
  {
    matricule: 'FIN01',
    name: 'Rabe M.',
    role: 'finance',
    id: 'v29-finance',
    poste: 'Comptable',
    departement: 'Finance',
    profile: 'Finance',
    email: 'finance@ansdesign.mg',
  },
  {
    matricule: 'LEC01',
    name: 'Andry S.',
    role: 'lecture',
    id: 'v29-lecture',
    poste: 'Consultation',
    departement: 'Direction',
    profile: 'Lecture seule',
    email: 'lecture@ansdesign.mg',
  },
  // ——— Équipe ANS (logins hors 17 profils initiaux) ———
  {
    matricule: 'GRA02',
    name: 'Mendrika V.',
    role: 'designer',
    id: 'v29-gra02-mendrika',
    poste: 'Graphiste',
    departement: 'Studio Création',
    profile: 'Graphiste',
    email: 'mendrika@ansdesign.mg',
  },
  {
    matricule: 'FAC02',
    name: 'Tojo L.',
    role: 'faconnage',
    id: 'v29-fac02-tojo',
    poste: 'Responsable façonnage',
    departement: 'Production',
    profile: 'Façonnage',
    email: 'tojo@ansdesign.mg',
  },
  {
    matricule: 'QUAL01',
    name: 'Alain T.',
    role: 'production',
    id: 'v29-qual01-alain',
    poste: 'Contrôleur qualité',
    departement: 'Qualité',
    profile: 'Contrôle qualité',
    email: 'alain@ansdesign.mg',
  },
  {
    matricule: 'GRA03',
    name: 'Tsiory A.',
    role: 'designer',
    id: 'v29-gra03-tsiory',
    poste: 'Graphiste',
    departement: 'Studio Création',
    profile: 'Graphiste',
    email: 'tsioriniaina@ansdesign.mg',
  },
  {
    matricule: 'COM02',
    name: 'Nancia R.',
    role: 'commercial',
    id: 'v29-com02-nancia',
    poste: 'Commercial',
    departement: 'Commercial',
    profile: 'Commercial',
    email: 'nancia@ansdesign.mg',
  },
  {
    matricule: 'FAC03',
    name: 'Tojo N.',
    role: 'faconnage',
    id: 'v29-fac03-tojo-n',
    poste: 'Opérateur façonnage',
    departement: 'Production',
    profile: 'Façonnage',
    email: 'tojo.niriantsoa@ansdesign.mg',
  },
  {
    matricule: 'FAC04',
    name: 'Santatra R.',
    role: 'faconnage',
    id: 'v29-fac04-santatra',
    poste: 'Responsable façonnage et grand format',
    departement: 'Production',
    profile: 'Façonnage',
    email: 'santatra@ansdesign.mg',
  },
  {
    matricule: 'ACC02',
    name: 'Fanasa M.',
    role: 'accueil',
    id: 'v29-acc02-fanasa',
    poste: "Chargée d'accueil",
    departement: 'Accueil',
    profile: 'Accueil',
    email: 'fanasa@ansdesign.mg',
  },
  {
    matricule: 'CM02',
    name: 'Fytia R.',
    role: 'cm',
    id: 'v29-cm02-fytia',
    poste: 'Community manager',
    departement: 'Communication',
    profile: 'CM Social',
    email: 'fytia@ansdesign.mg',
  },
] as const;

function parsePasswordMap(): Record<string, string> {
  const raw = process.env.ORION_V29_PASSWORDS_JSON?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.trim().length >= 8) {
        out[k.trim().toUpperCase()] = v.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Comptes authentifiables = profils + mots de passe env (fail-closed si JSON absent). */
export function getOrionV29Accounts(): OrionV29Account[] {
  const map = parsePasswordMap();
  const list: OrionV29Account[] = [];
  for (const profile of ORION_V29_PROFILES) {
    const password = map[profile.matricule];
    if (!password) continue;
    list.push({ ...profile, password });
  }
  return list;
}

/** Alias seed / e2e — même source que getOrionV29Accounts(). */
export function listOrionV29Accounts(): OrionV29Account[] {
  return getOrionV29Accounts();
}
export function matchOrionV29Account(login: string, password: string): OrionV29Account | null {
  if (!password) return null;
  const key = login.trim().toUpperCase();
  const email = login.trim().toLowerCase();
  return (
    getOrionV29Accounts().find(
      (a) => (a.matricule === key || a.email.toLowerCase() === email) && a.password === password,
    ) ?? null
  );
}

/** Métadonnées publiques pour la page login (sans mot de passe). */
export const ORION_V29_PUBLIC = ORION_V29_PROFILES.map(
  ({ matricule, name, role, profile, poste, email }) => ({
    matricule,
    name,
    role,
    profile,
    poste,
    email,
  }),
);

/**
 * Quick-login : tous les profils v29 (métadonnées), sans exiger le JSON mots de passe.
 * Sécurité : réservé à isQuickLoginEnabled() côté auth.
 */
export function resolveOrionV29QuickLogin(login: string): OrionV29Profile | null {
  const key = login.trim().toUpperCase();
  const email = login.trim().toLowerCase();
  return (
    ORION_V29_PROFILES.find(
      (a) => a.matricule === key || a.email.toLowerCase() === email,
    ) ?? null
  );
}

/** Mot de passe v29 — uniquement depuis l’env (jamais de littéral). */
export function getOrionV29Password(matricule: string): string | null {
  const key = matricule.trim().toUpperCase();
  return parsePasswordMap()[key] ?? null;
}

/** Liste des matricules attendus (seed / ensure local). */
export function listOrionV29Matricules(): string[] {
  return ORION_V29_PROFILES.map((p) => p.matricule);
}
