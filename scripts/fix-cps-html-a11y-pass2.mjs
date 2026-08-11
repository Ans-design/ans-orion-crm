/**
 * Pass 2: fix buttons whose attributes contain `>=` (broke naive regex).
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const file = join(process.cwd(), 'docs/ui-references/ANS_ORION_CPS_PREMIUM_V5.html');
let html = readFileSync(file, 'utf8');
let fixes = 0;

function findButtons(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const start = s.indexOf('<button', i);
    if (start < 0) break;
    let j = start + 7;
    let quote = null;
    while (j < s.length) {
      const c = s[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        break;
      }
      j++;
    }
    if (j >= s.length) break;
    const openEnd = j;
    const open = s.slice(start, openEnd + 1);
    let k = openEnd + 1;
    let depth = 1;
    let found = false;
    while (k < s.length && depth > 0) {
      const nextOpen = s.indexOf('<button', k);
      const nextClose = s.indexOf('</button>', k);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth++;
        k = nextOpen + 7;
      } else {
        depth--;
        if (depth === 0) {
          const inner = s.slice(openEnd + 1, nextClose);
          out.push({ start, closeEnd: nextClose + 9, open, inner });
          i = nextClose + 9;
          found = true;
          break;
        }
        k = nextClose + 9;
      }
    }
    if (!found) i = start + 7;
  }
  return out;
}

function labelFor(open, inner) {
  const blob = open + inner;
  if (/mobile-menu/.test(blob)) return 'Ouvrir le menu';
  if (/toggleTheme/.test(blob)) return 'Basculer le thème';
  if (/openProjectMap/.test(blob)) return 'Cartographie du projet';
  if (/openChangeCenter/.test(blob)) return 'Brouillons et validations';
  if (/openSync|sync-button|runSync/.test(blob)) return 'Synchronisation';
  if (/Page--|page--|chevron-left/.test(blob)) return 'Page précédente';
  if (/Page\+\+|page\+\+|chevron-right/.test(blob)) return 'Page suivante';
  if (/\bswitch\b/.test(blob)) return 'Activer ou désactiver';
  if (/fa-pen|Modifier/.test(blob)) return 'Modifier';
  if (/fa-copy|Dupliquer/.test(blob)) return 'Dupliquer';
  if (/fa-trash|Archiver|Supprimer/.test(blob)) return 'Supprimer';
  if (/fa-xmark|class="close"/.test(blob)) return 'Fermer';
  if (/comfortable/.test(blob) || (/fa-bars/.test(blob) && /density/.test(blob))) return 'Affichage confortable';
  if (/fa-grip-lines|compact/.test(blob)) return 'Affichage compact';
  if (/section-link/.test(blob)) return 'Section';
  if (/rule-card/.test(blob)) return 'Règle métier';
  const title = blob.match(/\stitle="([^"]+)"/);
  if (title) return title[1];
  return 'Action';
}

const buttons = findButtons(html);
for (let b = buttons.length - 1; b >= 0; b--) {
  const { start, closeEnd, open, inner } = buttons[b];
  if (/\saria-label\s*=/i.test(open)) continue;
  const text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const onlyDyn = !text && /x-text=/.test(inner);
  const onlyIcon = !text && /<i\b/.test(inner);
  const isSwitch = /\bswitch\b/.test(open);
  if (!(onlyDyn || onlyIcon || isSwitch || !text)) continue;
  const label = labelFor(open, inner).replace(/"/g, '&quot;');
  const newOpen = open.replace(/^<button/, `<button aria-label="${label}"`);
  html = html.slice(0, start) + newOpen + inner + '</button>' + html.slice(closeEnd);
  fixes++;
}

html = html.replace(/<th([^>]*)>\s*<\/th>/g, (_m, attrs) => {
  fixes++;
  return `<th${attrs}>Actions</th>`;
});

// Improve generic "Action" / "Champ" / "Sélection" where a nearby label exists — optional polish
html = html.replace(
  /<label class="form-label">([^<]+)<\/label><(input|select|textarea) aria-label="(?:Champ|Sélection|Action)"/g,
  (_m, labelText, tag) => {
    fixes++;
    return `<label class="form-label">${labelText}</label><${tag} aria-label="${labelText.replace(/"/g, '&quot;')}"`;
  },
);

writeFileSync(file, html);
console.log(`Pass2 fixed ${fixes} (scanned ${buttons.length} buttons)`);
