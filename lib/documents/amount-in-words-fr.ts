const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf',
];

const TENS = [
  '', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix',
];

function underHundred(n: number): string {
  if (n < 20) return UNITS[n];
  if (n < 70) {
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    if (unit === 0) return TENS[ten];
    if (unit === 1 && ten !== 8) return `${TENS[ten]}-et-un`;
    return `${TENS[ten]}-${UNITS[unit]}`;
  }
  if (n < 80) {
    const rest = n - 60;
    if (rest === 11) return 'soixante et onze';
    return `soixante-${underHundred(rest)}`;
  }
  if (n < 100) {
    const rest = n - 80;
    if (rest === 0) return 'quatre-vingts';
    return `quatre-vingt-${underHundred(rest)}`;
  }
  return '';
}

function underThousand(n: number): string {
  if (n < 100) return underHundred(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let head = hundreds === 1 ? 'cent' : `${UNITS[hundreds]} cent`;
  if (rest === 0 && hundreds > 1) head += 's';
  return rest ? `${head} ${underHundred(rest)}` : head;
}

function numberToFrench(n: number): string {
  if (n === 0) return UNITS[0];
  if (n < 0) return `moins ${numberToFrench(-n)}`;

  const parts: string[] = [];

  const billions = Math.floor(n / 1_000_000_000);
  if (billions > 0) {
    parts.push(billions === 1 ? 'un milliard' : `${underThousand(billions)} milliards`);
    n %= 1_000_000_000;
  }

  const millions = Math.floor(n / 1_000_000);
  if (millions > 0) {
    parts.push(millions === 1 ? 'un million' : `${underThousand(millions)} millions`);
    n %= 1_000_000;
  }

  const thousands = Math.floor(n / 1000);
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mille' : `${underThousand(thousands)} mille`);
    n %= 1000;
  }

  if (n > 0) parts.push(underThousand(n));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Montant TTC en lettres (ariary malgache). */
export function formatAmountInWordsAr(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  const rounded = Math.round(amount);
  if (rounded === 0) return 'zéro ariary';
  const words = numberToFrench(Math.abs(rounded));
  const prefix = rounded < 0 ? 'moins ' : '';
  return `${prefix}${words} ariary`;
}
