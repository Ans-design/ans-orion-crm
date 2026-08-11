/**
 * One-shot: convert Admin monetary Float fields → Int in prisma/schema.prisma
 * Does NOT touch % / dimensions / qty / multipliers.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const path = resolve(process.cwd(), 'prisma/schema.prisma');
let s = readFileSync(path, 'utf8');

const moneyFields = [
  'unitPrice',
  'blankUnitPrice',
  'finalUnitPrice',
  'directPrice',
  'basePrice',
  'maxSafetyPrice',
  'materialCost',
  'printCost',
  'prixM2',
  'prixCm2',
  'sourcePriceAr',
  'salePriceAr',
  'amount',
  'montant',
  'costMGA',
  'prixAchat',
  'cout',
  'price',
  'prixVierge',
  'prixTechnique',
  'prixSupportVierge',
  'prixMarquage',
  'prixLabor',
  'valeurRemise',
  'discountValue',
  'pricePerM2',
  'pricePerLinearMeter',
  'prixHt',
  'prixViergeHt',
  'prixMinimum',
  'prixStandardHt',
  'supplementAr',
  'cutAr',
  'prixA4Nb',
  'prixA4Quadri',
  'numerotationArPerPage',
  'reliureAr',
  'perforationArPerA4',
  'couverture300gA3RectoAr',
  'prixPageA4',
  'softCoverSupplement',
  'rigidCoverSupplement',
  'leatherCoverSupplement',
  'customCoverSupplement',
  'prixBaseA4',
  'optionalSupplement',
  'priceAr',
  'badgeCutAr',
  'ticketCutAr',
  'ticketQrAr',
  'budget',
];

let count = 0;
for (const f of moneyFields) {
  const re = new RegExp(`(\\b${f}\\s+)Float(\\??)`, 'g');
  s = s.replace(re, (_m, a, q) => {
    count += 1;
    return `${a}Int${q}`;
  });
}

writeFileSync(path, s);
console.log(`replacements: ${count}`);

const leftovers: string[] = [];
for (const f of moneyFields) {
  const m = s.match(new RegExp(`\\b${f}\\s+Float`));
  if (m) leftovers.push(`${f}: ${m[0]}`);
}
console.log('leftover money Float:', leftovers.length ? leftovers : 'none');
