// Beat 7 — "At five kilometers, most of the seafloor is dry: | vast, flat abyssal plains."
// The camera turns to the North Atlantic basins (32°, −42°) while the sea drops −3,000 → −5,000 m (41.81–44.66). The
// rust-brown abyssal plains come up either side of the ridge (env's sediment colours); pools stay in the deepest basins.
//   * A live counter "NN%" / "of the seafloor is dry", from env's wetFraction (the grid's hypsometry): it climbs with
//     the drain and lands on 79 % exactly as the sea reaches −5,000 m (a short flash).
//   * On "vast, flat abyssal plains": a pin on a dry, flat plain (the Newfoundland Basin floor, 42.3° N 42.7° W: −4,890 m
//     in the grid, < 170 m of relief over 2° × 2°, so it is dry at −5 km) with the callout ABYSSAL PLAIN.
// The ridge seam (s06) stays on, dimmer, behind.
import * as L from '../../../../engine/runtime/lib.js';
import { SEA, project, seaLevel, wetFraction } from '../env.js';
import { drawPin, labelBlock, wordAt } from './s06-ridge.js';

const PLAIN = { lat: 42.3, lon: -42.7 };
const dryPct = (s) => (1 - wetFraction(s)) * 100;
const FINAL = Math.round(dryPct(SEA.abyss));          // 79

export default {
  beat: 7,
  chapter: { num: '06', title: 'Abyssal plains' },
  layer: 7,
  cues(d) {
    // beat starts 41.36: counter in on "five" (41.70 → +0.3), lands as the sea reaches −5,000 m (44.66 → +3.3),
    // the pin on "vast" (45.02 → +3.65)
    return [
      { t: 0.32, name: 'count', gain: 0.2, pitch: 0.9 },
      { t: 3.3, name: 'tick', gain: 0.34, pitch: 0.95 },
      { t: 3.66, name: 'ping', gain: 0.24, pitch: 0.9 },
    ];
  },
  drawOverlay(c, v) {
    const five = wordAt(v.tl, 7, 'five'), vast = wordAt(v.tl, 7, 'vast');
    const t0 = five ? five.start - 0.1 : v.tl.scenes[7].start + 0.3;
    const k = v.k * L.prog(v.gt, t0, 0.55);
    const s = seaLevel(v);
    const pct = s <= SEA.abyss + 0.5 ? FINAL : Math.min(FINAL, Math.round(dryPct(s)));
    // flash when the counter lands (the sea reaches −5 km)
    const landK = s <= SEA.abyss + 0.5 ? 1 : 0;
    const flash = landK * Math.exp(-Math.pow((v.gt - landTime(v)) / 0.3, 2));
    labelBlock(c, { x: 80, y: 568, big: `${pct}%`, small: 'of the seafloor is dry', k, flash, size: 112 });
    // the plain: pin + callout on "vast, flat abyssal plains"
    const pk = vast ? L.prog(v.gt, vast.start - 0.1, 0.6) : 0;
    if (pk > 0) {
      const p = project(v, PLAIN.lat, PLAIN.lon);
      const a = v.k * L.smoothstep(L.clamp((p.z - 0.15) / 0.2));
      drawPin(c, p.x, p.y, pk, L.prog(v.gt, vast.start, 0.9), a);
      callout(c, p.x, p.y, { name: 'ABYSSAL PLAIN', k: L.prog(v.gt, vast.start + 0.05, 0.8), a, dx: -105, dy: -62, size: 42 });
    }
  },
};

let cacheTl = null, cacheLand = 0;
/** global time the display sea level first reaches −5,000 m in this beat */
function landTime(v) {
  if (cacheTl === v.tl) return cacheLand;
  let t = v.tl.scenes[7].start;
  const end = v.tl.scenes[8].start;
  for (; t < end; t += 1 / 120) if (seaLevelAt(v, t) <= SEA.abyss + 0.5) break;
  cacheTl = v.tl; cacheLand = t;
  return t;
}
const seaLevelAt = (v, t) => seaLevel({ gt: t, tl: v.tl });

/** Pin callout: hairline leader from the pin to an elbow (dx, dy), a short run, then the name (right-aligned to the left). */
function callout(c, x, y, { name, k, a = 1, dx, dy, size = 46 }) {
  if (k <= 0 || a <= 0.01) return;
  const e = L.ease.outCubic(L.clamp(k));
  const ex = x + dx, ey = y + dy, dir = dx < 0 ? -1 : 1;
  c.save();
  c.globalAlpha *= a;
  const ang = Math.atan2(dy, dx);
  const sx = x + Math.cos(ang) * 14, sy = y + Math.sin(ang) * 14;
  const l1 = L.clamp(e * 1.6), l2 = L.clamp(e * 1.6 - 0.6);
  c.strokeStyle = 'rgba(235,242,248,0.85)';
  c.lineWidth = 1.6;
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6;
  c.beginPath();
  c.moveTo(sx, sy);
  c.lineTo(L.lerp(sx, ex, l1), L.lerp(sy, ey, l1));
  if (l2 > 0) c.lineTo(ex + dir * 30 * l2, ey);
  c.stroke();
  const tk = L.clamp(e * 1.5 - 0.35);
  if (tk > 0) {
    const tx = ex + dir * 42;
    const maxW = dir < 0 ? tx - 70 : 900 - tx;
    const fs = L.fitSize(c, name, maxW, size, 800, L.FONT.display, 24);
    c.save();
    c.globalAlpha *= L.clamp(tk * 1.4);
    c.beginPath(); c.rect(dir < 0 ? tx - 900 : tx - 4, ey - fs * 0.9, 904, fs * 1.4); c.clip();
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(2,8,18,0.8)'; c.shadowBlur = 14;
    c.font = L.font(fs, 800, L.FONT.display);
    c.fillStyle = 'rgba(245,248,252,0.98)';
    const te = L.ease.outCubic(tk);
    L.trackedText(c, name, tx, ey + fs * 0.34 + (1 - te) * fs * 0.8, 1, dir < 0 ? 'right' : 'left');
    c.restore();
  }
  c.restore();
}
