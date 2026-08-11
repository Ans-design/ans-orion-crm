import type { OfficialMaterialCompat } from './material-compat-official';

/** Matières/grammages complémentaires — audit POS 2026, hors OFFICIAL_MATERIAL_COMPAT. */
export const SUPPLEMENTARY_MATERIAL_COMPAT: OfficialMaterialCompat[] = [
  /* Papier autocopiant / NCR */
  { key: 'autocopiant-cb', label: 'Autocopiant CB blanc', family: 'Petit format', grammages: ['57g'], source: 'POS doc-carnet/doc-recu/doc-facturier' },
  { key: 'autocopiant-cfb', label: 'Autocopiant CFB couleur', family: 'Petit format', grammages: ['57g'], source: 'POS autocopiant' },
  { key: 'autocopiant-cf', label: 'Autocopiant CF couleur', family: 'Petit format', grammages: ['57g'], source: 'POS autocopiant' },
  { key: 'ncr-2-plis', label: 'NCR 2 plis', family: 'Petit format', grammages: ['57g'], source: 'Duplicopie POS' },
  { key: 'ncr-3-plis', label: 'NCR 3 plis', family: 'Petit format', grammages: ['57g'], source: 'Triplicopie POS' },
  { key: 'ncr-4-plis', label: 'NCR 4 plis', family: 'Petit format', grammages: ['57g'], source: 'Quadruplicopie POS' },
  /* Grand (indechirable) */
  { key: 'indechirable', label: 'Papier indéchirable', family: 'Petit format', grammages: ['120g', '150g', '200g'], source: 'Audit ultraprompt' },
  /* Grand format compléments */
  { key: 'bache', label: 'Bâche', family: 'Grand format', grammages: ['340g', '440g', '510g'], source: 'Stock GF audit' },
  { key: 'bache-dos-noir', label: 'Bâche dos noir', family: 'Grand format', grammages: ['440g'], source: 'Stock GF' },
  { key: 'vinyle-monomere', label: 'Vinyle monomère', family: 'Grand format', grammages: ['140g'], source: 'Audit ultraprompt' },
  { key: 'vinyle-polymere', label: 'Vinyle polymère', family: 'Grand format', grammages: ['140g'], source: 'Audit ultraprompt' },
  { key: 'canvas', label: 'Canvas / toile', family: 'Grand format', grammages: ['280g'], source: 'Audit ultraprompt' },
  { key: 'backlit', label: 'Backlit', family: 'Grand format', grammages: ['200g'], source: 'Audit ultraprompt' },
  /* Supports rigides */
  { key: 'pvc-rigide', label: 'PVC rigide', family: 'Grand format', grammages: ['1mm', '2mm', '3mm', '5mm'], source: 'Stock GF' },
  { key: 'forex', label: 'Forex', family: 'Grand format', grammages: ['3mm', '5mm'], source: 'Audit ultraprompt' },
  { key: 'dibond', label: 'Dibond', family: 'Grand format', grammages: ['3mm'], source: 'Audit ultraprompt' },
  { key: 'akilux', label: 'Akilux', family: 'Grand format', grammages: ['3mm'], source: 'Audit ultraprompt' },
  /* Kraft petit format */
  { key: 'kraft', label: 'Kraft', family: 'Petit format', grammages: ['120g', '170g', '200g', '230g', '250g', '300g'], source: 'Audit ultraprompt' },
  /* Bristol étendu */
  { key: 'bristol', label: 'Bristol', family: 'Petit format', grammages: ['180g', '200g', '220g', '250g', '300g', '350g'], source: 'Audit ultraprompt' },
  /* Couché mat */
  { key: 'couche-mat', label: 'Couché mat', family: 'Petit format', grammages: ['120g', '130g', '150g', '170g', '200g', '250g', '300g', '350g'], source: 'Audit ultraprompt' },
  /* Offset étendu */
  { key: 'offset', label: 'Offset', family: 'Petit format', grammages: ['70g', '80g', '90g', '100g', '120g', '160g'], source: 'Audit ultraprompt' },
];
