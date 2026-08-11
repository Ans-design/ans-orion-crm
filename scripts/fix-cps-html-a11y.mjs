/**
 * Fix axe-linter a11y issues in ANS_ORION_CPS_PREMIUM_V5.html (static Alpine mock).
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const file = join(process.cwd(), 'docs/ui-references/ANS_ORION_CPS_PREMIUM_V5.html');
let html = readFileSync(file, 'utf8');
let fixes = 0;

const has = (tag, name) => new RegExp(`\\s${name}\\s*=`, 'i').test(tag);

function withAria(openTag, label) {
  if (has(openTag, 'aria-label') || has(openTag, 'aria-labelledby')) return openTag;
  fixes++;
  return openTag.replace(/^(<\w+)/, `$1 aria-label="${label.replace(/"/g, '&quot;')}"`);
}

function btnLabel(open, inner = '') {
  const blob = `${open}${inner}`;
  if (/mobile-menu/.test(blob)) return 'Ouvrir le menu';
  if (/toggleTheme/.test(blob)) return 'Basculer le thème';
  if (/openProjectMap/.test(blob)) return 'Cartographie du projet';
  if (/openChangeCenter/.test(blob)) return 'Brouillons et validations';
  if (/openSync|sync-button/.test(blob)) return 'Synchronisation';
  if (/pager-btn/.test(blob) && /chevron-left|Page--|page--/.test(blob)) return 'Page précédente';
  if (/pager-btn/.test(blob) && /chevron-right|Page\+\+|page\+\+/.test(blob)) return 'Page suivante';
  if (/\bswitch\b/.test(blob)) return 'Activer ou désactiver';
  if (/fa-pen|title="Modifier"/.test(blob)) return 'Modifier';
  if (/fa-copy|title="Dupliquer"/.test(blob)) return 'Dupliquer';
  if (/fa-trash-can|title="Archiver"/.test(blob)) return 'Supprimer';
  if (/fa-xmark/.test(blob)) return 'Fermer';
  if (/fa-bars/.test(blob) && /comfortable|density/.test(blob)) return 'Affichage confortable';
  if (/fa-grip-lines/.test(blob)) return 'Affichage compact';
  const title = blob.match(/\stitle="([^"]+)"/);
  if (title) return title[1];
  return 'Action';
}

function selectLabel(tag) {
  if (/materialFamily/.test(tag)) return 'Famille matière';
  if (/articleFamily/.test(tag)) return 'Famille article';
  if (/pageSize/.test(tag)) return 'Taille de page';
  if (/characteristic/.test(tag)) return 'Caractéristique';
  if (/f\.unit/.test(tag)) return 'Unité';
  if (/tierArticle/.test(tag)) return 'Article';
  if (/tierSegment/.test(tag)) return 'Segment client';
  if (/selectedEngineData\(\)\.unit/.test(tag)) return 'Unité principale';
  if (/selectedEngineData\(\)\.round/.test(tag)) return 'Arrondi tarifaire';
  if (/selectedBlockData\(\)\.type/.test(tag)) return 'Type de calcul';
  if (/d\.condition/.test(tag)) return 'Condition SI';
  if (/d\.action/.test(tag)) return 'Action ALORS';
  if (/t\.type/.test(tag)) return 'Type de palier';
  if (/currentRole|role-select/.test(tag)) return 'Rôle de démonstration';
  return 'Sélection';
}

function inputLabel(tag) {
  if (/type\s*=\s*["']?checkbox/i.test(tag)) {
    if (/selectAll/.test(tag)) return 'Tout sélectionner';
    return 'Sélectionner la ligne';
  }
  if (/materialSearch/.test(tag)) return 'Rechercher une matière';
  if (/articleSearch/.test(tag)) return 'Rechercher un article';
  if (/profileSearch/.test(tag)) return 'Rechercher un profil';
  if (/optionSearch/.test(tag)) return 'Rechercher une option';
  if (/usageSearch/.test(tag)) return 'Rechercher';
  if (/laizeTest/.test(tag)) return 'Laize disponible';
  if (/sideTest/.test(tag)) return 'Côté demandé';
  if (/purchasePrice/.test(tag)) return 'Prix achat';
  if (/blankPrice/.test(tag)) return 'Prix vierge';
  if (/printPrice/.test(tag)) return 'Prix imprimé';
  if (/f\.name/.test(tag)) return 'Nom du format';
  if (/f\.width/.test(tag)) return 'Largeur';
  if (/f\.height/.test(tag)) return 'Hauteur';
  if (/t\.min/.test(tag)) return 'Quantité minimale';
  if (/t\.max/.test(tag)) return 'Quantité maximale';
  if (/t\.value/.test(tag)) return 'Valeur du palier';
  if (/p\.price/.test(tag)) return 'Prix de base';
  if (/selectedEngineData\(\)\.code/.test(tag)) return 'Code moteur';
  if (/selectedEngineData\(\)\.margin/.test(tag)) return 'Marge cible';
  if (/selectedBlockData\(\)\.name/.test(tag)) return 'Libellé';
  if (/selectedBlockData\(\)\.config/.test(tag)) return 'Configuration';
  if (/selectedOptionGroupData\(\)\.name/.test(tag)) return 'Nom du groupe';
  if (/selectedOptionGroupData\(\)\.canonical/.test(tag)) return 'Identifiant canonique';
  const ph = tag.match(/placeholder="([^"]+)"/);
  if (ph) return ph[1];
  return 'Champ';
}

html = html.replace(/<th([^>]*)>\s*<\/th>/g, (_m, attrs) => {
  fixes++;
  return `<th${attrs}>Actions</th>`;
});

html = html.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/g, (_full, attrs, inner) => {
  const open = `<button${attrs}>`;
  if (has(open, 'aria-label')) return `<button${attrs}>${inner}</button>`;
  const text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const onlyDynamic = !text && /x-text=/.test(inner);
  const onlyIcon = !text && /<i\b/.test(inner);
  const isSwitch = /\bswitch\b/.test(attrs);
  if (!(onlyDynamic || onlyIcon || isSwitch || !text)) {
    return `<button${attrs}>${inner}</button>`;
  }
  return `${withAria(open, btnLabel(open, inner))}${inner}</button>`;
});

html = html.replace(/<select\b([^>]*)>/g, (_m, attrs) => withAria(`<select${attrs}>`, selectLabel(`<select${attrs}>`)));

html = html.replace(/<input\b([^>]*)>/g, (_m, attrs) => {
  const open = `<input${attrs}>`;
  if (/type\s*=\s*["']?hidden/i.test(open)) return open;
  return withAria(open, inputLabel(open));
});

html = html.replace(/<textarea\b([^>]*)>/g, (_m, attrs) => {
  const open = `<textarea${attrs}>`;
  return withAria(open, inputLabel(open));
});

writeFileSync(file, html);
console.log(`Applied ${fixes} a11y fixes → ${file}`);
