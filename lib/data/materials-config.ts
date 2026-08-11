/** Matières & grammages POS — source admin (SystemConfig) avec fallback code */

export type MaterialEntry = {
  id: string;
  label: string;
  category: 'print' | 'carte' | 'autre';
  actif: boolean;
  grammages: string[];
};

export const DEFAULT_MATERIALS: MaterialEntry[] = [
  { id: 'pcb', label: 'PCB', category: 'print', actif: true, grammages: ['90g', '115g', '130g', '135g', '150g', '170g', '250g', '300g', '350g', '600g', '700g'] },
  { id: 'pcm', label: 'PCM', category: 'print', actif: true, grammages: ['90g', '115g', '130g', '135g', '150g', '170g', '250g', '300g', '350g', '600g', '700g'] },
  { id: 'offset', label: 'Offset', category: 'print', actif: true, grammages: ['80g', '90g', '100g', '120g'] },
  { id: 'glossy', label: 'Glossy', category: 'print', actif: true, grammages: ['120g', '140g', '160g', '180g', '250g', '300g'] },
  { id: 'pcb-pellicule', label: 'PCB pelliculé', category: 'print', actif: true, grammages: ['170g', '250g', '300g', '350g', '600g', '700g'] },
  { id: 'bristol', label: 'Bristol', category: 'print', actif: true, grammages: ['250g', '300g'] },
  { id: 'recycle', label: 'Papier recyclé', category: 'print', actif: true, grammages: ['115g', '135g'] },
  { id: 'carte-pcb', label: 'PCB', category: 'carte', actif: true, grammages: ['250g', '300g', '350g', '600g', '700g'] },
  { id: 'carte-pcm', label: 'PCM', category: 'carte', actif: true, grammages: ['250g', '300g', '350g', '600g', '700g'] },
  { id: 'carte-bristol', label: 'Bristol', category: 'carte', actif: true, grammages: ['250g', '300g', '350g'] },
  { id: 'carte-texture', label: 'Papier texturé avec motif', category: 'carte', actif: true, grammages: ['250g', '300g', '350g'] },
  { id: 'carte-toile', label: 'Toile fin', category: 'carte', actif: true, grammages: ['270g'] },
  { id: 'carte-invitation', label: 'Invitation luxe', category: 'carte', actif: true, grammages: ['180g', '200g', '250g', '300g', '325g'] },
  { id: 'carte-pellicule-mat', label: 'Papier pelliculé mat', category: 'carte', actif: true, grammages: ['320g', '370g'] },
  { id: 'carte-pellicule-brillant', label: 'Papier pelliculé brillant', category: 'carte', actif: true, grammages: ['320g', '370g'] },
  { id: 'carte-kraft', label: 'Kraft', category: 'carte', actif: true, grammages: ['230g', '250g', '300g'] },
  { id: 'carte-pvc-opaque', label: 'PVC opaque 1 mm', category: 'carte', actif: true, grammages: ['1 mm'] },
  { id: 'carte-pvc-transl', label: 'PVC translucide 1 mm', category: 'carte', actif: false, grammages: ['1 mm'] },
  { id: 'carton-rigide', label: 'Carton rigide', category: 'carte', actif: true, grammages: ['350g', '600g', '750g'] },
];

export const MATERIALS_CONFIG_KEY = 'pos_materials_config';

export {
  DEFAULT_PRINT_TECHNOLOGY_COMPAT_RULES,
  PRINT_TECHNOLOGY_COMPAT_CONFIG_KEY,
} from './print-technology-compat-config';

export function grammagesForMaterial(materials: MaterialEntry[], materialLabel: string): string[] {
  const m = materials.find((x) => x.actif && x.label.toLowerCase() === materialLabel.toLowerCase());
  return m?.grammages ?? [];
}

export function activePrintMaterials(materials: MaterialEntry[]): MaterialEntry[] {
  return materials.filter((m) => m.actif && m.category === 'print');
}
