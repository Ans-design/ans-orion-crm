// Conception graphique — extrait de base ok.html (CGX)

export const CG_LEVELS: Record<string, number> = {
  Essentiel: 1,
  Standard: 1.35,
  Premium: 1.8,
};

export const CG_DELAYS = ['Standard', 'Express'] as const;
export const CG_DELAY_SURCHARGE = 25000;

export const CG_EXTRA_CATALOG = [
  { key: 'print', label: '+ Impression', price: 12000 },
  { key: 'finition', label: '+ Finition', price: 18000 },
  { key: 'brand_pack', label: '+ Multi-formats', price: 20000 },
  { key: 'bat', label: 'BAT Premium', price: 15000 },
  { key: 'copy', label: 'Aide au contenu', price: 25000 },
  { key: 'source', label: 'Fichiers sources', price: 18000 },
];

export type CGServiceBase = {
  key: string;
  label: string;
  tags: string[];
  base: number;
  fields?: string[];
  suggestion?: string;
  desc?: string;
  badge?: string;
  deliverables?: string[];
  bridges?: string[];
};

export interface CGService extends CGServiceBase {
  catKey: string;
  catLabel: string;
}

export const CG_CATEGORY_COLORS: Record<string, string> = {
  identite: '#FF174D',
  admin: '#FF174D',
  marketing: '#FF174D',
  edition: '#C91443',
  signaletique: '#FF3366',
  textile: '#FF174D',
  digital: '#FF174D',
  avance: '#C91443',
};

export const CG_CATEGORIES: Array<{
  key: string;
  label: string;
  icon: string;
  scope: string;
  services: CGServiceBase[];
}> = [
  {
    key: 'identite', label: 'Identité & Branding', icon: '◈', scope: 'all',
    services: [
      { key: 'logo', label: 'Logo', tags: ['branding', 'print', 'digital'], base: 120000, fields: ['brief'], suggestion: 'Suggérer charte graphique + carte de visite' },
      { key: 'refonte_logo', label: 'Refonte logo', tags: ['branding', 'digital'], base: 150000, fields: ['brief'], suggestion: 'Suggérer harmonisation des supports existants' },
      { key: 'charte', label: 'Charte graphique', tags: ['branding', 'print', 'digital'], base: 220000, fields: ['brief'], suggestion: 'Suggérer logo + templates réseaux sociaux' },
      { key: 'branding', label: 'Branding complet', tags: ['branding', 'print', 'digital'], base: 450000, fields: ['brief'], suggestion: 'Suggérer papeterie + signalétique + digital' },
    ],
  },
  {
    key: 'admin', label: 'Supports administratifs', icon: '▤', scope: 'print',
    services: [
      { key: 'carte_visite', label: 'Carte de visite', tags: ['print'], base: 35000, fields: ['format'], suggestion: 'Suggérer impression + pelliculage', desc: 'Carte pro, nette et imprimable', badge: 'Essentiel', deliverables: ['Maquette recto/verso', 'PDF HD'], bridges: ['Impression cartes'] },
      { key: 'carte_fidelite', label: 'Carte fidélité', tags: ['print'], base: 32000, fields: ['format'], suggestion: 'Suggérer pelliculage', desc: 'Carte fidélité ou membre', deliverables: ['Maquette', 'PDF print'] },
      { key: 'papier_tete', label: 'Papier en-tête', tags: ['print'], base: 30000, fields: ['format'], suggestion: 'Suggérer suite bureautique complète', desc: 'Papier à en-tête brandé', deliverables: ['Modèle A4', 'PDF HD'] },
      { key: 'enveloppe', label: 'Enveloppe', tags: ['print'], base: 28000, fields: ['format'], suggestion: 'Suggérer papier en-tête assorti', desc: 'Enveloppe aux couleurs de la marque', deliverables: ['Maquette', 'PDF print'] },
      { key: 'facture_bc', label: 'Facture / bon de commande', tags: ['print'], base: 25000, fields: ['format'], suggestion: 'Suggérer pack administratif', desc: 'Documents commerciaux brandés', deliverables: ['Modèle', 'PDF HD'] },
      { key: 'signature_email', label: 'Signature mail', tags: ['digital'], base: 22000, fields: ['format'], suggestion: 'Suggérer bannière mail + template newsletter', desc: 'Signature email professionnelle', deliverables: ['HTML signature', 'PNG'] },
    ],
  },
  {
    key: 'marketing', label: 'Supports marketing', icon: '◉', scope: 'print',
    services: [
      { key: 'flyer', label: 'Flyer', tags: ['print'], base: 40000, fields: ['format', 'orientation'], suggestion: 'Suggérer impression + finition', desc: 'Support promo impactant, prêt à imprimer', badge: 'Populaire', deliverables: ['Maquette HD', 'PDF print'], bridges: ['Impression flyer'] },
      { key: 'affiche', label: 'Affiche', tags: ['print'], base: 50000, fields: ['format', 'orientation'], suggestion: 'Suggérer grand format + vernis', desc: 'Affiche événementielle ou commerciale', deliverables: ['Visuel HD', 'Version A3/A2/A1'], bridges: ['Grand format'] },
      { key: 'depliant', label: 'Dépliant', tags: ['print'], base: 65000, fields: ['format', 'volets'], suggestion: 'Suggérer pliage + pelliculage', desc: 'Dépliant 2 ou 3 volets', deliverables: ['Maquette pliée', 'PDF HD'], bridges: ['Façonnage pliage'] },
      { key: 'brochure', label: 'Brochure', tags: ['print'], base: 90000, fields: ['pages'], suggestion: 'Suggérer reliure + couverture premium', desc: 'Brochure commerciale multipages', deliverables: ['Intérieur + couverture', 'PDF HD'], bridges: ['Reliure'] },
      { key: 'plaquette', label: 'Plaquette', tags: ['print'], base: 75000, fields: ['pages'], suggestion: 'Suggérer finition pelliculage', desc: 'Plaquette institutionnelle', deliverables: ['Mise en page', 'Exports print'] },
    ],
  },
  {
    key: 'edition', label: 'Édition & documents', icon: '◧', scope: 'print',
    services: [
      { key: 'catalogue', label: 'Catalogue', tags: ['print'], base: 120000, fields: ['pages'], suggestion: 'Suggérer impression + reliure', desc: 'Catalogue produits premium', badge: 'Premium', deliverables: ['Couverture + intérieur', 'PDF HD'], bridges: ['Reliure', 'Impression'] },
      { key: 'livre', label: 'Livre', tags: ['print'], base: 180000, fields: ['pages'], suggestion: 'Suggérer couverture + finition', desc: 'Livret / livre éditorial', deliverables: ['Pagination', 'Couverture', 'PDF HD'] },
      { key: 'magazine', label: 'Magazine', tags: ['print'], base: 145000, fields: ['pages'], suggestion: 'Suggérer pagination + BAT', desc: 'Magazine ou périodique', badge: 'Édition', deliverables: ['Mise en page', 'Couverture', 'BAT'], bridges: ['Impression magazine'] },
      { key: 'rapport', label: 'Rapport annuel', tags: ['print'], base: 85000, fields: ['pages'], suggestion: 'Suggérer mise en page + reliure', desc: 'Rapport institutionnel', deliverables: ['Document paginé', 'PDF HD'] },
      { key: 'livret', label: 'Livret / booklet', tags: ['print'], base: 76000, fields: ['pages'], suggestion: 'Suggérer reliure agrafe', desc: 'Livret 8–32 pages', deliverables: ['Intérieur + couverture'] },
    ],
  },
  {
    key: 'signaletique', label: 'Signalétique', icon: '◰', scope: 'print',
    services: [
      { key: 'bache', label: 'Bâche', tags: ['print'], base: 60000, fields: ['dimensions'], suggestion: 'Suggérer impression + œillets' },
      { key: 'rollup', label: 'Roll-up', tags: ['print'], base: 70000, fields: ['dimensions'], suggestion: 'Suggérer impression + structure' },
      { key: 'kakemono', label: 'Kakemono', tags: ['print'], base: 75000, fields: ['dimensions'], suggestion: 'Suggérer impression + structure' },
    ],
  },
  {
    key: 'textile', label: 'Textile & goodies', icon: '◫', scope: 'all',
    services: [
      { key: 'tshirt', label: 'T-shirt', tags: ['print'], base: 45000, fields: ['dimensions'], suggestion: 'Suggérer impression textile + mockup' },
      { key: 'casquette', label: 'Casquette', tags: ['print'], base: 35000, fields: ['dimensions'], suggestion: 'Suggérer broderie + mockup' },
      { key: 'goodies', label: 'Objets pub', tags: ['print'], base: 40000, fields: ['dimensions'], suggestion: 'Suggérer pack goodies multi-supports' },
    ],
  },
  {
    key: 'digital', label: 'Digital', icon: '◍', scope: 'digital',
    services: [
      { key: 'post_rs', label: 'Réseaux sociaux', tags: ['digital'], base: 25000, fields: ['format'], suggestion: 'Suggérer déclinaisons multi-formats' },
      { key: 'banniere', label: 'Bannière web', tags: ['digital'], base: 30000, fields: ['format'], suggestion: 'Suggérer pack desktop + mobile' },
      { key: 'story', label: 'Story', tags: ['digital'], base: 20000, fields: ['format'], suggestion: 'Suggérer déclinaisons Reels + TikTok' },
    ],
  },
  {
    key: 'avance', label: 'Créations avancées', icon: '◎', scope: 'digital',
    services: [
      { key: 'motion', label: 'Motion design', tags: ['digital'], base: 220000, fields: ['duration'], suggestion: 'Suggérer storyboard + déclinaisons social media' },
      { key: 'video', label: 'Vidéo', tags: ['digital'], base: 280000, fields: ['duration'], suggestion: 'Suggérer sous-titres + format vertical' },
      { key: 'illustration', label: 'Animation', tags: ['digital'], base: 150000, fields: ['brief'], suggestion: 'Suggérer adaptation print + digital' },
    ],
  },
];

export function flatCGServices(): CGService[] {
  return CG_CATEGORIES.flatMap((c) =>
    c.services.map((s) => ({ ...s, catKey: c.key, catLabel: c.label }))
  );
}

export function getCGService(key: string): CGService | undefined {
  return flatCGServices().find((s) => s.key === key);
}

export const CG_FIELD_META: Record<string, { label: string; placeholder: string }> = {
  format: { label: 'Format / Support', placeholder: 'Ex : A5, carré, story, bannière 1200×628' },
  orientation: { label: 'Orientation', placeholder: 'Portrait, paysage…' },
  volets: { label: 'Nb de volets', placeholder: 'Ex : 2, 3 volets' },
  pages: { label: 'Nb de pages', placeholder: 'Ex : 8, 12, 24 pages' },
  dimensions: { label: 'Dimensions', placeholder: 'Ex : 80×200 cm, 3×2 m' },
  duration: { label: 'Durée', placeholder: 'Ex : 15 sec, 30 sec' },
  brief: { label: 'Brief créatif', placeholder: 'Décrivez le besoin, le style, la cible…' },
};

export interface ConceptionConfig {
  serviceKey: string;
  level: keyof typeof CG_LEVELS;
  proposals: number;
  revisions: number;
  delay: typeof CG_DELAYS[number];
  extras: string[];
  fieldValues: Record<string, string>;
  remarques?: string;
  prixForce?: number;
}

export function calculateConceptionPrice(cfg: ConceptionConfig): number {
  const svc = getCGService(cfg.serviceKey);
  if (!svc) return 0;
  if (cfg.prixForce && cfg.prixForce > 0) return cfg.prixForce;

  let total = Math.round(svc.base * (CG_LEVELS[cfg.level] || 1));
  total += Math.max(0, cfg.proposals - 2) * 15000;
  total += Math.max(0, cfg.revisions - 2) * 10000;
  if (cfg.delay === 'Express') total += CG_DELAY_SURCHARGE;

  const pages = parseInt(cfg.fieldValues.pages || '0', 10);
  if (pages > 8 && svc.fields?.includes('pages')) {
    total += (pages - 8) * (cfg.level === 'Premium' ? 8000 : cfg.level === 'Standard' ? 5500 : 3500);
  }

  cfg.extras.forEach((k) => {
    const x = CG_EXTRA_CATALOG.find((e) => e.key === k);
    if (x) total += x.price;
  });
  return total;
}

export function searchCGServices(query: string, filter: 'all' | 'print' | 'digital' = 'all'): CGService[] {
  const q = query.trim().toLowerCase();
  return flatCGServices().filter((s) => {
    if (filter === 'print' && !s.tags.includes('print') && !s.tags.includes('branding')) return false;
    if (filter === 'digital' && !s.tags.includes('digital') && !s.tags.includes('branding')) return false;
    if (!q) return true;
    return s.label.toLowerCase().includes(q) || s.catLabel.toLowerCase().includes(q) || (s.desc || '').toLowerCase().includes(q);
  });
}
