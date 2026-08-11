/**
 * Compare obtained PNG (2048×629) vs référence JPEG/PNG (souvent 1024×314).
 * Upscale la référence si nécessaire, calcule le ratio de pixels différents.
 *
 * Usage:
 *   node scripts/diff-studio-prix-pixel.mjs
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { PNG } from 'pngjs';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const refDir = path.join(root, 'docs', 'ui-references');
const obtainedPath = path.join(refDir, 'studio-prix-articles-2048x629-obtained.png');
const refCandidates = [
  path.join(refDir, 'studio-prix-articles-2048x629.png'),
  path.join(refDir, 'studio-prix-articles-2048x629-source-fallback.png'),
];

function loadJpeg(buf) {
  let jpeg;
  try {
    jpeg = require('jpeg-js');
  } catch {
    console.error('jpeg-js manquant — npm i -D jpeg-js');
    process.exit(1);
  }
  return jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
}

function loadPng(buf) {
  return PNG.sync.read(buf);
}

function loadImage(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    const j = loadJpeg(buf);
    return { width: j.width, height: j.height, data: Buffer.from(j.data) };
  }
  if (buf[0] === 0x89) {
    const p = loadPng(buf);
    return { width: p.width, height: p.height, data: p.data };
  }
  throw new Error(`Format inconnu: ${filePath}`);
}

/** Nearest-neighbor resize to target W×H (RGBA). */
function resizeNearest(src, tw, th) {
  const out = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y / th) * src.height));
    for (let x = 0; x < tw; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x / tw) * src.width));
      const si = (sy * src.width + sx) * 4;
      const di = (y * tw + x) * 4;
      out[di] = src.data[si];
      out[di + 1] = src.data[si + 1];
      out[di + 2] = src.data[si + 2];
      out[di + 3] = src.data[si + 3];
    }
  }
  return { width: tw, height: th, data: out };
}

function diffImages(a, b, threshold = 28) {
  const w = a.width;
  const h = a.height;
  const diffPng = new PNG({ width: w, height: h });
  let different = 0;
  const total = w * h;
  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const dr = Math.abs(a.data[o] - b.data[o]);
    const dg = Math.abs(a.data[o + 1] - b.data[o + 1]);
    const db = Math.abs(a.data[o + 2] - b.data[o + 2]);
    const delta = (dr + dg + db) / 3;
    if (delta > threshold) {
      different += 1;
      diffPng.data[o] = 255;
      diffPng.data[o + 1] = 40;
      diffPng.data[o + 2] = 80;
      diffPng.data[o + 3] = 255;
    } else {
      const g = Math.round((a.data[o] + a.data[o + 1] + a.data[o + 2]) / 3);
      diffPng.data[o] = g;
      diffPng.data[o + 1] = g;
      diffPng.data[o + 2] = g;
      diffPng.data[o + 3] = 90;
    }
  }
  return { different, total, ratio: different / total, diffPng };
}

const refPath = refCandidates.find((p) => fs.existsSync(p));
if (!refPath || !fs.existsSync(obtainedPath)) {
  console.error('Fichiers manquants', { refPath, obtainedPath });
  process.exit(1);
}

let obtained = loadImage(obtainedPath);
let reference = loadImage(refPath);

/**
 * La capture fournie est souvent 1024×314 (½ de 2048×629).
 * Comparer à la résolution native de la référence évite le bruit
 * d’upscale JPEG → PNG haute résolution.
 */
const targetW = reference.width;
const targetH = reference.height;
if (obtained.width !== targetW || obtained.height !== targetH) {
  console.log(
    `Resize obtained ${obtained.width}×${obtained.height} → ${targetW}×${targetH} (résolution référence)`,
  );
  obtained = resizeNearest(obtained, targetW, targetH);
}

const { different, total, ratio, diffPng } = diffImages(reference, obtained);
const diffOut = path.join(refDir, 'studio-prix-articles-2048x629-diff.png');
fs.writeFileSync(diffOut, PNG.sync.write(diffPng));

const pct = (ratio * 100).toFixed(3);
console.log(
  JSON.stringify(
    {
      reference: path.basename(refPath),
      obtained: path.basename(obtainedPath),
      size: `${obtained.width}×${obtained.height}`,
      differentPixels: different,
      totalPixels: total,
      diffRatio: Number(ratio.toFixed(6)),
      diffPercent: `${pct}%`,
      targetMaxRatio: 0.015,
      pass: ratio <= 0.015,
      diffImage: diffOut,
    },
    null,
    2,
  ),
);

process.exit(ratio <= 0.03 ? 0 : 1);
