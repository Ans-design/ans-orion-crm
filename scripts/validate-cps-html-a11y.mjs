import { readFileSync } from 'fs';
import { join } from 'path';

const html = readFileSync(join(process.cwd(), 'docs/ui-references/ANS_ORION_CPS_PREMIUM_V5.html'), 'utf8');

function findOpenTags(s, name) {
  const out = [];
  let i = 0;
  const openTok = `<${name}`;
  while (i < s.length) {
    const start = s.indexOf(openTok, i);
    if (start < 0) break;
    const next = s[start + openTok.length];
    if (next && /[a-zA-Z0-9-]/.test(next)) {
      i = start + openTok.length;
      continue;
    }
    let j = start + openTok.length;
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
    out.push(s.slice(start, j + 1));
    i = j + 1;
  }
  return out;
}

let missingBtn = 0;
let i = 0;
while (i < html.length) {
  const start = html.indexOf('<button', i);
  if (start < 0) break;
  let j = start + 7;
  let quote = null;
  while (j < html.length) {
    const c = html[j];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '>') {
      break;
    }
    j++;
  }
  const open = html.slice(start, j + 1);
  const close = html.indexOf('</button>', j + 1);
  const inner = close > 0 ? html.slice(j + 1, close) : '';
  const text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const needs =
    !text ||
    (!text && /x-text=/.test(inner)) ||
    (!text && /<i\b/.test(inner)) ||
    /\bswitch\b/.test(open);
  if (!/aria-label=/i.test(open) && needs) {
    missingBtn++;
    console.log('BTN:', open.slice(0, 140));
  }
  i = close > 0 ? close + 9 : j + 1;
}

const selects = findOpenTags(html, 'select').filter(
  (t) => !/aria-label=/i.test(t) && !/aria-labelledby=/i.test(t),
);
const inputs = findOpenTags(html, 'input').filter(
  (t) =>
    !/type\s*=\s*["']?hidden/i.test(t) &&
    !/aria-label=/i.test(t) &&
    !/aria-labelledby=/i.test(t),
);
const emptyTh = (html.match(/<th[^>]*>\s*<\/th>/g) || []).length;

console.log({
  missingBtn,
  selects: selects.length,
  inputs: inputs.length,
  emptyTh,
});
if (selects[0]) console.log('SEL', selects[0].slice(0, 120));
if (inputs[0]) console.log('INP', inputs[0].slice(0, 120));
