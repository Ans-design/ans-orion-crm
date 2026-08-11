import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const markPath = path.join('public', 'branding', 'ans-logo-mark.png');
const src = PNG.sync.read(fs.readFileSync(markPath));
const { width: w, height: h, data } = src;
const out = new PNG({ width: w, height: h });
const r = Math.round(Math.min(w, h) * 0.18);

function inRound(x, y) {
  if (x < r && y < r) {
    const dx = x - r;
    const dy = y - r;
    return dx * dx + dy * dy <= r * r;
  }
  if (x > w - 1 - r && y < r) {
    const dx = x - (w - 1 - r);
    const dy = y - r;
    return dx * dx + dy * dy <= r * r;
  }
  if (x < r && y > h - 1 - r) {
    const dx = x - r;
    const dy = y - (h - 1 - r);
    return dx * dx + dy * dy <= r * r;
  }
  if (x > w - 1 - r && y > h - 1 - r) {
    const dx = x - (w - 1 - r);
    const dy = y - (h - 1 - r);
    return dx * dx + dy * dy <= r * r;
  }
  return true;
}

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (w * y + x) << 2;
    if (inRound(x, y)) {
      out.data[i] = data[i];
      out.data[i + 1] = data[i + 1];
      out.data[i + 2] = data[i + 2];
      out.data[i + 3] = data[i + 3];
    } else {
      out.data[i] = 0;
      out.data[i + 1] = 0;
      out.data[i + 2] = 0;
      out.data[i + 3] = 0;
    }
  }
}

const buf = PNG.sync.write(out);
const roundedPath = path.join('public', 'branding', 'ans-logo-mark-rounded.png');
fs.writeFileSync(roundedPath, buf);
fs.writeFileSync(path.join('public', 'favicon.png'), buf);
fs.writeFileSync(path.join('public', 'apple-touch-icon.png'), buf);

const b64 = buf.toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="ANS">
  <title>ANS</title>
  <image href="data:image/png;base64,${b64}" width="${w}" height="${h}"/>
</svg>
`;
fs.writeFileSync(path.join('public', 'favicon.svg'), svg);
console.log(`rounded favicon ${w}x${h} radius=${r} bytes=${buf.length}`);
