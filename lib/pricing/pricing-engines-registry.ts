/**
 * Registre moteurs tarifaires (galerie) — helpers couverture sans UI.
 * Partagé FormulesMoteursWorkspace + PricingEnginesGallery.
 */

import type { PricingFamilyCoverage } from '@/lib/pricing/pricing-types';

export type PricingEngineDef = {
  id: string;
  label: string;
  href: string;
  desc: string;
  unit: string;
  familyAliases: string[];
  rules: { label: string; detail: string }[];
  hidden?: boolean;
};

export const PRICING_GALLERY_ENGINES: PricingEngineDef[] = [
  {
    id: 'isf',
    label: 'Petit format / ISF',
    href: '/administration/catalogue-prix-stock?studio=calculs&tab=engines',
    desc: 'Alias — Impression sans finition masquée (moteur via formules)',
    unit: 'pièce',
    familyAliases: ['isf', 'petit format', 'impression', 'papeterie'],
    hidden: true,
    rules: [
      { label: 'Format supérieur', detail: 'A5 = A4 ÷ 2 · A6 = A4 ÷ 4 + 50 Ar découpe · A3 = A4 × 2' },
      { label: 'Découpe', detail: 'Format strictement inférieur à A5 → supplément découpe 50 Ar (A5 = A4/2 sans découpe)' },
      { label: 'Grammage', detail: '135–180G = +50 Ar · 300G et plus = +100 Ar' },
      { label: 'Arrondi', detail: 'Prix final arrondi au 50 Ar supérieur' },
    ],
  },
  {
    id: 'flyers',
    label: 'Flyers',
    href: '/administration/catalogue-prix-stock?studio=calculs&tab=flyers',
    desc: 'Tirages commerciaux',
    unit: 'pièce',
    familyAliases: ['flyer'],
    rules: [
      { label: 'Paliers de quantité', detail: 'Dégressif selon tirage — grilles par segment client' },
      { label: 'Recto / verso', detail: 'Tarification distincte recto seul et recto-verso' },
      { label: 'Urgence', detail: '+20 % si règle urgence active' },
    ],
  },
  {
    id: 'carterie',
    label: 'Carterie',
    href: '/administration/catalogue-prix-stock?studio=prix&tab=carterie',
    desc: 'Cartes & imposition',
    unit: 'pièce',
    familyAliases: ['carterie', 'carte'],
    rules: [
      { label: 'Imposition', detail: 'Nombre de poses calculé selon format carte / feuille' },
      { label: 'Grammage fort', detail: '400–600G contrecollé = impression 300G + matière vierge' },
      { label: 'Marge minimum', detail: 'Marge finale < 25 % → validation Direction' },
    ],
  },
  {
    id: 'publications',
    label: 'Publications',
    href: '/administration/catalogue-prix-stock?studio=prix&tab=publications',
    desc: 'Brochures, livres et carnets',
    unit: 'pièce',
    familyAliases: ['publication', 'brochure', 'livre', 'carnet', 'calendrier', 'bloc'],
    rules: [
      { label: 'Pagination', detail: 'Coût par cahier / page intérieure + couverture' },
      { label: 'Reliure', detail: 'Couverture rigide → reliure agrafée masquée (dépendance)' },
      { label: 'Façonnage', detail: 'Pliage, assemblage et finition intégrés au calcul' },
    ],
  },
  {
    id: 'grand-format',
    label: 'Grand format',
    href: '/administration/catalogue-prix-stock?studio=prix&tab=grand-format',
    desc: 'Surface et laizes',
    unit: 'm²',
    familyAliases: ['grand format', 'grand-format', 'bâche', 'bache', 'vinyle', 'roll'],
    rules: [
      { label: 'Règle de laize', detail: 'Format personnalisé uniquement → laize + règle -30 cm ; ISO A0–A5 hors laize' },
      { label: 'Recto seul', detail: 'Autocollant, vinyle, PVC translucide, sublimation : recto uniquement' },
      { label: 'Perte matière', detail: 'Chutes calculées selon orientation et laize retenue' },
    ],
  },
  {
    id: 'avd',
    label: 'Vente directe',
    href: '/administration/catalogue-prix-stock?studio=prix&tab=avd',
    desc: 'Articles AVD et stock',
    unit: 'pièce',
    familyAliases: ['avd', 'vente directe', 'direct'],
    rules: [
      { label: 'Prix direct', detail: 'Prix de vente saisi — pas de formule de fabrication' },
      { label: 'Stock', detail: 'Stock disponible ≤ 0 → blocage ou substitution autorisée' },
      { label: 'Paliers & remises', detail: 'Remises par quantité avec marge minimale protégée' },
    ],
  },
  {
    id: 'finitions',
    label: 'Finitions',
    href: '/administration/catalogue-prix-stock?studio=prix&tab=finitions',
    desc: 'Façonnage tarifaire',
    unit: 'opération',
    familyAliases: ['finition', 'façonnage', 'faconnage'],
    rules: [
      { label: 'Options & finitions', detail: 'Pelliculage, rainage, découpe — suppléments par opération' },
      { label: 'Dépendances', detail: 'Compatibilités SI / ALORS contrôlées avant activation' },
    ],
  },
  {
    id: 'packaging',
    label: 'Packaging',
    href: '/administration/packaging',
    desc: 'Boîtes & soft',
    unit: 'pièce',
    familyAliases: ['packaging', 'boite', 'boîte'],
    rules: [
      { label: 'Module dédié', detail: 'Développés, rainage et découpe gérés dans le module Packaging' },
    ],
  },
];

export function coverageForEngine(
  engine: PricingEngineDef,
  families: PricingFamilyCoverage[],
) {
  const matches = families.filter((f) => {
    const name = f.family.toLowerCase();
    return engine.familyAliases.some((alias) => name.includes(alias));
  });
  return {
    profiles: matches.reduce((acc, f) => acc + f.profiles, 0),
    published: matches.reduce((acc, f) => acc + f.published, 0),
    draft: matches.reduce((acc, f) => acc + f.draft, 0),
    families: matches.map((f) => f.family),
  };
}

export function matchEngineByFamily(family: string | null | undefined): PricingEngineDef {
  const visible = PRICING_GALLERY_ENGINES.filter((e) => !e.hidden);
  if (!family) return visible[0] ?? PRICING_GALLERY_ENGINES[1]!;
  const name = family.toLowerCase();
  return (
    visible.find((e) => e.familyAliases.some((alias) => name.includes(alias)))
    ?? visible[0]
    ?? PRICING_GALLERY_ENGINES[1]!
  );
}
