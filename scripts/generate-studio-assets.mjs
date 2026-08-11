#!/usr/bin/env node
/**
 * Génère les assets SVG studio catalogue B2B (vierge imprimerie).
 * Style : fond transparent, produit blanc/naturel, ombre studio, détails reconnaissables.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '../public/assets/products/studio');
mkdirSync(OUT, { recursive: true });

const SHADOW = `<ellipse cx="200" cy="360" rx="120" ry="14" fill="#000" opacity="0.12"/>`;
const BG = `<rect width="400" height="400" fill="none"/>`;

function wrap(body, viewBox = '0 0 400 400') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="400" height="400">
<defs>
  <linearGradient id="fab" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#ffffff"/>
    <stop offset="55%" stop-color="#f4f4f0"/>
    <stop offset="100%" stop-color="#e4e4de"/>
  </linearGradient>
  <linearGradient id="fabD" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#d8d8d2"/>
    <stop offset="100%" stop-color="#f8f8f6"/>
  </linearGradient>
  <linearGradient id="brim" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#f0f0ec"/>
    <stop offset="100%" stop-color="#d0d0c8"/>
  </linearGradient>
  <linearGradient id="cer" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#ffffff"/>
    <stop offset="100%" stop-color="#e8ecf0"/>
  </linearGradient>
  <linearGradient id="paper" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#ffffff"/>
    <stop offset="100%" stop-color="#f0f2f5"/>
  </linearGradient>
  <linearGradient id="kraft" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#dcc9a8"/>
    <stop offset="100%" stop-color="#a08050"/>
  </linearGradient>
  <linearGradient id="metal" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#e8ecf0"/>
    <stop offset="100%" stop-color="#8898a8"/>
  </linearGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.18"/>
  </filter>
</defs>
${BG}
${SHADOW}
<g filter="url(#sh)">${body}</g>
</svg>`;
}

const ASSETS = {
  cap: `
    <!-- Casquette 6 panneaux — vue 3/4 catalogue -->
    <ellipse cx="200" cy="118" rx="88" ry="22" fill="url(#fabD)" stroke="#ccc" stroke-width="1"/>
    <path d="M112 118 Q112 52 200 42 Q288 52 288 118 L288 168 Q200 188 112 168 Z" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M112 118 L200 42 L288 118" fill="none" stroke="#ccc" stroke-width="1.2"/>
    <path d="M145 68 L200 48 L255 68" fill="none" stroke="#ccc" stroke-width="1"/>
    <path d="M128 95 L200 72 L272 95" fill="none" stroke="#ccc" stroke-width="0.8"/>
    <path d="M118 140 L200 118 L282 140" fill="none" stroke="#ccc" stroke-width="0.8"/>
    <circle cx="200" cy="48" r="6" fill="url(#fabD)" stroke="#bbb" stroke-width="0.6"/>
    <path d="M118 168 Q200 198 318 158 L318 178 Q200 228 98 188 L98 168 Q108 172 118 168" fill="url(#brim)" stroke="#aaa" stroke-width="0.8"/>
    <path d="M118 168 Q200 185 318 158" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.5"/>
    <ellipse cx="200" cy="168" rx="100" ry="8" fill="#000" opacity="0.06"/>
    <rect x="290" y="108" width="28" height="6" rx="2" fill="#ddd" stroke="#bbb" stroke-width="0.5"/>
    <circle cx="296" cy="111" r="2" fill="#999"/>
    <rect x="82" y="108" width="28" height="6" rx="2" fill="#ddd" stroke="#bbb" stroke-width="0.5"/>
    <rect x="168" y="88" width="64" height="48" rx="4" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3" stroke-width="0.8"/>
  `,

  bob: `
    <!-- Bob / bucket hat -->
    <ellipse cx="200" cy="130" rx="95" ry="28" fill="url(#fabD)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M105 130 Q105 55 200 48 Q295 55 295 130 L310 148 Q200 175 90 148 Z" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M90 148 Q200 178 310 148 L318 162 Q200 205 82 162 Z" fill="url(#fabD)" stroke="#aaa" stroke-width="0.7"/>
    <path d="M120 100 Q200 88 280 100" fill="none" stroke="#ccc" stroke-width="1"/>
    <rect x="158" y="95" width="84" height="42" rx="3" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
  `,

  tshirt: `
    <!-- T-shirt crew neck face -->
    <path d="M128 95 Q128 72 200 68 Q272 72 272 95 L310 118 L328 168 L288 182 L272 138 L272 310 L128 310 L128 138 L112 182 L72 168 L90 118 Z" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M168 68 Q200 82 232 68 Q200 95 168 68" fill="#e8e8e4" stroke="#bbb" stroke-width="0.6"/>
    <path d="M128 138 L72 168 M272 138 L328 168" fill="none" stroke="#d0d0c8" stroke-width="14" stroke-linecap="round"/>
    <path d="M145 145 Q200 135 255 145" fill="none" stroke="#ccc" stroke-width="1"/>
    <path d="M138 200 Q200 188 262 200" fill="none" stroke="#ddd" stroke-width="0.8"/>
    <rect x="148" y="155" width="104" height="88" rx="4" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
  `,

  polo: `
    <path d="M128 95 Q128 72 200 68 Q272 72 272 95 L310 118 L328 168 L288 182 L272 138 L272 310 L128 310 L128 138 L112 182 L72 168 L90 118 Z" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M182 58 L218 58 L218 88 L200 102 L182 88 Z" fill="#fff" stroke="#bbb" stroke-width="0.8"/>
    <path d="M196 88 L204 88 L204 118" fill="none" stroke="#ccc" stroke-width="2"/>
    <circle cx="200" cy="96" r="2" fill="#bbb"/><circle cx="200" cy="106" r="2" fill="#bbb"/>
    <rect x="148" y="155" width="104" height="88" rx="4" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
  `,

  sweat: `
    <!-- Hoodie -->
    <path d="M118 105 Q118 62 200 55 Q282 62 282 105 L318 128 L338 188 L292 205 L272 148 L272 315 L128 315 L128 148 L108 205 L62 188 L82 128 Z" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M155 55 Q200 38 245 55 Q200 88 155 55" fill="#e0e0dc" stroke="#bbb" stroke-width="0.7"/>
    <path d="M155 55 L145 95 M245 55 L255 95" fill="none" stroke="#ccc" stroke-width="1"/>
    <rect x="178" y="72" width="44" height="12" rx="6" fill="#ddd" stroke="#bbb" stroke-width="0.5"/>
    <path d="M128 148 L62 188 M272 148 L338 188" fill="none" stroke="#ccc" stroke-width="16" stroke-linecap="round" opacity="0.5"/>
    <rect x="148" y="165" width="104" height="72" rx="4" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
  `,

  gilet: `
    <!-- Gilet sans manches -->
    <path d="M155 78 L155 310 L245 310 L245 78 L200 108 Z" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M108 118 L155 88 L245 88 L292 118 L292 175 L108 175 Z" fill="url(#fabD)" stroke="#bbb" stroke-width="0.7"/>
    <path d="M200 108 L200 310" fill="none" stroke="#ccc" stroke-width="0.8"/>
    <rect x="165" y="195" width="70" height="55" rx="4" fill="#fff" stroke="#bbb" stroke-width="0.8"/>
    <rect x="168" y="125" width="64" height="48" rx="3" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
  `,

  maillot: `
    <!-- Maillot sport numéroté -->
    <path d="M125 92 Q125 68 200 64 Q275 68 275 92 L312 115 L328 162 L288 175 L272 132 L272 310 L128 310 L128 132 L112 175 L72 162 L88 115 Z" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M168 64 Q200 78 232 64" fill="#222" opacity="0.15"/>
    <rect x="195" y="175" width="50" height="55" rx="3" fill="#000" opacity="0.06" stroke="#bbb"/>
    <text x="220" y="215" text-anchor="middle" font-size="32" font-weight="bold" fill="#bbb" font-family="Arial">10</text>
    <rect x="148" y="145" width="104" height="72" rx="4" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
  `,

  combinaison: `
    <!-- Combinaison / salopette travail -->
    <path d="M138 82 Q138 58 200 54 Q262 58 262 82 L295 105 L312 148 L278 162 L262 118 L262 310 L138 310 L138 118 L122 162 L88 148 L105 105 Z" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M138 118 L122 162 L122 195 L138 195 L155 162 L155 118 M262 118 L278 162 L278 195 L262 195 L245 162 L245 118" fill="url(#fabD)" stroke="#bbb" stroke-width="0.6"/>
    <rect x="155" y="145" width="90" height="75" rx="4" fill="#fff" stroke="#bbb" stroke-width="0.8"/>
    <rect x="165" y="155" width="28" height="22" rx="2" fill="#eee" stroke="#ccc"/>
    <rect x="207" y="155" width="28" height="22" rx="2" fill="#eee" stroke="#ccc"/>
    <line x1="138" y1="220" x2="262" y2="220" stroke="#ccc" stroke-width="0.8"/>
    <path d="M155 220 L155 310 M245 220 L245 310" fill="none" stroke="#ccc" stroke-width="0.6"/>
    <rect x="168" y="165" width="64" height="40" rx="3" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
  `,

  survetement: `
    <!-- Survêtement veste + pantalon -->
    <path d="M95 95 Q95 68 165 62 Q200 58 235 62 Q305 68 305 95 L328 118 L342 162 L305 175 L288 128 L288 195 L112 195 L112 128 L95 175 L58 162 L72 118 Z" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M200 62 L200 195" fill="none" stroke="#ccc" stroke-width="0.8"/>
    <rect x="128" y="118" width="55" height="45" rx="3" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
    <path d="M128 195 L128 305 L178 305 L178 195 M222 195 L222 305 L272 305 L272 195" fill="url(#fabD)" stroke="#bbb" stroke-width="0.7"/>
    <line x1="128" y1="240" x2="272" y2="240" stroke="#ccc" stroke-width="0.6"/>
    <rect x="215" y="128" width="48" height="38" rx="3" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
  `,

  lambahoany: `
    <!-- Lambahoany / paréo malgache -->
    <path d="M95 75 Q200 55 305 75 L325 285 Q200 320 75 285 Z" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M110 120 Q200 105 290 120" fill="none" stroke="#ccc" stroke-width="1"/>
    <path d="M100 180 Q200 165 300 180" fill="none" stroke="#ddd" stroke-width="0.8"/>
    <path d="M95 240 Q200 225 305 240" fill="none" stroke="#ddd" stroke-width="0.6"/>
    <rect x="148" y="130" width="104" height="100" rx="4" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
    <ellipse cx="200" cy="72" rx="12" ry="6" fill="url(#metal)" opacity="0.7"/>
  `,

  tote: `
    <path d="M108 125 Q108 85 200 82 Q292 85 292 125 L308 295 Q200 318 92 295 Z" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M135 125 Q135 98 200 95 Q265 98 265 125" fill="none" stroke="#888" stroke-width="5" stroke-linecap="round"/>
    <rect x="148" y="165" width="104" height="88" rx="4" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
  `,

  bag: `
    <rect x="115" y="145" width="170" height="130" rx="12" fill="url(#fab)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M145 145 Q145 105 200 100 Q255 105 255 145" fill="none" stroke="#888" stroke-width="4"/>
    <rect x="145" y="175" width="110" height="65" rx="4" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
  `,

  mug: `
    <ellipse cx="195" cy="108" rx="72" ry="12" fill="#fff" stroke="#ccc" stroke-width="0.8"/>
    <path d="M123 118 Q123 95 195 92 Q267 95 267 118 L267 268 Q267 288 195 292 Q123 288 123 268 Z" fill="url(#cer)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M267 138 Q318 132 318 195 Q318 252 267 245" fill="none" stroke="url(#cer)" stroke-width="14"/>
    <path d="M267 138 Q318 132 318 195 Q318 252 267 245" fill="none" stroke="#ccc" stroke-width="1"/>
    <rect x="148" y="145" width="85" height="75" rx="4" fill="#000" opacity="0.04" stroke="#ccc" stroke-dasharray="4 3"/>
  `,

  bottle: `
    <rect x="178" y="68" width="44" height="18" rx="6" fill="url(#metal)" stroke="#888" stroke-width="0.6"/>
    <rect x="188" y="52" width="24" height="20" rx="4" fill="url(#metal)"/>
    <path d="M158 86 Q158 72 200 68 Q242 72 242 86 L252 285 Q200 298 148 285 Z" fill="url(#metal)" stroke="#888" stroke-width="0.8"/>
    <rect x="168" y="155" width="64" height="85" rx="4" fill="#000" opacity="0.05" stroke="#aaa" stroke-dasharray="4 3"/>
  `,

  box: `
    <path d="M95 175 L200 125 L305 175 L305 285 L200 335 L95 285 Z" fill="url(#paper)" stroke="#bbb" stroke-width="0.8"/>
    <path d="M95 175 L200 225 L305 175" fill="none" stroke="#ccc" stroke-width="0.8"/>
    <path d="M200 125 L200 225 L200 335" fill="none" stroke="#ccc" stroke-width="0.8"/>
    <path d="M95 175 L200 125 L305 175 L200 225 Z" fill="#fff" opacity="0.5"/>
  `,

  flyer: `
    <rect x="118" y="72" width="164" height="232" rx="3" fill="url(#paper)" stroke="#ccc" stroke-width="0.8" transform="rotate(-4 200 188)"/>
    <rect x="128" y="82" width="164" height="232" rx="3" fill="url(#paper)" stroke="#bbb" stroke-width="0.8" transform="rotate(2 210 198)"/>
    <rect x="138" y="92" width="164" height="232" rx="3" fill="url(#paper)" stroke="#aaa" stroke-width="0.8"/>
    <rect x="158" y="145" width="124" height="88" rx="2" fill="#000" opacity="0.04"/>
  `,

  poster: `
    <rect x="108" y="55" width="184" height="260" rx="2" fill="url(#paper)" stroke="#bbb" stroke-width="0.8"/>
    <rect x="128" y="95" width="144" height="100" rx="2" fill="#000" opacity="0.05"/>
    <rect x="128" y="210" width="100" height="8" rx="1" fill="#ddd"/>
    <rect x="128" y="225" width="120" height="6" rx="1" fill="#eee"/>
  `,

  card: `
    <rect x="95" y="145" width="210" height="130" rx="6" fill="url(#paper)" stroke="#bbb" stroke-width="0.8" transform="rotate(-6 200 210)"/>
    <rect x="105" y="135" width="210" height="130" rx="6" fill="url(#paper)" stroke="#aaa" stroke-width="0.8"/>
    <rect x="125" y="165" width="55" height="6" rx="1" fill="#ddd"/>
    <rect x="125" y="180" width="85" height="4" rx="1" fill="#eee"/>
    <circle cx="275" cy="195" r="22" fill="#000" opacity="0.06"/>
  `,

  rollup: `
    <rect x="88" y="295" width="224" height="22" rx="4" fill="url(#metal)" stroke="#888" stroke-width="0.6"/>
    <rect x="192" y="68" width="16" height="230" rx="2" fill="url(#metal)"/>
    <rect x="108" y="78" width="184" height="218" rx="2" fill="url(#paper)" stroke="#bbb" stroke-width="0.8"/>
    <rect x="128" y="118" width="144" height="100" rx="2" fill="#000" opacity="0.05"/>
  `,

  mesh_banner: `
    <rect x="72" y="95" width="256" height="165" rx="3" fill="#f5f5f5" stroke="#bbb" stroke-width="0.8"/>
    <pattern id="meshp" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#f0f0f0"/>
      <circle cx="4" cy="4" r="1.5" fill="none" stroke="#ccc" stroke-width="0.5"/>
    </pattern>
    <rect x="72" y="95" width="256" height="165" fill="url(#meshp)" opacity="0.8"/>
    <circle cx="88" cy="108" r="7" fill="#ccc" stroke="#888" stroke-width="0.8"/><circle cx="88" cy="108" r="2.5" fill="#666"/>
    <circle cx="312" cy="108" r="7" fill="#ccc" stroke="#888" stroke-width="0.8"/><circle cx="312" cy="108" r="2.5" fill="#666"/>
    <circle cx="88" cy="247" r="7" fill="#ccc" stroke="#888" stroke-width="0.8"/><circle cx="88" cy="247" r="2.5" fill="#666"/>
    <circle cx="312" cy="247" r="7" fill="#ccc" stroke="#888" stroke-width="0.8"/><circle cx="312" cy="247" r="2.5" fill="#666"/>
    <rect x="108" y="130" width="184" height="95" rx="2" fill="#000" opacity="0.04"/>
  `,

  sticker: `
    <rect x="118" y="118" width="164" height="164" rx="82" fill="url(#paper)" stroke="#ccc" stroke-width="0.8"/>
    <rect x="148" y="148" width="104" height="104" rx="52" fill="#000" opacity="0.04" stroke="#ddd" stroke-dasharray="4 3"/>
  `,

  book: `
    <rect x="108" y="88" width="48" height="248" rx="2" fill="#ddd"/>
    <rect x="128" y="78" width="164" height="258" rx="2" fill="url(#paper)" stroke="#bbb" stroke-width="0.8"/>
    <rect x="148" y="118" width="124" height="8" rx="1" fill="#eee"/>
    <rect x="148" y="138" width="100" height="5" rx="1" fill="#f0f0f0"/>
    <rect x="148" y="152" width="110" height="5" rx="1" fill="#f0f0f0"/>
  `,

  notebook: `
    <rect x="118" y="78" width="164" height="258" rx="3" fill="url(#paper)" stroke="#bbb" stroke-width="0.8"/>
    <rect x="148" y="78" width="3" height="258" fill="#e57373" opacity="0.6"/>
    ${[95, 125, 155, 185, 215, 245, 275].map((y) => `<circle cx="132" cy="${y}" r="4" fill="#ccc"/>`).join('')}
  `,

  pen: `
    <rect x="185" y="68" width="30" height="268" rx="4" fill="url(#paper)" stroke="#bbb" stroke-width="0.8" transform="rotate(-8 200 200)"/>
    <polygon points="185,68 200,48 215,68" fill="url(#metal)"/>
    <rect x="192" y="120" width="16" height="80" rx="2" fill="#000" opacity="0.05"/>
  `,
};

// Génère les assets définis + fallbacks pour types manquants
const FALLBACK_MAP = {
  pouch: 'box', paperbag: 'box', cup: 'mug', playing_cards: 'card',
  invitation: 'card', depliant: 'flyer', letterhead: 'flyer', menu: 'book',
  photo_print: 'poster', photobook: 'book', calendar: 'notebook',
  chevalet: 'rollup', xbanner: 'rollup', display: 'rollup', totem: 'rollup',
  photocall: 'poster', flag: 'poster', rigid_panel: 'poster',
  vinyl_sheet: 'sticker', canvas: 'poster', envelope: 'card',
  badge: 'sticker', bracelet: 'sticker', ticket: 'card', lanyard: 'pen',
  keychain: 'pen', pin: 'sticker', usb: 'pen', umbrella: 'poster',
  lighter: 'pen', mousepad: 'poster', phone_case: 'box', stamp: 'card',
  conception: 'flyer', flat: 'flyer',
};

const ALL_KINDS = new Set([
  ...Object.keys(ASSETS),
  ...Object.keys(FALLBACK_MAP),
]);

const FILE_NAMES = {
  playing_cards: 'playing-cards',
  photo_print: 'photo-print',
  mesh_banner: 'mesh-banner',
  vinyl_sheet: 'vinyl-sheet',
  rigid_panel: 'rigid-panel',
  phone_case: 'phone-case',
};

function kindToFile(kind) {
  return (FILE_NAMES[kind] ?? kind.replace(/_/g, '-')) + '.svg';
}

for (const kind of ALL_KINDS) {
  const body = ASSETS[kind] ?? ASSETS[FALLBACK_MAP[kind]];
  if (!body) continue;
  writeFileSync(join(OUT, kindToFile(kind)), wrap(body), 'utf8');
}

console.log(`✓ ${ALL_KINDS.size} assets studio générés dans ${OUT}`);
