/**
 * Classification métier des chips / options (inventaire — pas de mutation).
 * Cible canonique : matières/formats · finitions · dépendances · formules · produit · historique.
 */

export type OptionCanonicalBucket =
  | 'matieres_formats'
  | 'finitions'
  | 'dependances'
  | 'formules_prix'
  | 'affectation_produit'
  | 'historique_technique'
  | 'orphelin';

export type ClassifiableChip = {
  id: string;
  label: string;
  blockKey: string;
  blockLabel?: string;
  fieldKey?: string;
  fieldType?: string;
  impactsPrice?: boolean;
  impactsStock?: boolean;
  impactsProduction?: boolean;
  isInformational?: boolean;
  archived?: boolean;
  priceModifier?: number;
  articleId?: string;
};

export type ChipClassification = {
  id: string;
  label: string;
  blockKey: string;
  bucket: OptionCanonicalBucket;
  reason: string;
  articleId?: string;
};

const MATIERE_RE =
  /mati[eè]re|support|grammage|laize|papier|carton|pvc|acryl|vinyl|adh[eé]sif|couleur\s*mati|epaisseur|épaisseur|surface|unit[eé]/i;
const FORMAT_RE =
  /format|dimension|taille|largeur|hauteur|longueur|\d+\s*[×x]\s*\d+|mm\b|cm\b|m²|m2/i;
const FINITION_RE =
  /finition|fa[cç]onnage|coin|coins|d[eé]coupe|pliage|rainage|pellicul|plastif|vernis|dorure|reliure|œillet|oeillet|pose|couture|perfor|lamin|encoll|biseau|bord/i;
const DEPEND_RE =
  /d[eé]pend|incompat|condition|si\s*\/?\s*alors|recto|verso|obligatoire|limite|quantit[eé]|affichage|r[eè]gle/i;

function normalize(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyOptionChip(chip: ClassifiableChip): ChipClassification {
  const block = normalize(`${chip.blockKey} ${chip.blockLabel ?? ''}`);
  const label = normalize(chip.label);
  const field = normalize(chip.fieldKey ?? '');
  const hay = `${block} ${label} ${field}`;

  if (chip.archived) {
    return {
      id: chip.id,
      label: chip.label,
      blockKey: chip.blockKey,
      bucket: 'historique_technique',
      reason: 'Archivé — conservé pour historique',
      articleId: chip.articleId,
    };
  }

  if (FORMAT_RE.test(hay) || block.includes('dimension')) {
    return {
      id: chip.id,
      label: chip.label,
      blockKey: chip.blockKey,
      bucket: 'matieres_formats',
      reason: 'Format / dimension → Matières, formats & coûts',
      articleId: chip.articleId,
    };
  }

  if (MATIERE_RE.test(hay) || block.includes('matiere') || block.includes('support')) {
    return {
      id: chip.id,
      label: chip.label,
      blockKey: chip.blockKey,
      bucket: 'matieres_formats',
      reason: 'Matière / support / grammage → Matières, formats & coûts',
      articleId: chip.articleId,
    };
  }

  if (FINITION_RE.test(hay) || block.includes('finition') || block.includes('reliure')) {
    return {
      id: chip.id,
      label: chip.label,
      blockKey: chip.blockKey,
      bucket: 'finitions',
      reason: 'Opération de façonnage → Finitions & façonnage',
      articleId: chip.articleId,
    };
  }

  if (DEPEND_RE.test(hay) || chip.isInformational) {
    return {
      id: chip.id,
      label: chip.label,
      blockKey: chip.blockKey,
      bucket: 'dependances',
      reason: chip.isInformational
        ? 'Indicatif / condition → Conditions & dépendances'
        : 'Règle conditionnelle → Conditions & dépendances',
      articleId: chip.articleId,
    };
  }

  if (chip.impactsPrice || (chip.priceModifier != null && chip.priceModifier !== 0)) {
    return {
      id: chip.id,
      label: chip.label,
      blockKey: chip.blockKey,
      bucket: 'formules_prix',
      reason: 'Impact prix → Formules & règles (référence, pas duplication)',
      articleId: chip.articleId,
    };
  }

  if (chip.articleId) {
    return {
      id: chip.id,
      label: chip.label,
      blockKey: chip.blockKey,
      bucket: 'affectation_produit',
      reason: 'Affectation produit (obligatoire / défaut / ordre)',
      articleId: chip.articleId,
    };
  }

  return {
    id: chip.id,
    label: chip.label,
    blockKey: chip.blockKey,
    bucket: 'orphelin',
    reason: 'Non classé automatiquement — revue manuelle',
    articleId: chip.articleId,
  };
}

export function classifyOptionChips(chips: ClassifiableChip[]): {
  items: ChipClassification[];
  counts: Record<OptionCanonicalBucket, number>;
  total: number;
  articleIds: string[];
} {
  const items = chips.map(classifyOptionChip);
  const counts: Record<OptionCanonicalBucket, number> = {
    matieres_formats: 0,
    finitions: 0,
    dependances: 0,
    formules_prix: 0,
    affectation_produit: 0,
    historique_technique: 0,
    orphelin: 0,
  };
  for (const it of items) counts[it.bucket] += 1;
  const articleIds = [...new Set(chips.map((c) => c.articleId).filter(Boolean) as string[])].sort();
  return { items, counts, total: items.length, articleIds };
}

export const BUCKET_LABELS: Record<OptionCanonicalBucket, string> = {
  matieres_formats: 'Matières, formats & coûts',
  finitions: 'Finitions & façonnage',
  dependances: 'Conditions & dépendances',
  formules_prix: 'Formules & règles (impact prix)',
  affectation_produit: 'Affectation produit',
  historique_technique: 'Historique technique',
  orphelin: 'Orphelin / revue',
};
