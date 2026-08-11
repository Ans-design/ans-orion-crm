/**
 * Seed métier Goodies — modèles / techniques / addons / dépendances.
 * Idempotent via excelId.
 */
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
  process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
}

const prisma = new PrismaClient();

type ModelSeed = {
  excelId: string;
  articleId: string;
  typeModele: string;
  fieldKey?: string;
  matiere?: string;
  formatDimension?: string;
  widthMm?: number;
  heightMm?: number;
  diameterMm?: number;
  contenance?: string;
  capacite?: string;
  interfaceUsb?: string;
  panneaux?: string;
  prixVierge: number;
  details?: string;
};

type TechSeed = {
  excelId: string;
  articleId: string;
  technique: string;
  prixTechnique: number;
  details?: string;
};

type AddonSeed = {
  excelId: string;
  articleId: string;
  name: string;
  type?: string;
  price: number;
  required?: boolean;
  fieldKey?: string;
  details?: string;
};

const MODELS: ModelSeed[] = [
  // Tapis
  { excelId: 'GD-TAPIS-20', articleId: 'gd-tapis', typeModele: 'Tapis 20 cm', fieldKey: 'format', formatDimension: 'Ø 20 cm (S)', diameterMm: 200, prixVierge: 9000, details: 'Vierge 20 cm' },
  { excelId: 'GD-TAPIS-1822', articleId: 'gd-tapis', typeModele: 'Tapis 18×22 cm', fieldKey: 'format', formatDimension: '18×22 cm (XS)', widthMm: 180, heightMm: 220, prixVierge: 9000 },
  { excelId: 'GD-TAPIS-2227', articleId: 'gd-tapis', typeModele: 'Tapis 22×27 cm', fieldKey: 'format', formatDimension: '22×27 cm (S)', widthMm: 220, heightMm: 270, prixVierge: 10000 },
  // Stylo
  { excelId: 'GD-STYLO-4C-METAL', articleId: 'gd-stylo', typeModele: 'Stylo 4 couleurs', fieldKey: 'type', matiere: 'Métal', prixVierge: 4000, details: 'Stylo 4 couleurs métal vierge' },
  { excelId: 'GD-STYLO-BILLE', articleId: 'gd-stylo', typeModele: 'Stylo bille', fieldKey: 'type', matiere: 'Plastique', prixVierge: 2200 },
  { excelId: 'GD-STYLO-METAL', articleId: 'gd-stylo', typeModele: 'Stylo premium / coffret', fieldKey: 'type', matiere: 'Métal', prixVierge: 5000 },
  // Porte-clés
  { excelId: 'GD-PK-METAL', articleId: 'gd-portecles', typeModele: 'Porte-clés métal', fieldKey: 'type', matiere: 'Métal chromé', formatDimension: 'Standard — 35×35 mm', prixVierge: 2500 },
  { excelId: 'GD-PK-PVC-50', articleId: 'gd-portecles', typeModele: 'Porte-clés PVC souple', fieldKey: 'type', matiere: 'PVC souple', formatDimension: 'Grand — 50×50 mm', widthMm: 50, heightMm: 50, prixVierge: 0, details: 'Formule PVC opaque A4 / diviseur + découpe + attache' },
  // Pins
  { excelId: 'GD-PINS-25', articleId: 'gd-pins', typeModele: "Pin's métal émaillé", fieldKey: 'type', formatDimension: 'Standard — 25 mm', diameterMm: 25, prixVierge: 3000 },
  { excelId: 'GD-PINS-40', articleId: 'gd-pins', typeModele: "Pin's imprimé résine", fieldKey: 'type', formatDimension: 'Grand — 40 mm', diameterMm: 40, prixVierge: 4500 },
  // Parapluie
  { excelId: 'GD-PARA-100-8', articleId: 'gd-parapluie', typeModele: 'Parapluie pliant 100 cm', fieldKey: 'diametre', diameterMm: 1000, panneaux: '8 panneaux', formatDimension: '100 cm (pliant standard)', prixVierge: 18000 },
  { excelId: 'GD-PARA-120-8', articleId: 'gd-parapluie', typeModele: 'Parapluie 120 cm', fieldKey: 'diametre', diameterMm: 1200, panneaux: '8 panneaux', formatDimension: '120 cm (droit standard)', prixVierge: 22000 },
  // Mug
  { excelId: 'GD-MUG-330', articleId: 'gd-mug', typeModele: 'Mug blanc 330 ml', fieldKey: 'type', contenance: '330 ml', matiere: 'Céramique blanche', prixVierge: 9000 },
  { excelId: 'GD-MUG-CLASSIQUE', articleId: 'gd-mug', typeModele: 'Mug classique', fieldKey: 'type', contenance: '300 ml (standard)', prixVierge: 9000 },
  { excelId: 'GD-MUG-MAGIQUE', articleId: 'gd-mug', typeModele: 'Mug magique (thermosensible)', fieldKey: 'type', contenance: '300 ml (standard)', prixVierge: 12000 },
  { excelId: 'GD-MUG-500', articleId: 'gd-mug', typeModele: 'Mug XXL 500 ml', fieldKey: 'type', contenance: '500 ml (XXL)', prixVierge: 11000 },
  // Housse
  { excelId: 'GD-HOU-TEL', articleId: 'gd-housse', typeModele: 'Housse téléphone', fieldKey: 'type', formatDimension: 'iPhone / Samsung standard', prixVierge: 8000 },
  { excelId: 'GD-HOU-TAB', articleId: 'gd-housse', typeModele: 'Housse tablette', fieldKey: 'type', formatDimension: 'Tablette 10"', prixVierge: 12000 },
  { excelId: 'GD-HOU-LAP13', articleId: 'gd-housse', typeModele: 'Housse laptop', fieldKey: 'type', formatDimension: 'Laptop 13"', prixVierge: 15000 },
  // Gourde
  { excelId: 'GD-GOU-500', articleId: 'gd-gourde', typeModele: 'Gourde inox 500 ml', fieldKey: 'type', contenance: '500 ml', matiere: 'Inox double paroi', prixVierge: 28000 },
  { excelId: 'GD-GOU-750', articleId: 'gd-gourde', typeModele: 'Gourde plastique 750 ml', fieldKey: 'type', contenance: '750 ml', matiere: 'Tritan (plastique)', prixVierge: 18000 },
  // USB
  { excelId: 'GD-USB-16A', articleId: 'gd-usb', typeModele: 'Clé USB 16 Go type A', fieldKey: 'capacite', capacite: '16 Go', interfaceUsb: 'USB 2.0', matiere: 'Plastique', prixVierge: 10000 },
  { excelId: 'GD-USB-32A', articleId: 'gd-usb', typeModele: 'Clé USB 32 Go', fieldKey: 'capacite', capacite: '32 Go', interfaceUsb: 'USB 3.0', prixVierge: 14000 },
  { excelId: 'GD-USB-128', articleId: 'gd-usb', typeModele: 'Clé USB 128 Go', fieldKey: 'capacite', capacite: '128 Go', interfaceUsb: 'USB-C', prixVierge: 28000 },
  // Briquet
  { excelId: 'GD-BRI-STD', articleId: 'gd-briquet', typeModele: 'Briquet standard', fieldKey: 'taille', formatDimension: 'Standard', prixVierge: 1500 },
  { excelId: 'GD-BRI-METAL', articleId: 'gd-briquet', typeModele: 'Briquet métal', fieldKey: 'taille', formatDimension: 'Large', matiere: 'Métal', prixVierge: 3500 },
  // Assiette
  { excelId: 'GD-ASS-22', articleId: 'gd-tasse', typeModele: 'Assiette plate 22 cm', fieldKey: 'type', diameterMm: 220, formatDimension: '22 cm', matiere: 'Porcelaine', prixVierge: 8000 },
  { excelId: 'GD-ASS-26', articleId: 'gd-tasse', typeModele: 'Assiette plate 26 cm', fieldKey: 'type', diameterMm: 260, formatDimension: '26 cm', matiere: 'Céramique', prixVierge: 10000 },
];

const TECHNIQUES: TechSeed[] = [
  { excelId: 'GD-TECH-TAPIS-SUB', articleId: 'gd-tapis', technique: 'Sublimation', prixTechnique: 1000, details: 'Sublimation 20 cm' },
  { excelId: 'GD-TECH-TAPIS-SUB-FULL', articleId: 'gd-tapis', technique: 'Sublimation pleine surface', prixTechnique: 1000 },
  { excelId: 'GD-TECH-TAPIS-UV', articleId: 'gd-tapis', technique: 'Impression UV', prixTechnique: 1500 },
  { excelId: 'GD-TECH-STYLO-IMP', articleId: 'gd-stylo', technique: 'Impression', prixTechnique: 500 },
  { excelId: 'GD-TECH-STYLO-TAMP', articleId: 'gd-stylo', technique: 'Tampographie', prixTechnique: 500 },
  { excelId: 'GD-TECH-STYLO-GRAV', articleId: 'gd-stylo', technique: 'Gravure laser', prixTechnique: 800 },
  { excelId: 'GD-TECH-PK-UV', articleId: 'gd-portecles', technique: 'Impression UV', prixTechnique: 500 },
  { excelId: 'GD-TECH-PK-NONE', articleId: 'gd-portecles', technique: 'Sans personnalisation', prixTechnique: 0 },
  { excelId: 'GD-TECH-MUG-SUB', articleId: 'gd-mug', technique: 'Sublimation', prixTechnique: 2000 },
  { excelId: 'GD-TECH-MUG-NONE', articleId: 'gd-mug', technique: 'Sans personnalisation', prixTechnique: 0 },
  { excelId: 'GD-TECH-GOU-GRAV', articleId: 'gd-gourde', technique: 'Gravure laser', prixTechnique: 3000 },
  { excelId: 'GD-TECH-USB-GRAV', articleId: 'gd-usb', technique: 'Gravure laser', prixTechnique: 1500 },
  { excelId: 'GD-TECH-HOU-UV', articleId: 'gd-housse', technique: 'Impression UV', prixTechnique: 2000 },
  { excelId: 'GD-TECH-PARA-SERI', articleId: 'gd-parapluie', technique: 'Sérigraphie', prixTechnique: 5000 },
  { excelId: 'GD-TECH-PINS-EMA', articleId: 'gd-pins', technique: 'Émaillage soft', prixTechnique: 0 },
  { excelId: 'GD-TECH-BRI-TAMP', articleId: 'gd-briquet', technique: 'Tampographie', prixTechnique: 400 },
  { excelId: 'GD-TECH-ASS-SUB', articleId: 'gd-tasse', technique: 'Sublimation', prixTechnique: 2000 },
];

const ADDONS: AddonSeed[] = [
  { excelId: 'GD-ADD-PK-DIV', articleId: 'gd-portecles', name: 'Diviseur A4 PVC souple', type: 'param', price: 20, fieldKey: 'pvc_diviseur_a4', details: 'A4 ÷ N pièces selon 50×50 mm' },
  { excelId: 'GD-ADD-PK-DEC', articleId: 'gd-portecles', name: 'Découpe', type: 'decoupe', price: 50, fieldKey: 'decoupe', required: true },
  { excelId: 'GD-ADD-PK-ATT', articleId: 'gd-portecles', name: 'Anneau + perforation + œillet', type: 'attache', price: 300, fieldKey: 'attache', required: true },
  { excelId: 'GD-ADD-PK-PVC-REF', articleId: 'gd-portecles', name: 'Prix PVC opaque A4 (fallback)', type: 'param', price: 13000, fieldKey: 'pvc_opaque_a4', details: 'Fallback si ISF non publié' },
];

const DEPS = [
  {
    excelId: 'GD-DEP-HOU-TEL',
    articleId: 'gd-housse',
    sourceField: 'type',
    sourceValue: 'Housse téléphone',
    targetField: 'format',
    allowedValues: 'iPhone / Samsung standard|Téléphone standard|iPhone|Samsung|Format personnalisé',
    action: 'filter',
    details: 'Formats téléphone uniquement',
  },
  {
    excelId: 'GD-DEP-HOU-TAB',
    articleId: 'gd-housse',
    sourceField: 'type',
    sourceValue: 'Housse tablette',
    targetField: 'format',
    allowedValues: 'Tablette 10"|Tablette 12"|iPad|Format personnalisé',
    action: 'filter',
    details: 'Formats tablette uniquement',
  },
  {
    excelId: 'GD-DEP-HOU-LAP',
    articleId: 'gd-housse',
    sourceField: 'type',
    sourceValue: 'Housse laptop',
    targetField: 'format',
    allowedValues: 'Laptop 13"|Laptop 15"|Format personnalisé',
    action: 'filter',
  },
];

export async function seedGoodiesAdminTables(client: PrismaClient = prisma) {
  let models = 0;
  let techs = 0;
  let addons = 0;
  let deps = 0;

  for (const m of MODELS) {
    await client.goodiesArticleModel.upsert({
      where: { excelId: m.excelId },
      create: {
        excelId: m.excelId,
        articleId: m.articleId,
        typeModele: m.typeModele,
        fieldKey: m.fieldKey ?? 'type',
        matiere: m.matiere ?? null,
        formatDimension: m.formatDimension ?? null,
        widthMm: m.widthMm ?? null,
        heightMm: m.heightMm ?? null,
        diameterMm: m.diameterMm ?? null,
        contenance: m.contenance ?? null,
        capacite: m.capacite ?? null,
        interfaceUsb: m.interfaceUsb ?? null,
        panneaux: m.panneaux ?? null,
        prixVierge: m.prixVierge,
        details: m.details ?? null,
        status: 'published',
        active: true,
        visiblePOS: true,
      },
      update: {
        typeModele: m.typeModele,
        fieldKey: m.fieldKey ?? 'type',
        matiere: m.matiere ?? null,
        formatDimension: m.formatDimension ?? null,
        widthMm: m.widthMm ?? null,
        heightMm: m.heightMm ?? null,
        diameterMm: m.diameterMm ?? null,
        contenance: m.contenance ?? null,
        capacite: m.capacite ?? null,
        interfaceUsb: m.interfaceUsb ?? null,
        panneaux: m.panneaux ?? null,
        prixVierge: m.prixVierge,
        details: m.details ?? null,
        deletedAt: null,
        active: true,
        visiblePOS: true,
        status: 'published',
      },
    });
    models++;
  }

  for (const t of TECHNIQUES) {
    await client.goodiesPrintingTechnique.upsert({
      where: { excelId: t.excelId },
      create: {
        excelId: t.excelId,
        articleId: t.articleId,
        technique: t.technique,
        prixTechnique: t.prixTechnique,
        details: t.details ?? null,
        status: 'published',
        active: true,
        visiblePOS: true,
      },
      update: {
        technique: t.technique,
        prixTechnique: t.prixTechnique,
        details: t.details ?? null,
        deletedAt: null,
        active: true,
        visiblePOS: true,
        status: 'published',
      },
    });
    techs++;
  }

  for (const a of ADDONS) {
    await client.goodiesAddon.upsert({
      where: { excelId: a.excelId },
      create: {
        excelId: a.excelId,
        articleId: a.articleId,
        name: a.name,
        type: a.type ?? 'option',
        price: a.price,
        required: a.required ?? false,
        fieldKey: a.fieldKey ?? 'supplements',
        details: a.details ?? null,
        status: 'published',
        active: true,
        visiblePOS: a.fieldKey?.startsWith('pvc_') ? false : true,
      },
      update: {
        name: a.name,
        type: a.type ?? 'option',
        price: a.price,
        required: a.required ?? false,
        fieldKey: a.fieldKey ?? 'supplements',
        details: a.details ?? null,
        deletedAt: null,
        active: true,
        status: 'published',
      },
    });
    addons++;
  }

  for (const d of DEPS) {
    await client.goodiesOptionDependency.upsert({
      where: { excelId: d.excelId },
      create: { ...d, active: true },
      update: {
        sourceField: d.sourceField,
        sourceValue: d.sourceValue,
        targetField: d.targetField,
        allowedValues: d.allowedValues,
        action: d.action,
        details: d.details ?? null,
        deletedAt: null,
        active: true,
      },
    });
    deps++;
  }

  return { models, techs, addons, deps };
}

seedGoodiesAdminTables()
  .then((r) => {
    console.log('GOODEES_SEED', JSON.stringify(r));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
