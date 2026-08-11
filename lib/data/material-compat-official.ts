/** Compatibilités matière / grammage officielles — consignes fusion métier 2026-06-21 */

export type OfficialMaterialCompat = {
  key: string;
  label: string;
  family: 'Petit format' | 'Grand format' | 'Carte' | 'Autre';
  grammages: string[];
  source?: string;
};

export const OFFICIAL_MATERIAL_COMPAT: OfficialMaterialCompat[] = [
  { key: 'pcm', label: 'PCM', family: 'Petit format', grammages: ['90g', '115g', '130g', '135g', '150g', '170g', '250g', '300g', '350g', '600g', '700g'], source: 'base ok.html EVE_MAT_GRAMMAGES + stock' },
  { key: 'pcb', label: 'PCB', family: 'Petit format', grammages: ['90g', '115g', '130g', '135g', '150g', '170g', '250g', '300g', '350g', '600g', '700g'], source: 'base ok.html EVE_MAT_GRAMMAGES + stock' },
  { key: 'pcb-pellicule', label: 'PCB pelliculé', family: 'Petit format', grammages: ['170g', '250g', '300g', '350g', '600g', '700g'], source: 'Consignes §5' },
  { key: 'offset', label: 'Offset', family: 'Petit format', grammages: ['80g', '90g', '100g', '120g'], source: 'Consignes §5' },
  { key: 'glossy', label: 'Glossy', family: 'Petit format', grammages: ['120g', '140g', '160g', '180g', '250g', '300g'], source: 'base ok.html / stock GL120 GL160' },
  { key: 'cover-luxe', label: 'Papier cover luxe', family: 'Petit format', grammages: ['900g'], source: 'PRIX 2026' },
  { key: 'bache', label: 'Bâche', family: 'Grand format', grammages: ['440g'], source: 'Stock GF' },
  { key: 'bache-mesh', label: 'Bâche microperforée / mesh', family: 'Grand format', grammages: ['270g'], source: 'Stock GF' },
  { key: 'vinyle-blanc-brillant', label: 'Vinyle blanc brillant', family: 'Grand format', grammages: ['140g'], source: 'Stock GF' },
  { key: 'vinyle-blanc-mat', label: 'Vinyle blanc mat', family: 'Grand format', grammages: ['140g'], source: 'Stock GF' },
  { key: 'vinyle-transparent', label: 'Vinyle transparent', family: 'Grand format', grammages: ['100g'], source: 'Stock GF' },
  { key: 'film-reflechissant', label: 'Film réfléchissant', family: 'Grand format', grammages: ['140g'], source: 'Stock GF' },
  { key: 'oneway-vision', label: 'One-Way Vision', family: 'Grand format', grammages: ['140g'], source: 'Stock GF' },
  { key: 'dos-bleu', label: 'Dos bleu', family: 'Grand format', grammages: ['120g'], source: 'Stock GF' },
  { key: 'papier-photo', label: 'Papier photo', family: 'Grand format', grammages: ['140g'], source: 'Stock GF' },
  { key: 'pp-film', label: 'PP film indéchirable', family: 'Grand format', grammages: ['140g'], source: 'Stock GF' },
  { key: 'frosted', label: 'Frosted film sablé', family: 'Grand format', grammages: ['140g'], source: 'Stock GF' },
  { key: 'pvc', label: 'PVC', family: 'Grand format', grammages: ['3mm', '5mm'], source: 'Stock GF' },
  { key: 'plexi', label: 'Plexi', family: 'Grand format', grammages: ['3mm', '5mm'], source: 'Stock GF' },
  { key: 'acrylic', label: 'Acrylic', family: 'Grand format', grammages: ['3mm'], source: 'Stock GF' },
  { key: 'bristol', label: 'Bristol', family: 'Petit format', grammages: ['250g', '300g'], source: 'Legacy seed' },
  { key: 'recycle', label: 'Papier recyclé', family: 'Petit format', grammages: ['115g', '135g'], source: 'Legacy seed' },
  /* ─── Cartes & couvertures premium ─── */
  { key: 'toile-fin', label: 'Toile fin', family: 'Carte', grammages: ['270g'], source: 'CV_RECTO / ISF' },
  { key: 'invitation-luxe', label: 'Invitation luxe', family: 'Carte', grammages: ['180g', '200g', '250g', '300g', '325g'], source: 'CV_RECTO / ISF' },
  { key: 'texture-motif', label: 'Papier texturé avec motif', family: 'Carte', grammages: ['250g', '300g', '350g'], source: 'CV_RECTO / ISF' },
  { key: 'pellicule-mat', label: 'Papier pelliculé mat', family: 'Carte', grammages: ['320g', '370g'], source: 'CV_RECTO' },
  { key: 'pellicule-brillant', label: 'Papier pelliculé brillant', family: 'Carte', grammages: ['320g', '370g'], source: 'CV_RECTO' },
  { key: 'kraft-carte', label: 'Kraft', family: 'Carte', grammages: ['230g', '250g', '300g'], source: 'CV_RECTO / ISF' },
  { key: 'pvc-opaque-carte', label: 'PVC opaque 1 mm', family: 'Carte', grammages: ['1 mm'], source: 'IMPRESSION_PRIX' },
  { key: 'pvc-transl-carte', label: 'PVC translucide 1 mm', family: 'Carte', grammages: ['1 mm'], source: 'IMPRESSION_PRIX' },
  { key: 'carton-rigide', label: 'Carton rigide', family: 'Carte', grammages: ['350g', '600g', '750g'], source: 'Couverture livre' },
];
