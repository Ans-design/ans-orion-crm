// ═══════════════════════════════════════════════════════════════
// ANS ORION ERP — CATALOGUE COMPLET (Source: base ok.html)
// 16 Catégories POS · Tous les articles · Tous les prix
// ═══════════════════════════════════════════════════════════════

export interface PriceTier {
  min?: number;
  max: number | null;
  px: number;
}

export interface Article {
  id: number;
  name: string;
  cat: string;
  desc: string;
  prix: number;
  unit: string;
  tiers: PriceTier[];
  status: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  badge: string;
  items: string[];
}

// ═══════ 16 CATÉGORIES POS (alignées sur CATS_INFO source) ═══════
export const CATEGORIES: Category[] = [
  { id: 'packaging', label: 'Packaging & Boîtes', icon: '📦', color: '#F79009', badge: 'bdg-gold',
    items: ['Hangtag', 'Étiquette prédécoupée', 'Boîte', 'Doypack', 'Sac papier'] },
  { id: 'calendrier', label: 'Calendriers & Marque-page', icon: '📅', color: '#DC6803', badge: 'bdg-blue',
    items: ['Calendrier plateau', 'Marque-page', 'Chevalet'] },
  { id: 'notes', label: 'Bloc-note', icon: '📝', color: '#B54708', badge: 'bdg-gold',
    items: ['Bloc-note'] },
  { id: 'plv', label: 'PLV & Chevalets', icon: '🪧', color: '#175CD3', badge: 'bdg-purple',
    items: ['Chevalets', 'Roll-up', 'X-Banner', 'Stop & Totem', 'Porte-flyers', 'Porte-affiches', 'Présentoirs magasin', 'Oriflamme'] },
  { id: 'livres', label: 'Livres, Booklets, Mémoires', icon: '📚', color: '#155EEF', badge: 'bdg-blue',
    items: ['Livres & publications'] },
  { id: 'carterie', label: 'Carterie', icon: '💳', color: '#B54708', badge: 'bdg-gold',
    items: ['Carte de visite', 'Carte de fidélité', 'Jeux de cartes'] },
  { id: 'flyers', label: 'Flyers', icon: '📄', color: '#F04438', badge: 'bdg-blue',
    items: ['Tous formats A6 à A3, DL, B5, carré 90 mm'] },
  { id: 'finitions', label: 'Finitions & Reliures', icon: '✨', color: '#93370D', badge: 'bdg-cyan',
    items: ['Pelliculage', 'Vernis', 'Rainage', 'Plastification', 'Reliure', 'Découpe flex', 'Perforation', 'Couture Oriflammes', 'Dorure', 'Gaufrage', 'Coins arrondis', 'Pose autocollant', 'Personnalisation libre'] },
  { id: 'grand_format', label: 'Grand Format & PVC', icon: '🖼️', color: '#6938EF', badge: 'bdg-red',
    items: ['Vinyl Blanc/Mat/Transparent 140G', 'Dos bleu 120G', 'Bâche PVC & Mesh', 'Tissus drapeau', 'One-Way Vision 140G', 'Autocollant Réfléchissant 140G', 'Frosted Film Sablé 140G', 'Papier Photo GF 140G', 'PVC 3mm/5mm', 'Plexiglas 3mm/5mm', 'Acrylic 1/3/5mm', 'PP Film 140G', 'Flex Imprimable 50cm'] },
  { id: 'textile', label: 'Textiles', icon: '👕', color: '#027A48', badge: 'bdg-purple',
    items: ['T-Shirt', 'Polo', 'Sweat', 'Gilet', 'Casquette', 'Bob', 'Maillot', 'Totebag', 'Trousse'] },
  { id: 'goodies', label: 'Goodies', icon: '🎁', color: '#008F7A', badge: 'bdg-gold',
    items: ['Mug', 'Gourde', 'Assiette', 'Tapis souris', 'Briquet', 'USB', 'Parapluie', 'Stylo', 'Porte-clé', "Pin's/Badge"] },
  { id: 'evenementiel', label: 'Événementiel', icon: '🎉', color: '#C11574', badge: 'bdg-red',
    items: ['Enveloppe', 'Badge', 'Bracelets', 'Chèques cadeaux', 'Photocall', 'Fanion', 'Billet', 'Pochette à rabat'] },
  { id: 'photo', label: 'Photo', icon: '📸', color: '#026AA2', badge: 'bdg-blue',
    items: ['Tirage photo', 'Cadre photo', 'Photobook'] },
  { id: 'document', label: 'Documents Administratifs', icon: '📋', color: '#475467', badge: 'bdg-off',
    items: ['Carnet autocopiant / Facturier', 'Tampon'] },
  { id: 'conception', label: 'Conception graphique', icon: '🎨', color: '#DC6803', badge: 'bdg-magenta',
    items: ['Logo', 'Charte graphique', 'Carte de visite', 'Flyer', 'Brochure', 'Digital', 'Motion design'] },
  { id: 'impression', label: 'Impression sans finition', icon: '🖨️', color: '#E5484D', badge: 'bdg-blue',
    items: ['Impression sans finition'] },
];

export const CAT_LABELS: Record<string, string> = {};
CATEGORIES.forEach(c => { CAT_LABELS[c.id] = c.label; });

// ═══════ CATALOGUE POS — TOUS LES PRODUITS ═══════
export interface CatalogueItem {
  id: string;
  name: string;
  category: string;
  description: string;
  prixDepart: number | null;
  unit: string;
  icon: string;
  popular?: boolean;
  nouveau?: boolean;
  configType: string;
  minQty?: number;
}

export const CATALOGUE: CatalogueItem[] = [
  // ══════════════════════════════════════════════════════════════
  // 1. PACKAGING & BOÎTES
  // ══════════════════════════════════════════════════════════════
  {id:'pkg-hangtag',name:'Hangtag',category:'packaging',description:'PCB 350g découpé, trou œillet + cordelette, plusieurs découpes',prixDepart:80,unit:'pièce',icon:'🏷️',configType:'packaging',minQty:50},
  {id:'pkg-etiquette',name:'Étiquette prédécoupée',category:'packaging',description:'Étiquette adhésive, format 50×50 mm ou sur mesure',prixDepart:35,unit:'pièce',icon:'🔖',configType:'packaging',minQty:1},
  {id:'pkg-boite',name:'Boîte personnalisée',category:'packaging',description:'Boîte imprimée, choix matière/couleur/forme/fermeture',prixDepart:1200,unit:'pièce',icon:'📦',popular:true,configType:'packaging',minQty:10},
  {id:'pkg-doypack',name:'Doypack',category:'packaging',description:'Sachet stand-up kraft/aluminium/plastique, impression CMJN',prixDepart:null,unit:'pièce',icon:'🛍️',configType:'packaging',minQty:50},
  {id:'pkg-sac',name:'Sac papier',category:'packaging',description:'Sac kraft avec/sans fenêtre, impression quadri',prixDepart:800,unit:'pièce',icon:'🛍️',configType:'packaging',minQty:1},
  {id:'pkg-gobelet',name:'Gobelet personnalisé',category:'packaging',description:'Gobelet carton simple/double paroi, impression partielle ou totale',prixDepart:null,unit:'pièce',icon:'🥤',configType:'packaging',minQty:50},

  // ══════════════════════════════════════════════════════════════
  // 2. CALENDRIERS & MARQUE-PAGE
  // ══════════════════════════════════════════════════════════════
  {id:'cal-plateau',name:'Calendrier plateau',category:'calendrier',description:'A4 à A2, matière épaisse, impression recto ou R/V, prix auto',prixDepart:null,unit:'pièce',icon:'📅',popular:true,configType:'calendrier'},
  {id:'cal-sousmain',name:'Calendrier sous-main',category:'calendrier',description:'Article archivé — historique devis uniquement',prixDepart:null,unit:'pièce',icon:'📋',configType:'calendrier',minQty:25},
  {id:'cal-marquepage',name:'Marque-page',category:'calendrier',description:'Formats étroits, min 230g, sans Offset',prixDepart:100,unit:'pièce',icon:'🔖',configType:'calendrier',minQty:50},
  {id:'cal-chevalet',name:'Chevalet de bureau',category:'calendrier',description:'A4 à A6, support épais, 6–52 feuillets, spirale',prixDepart:6000,unit:'pièce',icon:'📆',configType:'calendrier',minQty:50},
  {id:'cal-chevalet-table',name:'Chevalet de table simple',category:'calendrier',description:'Formes 3D cube/pyramide ou A3–A4, pelliculage',prixDepart:700,unit:'pièce',icon:'📆',configType:'calendrier'},
  {id:'cal-mural',name:'Calendrier mural',category:'calendrier',description:'A4 à A2, feuillets, spirale, avec crochet',prixDepart:null,unit:'pièce',icon:'🗓️',configType:'calendrier'},

  // ══════════════════════════════════════════════════════════════
  // 3. BLOC-NOTE
  // ══════════════════════════════════════════════════════════════
  {id:'bn-bloc-note',name:'Bloc-note & Agenda',category:'notes',description:'Formats A4, B5, A5, A6 — 100 feuillets Offset 80g, couverture 300G ou 750G luxe',prixDepart:6000,unit:'pièce',icon:'📝',popular:true,configType:'bloc_note'},

  // ══════════════════════════════════════════════════════════════
  // 4. PLV STAND — 8 articles fusionnés (ex-16)
  // ══════════════════════════════════════════════════════════════
  {id:'plv-chevalet',name:'Chevalets PLV',category:'plv',description:'Table Plexi/acrylique, carton stop-rayon ou PVC — A3 à A7',prixDepart:null,unit:'pièce',icon:'🗂️',configType:'plv'},
  {id:'plv-rollup',name:'Roll-up',category:'plv',description:'Standard 80×200 / 85×200 · Deluxe jusqu\'à 150×200 · Mini A4/A3 — bâche ou PP film',prixDepart:150000,unit:'pièce',icon:'🪧',popular:true,configType:'plv'},
  {id:'plv-xbanner',name:'X-Banner',category:'plv',description:'Standard ou mini A4/A3 — bâche ou PP film indéchirable',prixDepart:85000,unit:'pièce',icon:'✖️',configType:'plv'},
  {id:'plv-presentoir-sol',name:'Stop-trottoir & Totem',category:'plv',description:'Stop A1/A0 double face ou totem autoportant de sol',prixDepart:null,unit:'pièce',icon:'🚏',configType:'plv'},
  {id:'plv-porte-flyers',name:'Porte-flyers & Brochures',category:'plv',description:'Comptoir, mural, sur pied — flyers et brochures carton',prixDepart:null,unit:'pièce',icon:'📋',configType:'plv'},
  {id:'plv-porte-affiches',name:'Porte-affiches & Fronton',category:'plv',description:'Clic-clac, suspendu, LED, fronton mural + étagères',prixDepart:null,unit:'pièce',icon:'🖼️',configType:'plv'},
  {id:'plv-presentoir-magasin',name:'Présentoirs magasin',category:'plv',description:'Comptoir escalier, colonne tournante, box palette, sur mesure',prixDepart:null,unit:'pièce',icon:'🏪',configType:'plv'},
  {id:'plv-oriflamme',name:'Oriflamme',category:'plv',description:'Goutte · Plume · Couteaux · Rectangle — support 2 à 5 m, voile polyester, base ciment ou platine',prixDepart:300000,unit:'pièce',icon:'🚩',configType:'plv'},

  // ══════════════════════════════════════════════════════════════
  // 5. LIVRES, BOOKLETS, MÉMOIRES
  // ══════════════════════════════════════════════════════════════
  {id:'bk-livres',name:'Livres & publications',category:'livres',description:'Booklet, livret, fascicule, magazine, menus, livres & mémoires — choix par type',prixDepart:1500,unit:'pièce',icon:'📚',popular:true,configType:'livre'},

  // ══════════════════════════════════════════════════════════════
  // 6. CARTERIE
  // ══════════════════════════════════════════════════════════════
  {id:'cv-std',name:'Carte de visite',category:'carterie',description:'85×55mm — PCB, pelliculé, texturé, invitation, kraft, PVC · grammage ≥230g',prixDepart:200,unit:'pièce',icon:'💳',popular:true,configType:'carte_visite',minQty:50},
  {id:'cv-fidelite',name:'Carte de fidélité',category:'carterie',description:'Tamponnage — support ≥250g, PVC interdit',prixDepart:200,unit:'pièce',icon:'🏆',configType:'carte_fidelite',minQty:50},
  {id:'cv-jeux',name:'Jeux de cartes',category:'carterie',description:'32 ou 52 cartes — formats carte visite, PCB/PCM, pelliculé, PVC…',prixDepart:null,unit:'jeu',icon:'🃏',configType:'jeux_cartes',minQty:50},

  // ══════════════════════════════════════════════════════════════
  // 7. FLYERS — article unique, format en dimension
  // ══════════════════════════════════════════════════════════════
  {id:'fly-std',name:'Flyer',category:'flyers',description:'A6, DL, A5, B5, A4, A3, carré 90 mm — R ou R/V, PCB/PCM 90–300g',prixDepart:2000,unit:'pièce',icon:'📄',popular:true,configType:'flyer',minQty:5},

  // ══════════════════════════════════════════════════════════════
  // 8. FINITIONS & RELIURES (13 articles)
  // ══════════════════════════════════════════════════════════════
  {id:'fin-pelliculage',name:'Pelliculage',category:'finitions',description:'Mat, brillant, soft touch · A6 à A3+ · Recto ou R/V — base A4 600 Ar/face',prixDepart:600,unit:'feuille',icon:'✨',configType:'finition'},
  {id:'fin-vernis',name:'Vernis',category:'finitions',description:'Vernis mat ou brillant — base A4 5 000 Ar/face',prixDepart:5000,unit:'feuille',icon:'💎',configType:'finition'},
  {id:'fin-rainage',name:'Rainage / Pliage',category:'finitions',description:'Rainage / pliage / arrondi / perforation — 50 Ar / pli (base A4, PRIX 2026)',prixDepart:50,unit:'feuille',icon:'📏',configType:'finition'},
  {id:'fin-plastification',name:'Plastification',category:'finitions',description:'Pochettes A6–A3 — base A4 2 000 Ar (recto = recto-verso)',prixDepart:2000,unit:'feuille',icon:'🛡️',configType:'finition'},
  {id:'fin-collage',name:'Collage',category:'finitions',description:'Collage A4 500 Ar · A3 1 000 Ar (PRIX 2026) — dos carré = reliure',prixDepart:500,unit:'feuille',icon:'📎',configType:'finition'},
  {id:'fin-reliure',name:'Reliure spirale',category:'finitions',description:'Spirale plast/métal (6 mm=3 000 Ar +1 000/cran), piqûre, dos carré',prixDepart:3000,unit:'exemplaire',icon:'📎',configType:'finition'},
  {id:'fin-decoupe',name:'Découpe',category:'finitions',description:'Droite 50 Ar/pièce · flex/ml · photobooth 75 000 Ar/m² — hors coins arrondis',prixDepart:50,unit:'pièce',icon:'✂️',configType:'finition'},
  {id:'fin-perforation',name:'Perforation',category:'finitions',description:'1 trou 50 · 2 trous 100 · 4 trous 150 · pointillé 100 Ar/A4',prixDepart:50,unit:'feuille',icon:'🔘',configType:'finition'},
  {id:'fin-couture',name:'Couture Oriflammes',category:'finitions',description:'Couture simple 5 000 Ar/m² · renforcée 10 000 Ar/m²',prixDepart:5000,unit:'m²',icon:'🧵',configType:'finition'},
  {id:'fin-dorure',name:'Dorure / argenture',category:'finitions',description:'Standard/Texte/Logo/Motif · base A4 2–5 000 Ar/face',prixDepart:2000,unit:'face',icon:'🌟',configType:'finition'},
  {id:'fin-gaufrage',name:'Gaufrage / débossage',category:'finitions',description:'Relief, creux, embossage aveugle ou gaufrage + dorure',prixDepart:null,unit:'pièce',icon:'🏔️',configType:'finition'},
  {id:'fin-coins',name:'Coins arrondis',category:'finitions',description:'50 Ar / feuille — tout format (hors types découpe)',prixDepart:50,unit:'feuille',icon:'⬜',configType:'finition'},
  {id:'fin-autocollant',name:'Pose autocollant',category:'finitions',description:'Pose A4 3 000 Ar · A3 5 000 · A0 10 000 Ar (PRIX 2026) · + déplacement',prixDepart:3000,unit:'pièce',icon:'🏷️',configType:'finition'},
  {id:'fin-autres',name:'Personnalisation libre',category:'finitions',description:'Finition sur mesure : description + prix unitaire négocié',prixDepart:null,unit:'prestation',icon:'✏️',configType:'finition'},

  // ══════════════════════════════════════════════════════════════
  // 9. GRAND FORMAT & PVC
  // ══════════════════════════════════════════════════════════════
  // Prix d’entrée = A0 (= 1 m²) PRIX 2026.xlsx — jamais tarifs A4 « pièce »
  {id:'gf-vinyl-blanc',name:'Vinyle blanc autocollant',category:'grand_format',description:'Laize 150cm, A4 à A0 et format perso, éco-solvant',prixDepart:20000,unit:'m²',icon:'🖼️',popular:true,configType:'grand_format'},
  {id:'gf-vinyl-transp',name:'Vinyle transparent',category:'grand_format',description:'Laize 150cm, transparent, A4 à A0',prixDepart:22000,unit:'m²',icon:'🔍',configType:'grand_format'},
  {id:'gf-dosbleu',name:'Dos bleu 120G',category:'grand_format',description:'Papier dos bleu affichage temporaire, laize 120cm et 1m50',prixDepart:23000,unit:'m²',icon:'📰',configType:'grand_format'},
  {id:'gf-bache',name:'Bâche',category:'grand_format',description:'Bâche PVC, bâche renforcée, mesh micro-perforé, impression au m² selon laize.',prixDepart:20000,unit:'m²',icon:'🏗️',popular:true,configType:'grand_format'},
  {id:'gf-tissu',name:'Tissu drapeau',category:'grand_format',description:'Tissu léger laize 150/160cm, sublimation, au m²',prixDepart:30000,unit:'m²',icon:'🚩',configType:'grand_format'},
  {id:'gf-oneway',name:'One-Way Vision 140G',category:'grand_format',description:'Vision unidirectionnelle microperforé, laize 120cm',prixDepart:30000,unit:'m²',icon:'👁️',configType:'grand_format'},
  {id:'gf-reflechissant',name:'Autocollant Réfléchissant 140G',category:'grand_format',description:'Haute visibilité nocturne, laize 120cm et 1m50',prixDepart:46000,unit:'m²',icon:'⚡',configType:'grand_format'},
  {id:'gf-frosted',name:'Frosted Film Sablé 140G',category:'grand_format',description:'Film sablé pour vitres/portes, laize 120cm',prixDepart:46000,unit:'m²',icon:'❄️',configType:'grand_format'},
  {id:'gf-photo',name:'Papier Photo GF 140G',category:'grand_format',description:'Photo grand format ou PP indéchirable, laize 100cm',prixDepart:25000,unit:'m²',icon:'📸',configType:'grand_format'},
  {id:'gf-pvc',name:'PVC rigide',category:'grand_format',description:'Panneau PVC 3 à 20 mm, A4 à A0, recto ou R/V',prixDepart:110000,unit:'m²',icon:'🪧',configType:'grand_format'},
  {id:'gf-plexi',name:'Acrylic / Plexiglas',category:'grand_format',description:'Plaque Acrylic ou Plexiglas — épaisseur 1/3/5 mm, jusqu\'à 2400×1200 mm, prix m²',prixDepart:200000,unit:'m²',icon:'💎',configType:'grand_format'},
  {id:'gf-acrylic',name:'Acrylic 1/3/5mm',category:'grand_format',description:'[archivé→gf-plexi] Doublon — utiliser Acrylic / Plexiglas',prixDepart:200000,unit:'m²',icon:'💎',configType:'grand_format'},
  {id:'gf-pp',name:'PP Film indéchirable',category:'grand_format',description:'PP indéchirable, laize 0,9m et 1m, support blanc ou gris',prixDepart:20000,unit:'m²',icon:'📄',configType:'grand_format'},
  {id:'gf-toile',name:'Toile canvas',category:'grand_format',description:'Toile coton/polyester sur châssis, impression Fine Art',prixDepart:30000,unit:'m²',icon:'🎨',configType:'grand_format'},

  // ══════════════════════════════════════════════════════════════
  // 10. TEXTILES
  // ══════════════════════════════════════════════════════════════
  {id:'tx-tshirt',name:'T-Shirt',category:'textile',description:'170G, face avant ou face+dos, DTF/Flex/Sublimation, toutes tailles',prixDepart:25000,unit:'pièce',icon:'👕',popular:true,configType:'textile'},
  {id:'tx-polo',name:'Polo',category:'textile',description:'220G, face avant ou face+dos, premium',prixDepart:37000,unit:'pièce',icon:'👔',configType:'textile'},
  {id:'tx-sweat',name:'Sweat',category:'textile',description:'Sweat avec impression personnalisée',prixDepart:60000,unit:'pièce',icon:'🧥',configType:'textile'},
  {id:'tx-gilet',name:'Gilet',category:'textile',description:'Gilet personnalisé, impression ou broderie',prixDepart:null,unit:'pièce',icon:'🦺',configType:'textile'},
  {id:'tx-casquette',name:'Casquette',category:'textile',description:'Avec ou sans support, broderie ou impression',prixDepart:13000,unit:'pièce',icon:'🧢',configType:'textile'},
  {id:'tx-bob',name:'Bob',category:'textile',description:'Bob personnalisé, broderie ou impression',prixDepart:13000,unit:'pièce',icon:'🎩',configType:'textile'},
  {id:'tx-maillot',name:'Maillot',category:'textile',description:'Maillot sportif personnalisé, sublimation',prixDepart:null,unit:'pièce',icon:'🏃',configType:'textile'},
  {id:'tx-totebag',name:'Totebag',category:'textile',description:'Sac en coton, impression A3, personnalisé',prixDepart:25000,unit:'pièce',icon:'👜',configType:'textile'},
  {id:'tx-trousse',name:'Trousse',category:'textile',description:'Trousse personnalisée, avec ou sans support',prixDepart:13000,unit:'pièce',icon:'✏️',configType:'textile'},
  {id:'tx-combinaison',name:'Combinaison',category:'textile',description:'Combinaison travail/sécurité, impression ou broderie',prixDepart:null,unit:'pièce',icon:'🦺',configType:'textile'},
  {id:'tx-survetement',name:'Survêtement',category:'textile',description:'Survêtement complet ou pièces séparées, personnalisé',prixDepart:null,unit:'pièce',icon:'🏃',configType:'textile'},
  {id:'tx-lambahoany',name:'Lambahoany',category:'textile',description:'Lambahoany traditionnel ou personnalisé, impression textile',prixDepart:null,unit:'pièce',icon:'🏝️',configType:'textile'},

  // ══════════════════════════════════════════════════════════════
  // 11. GOODIES
  // ══════════════════════════════════════════════════════════════
  {id:'gd-mug',name:'Mug',category:'goodies',description:'Mug sublimation, zone 20×10cm, personnalisé',prixDepart:15000,unit:'pièce',icon:'☕',popular:true,configType:'goodie'},
  {id:'gd-gourde',name:'Gourde',category:'goodies',description:'Gourde isotherme avec impression/gravure',prixDepart:35000,unit:'pièce',icon:'🍶',configType:'goodie'},
  {id:'gd-tasse',name:'Assiette',category:'goodies',description:'Assiette personnalisée sublimation ou impression',prixDepart:8000,unit:'pièce',icon:'🍽️',configType:'goodie'},
  {id:'gd-tapis',name:'Tapis souris',category:'goodies',description:'Tapis de souris personnalisé, impression sublimation',prixDepart:8000,unit:'pièce',icon:'🖱️',configType:'goodie'},
  {id:'gd-briquet',name:'Briquet',category:'goodies',description:'Briquet personnalisé, gravure ou impression',prixDepart:null,unit:'pièce',icon:'🔥',configType:'goodie'},
  {id:'gd-usb',name:'Clé USB',category:'goodies',description:'Clé USB personnalisée, gravure ou impression',prixDepart:null,unit:'pièce',icon:'💾',configType:'goodie'},
  {id:'gd-parapluie',name:'Parapluie',category:'goodies',description:'Parapluie personnalisé, impression ou sérigraphie',prixDepart:null,unit:'pièce',icon:'☂️',configType:'goodie'},
  {id:'gd-stylo',name:'Stylo',category:'goodies',description:'Gravure/impression, zone 5cm, min 30ex',prixDepart:3000,unit:'pièce',icon:'🖊️',configType:'goodie',minQty:30},
  {id:'gd-portecles',name:'Porte-clés',category:'goodies',description:'Porte-clés personnalisé, gravure ou impression',prixDepart:null,unit:'pièce',icon:'🔑',configType:'goodie'},
  {id:'gd-housse',name:'Housse personnalisée',category:'goodies',description:'Housse téléphone/tablette/laptop, impression UV ou sublimation',prixDepart:null,unit:'pièce',icon:'📱',configType:'goodie'},
  {id:'gd-pins',name:"Pin's / Badge",category:'goodies',description:'Épingle ou aimant, zone 3cm, min 30ex',prixDepart:4000,unit:'pièce',icon:'📌',configType:'goodie',minQty:30},

  // E2E — article isolé Backoffice→POS (pas de moteur dédié ; tarification dynamique uniquement)
  {id:'e2e-bo-pos',name:'E2E Preuve Backoffice POS',category:'goodies',description:'Article de test E2E — ne pas vendre en production',prixDepart:null,unit:'pièce',icon:'🧪',configType:'goodie'},

  // ══════════════════════════════════════════════════════════════
  // 12. ÉVÉNEMENTIEL
  // ══════════════════════════════════════════════════════════════
  {id:'evt-enveloppe',name:'Enveloppe personnalisée',category:'evenementiel',description:'Enveloppe imprimée, formats standards ou personnalisés',prixDepart:null,unit:'pièce',icon:'✉️',configType:'evenementiel'},
  {id:'evt-badge',name:'Badge événementiel',category:'evenementiel',description:'Impression + plastification + épingle ou cordon',prixDepart:2000,unit:'pièce',icon:'🎫',configType:'evenementiel'},
  {id:'evt-bracelet',name:'Bracelets',category:'evenementiel',description:'Bracelets papier/tissu/silicone, événementiel',prixDepart:null,unit:'pièce',icon:'🎗️',configType:'evenementiel'},
  {id:'evt-cheque',name:'Chèques cadeaux',category:'evenementiel',description:'Chèques cadeaux imprimés, personnalisés',prixDepart:null,unit:'pièce',icon:'🎫',configType:'evenementiel'},
  {id:'evt-photocall',name:'Photocall / Backdrop',category:'evenementiel',description:'Mur photo backdrop PVC, plexiglas ou tissu — grands formats',prixDepart:null,unit:'pièce',icon:'📷',configType:'evenementiel'},
  {id:'evt-fanion',name:'Fanion',category:'evenementiel',description:'Fanion tissu ou papier, personnalisé',prixDepart:null,unit:'pièce',icon:'🏁',configType:'evenementiel'},
  {id:'evt-billet',name:'Billet',category:'evenementiel',description:'Billets d\'entrée, tickets, coupons',prixDepart:null,unit:'pièce',icon:'🎟️',configType:'evenementiel'},
  {id:'evt-pochette',name:'Pochette à rabat',category:'evenementiel',description:'PCB/PCM ≥300g, pelliculage mat ou brillant, R/V, format A4',prixDepart:3200,unit:'pièce',icon:'📂',configType:'evenementiel'},
  {id:'evt-affiche',name:'Affiche événement',category:'evenementiel',description:'Affiche imprimée, A4 à A0, PCB ou papier photo',prixDepart:null,unit:'pièce',icon:'🪧',configType:'evenementiel'},
  {id:'evt-cordon',name:'Cordon badge / lanyard',category:'evenementiel',description:'Cordon sublimé ou sérigraphié, mousqueton métal',prixDepart:null,unit:'pièce',icon:'🎫',configType:'evenementiel'},
  {id:'evt-carte-voeux',name:'Carte de vœux',category:'evenementiel',description:'Carte pliée ou simple, avec ou sans enveloppe',prixDepart:null,unit:'pièce',icon:'💌',configType:'evenementiel'},
  {id:'evt-photobooth',name:'Photobooth',category:'evenementiel',description:'Fond photobooth ou cadre selfie, tissu ou PVC',prixDepart:null,unit:'pièce',icon:'🎭',configType:'evenementiel'},
  {id:'evt-comptoir',name:'Comptoir événementiel',category:'evenementiel',description:'Comptoir pliable, impression tissu ou PVC',prixDepart:null,unit:'pièce',icon:'🏪',configType:'evenementiel'},

  // ══════════════════════════════════════════════════════════════
  // 13. PHOTO
  // ══════════════════════════════════════════════════════════════
  {id:'ph-tirage',name:'Tirage photo',category:'photo',description:'A6 à A3+, papier photo premium, formats standards et personnalisés',prixDepart:700,unit:'pièce',icon:'📸',popular:true,configType:'photo'},
  {id:'ph-cadre',name:'Cadre photo',category:'photo',description:'Cadre vierge + tirage photo adapté au format',prixDepart:null,unit:'pièce',icon:'🖼️',configType:'photo'},
  {id:'ph-photobook',name:'Photobook',category:'photo',description:'Album photo — prix/page A4 Admin + couverture',prixDepart:null,unit:'pièce',icon:'📕',configType:'photo'},

  // ══════════════════════════════════════════════════════════════
  // 14. DOCUMENTS ADMINISTRATIFS
  // ══════════════════════════════════════════════════════════════
  {id:'doc-carnet',name:'Carnet autocopiant / Facturier',category:'document',description:'Duplicopie/triplicopie, couleurs souches, NdG ou CMJN, A6 à A4',prixDepart:600,unit:'carnet',icon:'📋',configType:'doc_admin'},
  {id:'doc-tampon',name:'Tampon',category:'document',description:'Rond ou carré 20–50 mm, auto-encreur ou bois',prixDepart:null,unit:'pièce',icon:'🔏',configType:'doc_admin'},

  // ══════════════════════════════════════════════════════════════
  // 15. IMPRESSION SANS FINITION
  // ══════════════════════════════════════════════════════════════
  {id:'imp-impression',name:'Impression sans finition',category:'impression',description:'Toutes matières petit format : Offset, PCM, PCB, Glossy, PVC opaque/translucide, papier photo, etc.',prixDepart:70,unit:'page',icon:'🖨️',popular:true,configType:'impression'},
  {id:'cg-hub',name:'Conception graphique',category:'conception',description:'Logo, charte, supports print & digital, motion design — configurateur complet',prixDepart:35000,unit:'prestation',icon:'🎨',popular:true,nouveau:true,configType:'conception',minQty:1},
  {id:'imp-conception',name:'Prestation graphique (legacy)',category:'conception',description:'Redirige vers le configurateur conception',prixDepart:null,unit:'prestation',icon:'🎨',configType:'conception'},
];

// ═══════ FORMATS STANDARDS ═══════
export const FORMATS = ['A0','A1','A2','A3','A4','A5','A6','A7','DL','B5','90×90mm','85×55mm','A3+','B2','B1','B0','Format personnalisé'];

// Tarification papier / produits : PRIX 2026 (sale-price-service) + moteur POS — tables legacy ok.html retirées.

// ═══════ RELIURES (PRIX 2026.xlsx — onglet RELIURE) ═══════
/** Spirale plastique/métallique — prix unifié Excel. */
export const SPIRALES = [
  {mm:6,ref:'1/4"',f80:'≤10',f120:'≤6',f250:'≤1',px:3000,metal:true},
  {mm:8,ref:'5/16"',f80:'≤30',f120:'≤17',f250:'≤7',px:4000,metal:true},
  {mm:10,ref:'3/8"',f80:'≤50',f120:'≤28',f250:'≤12',px:6000,metal:true},
  {mm:12,ref:'7/16"',f80:'≤70',f120:'≤38',f250:'≤18',px:8000,metal:true},
  {mm:14,ref:'9/16"',f80:'≤90',f120:'≤50',f250:'≤23',px:10000,metal:true},
  {mm:16,ref:'5/8"',f80:'≤110',f120:'≤61',f250:'≤29',px:11500,metal:true},
  {mm:18,ref:'3/4"',f80:'≤130',f120:'≤72',f250:'≤34',px:13000,metal:false},
  {mm:20,ref:'13/16"',f80:'≤150',f120:'≤82',f250:'≤40',px:14000,metal:false},
  {mm:22,ref:'7/8"',f80:'≤170',f120:'≤93',f250:'≤45',px:15000,metal:false},
  {mm:24,ref:'15/16"',f80:'≤190',f120:'≤104',f250:'≤51',px:16500,metal:false},
  {mm:26,ref:'1"',f80:'≤210',f120:'≤114',f250:'≤57',px:18000,metal:false},
];

/** Piqûre à cheval — PRIX 2026. */
export const PIQURES = [
  {ref:'23/006',mm:'6mm',f80:'≤20',f120:'≤12',px:1500},
  {ref:'23/008',mm:'8mm',f80:'≤40',f120:'≤25',px:2000},
  {ref:'23/010',mm:'10mm',f80:'≤60',f120:'≤37',px:2500},
  {ref:'23/013',mm:'13mm',f80:'≤90',f120:'≤55',px:3200},
  {ref:'23/015',mm:'15mm',f80:'≤120',f120:'≤75',px:4000},
];

/** Dos carré collé — PRIX 2026 (cousu = +5 000 en moteur). */
export const DCC = [
  {p80:'20–30',p120:'15–25',p250:'10–15',ep:'4–6mm',px:6000},
  {p80:'31–50',p120:'26–40',p250:'16–25',ep:'6–9mm',px:8000},
  {p80:'51–60',p120:'41–60',p250:'26–35',ep:'9–12mm',px:11000},
  {p80:'61–80',p120:'61–70',p250:'36–45',ep:'12–15mm',px:13000},
  {p80:'81–100',p120:'71–90',p250:'46–55',ep:'15–18mm',px:15000},
  {p80:'101–120',p120:'91–110',p250:'56–65',ep:'18–21mm',px:17000},
  {p80:'121–140',p120:'111–130',p250:'66–75',ep:'21–24mm',px:18500},
  {p80:'141–160',p120:'131–150',p250:'76–85',ep:'24–27mm',px:20000},
];

// ═══════ FONCTIONS UTILITAIRES ═══════
export { formatPrice, formatPriceAr, formatNumberFr, formatPercentFr } from '@/lib/format/french-typography';
// ═══════ BLOC-NOTE PRIX — @deprecated grille Excel legacy (moteur = publication-core / bloc-note-pricing). Ne pas supprimer. ═══════
export const NOTES_PRIX = [
  {fmt:'A4',cover:'300G simple',finition:'Sans pellicule',couleur:'Noir',feuillets:100,p_r:17000,p_rv:23000},
  {fmt:'A4',cover:'300G simple',finition:'Sans pellicule',couleur:'Quadri',feuillets:100,p_r:29000,p_rv:41000},
  {fmt:'A4',cover:'300G simple',finition:'Pelliculé',couleur:'Noir',feuillets:100,p_r:19000,p_rv:25000},
  {fmt:'A4',cover:'300G simple',finition:'Pelliculé',couleur:'Quadri',feuillets:100,p_r:30000,p_rv:43000},
  {fmt:'A4',cover:'750G luxe',finition:'Pelliculé',couleur:'Noir',feuillets:90,p_r:19000,p_rv:25000},
  {fmt:'A4',cover:'750G luxe',finition:'Pelliculé',couleur:'Quadri',feuillets:90,p_r:30000,p_rv:43000},
  {fmt:'B5',cover:'300G simple',finition:'Sans pellicule',couleur:'Noir',feuillets:100,p_r:17000,p_rv:23000},
  {fmt:'B5',cover:'300G simple',finition:'Sans pellicule',couleur:'Quadri',feuillets:100,p_r:29000,p_rv:41000},
  {fmt:'B5',cover:'300G simple',finition:'Pelliculé',couleur:'Noir',feuillets:100,p_r:19000,p_rv:25000},
  {fmt:'B5',cover:'300G simple',finition:'Pelliculé',couleur:'Quadri',feuillets:100,p_r:30000,p_rv:43000},
  {fmt:'B5',cover:'750G luxe',finition:'Pelliculé',couleur:'Noir',feuillets:90,p_r:19000,p_rv:25000},
  {fmt:'B5',cover:'750G luxe',finition:'Pelliculé',couleur:'Quadri',feuillets:90,p_r:30000,p_rv:43000},
  {fmt:'A5',cover:'300G simple',finition:'Sans pellicule',couleur:'Noir',feuillets:100,p_r:10500,p_rv:13500},
  {fmt:'A5',cover:'300G simple',finition:'Sans pellicule',couleur:'Quadri',feuillets:100,p_r:16500,p_rv:22500},
  {fmt:'A5',cover:'300G simple',finition:'Pelliculé',couleur:'Noir',feuillets:100,p_r:11500,p_rv:14500},
  {fmt:'A5',cover:'300G simple',finition:'Pelliculé',couleur:'Quadri',feuillets:100,p_r:17500,p_rv:23500},
  {fmt:'A5',cover:'750G luxe',finition:'Pelliculé',couleur:'Noir',feuillets:90,p_r:11500,p_rv:14500},
  {fmt:'A5',cover:'750G luxe',finition:'Pelliculé',couleur:'Quadri',feuillets:90,p_r:17500,p_rv:23500},
  {fmt:'A6',cover:'300G simple',finition:'Sans pellicule',couleur:'Noir',feuillets:100,p_r:6000,p_rv:12000},
  {fmt:'A6',cover:'300G simple',finition:'Sans pellicule',couleur:'Quadri',feuillets:100,p_r:8500,p_rv:20500},
  {fmt:'A6',cover:'300G simple',finition:'Pelliculé',couleur:'Noir',feuillets:100,p_r:7000,p_rv:13000},
  {fmt:'A6',cover:'300G simple',finition:'Pelliculé',couleur:'Quadri',feuillets:100,p_r:9500,p_rv:21500},
  {fmt:'A6',cover:'750G luxe',finition:'Pelliculé',couleur:'Noir',feuillets:90,p_r:7000,p_rv:13000},
  {fmt:'A6',cover:'750G luxe',finition:'Pelliculé',couleur:'Quadri',feuillets:90,p_r:9500,p_rv:21500},
];

