/**
 * Liste exacte des employés ANS DESIGN PRINT.
 * Source : « liste des employées ANS.xlsx » (Music).
 * Ne pas inventer de fiches — sync via scripts/sync-ans-employees.ts.
 */

export type AnsEmployeeMaster = {
  matricule: string;
  firstName: string;
  lastName: string;
  poste: string;
  departement: string;
  authRole: string;
  tel: string;
  adresse: string;
  /** ISO date YYYY-MM-DD si connue */
  dateNaissance?: string | null;
  dateEmbauche?: string | null;
};

function excelSerialToIso(serial: number): string {
  // Excel 1900 date system
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  return new Date(utc).toISOString().slice(0, 10);
}

function parseFrenchDate(raw: string): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const m = s.match(/(\d{1,2})\s*([A-Za-zÀ-ÿ]+)\s*(\d{4})/i);
  if (!m) return null;
  const key = m[2]!
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const months: Record<string, number> = {
    janvier: 0,
    fevrier: 1,
    mars: 2,
    avril: 3,
    mai: 4,
    juin: 5,
    juillet: 6,
    aout: 7,
    septembre: 8,
    octobre: 9,
    novembre: 10,
    decembre: 11,
  };
  const monthIdx = months[key];
  if (monthIdx == null) return null;
  const d = new Date(Date.UTC(Number(m[3]), monthIdx, Number(m[1])));
  return d.toISOString().slice(0, 10);
}

function toIsoDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return excelSerialToIso(raw);
  const s = String(raw).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return excelSerialToIso(Number(s));
  return parseFrenchDate(s);
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: parts[0]! };
  return { lastName: parts[0]!, firstName: parts.slice(1).join(' ') };
}

function mapPoste(posteRaw: string): { poste: string; departement: string; authRole: string } {
  const poste = String(posteRaw).trim().replace(/\s+/g, ' ');
  const p = poste.toLowerCase();
  if (/fondateur|directeur technique|propri[eé]taire.*directeur/i.test(p)) {
    return { poste, departement: 'Direction', authRole: 'admin' };
  }
  if (/co-propri[eé]taire|directrice g[eé]n[eé]ral/i.test(p)) {
    return { poste, departement: 'Direction', authRole: 'manager' };
  }
  if (/accueil/i.test(p)) {
    return { poste, departement: 'Accueil', authRole: 'accueil' };
  }
  if (/administrat/i.test(p)) {
    return { poste, departement: 'Administration', authRole: 'admin' };
  }
  if (/graphiste|studio/i.test(p)) {
    return { poste, departement: 'Studio Création', authRole: 'designer' };
  }
  if (/community/i.test(p)) {
    return { poste, departement: 'Communication', authRole: 'cm' };
  }
  if (/qualit/i.test(p)) {
    return { poste, departement: 'Qualité', authRole: 'production' };
  }
  if (/technique/i.test(p) && !/fa[cç]onnage/i.test(p)) {
    return { poste, departement: 'Technique', authRole: 'technicien' };
  }
  if (/fa[cç]onnage|grand format|poste\s*10/i.test(p)) {
    return { poste, departement: 'Production', authRole: 'faconnage' };
  }
  return { poste, departement: 'Production', authRole: 'production' };
}

/** Données brutes Excel (sérialisées) — utilisées par le script sync. */
export const ANS_EMPLOYEES_EXCEL_RAW = [
  {
    fullName: 'ANDRIANIAINA Nambinintsoa Sarobidy',
    birth: 35754,
    address: 'Lot II938 Ter Ampasanimalo',
    hire: '',
    poste: 'Fondateur Proprietaire Directeur Technique',
    tel: '034 63 242 72',
  },
  {
    fullName: 'RAMAROSON Rojotiana Liantsoa',
    birth: 37164,
    address: 'Lot II938 Ter Ampasanimalo',
    hire: '',
    poste: 'Co-propriétaire Directrice Général',
    tel: '034 44 080 66',
  },
  {
    fullName: 'RANDRIANASOLO Ny Aro Nancia',
    birth: 37375,
    address: 'Sabotsy Namehana',
    hire: 46148,
    poste: "Chargé d'accueil",
    tel: '038 89 758 17',
  },
  {
    fullName: 'RAMAROSON Tsikiniaina Laingotiana',
    birth: 36205,
    address: 'Lot 37D Soatsilefy Sab-Nam',
    hire: 44709,
    poste: 'Assistante administrative',
    tel: '037 70 910 61',
  },
  {
    fullName: 'RAMAROTAHINA Vonjy Mendrika',
    birth: 37568,
    address: 'III P 34 Ter A Lazaina',
    hire: '01 Aôut 2025',
    poste: 'Graphiste',
    tel: '033 82 258 45',
  },
  {
    fullName: 'RANDRIANARISOA Maminiaina Thomas',
    birth: 37150,
    address: 'Lot IVA 183 Ankeniheny',
    hire: 45658,
    poste: 'Responsable technique',
    tel: '034 93 834 00',
  },
  {
    fullName: 'RAHARIJOELINA Fitahiana',
    birth: 37820,
    address: 'Lot II F 72 H Bis Andraisora',
    hire: 45263,
    poste: 'Responsable façonnage',
    tel: '034 32 489 73',
  },
  {
    fullName: 'RABEMANANJARA Tojo Niriantsoa',
    birth: 36123,
    address: '252 FM',
    hire: 46176,
    poste: 'Poste 10',
    tel: '034 88 234 92',
  },
  {
    fullName: 'ANDRIANTSARAFARA Tojosoa Lalaina',
    birth: 36082,
    address: 'IPB 81 bis Itaosy Ambonisoa',
    hire: 46074,
    poste: 'Responsable façonnage',
    tel: '038 55 773 62',
  },
  {
    fullName: 'TOJONIRINA Mamitiana Alain',
    birth: 35621,
    address: 'Ambohipo Ambolokandrina',
    hire: 46153,
    poste: 'Contrôleur qualité',
    tel: '034 84 823 05',
  },
  {
    fullName: 'RAMIANDRISOA Anjara Fitia Tsioriniaina',
    birth: 38830,
    address: '03.481D Soaniadanana Sab-Nam',
    hire: 46055,
    poste: 'Graphiste',
    tel: '034 85 366 85',
  },
  {
    fullName: 'RANDRIAMAMPANANA Santatra',
    birth: 35775,
    address: 'Anosibe',
    hire: 46150,
    poste: 'Responsable Façonnage et Grand format',
    tel: '038 22 473 93',
  },
  {
    fullName: 'RAJOELITIANA Fanasa Miangola',
    birth: 38256,
    address: 'Ampitatafika',
    hire: 46210,
    poste: "Chargée d'accueil",
    tel: '038 89 364 79',
  },
  {
    fullName: 'RABENJA Fytia',
    birth: '26 Aôut 2004',
    address: 'Ampefiloha',
    hire: 46195,
    poste: 'Community manager',
    tel: '038 84 906 13',
  },
] as const;

export function buildAnsEmployeesMaster(): AnsEmployeeMaster[] {
  return ANS_EMPLOYEES_EXCEL_RAW.map((row, idx) => {
    const { firstName, lastName } = splitName(row.fullName);
    const mapped = mapPoste(row.poste);
    const matricule = `ANS-${String(idx + 1).padStart(3, '0')}`;
    return {
      matricule,
      firstName,
      lastName,
      poste: mapped.poste,
      departement: mapped.departement,
      authRole: mapped.authRole,
      tel: row.tel.replace(/\s+/g, ' ').trim(),
      adresse: row.address,
      dateNaissance: toIsoDate(row.birth),
      dateEmbauche: toIsoDate(row.hire),
    };
  });
}

export const ANS_EMPLOYEES_MASTER = buildAnsEmployeesMaster();
