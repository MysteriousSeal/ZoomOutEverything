// Beat 3 — "One by one, | the lights would go out." Env switches the city off DISTRICT BY DISTRICT (env districtOff:
// feeder order along the street grid from the Ravenswood plant, ragged, with flickers and late holdouts). This scene
// adds the life of that failure: a brief brown-out shimmer over the whole lit city, a blue-white transformer pop at each
// district's substation corner the instant it dies, and afterwards the city's last lights: red aircraft-warning
// beacons on the tallest towers (battery backed) that keep blinking into beat 4, then die one by one.
import * as L from '../../../../engine/runtime/lib.js';
import { PLANT } from '../camera.js';
import { cityState, worldRect, glowDot, onLand, addLand, DIST, districtOff } from '../env.js';
import { label } from './s01-lights-on.js';

const { W, H } = L;
const hash = (a, b, s = 0) => { const n = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
const SPARK = [200, 225, 255];
const BEACON = [255, 40, 30];

/** Brown-out: the whole lit city dims and flickers for a moment, just before the first districts drop. */
function brownOut(c, v, st) {
  const t = v.t;
  const env = L.clamp((t + 0.45) / 0.2) * (1 - L.clamp((t - 0.05) / 0.35));
  if (env <= 0 || st.blackR === Infinity) return;
  const fl = 0.5 + 0.5 * L.noise1(v.gt * 30, 41);
  c.save();
  c.beginPath(); addLand(c, v);
  c.fillStyle = `rgba(2,3,8,${0.42 * env * fl})`;
  c.fill('nonzero');
  c.restore();
}

/** A transformer pop at each district's substation corner as it dies (bounded by the view). */
function pops(c, v) {
  const t3 = v.t;
  if (t3 < 0 || t3 > 3.4) return;
  const R = worldRect(v, 40);
  const i0 = Math.floor(R.x0 / DIST.w), i1 = Math.ceil(R.x1 / DIST.w), j0 = Math.floor(R.y0 / DIST.h), j1 = Math.ceil(R.y1 / DIST.h);
  if ((i1 - i0) * (j1 - j0) > 4000) return;
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const off = districtOff(i, j);
      const u = t3 - off;
      if (u < -0.02 || u > 0.4) continue;
      const x = (i + 0.15 + 0.7 * hash(i, j, 52)) * DIST.w, y = (j + 0.15 + 0.7 * hash(i, j, 53)) * DIST.h;
      if (!onLand(x, y)) continue;
      const a = Math.exp(-(((u - 0.03) / 0.09) ** 2)) * (0.55 + 0.45 * hash(i, j, 54));
      const sx = v.wx(x), sy = v.wy(y);
      glowDot(c, sx, sy, 22, SPARK, 0.6 * a);
      glowDot(c, sx, sy, 5, [255, 255, 255], 0.9 * a);
      // the district's last warm afterglow, collapsing to the pop
      glowDot(c, v.wx((i + 0.5) * DIST.w), v.wy((j + 0.5) * DIST.h), v.ws(520) * (1 - 0.6 * L.clamp(u / 0.3)), [255, 200, 130], 0.18 * Math.exp(-u / 0.12));
    }
  }
}

// the tallest towers (world metres, real places): their red aircraft beacons are battery backed and outlive the grid
const TOWERS = [
  [-260, -925], [-300, -760], [-190, -500], [-470, -1160], [-120, -1300],          // Lower Manhattan / One WTC
  [-342, -5345], [-567, -6047], [-420, -6400], [-180, -6900], [-610, -7350],        // Midtown, Empire State
  [-900, -7200], [-210, -7700], [-770, -6800], [120, -6200], [-1300, -4800],
  [2600, -6500], [1800, -500], [-2300, -1400], [-2050, -800],                         // LIC, Downtown Brooklyn, Jersey City
];
function beacons(c, v, st) {
  const t3 = v.t;
  if (t3 < 0.5 || t3 > 8) return;
  const m = v.cam.mpp;
  for (const [x, y] of TOWERS) {
    const h = hash(x, y, 81);
    const die = 3.2 + 4.2 * h;                                   // the batteries run out one by one (into beat 4)
    const k = L.clamp((t3 - 1.0) / 0.4) * (1 - L.clamp((t3 - die) / 0.25));
    if (k <= 0) continue;
    const ph = (v.gt * 0.9 + h * 7) % 1.5;                       // a slow blink
    const on = ph < 0.55 ? Math.sin((ph / 0.55) * Math.PI) : 0;
    if (on <= 0.02) continue;
    const sx = v.wx(x), sy = v.wy(y);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    glowDot(c, sx, sy, Math.max(20, 230 / m), BEACON, 0.55 * on * k);
    glowDot(c, sx, sy, 4.2, [255, 170, 150], 0.95 * on * k);
  }
}

/** The plant pops once as the first feeder trips (the epicentre). */
function epicentre(c, v) {
  const a = Math.exp(-(((v.t - 0.18) / 0.16) ** 2));
  if (a < 0.02) return;
  const sx = v.wx(PLANT.x), sy = v.wy(PLANT.y);
  glowDot(c, sx, sy, 60, SPARK, 0.5 * a);
  glowDot(c, sx, sy, 14, [255, 255, 255], 0.8 * a);
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'Blackout', sub: 'Eight hours without us' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: 0.1, name: 'deep', gain: 0.45, pitch: 0.6 },
      { t: 0.18, name: 'impact', gain: 0.28, pitch: 0.7 },
      { t: 0.55, name: 'tick', gain: 0.14, pitch: 1.6 },
      { t: 0.85, name: 'tick', gain: 0.13, pitch: 1.3 },
      { t: 1.2, name: 'tick', gain: 0.12, pitch: 1.8 },
      { t: 1.55, name: 'swish', gain: 0.2, pitch: 0.7 },
      { t: 2.45, name: 'impact', gain: 0.3, pitch: 0.5 },
      { t: 3.0, name: 'blip', gain: 0.14, pitch: 0.6 },
    ].filter((c) => c.t < d);
  },
  drawWorld(ctx, v) {
    if (v.t < -0.6 || v.t > 8.2) return;
    const st = cityState(v);
    if (v.t < 4) { brownOut(ctx, v, st); pops(ctx, v); epicentre(ctx, v); }
    beacons(ctx, v, st);
  },
  drawOverlay(ctx, v) {
    label(ctx, v, 'LIGHTS OUT', 'the grid fails', 0.4, 1.0);
  },
};
