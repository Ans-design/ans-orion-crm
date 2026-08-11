/**
 * Typologie d’erreurs imprimerie pour le retour client / SAV.
 * Facilite le ciblage vers le poste / rôle responsable.
 */

export type RetourClientIssue = {
  id: string;
  label: string;
};

export type RetourClientCategory = {
  id: string;
  label: string;
  /** Qui occuper / informer (affichage) */
  roleLabel: string;
  /** Rôle métier (aligné GPAO / tâches) */
  assigneeRole: string;
  issues: RetourClientIssue[];
};

export const RETOUR_CLIENT_CATEGORIES: RetourClientCategory[] = [
  {
    id: 'impression',
    label: 'Impression',
    roleLabel: 'Atelier impression',
    assigneeRole: 'production',
    issues: [
      { id: 'couleurs', label: 'Couleurs / dérive CMJN' },
      { id: 'densite', label: 'Densité / trop clair ou trop foncé' },
      { id: 'bandes', label: 'Bandes / stries / flou' },
      { id: 'manques', label: 'Manques d’encre / zones vides' },
      { id: 'recto_verso', label: 'Erreur recto-verso' },
      { id: 'support', label: 'Mauvais support / papier' },
    ],
  },
  {
    id: 'calage',
    label: 'Calage',
    roleLabel: 'Atelier impression',
    assigneeRole: 'production',
    issues: [
      { id: 'registre', label: 'Décalage registre couleurs' },
      { id: 'centrage', label: 'Centrage / marge incorrecte' },
      { id: 'repere', label: 'Repères de coupe mal calés' },
      { id: 'skew', label: 'Image penchée / skew' },
    ],
  },
  {
    id: 'faconnage',
    label: 'Façonnage',
    roleLabel: 'Atelier façonnage',
    assigneeRole: 'faconnage',
    issues: [
      { id: 'coupe', label: 'Coupe irrégulière / hors format' },
      { id: 'pli', label: 'Pli / rainage incorrect' },
      { id: 'perfo', label: 'Perforation / découpe' },
      { id: 'reliure', label: 'Reliure / piqûre / spirale' },
      { id: 'pelliculage', label: 'Pelliculage / vernis' },
      { id: 'oeillets', label: 'Œillets / finitions manquantes' },
    ],
  },
  {
    id: 'emballage',
    label: 'Emballage',
    roleLabel: 'Atelier emballage',
    assigneeRole: 'production',
    issues: [
      { id: 'quantite', label: 'Quantité incorrecte' },
      { id: 'conditionnement', label: 'Conditionnement abîmé' },
      { id: 'etiquetage', label: 'Étiquetage / identification' },
      { id: 'protection', label: 'Protection insuffisante' },
    ],
  },
  {
    id: 'graphisme',
    label: 'Graphisme / BAT',
    roleLabel: 'Studio / graphiste',
    assigneeRole: 'designer',
    issues: [
      { id: 'fichier', label: 'Fichier / résolution' },
      { id: 'bat', label: 'BAT non conforme au rendu' },
      { id: 'typo', label: 'Texte / orthographe' },
      { id: 'mise_en_page', label: 'Mise en page / marges' },
    ],
  },
  {
    id: 'livraison',
    label: 'Livraison',
    roleLabel: 'Logistique',
    assigneeRole: 'livraison',
    issues: [
      { id: 'retard', label: 'Retard de livraison' },
      { id: 'adresse', label: 'Adresse / destinataire' },
      { id: 'casse', label: 'Casse en transit' },
      { id: 'manquant', label: 'Colis / pièce manquante' },
    ],
  },
  {
    id: 'delai',
    label: 'Délai atelier',
    roleLabel: 'Chef d’atelier',
    assigneeRole: 'production',
    issues: [
      { id: 'retard_prod', label: 'Retard de production' },
      { id: 'com', label: 'Manque d’information client' },
    ],
  },
  {
    id: 'satisfait',
    label: 'Satisfait',
    roleLabel: 'Commercial',
    assigneeRole: 'commercial',
    issues: [
      { id: 'ras', label: 'RAS — conforme' },
      { id: 'merci', label: 'Très satisfait' },
      { id: 'recommande', label: 'Recommande ANS' },
    ],
  },
  {
    id: 'autre',
    label: 'Autre',
    roleLabel: 'Commercial / SAV',
    assigneeRole: 'commercial',
    issues: [
      { id: 'divers', label: 'Autre motif (préciser)' },
    ],
  },
];

export function getRetourClientCategory(id: string | null | undefined) {
  return RETOUR_CLIENT_CATEGORIES.find((c) => c.id === id) ?? null;
}

/** Construit le texte SAV structuré (catégorie + erreurs + responsable + détail). */
export function buildRetourClientFeedback(input: {
  categoryId: string;
  issueIds: string[];
  detail?: string;
}): string {
  const cat = getRetourClientCategory(input.categoryId);
  if (!cat) return (input.detail ?? '').trim();

  const selected = cat.issues.filter((i) => input.issueIds.includes(i.id));
  const issueLabels = selected.map((i) => i.label);
  const detail = (input.detail ?? '').trim();

  const lines = [
    `Poste : ${cat.label}`,
    issueLabels.length > 0 ? `Erreur(s) : ${issueLabels.join(' · ')}` : null,
    `À informer : ${cat.roleLabel}`,
    detail ? `Détail client : ${detail}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

export function isRetourClientFeedbackReady(input: {
  categoryId: string | null;
  issueIds: string[];
  detail?: string;
}): boolean {
  if (!input.categoryId) return false;
  const cat = getRetourClientCategory(input.categoryId);
  if (!cat) return false;
  if (input.issueIds.length > 0) return true;
  // « Autre » ou détail libre avec catégorie choisie
  return (input.detail ?? '').trim().length >= 3;
}
