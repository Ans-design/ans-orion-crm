export type ColorSwatch = {
  id: string;
  label: string;
  hex: string;
  badge?: string;
  /** Rendu POS : solide (défaut), translucide (damier), métallique, kraft */
  look?: 'solid' | 'translucent' | 'metallic' | 'kraft';
};

function pick(ids: string[], look?: ColorSwatch['look']): ColorSwatch[] {
  return ids
    .map((id) => EXTENDED_COLOR_PALETTE.find((c) => c.id === id))
    .filter((c): c is ColorSwatch => Boolean(c))
    .map((c) => (look ? { ...c, look } : { ...c }));
}

/** Palette étendue (~100 teintes) — textile, doypack, packaging */
export const EXTENDED_COLOR_PALETTE: ColorSwatch[] = [
  { id: 'blanc', label: 'Blanc', hex: '#FFFFFF' },
  { id: 'blanc_casse', label: 'Blanc cassé', hex: '#FAF0E6' },
  { id: 'ecru', label: 'Écru', hex: '#F5F0E1' },
  { id: 'ivoire', label: 'Ivoire', hex: '#FFFFF0' },
  { id: 'creme', label: 'Crème', hex: '#FFFDD0' },
  { id: 'beige_clair', label: 'Beige clair', hex: '#F5F5DC' },
  { id: 'sable_clair', label: 'Sable clair', hex: '#E8DCC8' },
  { id: 'noir', label: 'Noir', hex: '#1A1A1A' },
  { id: 'noir_profond', label: 'Noir profond', hex: '#0A0A0A' },
  { id: 'gris_anthracite', label: 'Gris anthracite', hex: '#3C3C3C' },
  { id: 'gris_fonce', label: 'Gris foncé', hex: '#555555' },
  { id: 'gris', label: 'Gris', hex: '#808080' },
  { id: 'gris_moyen', label: 'Gris moyen', hex: '#9CA3AF' },
  { id: 'gris_clair', label: 'Gris clair', hex: '#C0C0C0' },
  { id: 'gris_perle', label: 'Gris perle', hex: '#D9D9D9' },
  { id: 'gris_chine', label: 'Gris chiné', hex: '#B0B0B0' },
  { id: 'rouge', label: 'Rouge', hex: '#D32F2F' },
  { id: 'rouge_vif', label: 'Rouge vif', hex: '#FF0000' },
  { id: 'rouge_fonce', label: 'Rouge foncé', hex: '#8B0000' },
  { id: 'bordeaux', label: 'Bordeaux', hex: '#800020' },
  { id: 'grenat', label: 'Grenat', hex: '#6C2030' },
  { id: 'corail', label: 'Corail', hex: '#FF7F50' },
  { id: 'framboise', label: 'Framboise', hex: '#C72C48' },
  { id: 'rose_saumon', label: 'Saumon', hex: '#FA8072' },
  { id: 'rose', label: 'Rose', hex: '#E91E63' },
  { id: 'rose_fushia', label: 'Fuchsia', hex: '#FF00FF' },
  { id: 'rose_pastel', label: 'Rose pastel', hex: '#FFB6C1' },
  { id: 'rose_poudre', label: 'Rose poudré', hex: '#E8B4B8' },
  { id: 'orange', label: 'Orange', hex: '#FB8C00' },
  { id: 'orange_vif', label: 'Orange vif', hex: '#FF6600' },
  { id: 'peche', label: 'Pêche', hex: '#FFDAB9' },
  { id: 'abricot', label: 'Abricot', hex: '#FBCEB1' },
  { id: 'jaune', label: 'Jaune', hex: '#FDD835' },
  { id: 'jaune_vif', label: 'Jaune vif', hex: '#FFD700' },
  { id: 'jaune_pastel', label: 'Jaune pastel', hex: '#FFFACD' },
  { id: 'moutarde', label: 'Moutarde', hex: '#C7A317' },
  { id: 'citron', label: 'Citron', hex: '#FFF44F' },
  { id: 'vert', label: 'Vert', hex: '#388E3C' },
  { id: 'vert_fonce', label: 'Vert foncé', hex: '#1B5E20' },
  { id: 'vert_sapin', label: 'Vert sapin', hex: '#0B3D0B' },
  { id: 'vert_olive', label: 'Vert olive', hex: '#808000' },
  { id: 'vert_kaki', label: 'Kaki', hex: '#6B7B3A' },
  { id: 'vert_menthe', label: 'Vert menthe', hex: '#98FB98' },
  { id: 'vert_pomme', label: 'Vert pomme', hex: '#8DB600' },
  { id: 'vert_emeraude', label: 'Émeraude', hex: '#50C878' },
  { id: 'vert_lime', label: 'Vert lime', hex: '#32CD32' },
  { id: 'teal', label: 'Teal', hex: '#008080' },
  { id: 'turquoise', label: 'Turquoise', hex: '#40E0D0' },
  { id: 'bleu', label: 'Bleu', hex: '#1E88E5' },
  { id: 'bleu_marine', label: 'Bleu marine', hex: '#1B3A5C' },
  { id: 'bleu_roi', label: 'Bleu roi', hex: '#002395' },
  { id: 'bleu_ciel', label: 'Bleu ciel', hex: '#87CEEB' },
  { id: 'bleu_petrole', label: 'Bleu pétrole', hex: '#1B4D5C' },
  { id: 'bleu_canard', label: 'Bleu canard', hex: '#048B9A' },
  { id: 'bleu_electrique', label: 'Bleu électrique', hex: '#0066FF' },
  { id: 'bleu_pastel', label: 'Bleu pastel', hex: '#AEC6CF' },
  { id: 'bleu_nuit', label: 'Bleu nuit', hex: '#191970' },
  { id: 'indigo', label: 'Indigo', hex: '#4B0082' },
  { id: 'violet', label: 'Violet', hex: '#7B1FA2' },
  { id: 'violet_fonce', label: 'Violet foncé', hex: '#4A148C' },
  { id: 'lilas', label: 'Lilas', hex: '#C8A2C8' },
  { id: 'mauve', label: 'Mauve', hex: '#E0B0FF' },
  { id: 'prune', label: 'Prune', hex: '#8E4585' },
  { id: 'lavande', label: 'Lavande', hex: '#E6E6FA' },
  { id: 'beige', label: 'Beige', hex: '#D7CCC8' },
  { id: 'sable', label: 'Sable', hex: '#C2B280' },
  { id: 'camel', label: 'Camel', hex: '#C19A6B' },
  { id: 'marron', label: 'Marron', hex: '#5D4037' },
  { id: 'chocolat', label: 'Chocolat', hex: '#3E2723' },
  { id: 'taupe', label: 'Taupe', hex: '#483C32' },
  { id: 'cognac', label: 'Cognac', hex: '#9A463D' },
  { id: 'terracotta', label: 'Terracotta', hex: '#E2725B' },
  { id: 'kraft_naturel', label: 'Kraft naturel', hex: '#C4A882' },
  { id: 'kraft_brun', label: 'Kraft brun', hex: '#8B6914' },
  { id: 'kraft_blanc', label: 'Kraft blanc', hex: '#FAF5EF' },
  { id: 'argent', label: 'Argent', hex: '#C0C0C0' },
  { id: 'or', label: 'Or', hex: '#D4AF37' },
  { id: 'rose_gold', label: 'Rose gold', hex: '#E8B4B8' },
  { id: 'cuivre', label: 'Cuivre', hex: '#B87333' },
  { id: 'bronze', label: 'Bronze', hex: '#CD7F32' },
  { id: 'transparent', label: 'Transparent', hex: '#F0F9FF' },
  { id: 'custom', label: 'Personnalisée', hex: '#CCCCCC', badge: 'prix forcé' },
];

/** Couleurs doypack / sachet — détail devis sans impact prix (fallback) */
export const DOYPACK_COLOR_PALETTE = EXTENDED_COLOR_PALETTE.filter((c) => c.id !== 'custom');

/**
 * Palettes doypack par matière — options courantes catalogue flexible packaging
 * (kraft blanc/brun, alu mat/brillant & couleurs mat, PET opaque/translucide, soft-touch).
 */
export const DOYPACK_PALETTES_BY_MATIERE: Record<string, ColorSwatch[]> = {
  Kraft: [
    { id: 'kraft_naturel', label: 'Kraft naturel', hex: '#C4A882', look: 'kraft' },
    { id: 'kraft_brun', label: 'Kraft brun', hex: '#8B6914', look: 'kraft' },
    { id: 'kraft_brun_fonce', label: 'Kraft brun foncé', hex: '#6B4F2A', look: 'kraft' },
    { id: 'kraft_blanc', label: 'Kraft blanc', hex: '#FAF5EF', look: 'kraft' },
    { id: 'kraft_blanc_mat', label: 'Kraft blanc mat', hex: '#F3EDE4', look: 'kraft', badge: 'mat' },
    { id: 'kraft_recycle', label: 'Kraft recyclé', hex: '#B8A078', look: 'kraft', badge: 'éco' },
    { id: 'kraft_ecru', label: 'Écru', hex: '#F5F0E1', look: 'kraft' },
    { id: 'kraft_beige', label: 'Beige', hex: '#D7CCC8', look: 'kraft' },
    { id: 'kraft_sable', label: 'Sable', hex: '#C2B280', look: 'kraft' },
    { id: 'kraft_gris', label: 'Kraft gris', hex: '#A39888', look: 'kraft' },
    { id: 'kraft_noir', label: 'Kraft noir', hex: '#2C241B', look: 'kraft' },
    { id: 'kraft_chocolat', label: 'Chocolat', hex: '#3E2723', look: 'kraft' },
  ],
  Alu: [
    { id: 'alu_argent_mat', label: 'Argent mat', hex: '#C0C0C0', look: 'metallic', badge: 'mat' },
    { id: 'alu_argent_brillant', label: 'Argent brillant', hex: '#E8E8E8', look: 'metallic', badge: 'brillant' },
    { id: 'alu_or_mat', label: 'Or mat', hex: '#D4AF37', look: 'metallic', badge: 'mat' },
    { id: 'alu_or_brillant', label: 'Or brillant', hex: '#F5D76E', look: 'metallic', badge: 'brillant' },
    { id: 'alu_rose_gold', label: 'Rose gold', hex: '#E8B4B8', look: 'metallic' },
    { id: 'alu_cuivre', label: 'Cuivre', hex: '#B87333', look: 'metallic' },
    { id: 'alu_bronze', label: 'Bronze', hex: '#CD7F32', look: 'metallic' },
    { id: 'alu_noir_mat', label: 'Noir mat', hex: '#1A1A1A', look: 'metallic', badge: 'mat' },
    { id: 'alu_noir_soft', label: 'Noir soft-touch', hex: '#111111', look: 'metallic', badge: 'soft-touch' },
    { id: 'alu_blanc_mat', label: 'Blanc mat', hex: '#F8F8F8', look: 'metallic', badge: 'mat' },
    { id: 'alu_blanc_brillant', label: 'Blanc brillant', hex: '#FFFFFF', look: 'metallic', badge: 'brillant' },
    { id: 'alu_rouge_mat', label: 'Rouge mat', hex: '#B71C1C', look: 'metallic', badge: 'mat' },
    { id: 'alu_bleu_mat', label: 'Bleu mat', hex: '#1565C0', look: 'metallic', badge: 'mat' },
    { id: 'alu_vert_mat', label: 'Vert mat', hex: '#2E7D32', look: 'metallic', badge: 'mat' },
    { id: 'alu_violet_mat', label: 'Violet mat', hex: '#6A1B9A', look: 'metallic', badge: 'mat' },
    { id: 'alu_gris_anthracite', label: 'Gris anthracite', hex: '#3C3C3C', look: 'metallic' },
  ],
  Plastique: [
    // Opaque PET / PE
    { id: 'pet_blanc_mat', label: 'Blanc mat', hex: '#FFFFFF', look: 'solid', badge: 'mat' },
    { id: 'pet_blanc_brillant', label: 'Blanc brillant', hex: '#FAFAFA', look: 'solid', badge: 'brillant' },
    { id: 'pet_noir_mat', label: 'Noir mat', hex: '#1A1A1A', look: 'solid', badge: 'mat' },
    { id: 'pet_noir_brillant', label: 'Noir brillant', hex: '#0A0A0A', look: 'solid', badge: 'brillant' },
    { id: 'pet_noir_soft', label: 'Noir soft-touch', hex: '#141414', look: 'solid', badge: 'soft-touch' },
    ...pick(['rouge', 'bleu', 'vert', 'jaune', 'orange', 'rose', 'violet', 'gris', 'gris_clair'], 'solid'),
    { id: 'pet_bleu_marine', label: 'Bleu marine', hex: '#1B3A5C', look: 'solid' },
    { id: 'pet_vert_sapin', label: 'Vert sapin', hex: '#0B3D0B', look: 'solid' },
    // Transparent / translucide (fenêtre ou corps)
    {
      id: 'pet_transparent',
      label: 'Transparent',
      hex: '#E0F2FE',
      look: 'translucent',
      badge: 'translucide',
    },
    {
      id: 'pet_cristal',
      label: 'Cristal',
      hex: '#F0FDFA',
      look: 'translucent',
      badge: 'translucide',
    },
    {
      id: 'pet_blanc_translucide',
      label: 'Blanc translucide',
      hex: '#F8FAFC',
      look: 'translucent',
      badge: 'translucide',
    },
    {
      id: 'pet_fume',
      label: 'Fumé translucide',
      hex: '#94A3B8',
      look: 'translucent',
      badge: 'translucide',
    },
    {
      id: 'pet_ambre',
      label: 'Ambre translucide',
      hex: '#F59E0B',
      look: 'translucent',
      badge: 'translucide',
    },
    {
      id: 'pet_bleu_translucide',
      label: 'Bleu translucide',
      hex: '#38BDF8',
      look: 'translucent',
      badge: 'translucide',
    },
    {
      id: 'pet_vert_translucide',
      label: 'Vert translucide',
      hex: '#34D399',
      look: 'translucent',
      badge: 'translucide',
    },
    {
      id: 'pet_rose_translucide',
      label: 'Rose translucide',
      hex: '#F9A8D4',
      look: 'translucent',
      badge: 'translucide',
    },
    {
      id: 'pet_rouge_translucide',
      label: 'Rouge translucide',
      hex: '#F87171',
      look: 'translucent',
      badge: 'translucide',
    },
  ],
};

/** Support packaging carton — neutres + kraft */
export const PACKAGING_SUPPORT_PALETTE: ColorSwatch[] = [
  ...EXTENDED_COLOR_PALETTE.filter((c) =>
    ['blanc', 'ecru', 'creme', 'noir', 'gris', 'gris_clair', 'kraft_naturel', 'kraft_brun', 'kraft_blanc', 'beige', 'sable'].includes(c.id),
  ),
  { id: 'custom', label: 'Couleur personnalisée', hex: '#E5E7EB', badge: 'Prix forcé' },
];
