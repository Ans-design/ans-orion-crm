/**
 * Modèles Excel exemple — Base Prix, Matières & Stock (multi-feuilles).
 */
import * as XLSX from 'xlsx';

function sheetFromRows(name: string, columns: readonly string[], rows: Record<string, unknown>[]) {
  const ordered = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) out[col] = row[col] ?? '';
    return out;
  });
  return XLSX.utils.json_to_sheet(ordered.length ? ordered : [{}], {
    header: [...columns],
  });
}

const COLS_01 = [
  'ID', 'MATIÈRE', 'FAMILLE', 'GRAMMAGE', 'ÉPAISSEUR', 'UNITÉ',
  'PRIX ACHAT', 'PRIX BASE', 'VISIBLE POS', 'STATUT', 'DÉTAIL', 'MATERIAL_KEY',
] as const;

const COLS_02 = [
  'ID', 'MATIÈRE', 'CONTEXTE PRIX', 'FORMAT BASE', 'UNITÉ PRIX', 'PRIX HT', 'COÛT HT', 'ACTIF',
] as const;

const COLS_03 = [
  'ID', 'MATIÈRE', 'GRAMMAGE', 'FORMAT BASE', 'PRIX A4', 'RECTO', 'VERSO', 'UNITÉ', 'VISIBLE POS', 'STATUT',
] as const;

const COLS_04 = [
  'ID', 'MATIÈRE', 'PRIX M2', 'PRIX ML', 'LAIZE', 'VISIBLE POS', 'STATUT', 'DÉTAIL',
] as const;

/** Construit un classeur modèle avec 1–2 lignes d’exemple par feuille importable. */
export function buildPrixMatieresStockTemplateWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows('01_Matieres_Stock', COLS_01, [
      {
        ID: 'EX-MAT-001',
        MATIÈRE: 'Offset 80G',
        FAMILLE: 'Petit format',
        GRAMMAGE: '80',
        ÉPAISSEUR: '',
        UNITÉ: 'pcs',
        'PRIX ACHAT': 50,
        'PRIX BASE': 120,
        'VISIBLE POS': 'oui',
        STATUT: 'published',
        DÉTAIL: 'Exemple — à adapter',
        MATERIAL_KEY: 'offset_80g',
      },
      {
        ID: 'EX-MAT-002',
        MATIÈRE: 'PVC opaque',
        FAMILLE: 'Grand format',
        GRAMMAGE: '',
        ÉPAISSEUR: '5mm',
        UNITÉ: 'm2',
        'PRIX ACHAT': 8000,
        'PRIX BASE': 15000,
        'VISIBLE POS': 'oui',
        STATUT: 'published',
        DÉTAIL: 'Support grand format',
        MATERIAL_KEY: 'pvc_opaque',
      },
    ]),
    '01_Matieres_Stock',
  );

  const prixRows = [
    {
      ID: '',
      MATIÈRE: 'offset_80g',
      'CONTEXTE PRIX': 'PRINT_SMALL_FORMAT',
      'FORMAT BASE': 'A4',
      'UNITÉ PRIX': 'a4',
      'PRIX HT': 120,
      'COÛT HT': 50,
      ACTIF: 'oui',
    },
    {
      ID: '',
      MATIÈRE: 'offset_80g',
      'CONTEXTE PRIX': 'RAW_STOCK',
      'FORMAT BASE': 'A4',
      'UNITÉ PRIX': 'a4',
      'PRIX HT': 50,
      'COÛT HT': 50,
      ACTIF: 'oui',
    },
    {
      ID: '',
      MATIÈRE: 'pvc_opaque',
      'CONTEXTE PRIX': 'PRINT_GRAND_FORMAT',
      'FORMAT BASE': '',
      'UNITÉ PRIX': 'm2',
      'PRIX HT': 15000,
      'COÛT HT': 8000,
      ACTIF: 'oui',
    },
  ];
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows('02_Prix_Base', COLS_02, prixRows),
    '02_Prix_Base',
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows('02_Prix_Par_Contexte', COLS_02, prixRows),
    '02_Prix_Par_Contexte',
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows('03_Impression_Sans_Finition', COLS_03, [
      {
        ID: '',
        MATIÈRE: 'offset_80g',
        GRAMMAGE: '80',
        'FORMAT BASE': 'A4',
        'PRIX A4': 120,
        RECTO: 'oui',
        VERSO: '',
        UNITÉ: 'pcs',
        'VISIBLE POS': 'oui',
        STATUT: 'published',
      },
    ]),
    '03_Impression_Sans_Finition',
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows('04_Grand_Format', COLS_04, [
      {
        ID: 'EX-GF-001',
        MATIÈRE: 'PVC opaque',
        'PRIX M2': 15000,
        'PRIX ML': '',
        LAIZE: 122,
        'VISIBLE POS': 'oui',
        STATUT: 'published',
        DÉTAIL: 'Exemple GF',
      },
    ]),
    '04_Grand_Format',
  );

  // Feuilles documentation (non importées par le hub — export/référence)
  for (const [name, cols, rows] of [
    ['05_Articles_Vente_Directe', ['ID', 'ARTICLE', 'CATÉGORIE', 'PRIX DIRECT', 'VISIBLE POS', 'STATUT'], [
      { ID: 'EX-AVD-001', ARTICLE: 'Stylo personnalisé', CATÉGORIE: 'Goodies', 'PRIX DIRECT': 4500, 'VISIBLE POS': 'oui', STATUT: 'published' },
    ]],
    ['06_Finitions_Faconnage', ['ID', 'NOM', 'PRIX', 'ACTIF'], [
      { ID: 'EX-FIN-001', NOM: 'Reliure spirale', PRIX: 2000, ACTIF: 'oui' },
    ]],
    ['07_Paliers_Remises', ['ID', 'ARTICLE', 'QTE_MIN', 'REMISE_%', 'DÉTAIL'], [
      { ID: 'EX-PAL-001', ARTICLE: 'Polo', QTE_MIN: 50, 'REMISE_%': 10, DÉTAIL: 'Exemple palier' },
    ]],
    ['08_Regles_Formules', ['ID', 'CODE', 'FORMULE', 'DÉTAIL'], [
      { ID: 'EX-REG-001', CODE: 'A4_DIV', FORMULE: 'prixA4 * coeffFormat', DÉTAIL: 'Exemple' },
    ]],
    ['09_Limites_Matieres', ['ID', 'MATIÈRE', 'FORMAT_MAX', 'DÉTAIL'], [
      { ID: 'EX-LIM-001', MATIÈRE: 'glossy', FORMAT_MAX: 'A3', DÉTAIL: 'Exemple limite' },
    ]],
    ['10_Anomalies', ['TYPE', 'SÉVÉRITÉ', 'MESSAGE'], [
      { TYPE: 'exemple', SÉVÉRITÉ: 'info', MESSAGE: 'Feuille remplie à l’export anomalies' },
    ]],
    ['11_Options_Chips', ['ID', 'ARTICLE', 'FIELD', 'LABEL', 'ACTIF'], [
      { ID: 'EX-CHIP-001', ARTICLE: 'gd-housse', FIELD: 'type', LABEL: 'téléphone', ACTIF: 'oui' },
    ]],
    ['12_Categories_POS', ['ID', 'LABEL', 'ORDRE'], [
      { ID: 'textiles', LABEL: 'Textiles', ORDRE: 1 },
    ]],
    ['13_Anomalies_Catalogue', ['ARTICLE', 'KIND', 'SÉVÉRITÉ'], [
      { ARTICLE: 'bob-perso', KIND: 'personalized', SÉVÉRITÉ: 'critical' },
    ]],
  ] as const) {
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows(name, cols as unknown as string[], rows as unknown as Record<string, unknown>[]),
      name,
    );
  }

  // Guide
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows('00_Guide', ['ÉTAPE', 'INSTRUCTION'], [
      { ÉTAPE: '1', INSTRUCTION: 'Remplir 01_Matieres_Stock (identité matière).' },
      { ÉTAPE: '2', INSTRUCTION: 'Remplir 02_Prix_Base ou 02_Prix_Par_Contexte (prix par usage).' },
      { ÉTAPE: '3', INSTRUCTION: 'Optionnel : 03 ISF, 04 Grand Format.' },
      { ÉTAPE: '4', INSTRUCTION: 'Dans Admin → Import Excel : prévisualiser puis confirmer.' },
      { ÉTAPE: '5', INSTRUCTION: 'Si erreurs → rien n’est écrit (import atomique).' },
      { ÉTAPE: '6', INSTRUCTION: 'Après confirm → sync POS automatique.' },
    ]),
    '00_Guide',
  );

  return wb;
}

export function buildPrixMatieresStockTemplateBuffer(): Buffer {
  const wb = buildPrixMatieresStockTemplateWorkbook();
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
