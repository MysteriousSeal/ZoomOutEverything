// Camera table: when is the zoom at which scale?
//   node tools/camtime.mjs [from=0] [to=end] [step=0.5]      -> gt, beat, lf, field, centre
//   node tools/camtime.mjs --lf 6.0                           -> every time the camera crosses lf = 6.0
import fs from 'node:fs';
import { at } from '../camera.js';
import { fmtField } from '../world.js';

const tl = JSON.parse(fs.readFileSync(new URL('../build/timeline.json', import.meta.url)));
const beatOf = (t) => { let b = 0; tl.scenes.forEach((s, i) => { if (s.start <= t) b = i; }); return b; };
const a = process.argv.slice(2);
if (a[0] === '--lf') {
  const target = +a[1];
  let prev = at(0, tl).lf;
  for (let t = 1 / 30; t <= tl.total; t += 1 / 30) {
    const lf = at(t, tl).lf;
    if ((prev - target) * (lf - target) <= 0 && prev !== lf) console.log(`t=${t.toFixed(2)}s beat ${beatOf(t)} (${lf > prev ? 'out' : 'in'})`);
    prev = lf;
  }
} else {
  const from = +(a[0] ?? 0), to = +(a[1] ?? tl.total), step = +(a[2] ?? 0.5);
  for (let t = from; t <= to + 1e-9; t += step) {
    const c = at(t, tl);
    console.log(`${t.toFixed(2).padStart(7)}s  b${String(beatOf(t)).padStart(2)}  lf ${c.lf.toFixed(3).padStart(7)}  ${fmtField(c.F).padEnd(26)} centre ${c.x.toExponential(2)}, ${c.y.toExponential(2)}`);
  }
}
