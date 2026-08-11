import fs from 'fs';

function bal(t) {
  let n = 0;
  let inS = false;
  let inD = false;
  let inT = false;
  let esc = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === '\\' && (inS || inD || inT)) {
      esc = true;
      continue;
    }
    if (!inD && !inT && c === "'") {
      inS = !inS;
      continue;
    }
    if (!inS && !inT && c === '"') {
      inD = !inD;
      continue;
    }
    if (!inS && !inD && c === '`') {
      inT = !inT;
      continue;
    }
    if (inS || inD || inT) continue;
    if (c === '{') n++;
    else if (c === '}') n--;
  }
  return n;
}

const files = [
  'e2e/helpers/bo-pos-evidence.ts',
  'e2e/backoffice-pos-pricing-evidence.spec.ts',
  'e2e/backoffice-pos-pricing-negative.spec.ts',
  'e2e/backoffice-pos-responsive.spec.ts',
  'e2e/helpers/commercial.ts',
  'lib/auth/margin-access.ts',
  'lib/pricing/calculate.ts',
  'app/(app)/pos/[id]/page.tsx',
  'middleware.ts',
  'scripts/e2e-bo-pos-run.mjs',
];

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const end = t.trimEnd().slice(-60).replace(/\n/g, '|');
  console.log(`${bal(t)}\t${t.length}\t${f}\t…${end}`);
}
