// Environment for "What If the Sun Became a Black Hole?". Owned by the orchestrator — builders: read, don't edit.
//
// Draws the persistent world: the sky (day / night by the light front), the city street on the top of the planet,
// the coast, the ocean cross-section and the rock below, the globe (continents, city lights, terminator, frost), the
// Sun / black hole / red giant / white dwarf at SUN, the expanding front of the LAST SUNLIGHT, the starfield, and the
// HUD (top bar + ONE right-hand readout per beat: the elapsed clock or the true-scale bar).
// The story state is a pure function of global time (see "story state" below): import it, never re-derive it.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, niceLen, stars, topBar } from '../../../engine/runtime/kit.js';
import { drawEarth } from '../../../engine/runtime/earth.js';
import {
  AU, C, COAST, EARTH, R_EARTH, R_GIANT, R_SUN, R_WD, RS, SEA_Y, SUN, SUN_DIR, film,
} from './camera.js';

const { W, H } = L;
export const ACCENT = [190, 140, 255];
export { AU, C, EARTH, R_EARTH, R_SUN, RS, SUN, SUN_DIR };
export const YEAR = 365.25 * 86400;

// ------------------------------------------------------------------ monotone cubic (Fritsch–Carlson / Butland)
export function pchip(P) {
  const n = P.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = P[i + 1][0] - P[i][0]; d[i] = (P[i + 1][1] - P[i][1]) / h[i]; }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (3 * (h[i - 1] + h[i])) / ((2 * h[i] + h[i - 1]) / d[i - 1] + (h[i] + 2 * h[i - 1]) / d[i]);
  }
  return (x) => {
    if (x <= P[0][0]) return P[0][1];
    if (x >= P[n - 1][0]) return P[n - 1][1];
    let i = 0;
    while (x > P[i + 1][0]) i++;
    const t = (x - P[i][0]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * P[i][1] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * P[i + 1][1] + (t3 - t2) * h[i] * m[i + 1];
  };
}

// ------------------------------------------------------------------ story state (global seconds, from build/timeline.json)
// The Sun collapses at T_COLLAPSE ("For eight minutes…" starts). The hook's shrinking Sun is a flash-forward that
// beat 1 rewinds. The LAST SUNLIGHT then expands from SUN at c × elapsed: it touches Earth's sunward limb at
// T_DARK0 and has swept past the far side at T_DARK1 ("the sky would go dark"), and the clock lands on 8:20.
export const T = {
  collapse: 8.70,
  dark0: 22.4, dark1: 23.2, clock820: 23.2,   // the clock turns 8:20 exactly as the last glint leaves the limb
  frontFade: 23.9,                 // the stalled front fades out before beat 6's fly-off path (25.0)
  cold: 52.45,                     // "Back on Earth": the clock resumes
  restore: 72.35, restored: 73.35, // the black hole re-inflates into the Sun once the beat-16 flight has arrived (on screen)
  future: 79.85,                   // "In about five billion years": the future clock starts
  giant0: 82.1, giant1: 84.3,      // "swell into a red giant"
  wd0: 84.9, wd1: 86.6,            // "then shrink to a white dwarf"
};
const D0 = (AU - R_EARTH) / C;
const ACT1 = pchip([[T.collapse, 0], [12.2, 110], [15.3, 265], [18.5, 420], [21.0, 488], [T.dark0, D0], [T.clock820, 500.2]]);
const ACT2 = pchip([[T.cold, Math.log10(500)], [54.0, Math.log10(6 * 3600)], [56.3, Math.log10(2 * 86400)], [58.6, Math.log10(7 * 86400)],
  [61.5, Math.log10(21 * 86400)], [64.6, Math.log10(YEAR)], [70.4, Math.log10(25 * YEAR)]]);
const FUT = pchip([[T.future, 0], [81.5, Math.log10(5e9)], [T.giant1, Math.log10(7.6e9)], [T.wd1, Math.log10(7.8e9)]]);

/** Seconds since the collapse (0 before it, holds 500 = 8:20 until "Back on Earth", then weeks → years). */
export function elapsedAt(gt) {
  if (gt < T.cold) return Math.max(0, ACT1(gt));
  return Math.pow(10, ACT2(gt));
}
/** Years from today, for the closing future clock (0 before T.future). */
export const futureYears = (gt) => (gt < T.future ? 0 : Math.pow(10, FUT(gt)) - (gt < 81.5 ? 1 : 0));

/** Radius (m) of the dark sphere behind the last sunlight (0 before the collapse; the front stalls at 500 light-s). */
export const lightR = (gt) => (gt < T.collapse ? 0 : C * Math.min(500, elapsedAt(Math.min(gt, T.cold))));
/** Radius (m) of the NEW sunlight after the twist (the Sun re-inflates and shines again). */
export const lightR2 = (gt) => (gt < T.restore + 0.3 ? 0 : 1.1e10 * (gt - T.restore - 0.3));
/** 0..1 visibility of the last-light front ring (fades when the orbit view begins). */
export const frontK = (gt) => (gt < T.collapse ? 0 : 1 - L.ease.inOutCubic(L.prog(gt, T.frontFade, 0.9)));

/** Is the world point lit by the Sun at time gt? (1 lit, 0 dark; the front is a plane at Earth scale.) */
export function sunlitAt(x, y, gt) {
  const d = (x - SUN.x) * -SUN_DIR.x + (y - SUN.y) * -SUN_DIR.y;   // distance from the Sun along the Sun→Earth axis
  if (gt < T.collapse) return 1;
  if (gt >= T.restore) return d < lightR2(gt) ? 1 : 0;
  return d > lightR(gt) ? 1 : 0;
}
/** Daylight at the street (0..1): 1 until the front sweeps Earth, 0 after (eased across the sweep). */
export function dayK(gt) {
  if (gt < T.restore) return 1 - L.smoothstep(L.prog(gt, T.dark0 + 0.15, T.dark1 - T.dark0));
  return L.clamp((lightR2(gt) - AU) / (2 * R_EARTH));
}
/** Freezing of Earth's surface, 0..1 (globe frost by ~56 s, the street by ~59.5 s, the sea skin by ~64.6 s). */
export function freezeK(gt) {
  if (gt < T.cold) return 0;
  if (gt >= T.restore) return 1 - L.ease.inOutCubic(L.prog(gt, T.restored, 3));
  return L.clamp(pchip([[T.cold, 0], [56.0, 0.35], [59.5, 0.8], [64.6, 1]])(gt));
}

/** The star at SUN: {mode: 'sun'|'bh'|'restore'|'giant'|'wd', r (m), col, bh (0..1 black-hole look)}. */
export function starState(gt) {
  const lg = (a, b, k) => Math.exp(L.lerp(Math.log(a), Math.log(b), k));
  if (gt < T.collapse) return { mode: 'sun', r: R_SUN, col: [255, 236, 200], bh: 0 };
  if (gt < T.restore) return { mode: 'bh', r: RS, col: [255, 236, 200], bh: 1 };
  if (gt < T.restored) {
    const k = L.ease.inOutCubic(L.prog(gt, T.restore, T.restored - T.restore));
    return { mode: 'restore', r: lg(RS, R_SUN, k), col: [255, 236, 200], bh: 1 - L.clamp(k * 3) };
  }
  if (gt < T.giant0) return { mode: 'sun', r: R_SUN, col: [255, 236, 200], bh: 0 };
  if (gt < T.wd0) {
    const k = L.ease.inOutCubic(L.prog(gt, T.giant0, T.giant1 - T.giant0));
    return { mode: 'giant', r: lg(R_SUN, R_GIANT, k), col: L.mix([255, 236, 200], [255, 120, 70], k), bh: 0 };
  }
  const k = L.ease.inOutCubic(L.prog(gt, T.wd0, T.wd1 - T.wd0));
  return { mode: 'wd', r: lg(R_GIANT, R_WD, k), col: L.mix([255, 120, 70], [215, 230, 255], L.clamp(k * 1.4)), bh: 0, k };
}

/** Seabed depth below street level (m) for x > COAST: harbour 14 m, shelf, slope to ~4 km by x ≈ 9 km. */
const BED = pchip([[COAST, 14], [420, 16], [1200, 60], [2600, 130], [4200, 210], [5600, 900], [7200, 2900], [8800, 3950], [12000, 4250], [40000, 4400]]);
export const seabedDepth = (x) => BED(x) + 18 * L.noise1(x / 700, 5) + 6 * L.noise1(x / 130, 6);

// ------------------------------------------------------------------ the street (side elevation, on the top of the planet)
// Buildings face us across the street; bases at y = 0. A small park (trees, low) leaves the upper-left sky open for the
// Sun. Deterministic: BUILDINGS = [{x0, x1, h, pal, seed}], TREES = [{x, h, r}], LAMPS = [x].
const PAL = [[188, 176, 158], [166, 110, 86], [104, 128, 150], [204, 194, 176], [138, 132, 124]];
export const BUILDINGS = [];
export const TREES = [];
export const LAMPS = [];
(() => {
  const r = L.rng(1616);
  let x = -420;
  while (x < COAST - 30) {
    if (x > -26 && x < -3) { x = -3; continue; }                 // the park
    const w = 9 + r() * 14, gap = r() < 0.25 ? 2 + r() * 4 : 0.4;
    const x1 = Math.min(x + w, COAST - 30);
    const tall = r();
    const h = x < -60 || x > 60 ? 24 + tall * 46 : 22 + tall * 30;
    BUILDINGS.push({ x0: x, x1, h, pal: (r() * PAL.length) | 0, seed: (r() * 1e6) | 0, crown: r() });
    x = x1 + gap;
  }
  for (let tx = -24; tx < -4; tx += 4.5 + r() * 2) TREES.push({ x: tx, h: 7 + r() * 4, r: 2.4 + r() * 1.4, s: r() });
  for (let tx = -400; tx < COAST - 20; tx += 18) if (tx < -27 || tx > -3) TREES.push({ x: tx + 6 + r() * 3, h: 5.5 + r() * 2, r: 1.7 + r() * 0.8, s: r() });
  for (let lx = -410; lx < COAST; lx += 16) LAMPS.push(lx);
})();
const FAR = [];   // a hazy far skyline (screen-space parallax at street scale only)
(() => { const r = L.rng(77); let x = -1600; while (x < 1600) { const w = 16 + r() * 34; FAR.push({ x0: x, x1: x + w, h: 30 + r() * r() * 120 }); x += w + r() * 10; } })();

/** The two vertical flights between the street and the globe (beat 3 out, beat 14 back in): there the street fades
 *  early and hands straight over to the real globe, with no side-view terrain slab in between. */
const FLY = [[12.6, 16.3], [56.2, 58.9]];
export const inFly = (gt) => FLY.some(([a, b]) => gt >= a && gt <= b);
/** Street visibility for a camera scale (and time: earlier fade inside the flights). */
export function streetFade(mpp, gt) {
  if (gt != null && inFly(gt)) return 1 - L.smoothstep(L.clamp(L.invLerp(Math.log(0.14), Math.log(0.5), Math.log(mpp))));
  return mpp > 4 ? 0 : 1 - L.clamp(L.invLerp(Math.log(1.6), Math.log(4), Math.log(mpp)));
}

function drawStreet(c, v) {
  const mpp = v.cam.mpp;
  const fade = streetFade(mpp, v.gt);
  if (fade <= 0.001) return;
  const day = dayK(v.gt), frost = freezeK(v.gt);
  const xL = v.cam.x - (W / 2 + 40) * mpp, xR = v.cam.x + (W / 2 + 40) * mpp;
  const gy = v.wy(0);
  c.save();
  c.globalAlpha = fade;
  // far skyline (parallax 0.55), atmospheric haze
  if (mpp < 1.2) {
    const pk = 1 - L.clamp(L.invLerp(0.3, 1.2, mpp));
    const haze = L.mix([70, 92, 120], [14, 18, 32], 1 - day);
    const FS = 0.3;   // far layer drawn at 30 % scale, drifting at 30 % of the camera's speed
    for (const b of FAR) {
      const sx0 = W / 2 + ((b.x0 - v.cam.x) * FS) / mpp, sx1 = W / 2 + ((b.x1 - v.cam.x) * FS) / mpp;
      if (sx1 < -10 || sx0 > W + 10) continue;
      const top = gy - (b.h * FS) / mpp;
      const fg = c.createLinearGradient(0, top, 0, gy);
      fg.addColorStop(0, L.rgba(L.mix(haze, [235, 225, 210], 0.35 * day), 0.32 * pk));
      fg.addColorStop(1, L.rgba(haze, 0.5 * pk));
      c.fillStyle = fg;
      c.fillRect(sx0, top, sx1 - sx0 + 0.5, gy - top);
    }
  }
  // buildings
  for (const b of BUILDINGS) {
    if (b.x1 < xL || b.x0 > xR) continue;
    const X0 = v.wx(b.x0), X1 = v.wx(b.x1), top = v.wy(-b.h);
    const base = PAL[b.pal];
    const lit = L.mix(L.mix(base, [255, 232, 196], 0.12), [26, 32, 50], 1 - day);
    const shade = L.mix(L.mix(base, [40, 50, 80], 0.42), [14, 18, 32], 1 - day);
    const g = c.createLinearGradient(X0, top, X1, gy);
    g.addColorStop(0, L.rgba(lit)); g.addColorStop(1, L.rgba(shade));
    c.fillStyle = g;
    c.fillRect(X0, top, X1 - X0 + 0.6, gy - top);
    // cornice + roof frost
    c.fillStyle = L.rgba(L.mix(L.mix(lit, [255, 255, 255], 0.15), [225, 238, 255], frost * 0.85), 0.9);
    c.fillRect(X0 - 0.25 / mpp, top - 0.5 / mpp, X1 - X0 + 0.5 / mpp, Math.max(1, (0.6 + frost * 0.4) / mpp));
    if (b.crown > 0.7) {   // rooftop water tank / plant room
      const cw = (b.x1 - b.x0) * 0.28, cx = b.x0 + (b.x1 - b.x0) * (0.2 + 0.5 * ((b.seed % 100) / 100));
      c.fillStyle = L.rgba(shade, 0.95);
      c.fillRect(v.wx(cx), v.wy(-b.h - 3), cw / mpp, 3 / mpp);
    }
    // windows: floors every 3.4 m, bays every 2.4 m
    const wpx = 1.2 / mpp;
    if (wpx > 2.5) {
      const r = L.rng(b.seed);
      const floors = Math.floor((b.h - 4) / 3.4), bays = Math.max(1, Math.floor((b.x1 - b.x0 - 1.2) / 2.4));
      const bw = (b.x1 - b.x0 - 1.2) / bays;
      for (let f = 0; f < floors; f++) {
        const wy0 = -4 - f * 3.4 - 1.9;
        const sy = v.wy(wy0);
        for (let k = 0; k < bays; k++) {
          const on = r(), tint = r();
          if (sy < -60 || sy > H + 10) continue;
          const wx0 = b.x0 + 0.6 + k * bw + bw * 0.22;
          const sx = v.wx(wx0);
          if (sx > W + 10 || sx + wpx < -10) continue;
          const night = 1 - day;
          const warm = night * (on < 0.42 - frost * 0.15 ? 1 : 0);
          const glass = L.mix(L.mix([60, 80, 105], [150, 185, 215], (1 - (f / Math.max(1, floors))) * 0.5 + tint * 0.2), [8, 11, 20], night);
          c.fillStyle = L.rgba(warm ? L.mix([255, 196, 120], [255, 226, 170], tint) : glass, 0.95);
          c.fillRect(sx, sy, bw * 0.56 / mpp, 1.8 / mpp);
          if (frost > 0.05) { c.fillStyle = `rgba(230,242,255,${0.55 * frost})`; c.fillRect(sx, sy + 1.62 / mpp, bw * 0.56 / mpp, 0.18 / mpp); }
        }
      }
    }
    // contact shadow
    const cs = c.createLinearGradient(0, gy - 3 / mpp, 0, gy);
    cs.addColorStop(0, 'rgba(0,0,0,0)'); cs.addColorStop(1, `rgba(0,0,0,${0.25 + 0.2 * day})`);
    c.fillStyle = cs; c.fillRect(X0, gy - 3 / mpp, X1 - X0, 3 / mpp);
  }
  // trees (layered crowns; in the deep freeze the crowns drop away to bare, frost-edged branches)
  const crownK = 1 - L.smoothstep(L.invLerp(0.22, 0.6, frost));
  for (const t of TREES) {
    if (t.x + t.r < xL || t.x - t.r > xR) continue;
    const tx = v.wx(t.x), ty = v.wy(-t.h);
    const bark = L.rgba(L.mix([58, 46, 38], [10, 12, 18], 1 - day));
    c.fillStyle = bark;
    c.fillRect(tx - 0.12 / mpp, ty, 0.24 / mpp, gy - ty);
    if (crownK < 0.999) {
      // bare branches: a small deterministic fork tree, dark wood with a thin white frost edge on top
      const r = L.rng(Math.floor(t.s * 1e6) + 7);
      const segs = [];
      const grow = (x, y, ang, len, w, depth) => {
        const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
        segs.push([x, y, x2, y2, w]);
        if (depth <= 0) return;
        const n = depth > 1 ? 2 : 3;
        for (let i = 0; i < n; i++) grow(x2, y2, ang + (i - (n - 1) / 2) * 0.55 + (r() - 0.5) * 0.35, len * (0.62 + r() * 0.12), w * 0.62, depth - 1);
      };
      const top = t.h - t.r * 0.9;
      for (let i = 0; i < 3; i++) grow(0, -top, -Math.PI / 2 + (i - 1) * 0.6 + (r() - 0.5) * 0.2, t.r * 0.62, 0.14, 2);
      grow(0, -t.h * 0.45, -Math.PI / 2 - 0.9, t.r * 0.5, 0.1, 1);
      grow(0, -t.h * 0.5, -Math.PI / 2 + 0.95, t.r * 0.5, 0.1, 1);
      c.save();
      c.globalAlpha *= 1 - crownK;
      c.lineCap = 'round';
      for (const [x1, y1, x2, y2, w] of segs) {
        c.strokeStyle = bark;
        c.lineWidth = Math.max(1, w / mpp);
        c.beginPath(); c.moveTo(tx + x1 / mpp, gy + y1 / mpp); c.lineTo(tx + x2 / mpp, gy + y2 / mpp); c.stroke();
      }
      c.strokeStyle = `rgba(222,236,252,${0.75 * frost})`;
      for (const [x1, y1, x2, y2, w] of segs) {
        c.lineWidth = Math.max(0.8, w * 0.35 / mpp);
        c.beginPath(); c.moveTo(tx + x1 / mpp, gy + y1 / mpp - w * 0.45 / mpp); c.lineTo(tx + x2 / mpp, gy + y2 / mpp - w * 0.45 / mpp); c.stroke();
      }
      c.restore();
    }
    if (crownK <= 0.001) continue;
    // frosted leaves read blue-grey (not white): the light rim sits only on the top crown
    const leaf = L.mix(L.mix([70, 112, 70], [22, 34, 40], 1 - day), [96, 112, 134], frost * 0.8);
    for (let i = 0; i < 4; i++) {
      const ox = (L.noise1(i * 3.1 + t.s * 9, 2) * 0.7) * t.r, oy = -i * 0.35 * t.r + 0.4 * t.r;
      const sway = Math.sin(v.gt * 1.1 + t.s * 6 + i) * 0.08 * t.r * (1 - frost);
      c.fillStyle = L.rgba(L.mix(leaf, [255, 240, 200], (0.12 + i * 0.05) * day), 0.92 * crownK);
      c.beginPath(); c.arc(tx + (ox + sway) / mpp, ty + oy / mpp, Math.max(0, t.r * (0.95 - i * 0.12) / mpp), 0, Math.PI * 2); c.fill();
    }
  }
  // lamps
  for (const lx of LAMPS) {
    if (lx < xL || lx > xR) continue;
    const sx = v.wx(lx), top = v.wy(-6.2);
    c.fillStyle = L.rgba(L.mix([60, 64, 72], [18, 20, 28], 1 - day));
    c.fillRect(sx - 0.07 / mpp, top, 0.14 / mpp, gy - top);
    c.fillRect(sx - 0.07 / mpp, top, 0.9 / mpp, 0.12 / mpp);
    const night = 1 - day;
    if (night > 0.01) L.lightBlob(c, sx + 0.8 / mpp, top + 0.25 / mpp, 5 / mpp, [255, 190, 110], 0.42 * night);
  }
  // the street itself, foreshortened: pavement (0-0.3 m), kerb, asphalt with a lane line (to 8 m), far kerb
  {
    const xa = v.wx(xL), xb = v.wx(Math.min(xR, COAST)), wdt = xb - xa;
    const night = 1 - day;
    c.fillStyle = L.rgba(L.mix(L.mix([150, 146, 140], [26, 28, 36], night), [210, 224, 238], frost * 0.7));
    c.fillRect(xa, gy, wdt, 0.5 / mpp);
    const ag = c.createLinearGradient(0, gy + 0.5 / mpp, 0, v.wy(8));
    ag.addColorStop(0, L.rgba(L.mix(L.mix([70, 70, 76], [14, 16, 22], night), [150, 166, 186], frost * 0.55)));
    ag.addColorStop(1, L.rgba(L.mix(L.mix([40, 41, 46], [8, 9, 14], night), [100, 116, 138], frost * 0.5)));
    c.fillStyle = ag;
    c.fillRect(xa, gy + 0.5 / mpp, wdt, 7.5 / mpp);
    c.fillStyle = L.rgba(L.mix([230, 226, 214], [120, 124, 130], night), 0.75);
    const ly = v.wy(4.2), dash = 3, period = 9;
    for (let x0 = Math.floor(xL / period) * period; x0 < Math.min(xR, COAST - 5); x0 += period) c.fillRect(v.wx(x0), ly, dash / mpp, Math.max(1, 0.18 / mpp));
    c.fillStyle = L.rgba(L.mix([120, 118, 112], [20, 22, 28], night));
    c.fillRect(xa, v.wy(8), wdt, 0.4 / mpp);
    // the near pavement (8.4-12 m): pale slabs with joints, a gutter line
    const py0 = v.wy(8.4), py1 = v.wy(12);
    const pg = c.createLinearGradient(0, py0, 0, py1);
    pg.addColorStop(0, L.rgba(L.mix(L.mix([132, 128, 122], [24, 26, 34], night), [200, 214, 230], frost * 0.6)));
    pg.addColorStop(1, L.rgba(L.mix(L.mix([104, 101, 98], [18, 20, 27], night), [160, 176, 196], frost * 0.55)));
    c.fillStyle = pg;
    c.fillRect(xa, py0, wdt, py1 - py0);
    c.fillStyle = L.rgba(L.mix([70, 68, 66], [10, 11, 16], night), 0.6);
    for (let x0 = Math.floor(xL / 1.5) * 1.5; x0 < Math.min(xR, COAST); x0 += 1.5) c.fillRect(v.wx(x0), py0, Math.max(1, 0.03 / mpp), py1 - py0);
    c.fillRect(xa, v.wy(10.2), wdt, Math.max(1, 0.03 / mpp));
    // the foreground (12 m to the bottom of the frame): a granite kerb, then a darker cobbled square nearer the
    // viewer, with bollards and benches, so the street never floats over a void
    const fy0 = v.wy(12), fy1 = Math.max(fy0 + 2, Math.min(H + 20, v.wy(80)));
    if (fy0 < H + 10) {
      c.fillStyle = L.rgba(L.mix(L.mix([168, 162, 152], [34, 36, 46], night), [226, 236, 248], frost * 0.7));
      c.fillRect(xa, fy0, wdt, Math.max(1, 0.35 / mpp));
      const qg = c.createLinearGradient(0, v.wy(12.35), 0, v.wy(40));
      qg.addColorStop(0, L.rgba(L.mix(L.mix([92, 86, 80], [16, 18, 25], night), [150, 166, 188], frost * 0.6)));
      qg.addColorStop(1, L.rgba(L.mix(L.mix([58, 54, 52], [10, 11, 16], night), [92, 106, 128], frost * 0.55)));
      c.fillStyle = qg;
      c.fillRect(xa, v.wy(12.35), wdt, fy1 - v.wy(12.35));
      // cobble courses: rows widen toward the viewer, offset bricks
      c.fillStyle = L.rgba(L.mix(L.mix([40, 38, 36], [6, 7, 10], night), [110, 126, 150], frost * 0.5), 0.55);
      let yy = 12.35, rowH = 0.7, row = 0;
      while (v.wy(yy) < H + 10 && yy < 80) {
        const sy = v.wy(yy);
        c.fillRect(xa, sy, wdt, Math.max(1, 0.035 / mpp));
        const bw = rowH * 1.6, off = (row % 2) * bw * 0.5;
        if (bw / mpp > 6) for (let x0 = Math.floor((xL - off) / bw) * bw + off; x0 < Math.min(xR, COAST); x0 += bw) c.fillRect(v.wx(x0), sy, Math.max(1, 0.03 / mpp), rowH / mpp);
        yy += rowH; rowH *= 1.12; row++;
      }
      // light falling on the square from the sky (day) / lamps (night), deepening toward the viewer
      const sh = c.createLinearGradient(0, fy0, 0, v.wy(34));
      sh.addColorStop(0, `rgba(255,236,210,${0.06 * day})`); sh.addColorStop(0.35, 'rgba(0,0,0,0.08)'); sh.addColorStop(1, 'rgba(4,4,8,0.5)');
      c.fillStyle = sh; c.fillRect(xa, fy0, wdt, fy1 - fy0);
      if (night > 0.01) for (const lx of LAMPS) { if (lx < xL - 10 || lx > xR + 10) continue; L.lightBlob(c, v.wx(lx + 0.8), v.wy(13.5), 9 / mpp, [255, 180, 100], 0.12 * night); }
      // bollards along the kerb (every 4 m) and a bench every 24 m
      const dark = L.rgba(L.mix([44, 44, 50], [8, 9, 13], night));
      const capC = L.rgba(L.mix(L.mix([150, 146, 140], [40, 44, 56], night), [235, 244, 255], frost * 0.8));
      for (let bx = Math.floor(xL / 4) * 4 + 1; bx < Math.min(xR, COAST - 2); bx += 4) {
        const X = v.wx(bx), top = v.wy(13.0 - 1.0);
        c.fillStyle = dark;
        c.fillRect(X - 0.13 / mpp, top, 0.26 / mpp, 1.0 / mpp);
        c.fillStyle = capC;
        c.fillRect(X - 0.15 / mpp, top - 0.06 / mpp, 0.3 / mpp, Math.max(1, 0.12 / mpp));
      }
      for (let bx = Math.floor(xL / 24) * 24 + 13; bx < Math.min(xR, COAST - 4); bx += 24) {
        const X0 = v.wx(bx), X1 = v.wx(bx + 2.2), seat = v.wy(13.6 - 0.48), back = v.wy(13.6 - 0.95);
        c.fillStyle = dark;
        c.fillRect(X0, seat, X1 - X0, 0.08 / mpp);
        c.fillRect(X0, back, X1 - X0, 0.07 / mpp);
        c.fillRect(X0 + 0.1 / mpp, seat, 0.08 / mpp, 0.48 / mpp);
        c.fillRect(X1 - 0.18 / mpp, seat, 0.08 / mpp, 0.48 / mpp);
        if (frost > 0.05) { c.fillStyle = `rgba(232,242,255,${0.8 * frost})`; c.fillRect(X0, seat - 0.05 / mpp, X1 - X0, Math.max(1, 0.06 / mpp)); c.fillRect(X0, back - 0.05 / mpp, X1 - X0, Math.max(1, 0.05 / mpp)); }
      }
      // stone planters with low shrubs, nearer the viewer (y ≈ 16 m)
      for (let bx = Math.floor(xL / 12) * 12 + 5; bx < Math.min(xR, COAST - 6); bx += 12) {
        const X0 = v.wx(bx), X1 = v.wx(bx + 3.2), top = v.wy(16 - 0.7), base = v.wy(16);
        const pr = L.rng(Math.round(bx * 7) + 99);
        const bush = L.mix(L.mix([58, 86, 56], [12, 18, 20], night), [120, 134, 156], frost * 0.75);
        for (let i = 0; i < 5; i++) {
          const ox = 0.35 + i * 0.62 + (pr() - 0.5) * 0.2, rr = 0.42 + pr() * 0.22;
          c.fillStyle = L.rgba(L.mix(bush, [255, 240, 200], 0.1 * day * pr()));
          c.beginPath(); c.arc(v.wx(bx + ox), top - (rr * 0.55) / mpp, Math.max(0, rr / mpp), 0, Math.PI * 2); c.fill();
        }
        if (frost > 0.05) {
          c.fillStyle = `rgba(232,242,255,${0.55 * frost})`;
          for (let i = 0; i < 5; i++) { const ox = 0.35 + i * 0.62; c.beginPath(); c.arc(v.wx(bx + ox), top - 0.75 / mpp, Math.max(0, 0.28 / mpp), Math.PI, 0); c.fill(); }
        }
        const pgc = c.createLinearGradient(0, top, 0, base);
        pgc.addColorStop(0, L.rgba(L.mix(L.mix([150, 144, 134], [30, 32, 42], night), [220, 232, 246], frost * 0.7)));
        pgc.addColorStop(1, L.rgba(L.mix([84, 80, 76], [12, 13, 18], night)));
        c.fillStyle = pgc;
        c.fillRect(X0, top, X1 - X0, base - top);
      }
    }
    // street-lamp pools on the road at night
    if (night > 0.01) for (const lx of LAMPS) { if (lx < xL - 10 || lx > xR + 10) continue; L.lightBlob(c, v.wx(lx + 0.8), v.wy(2.5), 6 / mpp, [255, 180, 100], 0.22 * night); }
  }
  // quay railing at the coast
  if (COAST > xL && COAST - 30 < xR) {
    c.strokeStyle = L.rgba(L.mix([70, 74, 82], [24, 28, 38], 1 - day), 0.9);
    c.lineWidth = Math.max(1, 0.08 / mpp);
    c.beginPath();
    c.moveTo(v.wx(COAST - 28), v.wy(-1.1)); c.lineTo(v.wx(COAST), v.wy(-1.1));
    for (let px = COAST - 28; px <= COAST; px += 2) { c.moveTo(v.wx(px), gy); c.lineTo(v.wx(px), v.wy(-1.1)); }
    c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ local terrain: land, sea, seabed, rock (flat, mpp < ~120)
function drawTerrain(c, v, alpha) {
  const mpp = v.cam.mpp, frost = freezeK(v.gt), day = dayK(v.gt);
  const step = 6;
  const xs = [];
  for (let sx = -12; sx <= W + 12; sx += step) xs.push(sx);
  const wxOf = (sx) => v.cam.x + (sx - W / 2) * mpp;
  const bed = xs.map((sx) => { const x = wxOf(sx); return x < COAST ? 0 : seabedDepth(x); });
  const yTop = (i) => v.wy(bed[i]);
  c.save();
  c.globalAlpha = alpha;
  // rock below everything
  c.beginPath();
  c.moveTo(xs[0], H + 20);
  xs.forEach((sx, i) => c.lineTo(sx, Math.min(H + 20, yTop(i))));
  c.lineTo(xs[xs.length - 1], H + 20);
  c.closePath();
  const rg = c.createLinearGradient(0, v.wy(0), 0, v.wy(0) + 900);
  rg.addColorStop(0, L.rgba(L.mix([30, 30, 36], [14, 14, 20], 1 - day * 0.6)));
  rg.addColorStop(1, '#07070a');
  c.fillStyle = rg;
  c.fill();
  // the land is lit from the sky: a soft horizon glow and a fine rim along the ground line (day only)
  {
    const gy0 = v.wy(0), xs0 = Math.max(-12, Math.min(W + 12, v.wx(COAST)));
    if (gy0 > -20 && gy0 < H && xs0 > 0) {
      const hg = c.createLinearGradient(0, gy0, 0, gy0 + 260);
      hg.addColorStop(0, L.rgba(L.mix([60, 70, 92], [22, 26, 40], 1 - day), 0.9));
      hg.addColorStop(0.35, L.rgba(L.mix([40, 44, 58], [16, 18, 28], 1 - day), 0.55));
      hg.addColorStop(1, 'rgba(10,10,16,0)');
      c.fillStyle = hg;
      c.fillRect(-12, gy0, xs0 + 12, 260);
      c.fillStyle = L.rgba(L.mix([200, 214, 232], [70, 80, 104], 1 - day), 0.55);
      c.fillRect(-12, gy0 - 0.5, xs0 + 12, 1.5);
    }
  }
  // the sea body (x > COAST), surface at SEA_Y
  const seaX0 = v.wx(COAST);
  if (seaX0 < W + 12) {
    const sy = v.wy(SEA_Y);
    if (sy < H + 20) {
      c.beginPath();
      let first = true;
      xs.forEach((sx, i) => { if (wxOf(sx) < COAST) return; if (first) { c.moveTo(Math.max(sx, seaX0), sy); first = false; } c.lineTo(sx, sy); });
      for (let i = xs.length - 1; i >= 0; i--) { if (wxOf(xs[i]) < COAST) break; c.lineTo(xs[i], Math.min(H + 20, yTop(i))); }
      c.lineTo(Math.max(seaX0, -12), Math.min(H + 20, v.wy(seabedDepth(COAST + 1))));
      c.closePath();
      const wg = c.createLinearGradient(0, sy, 0, v.wy(4300));
      wg.addColorStop(0, L.rgba(L.mix([40, 110, 150], [14, 40, 70], 1 - day)));
      wg.addColorStop(0.08, L.rgba(L.mix([20, 70, 112], [10, 30, 58], 1 - day)));
      wg.addColorStop(1, L.rgba([4, 10, 26]));
      c.fillStyle = wg;
      c.fill();
      // surface line (frosts over)
      c.fillStyle = L.rgba(L.mix([150, 205, 230], [220, 236, 255], frost), 0.55 + 0.3 * frost);
      c.fillRect(Math.max(-12, seaX0), sy - 0.5, W + 24, Math.max(1.2, 0.15 / mpp));
      // seabed rim
      c.strokeStyle = 'rgba(120,110,100,0.35)';
      c.lineWidth = 1.5;
      c.beginPath();
      let s0 = true;
      xs.forEach((sx, i) => { if (wxOf(sx) < COAST) return; if (s0) { c.moveTo(sx, yTop(i)); s0 = false; } else c.lineTo(sx, yTop(i)); });
      c.stroke();
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ the globe (face view, mpp > ~40)
// The real Earth (engine/runtime/earth.js, NOAA ETOPO1). Face: southern Africa at the centre, Africa + the South
// Atlantic + Europe on the upper limb (the street, on the top of the disc, sits on the Norwegian coast, sea to its east).
// Light: screen-space from SUN_DIR (upper-left) with a little toward the viewer so the lit face reads.
export const GLOBE = { lon0: 14, lat0: -22, tilt: 0 };
export const SUN_LIGHT = [SUN_DIR.x, -SUN_DIR.y, 0.32];
/** earth.js view of the globe for this frame (shared with scenes that pin things on it). */
export function globeView(v) {
  return { cx: v.wx(EARTH.x), cy: v.wy(EARTH.y), r: v.ws(R_EARTH), lon0: GLOBE.lon0, lat0: GLOBE.lat0, rot: 0.3 * v.gt, tilt: GLOBE.tilt };
}
/** Latitude (deg) the sea ice has crept down to in the big freeze (beats 13-14). */
export const iceLat = (gt) => 74 - 50 * L.ease.inOutCubic(L.prog(gt, 54.0, 3.6)) - 8 * L.prog(gt, 57.6, 2);

/** Screen point of the front plane (distance R from the Sun along the Sun→Earth axis) nearest the screen centre,
 *  clamped to ±6000 px so huge distances keep the right side without overflowing the canvas maths. */
export function frontPoint(v, R) {
  const ax = -SUN_DIR.x, ay = -SUN_DIR.y;
  const dc = ((v.cam.x - SUN.x) * ax + (v.cam.y - SUN.y) * ay - R) / v.cam.mpp;
  const d = L.clamp(dc, -6000, 6000);
  const cy0 = H * (v.cam.anchor ?? 0.5);
  return { fx: W / 2 - ax * d, fy: cy0 - ay * d };
}
function frontClip(c, v, R, keepFar) {
  // half-plane of points farther from the Sun than R (keepFar) or nearer (else), along the Sun→Earth axis
  const ax = -SUN_DIR.x, ay = -SUN_DIR.y;
  const { fx, fy } = frontPoint(v, R);
  const px = -ay, py = ax, BIG = 8000, s = keepFar ? 1 : -1;
  c.beginPath();
  c.moveTo(fx + px * BIG, fy + py * BIG);
  c.lineTo(fx - px * BIG, fy - py * BIG);
  c.lineTo(fx - px * BIG + s * ax * BIG, fy - py * BIG + s * ay * BIG);
  c.lineTo(fx + px * BIG + s * ax * BIG, fy + py * BIG + s * ay * BIG);
  c.closePath();
  c.clip();
}

function drawGlobe(c, v, alpha) {
  const cx = v.wx(EARTH.x), cy = v.wy(EARTH.y), r = v.ws(R_EARTH);
  if (cx + r < -50 || cx - r > W + 50 || cy + r < -50 || cy - r > H + 50) return;
  const frost = freezeK(v.gt), gt = v.gt;
  c.save();
  c.globalAlpha = alpha;
  if (r < 5) {   // a dot at system scale
    const lit = sunlitAt(EARTH.x, EARTH.y - R_EARTH * 0.0, gt) * 0.5 + sunlitAt(EARTH.x + SUN_DIR.x * R_EARTH, EARTH.y + SUN_DIR.y * R_EARTH, gt) * 0.5;
    const col = L.mix(L.mix([96, 120, 160], [235, 245, 255], frost * 0.4), [120, 185, 255], lit);
    L.lightBlob(c, cx, cy, 34, col, 0.4 + 0.3 * lit);
    c.fillStyle = L.rgba(col);
    c.beginPath(); c.arc(cx, cy, 5.5, 0, Math.PI * 2); c.fill();
    c.restore();
    return;
  }
  const view = globeView(v);
  // the limb haze is right at the street (the top of the disc): thin it when we are skimming the surface
  // (and drop it entirely at street scale, where its 3 %-of-r rim would tint the whole sky)
  const atm = (1 - 0.75 * L.smoothstep(L.clamp(L.invLerp(Math.log(4e3), Math.log(4e5), Math.log(r)))))
    * (1 - L.smoothstep(L.clamp(L.invLerp(Math.log(4e5), Math.log(4e6), Math.log(r)))));
  const base = { cx, cy, r, lon0: view.lon0, lat0: view.lat0, rot: view.rot, tilt: view.tilt };
  // where is the light? (before the collapse: all lit; after: the front sweeps it dark; after the twist: lit again)
  const allDark = gt >= T.collapse && gt < T.restore && lightR(gt) >= AU + R_EARTH;
  const unlit = gt >= T.collapse && !(gt >= T.restore && lightR2(gt) > AU + R_EARTH);
  // 1. the night Earth (no sunlight anywhere: dark land and sea, city lights), under everything once the Sun is gone
  if (unlit) {
    drawEarth(c, { ...base, style: 'night', lights: 0.9 * (1 - 0.65 * frost), atmosphere: 0.35 * atm });
    // 2. the big freeze: snow over every continent, sea ice creeping from both poles (iceLat), in starlight
    if (frost > 0.002 && !(gt >= T.restore)) {
      const il = iceLat(gt);
      c.save();
      c.globalAlpha *= L.clamp(frost * 1.6) * 0.62;
      drawEarth(c, { ...base, style: 'frozen', iceLine: [il, -il], seaIce: 1, atmosphere: 0, lights: 0 });
      c.restore();
    }
  }
  // 3. the sunlit Earth: Blue Marble, terminator toward the lower right, clipped by the light front
  if (!allDark) {
    c.save();
    if (gt >= T.restore) frontClip(c, v, lightR2(gt), false);
    else if (gt >= T.collapse) frontClip(c, v, lightR(gt), true);
    drawEarth(c, { ...base, style: 'day', sun: SUN_LIGHT, lights: 0.85, atmosphere: atm });
    c.restore();
  }
  c.restore();
}

// ------------------------------------------------------------------ the star at SUN + the light front
function drawStar(c, v) {
  const s = starState(v.gt);
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y);
  const rpx = v.ws(s.r);
  const reach = Math.max(rpx * 3, 60);
  if (cx + reach < 0 || cx - reach > W || cy + reach < 0 || cy - reach > H) return;
  if (s.mode === 'bh') {
    // a lone black hole: a black disc (true size) and a faint violet marker when it is sub-pixel
    // once the true-size horizon is big on screen (beats 11-12) s11 draws the photon ring and glow itself
    const mk = 1 - L.smoothstep(L.invLerp(30, 60, rpx));
    const halo = Math.max(10, rpx * 2.6);
    L.lightBlob(c, cx, cy, halo * 2.6, ACCENT, 0.32 * mk);
    c.fillStyle = '#000';
    c.beginPath(); c.arc(cx, cy, Math.max(rpx, 4), 0, Math.PI * 2); c.fill();
    if (mk <= 0.002) return;
    c.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.3), 0.9 * mk);
    c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, Math.max(rpx * 1.5, 8), 0, Math.PI * 2); c.stroke();
    return;
  }
  const r = Math.max(rpx, s.mode === 'wd' ? 3 : 4);
  const col = s.col;
  L.lightBlob(c, cx, cy, Math.max(r * 4, 70), col, 0.45);
  L.lightBlob(c, cx, cy, Math.max(r * 1.8, 30), col, 0.6);
  const g = c.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
  g.addColorStop(0, L.rgba(L.mix(col, [255, 255, 255], 0.75)));
  g.addColorStop(0.7, L.rgba(col));
  g.addColorStop(1, L.rgba(L.mix(col, [140, 40, 20], s.mode === 'giant' ? 0.5 : 0.25)));
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); c.fill();
  if (s.bh > 0) {   // restoring: the black core is swallowed by the returning star
    c.fillStyle = `rgba(0,0,0,${s.bh})`;
    c.beginPath(); c.arc(cx, cy, Math.max(0, r * 0.6 * s.bh), 0, Math.PI * 2); c.fill();
  }
}

function drawFront(c, v) {
  const k = frontK(v.gt);
  if (k <= 0) return;
  const R = lightR(v.gt);
  if (R <= 0) return;
  const rpx = v.ws(R);
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y);
  c.save();
  c.globalCompositeOperation = 'lighter';
  if (rpx < 3e4) {
    // ring + soft warm glow just outside it (the light still in flight)
    const band = L.clamp(rpx * 0.08, 14, 60);
    const g = c.createRadialGradient(cx, cy, Math.max(0, rpx - 2), cx, cy, rpx + band);
    g.addColorStop(0, `rgba(255,220,160,${0.0})`);
    g.addColorStop(0.02, `rgba(255,226,170,${0.55 * k})`);
    g.addColorStop(1, 'rgba(255,200,140,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rpx + band), 0, Math.PI * 2); c.arc(cx, cy, Math.max(0, rpx - 2), 0, Math.PI * 2, true); c.fill();
    c.strokeStyle = `rgba(255,236,200,${0.8 * k})`;
    c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rpx), 0, Math.PI * 2); c.stroke();
  } else {
    // at planet scale the front is a straight line perpendicular to the Sun→Earth axis
    const ax = -SUN_DIR.x, ay = -SUN_DIR.y;
    const { fx, fy } = frontPoint(v, R);
    const px = -ay, py = ax, BIG = 4000, band = 120;
    const g = c.createLinearGradient(fx, fy, fx + ax * band, fy + ay * band);
    g.addColorStop(0, `rgba(255,230,180,${0.5 * k})`); g.addColorStop(1, 'rgba(255,210,150,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(fx + px * BIG, fy + py * BIG); c.lineTo(fx - px * BIG, fy - py * BIG);
    c.lineTo(fx - px * BIG + ax * band, fy - py * BIG + ay * band); c.lineTo(fx + px * BIG + ax * band, fy + py * BIG + ay * band);
    c.closePath(); c.fill();
    c.strokeStyle = `rgba(255,240,210,${0.85 * k})`;
    c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(fx + px * BIG, fy + py * BIG); c.lineTo(fx - px * BIG, fy - py * BIG); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ background
const SKY_DAY = [[0, [196, 214, 228]], [20, [128, 176, 226]], [55, [76, 136, 214]], [1500, [48, 104, 198]], [12000, [30, 66, 150]], [40000, [10, 18, 52]], [90000, [3, 4, 12]]];
const SKY_NIGHT = [[0, [20, 26, 44]], [300, [11, 15, 30]], [8000, [4, 6, 15]], [60000, [2, 3, 8]]];

let DITHER = null;
function ditherTile() {
  if (DITHER) return DITHER;
  const n = 128, cv = new OffscreenCanvas(n, n), cx = cv.getContext('2d'), im = cx.createImageData(n, n), r = L.rng(9091);
  for (let i = 0; i < n * n; i++) {
    const d = r() - r();                         // triangular noise
    const val = d > 0 ? 255 : 0;
    im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = val;
    im.data[i * 4 + 3] = Math.round(Math.abs(d) * 3);   // up to ~1.2 % opacity: about one 8-bit level
  }
  cx.putImageData(im, 0, 0);
  DITHER = cv;
  return cv;
}

export function drawBackground(c, v) {
  v = film(v);   // 16b: the story state runs on film time (camera.js OFF)
  const mpp = v.cam.mpp, day = dayK(v.gt);
  const g0 = c.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.5, H * 0.85);
  g0.addColorStop(0, '#0b0a14'); g0.addColorStop(1, '#020205');
  c.fillStyle = g0;
  c.fillRect(0, 0, W, H);
  // near the surface: the sky (by altitude, day <-> night)
  const farBg = L.clamp(L.invLerp(Math.log(400), Math.log(6000), Math.log(mpp)));
  // only when the camera is near Earth (not out by the Sun)
  const nearEarth = Math.hypot(v.cam.x - EARTH.x, v.cam.y) < 5e6;
  const altAt = (sy) => -(v.cam.y + (sy - H / 2) * mpp);
  if (farBg < 1 && nearEarth) {
    const g = c.createLinearGradient(0, 0, 0, H);
    for (let i = 0; i <= 12; i++) {
      const a = Math.max(0, altAt((H * i) / 12));
      g.addColorStop(i / 12, L.rgba(L.mix(L.ramp(SKY_NIGHT, a), L.ramp(SKY_DAY, a), day)));
    }
    c.save(); c.globalAlpha = 1 - farBg; c.fillStyle = g; c.fillRect(0, 0, W, H);
    // dither: +-1.5 levels of fixed noise over the smooth gradient so it never bands in the encode
    const pat = c.createPattern(ditherTile(), 'repeat');
    c.globalAlpha = (1 - farBg) * 0.5;
    c.fillStyle = pat; c.fillRect(0, 0, W, H);
    c.restore();
  }
  // stars: two layers drifting with the log of the zoom (parallax), hidden by daylight near the ground
  const skyK = farBg < 1 && nearEarth ? (1 - farBg) : 0;
  const starK = 1 - skyK * day * (1 - L.clamp(L.invLerp(30000, 80000, altAt(H * 0.3))));
  const lz = Math.log10(mpp);
  c.save();
  c.translate(0, ((lz * 90) % H + H) % H - H);
  stars(c, v, 0.55 * starK, 140, 31);
  c.translate(0, H);
  stars(c, v, 0.55 * starK, 140, 31);
  c.restore();
  stars(c, v, 0.35 * starK, 90, 47);

  // Earth's orbit: a faint 1 AU ring around SUN at orbit scales (scenes add the bright path / motion)
  const ok = L.clamp(L.invLerp(Math.log(4e7), Math.log(1.5e8), Math.log(mpp)));
  if (ok > 0) {
    c.save();
    c.strokeStyle = `rgba(200,190,235,${0.16 * ok})`;
    c.lineWidth = 1.5;
    c.setLineDash([3, 7]);
    c.beginPath(); c.arc(v.wx(SUN.x), v.wy(SUN.y), Math.max(0, v.ws(AU)), 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  // the star at SUN, the light front
  drawStar(c, v);
  drawFront(c, v);
  // Earth: local terrain at small scales, the globe beyond (crossfade)
  const fly = inFly(v.gt);
  // in the flights the real globe IS the ground under the street from the first frame (the street fades off it)
  const gk = fly ? 1 : L.clamp(L.invLerp(Math.log(40), Math.log(140), Math.log(mpp)));
  if (gk < 1 && nearEarth && !fly) drawTerrain(c, v, 1);
  if (gk > 0) drawGlobe(c, v, gk);
  if (nearEarth) drawStreet(c, v);
}
export function drawForeground() {}

// ------------------------------------------------------------------ HUD: top bar + ONE right-hand readout per beat
//   clock  = time since the collapse (beats 1-5, 13-15)
//   scale  = a true-scale bar (beats 6-12, 16-17)
//   future = years from today (beat 18)
export const HUD_MODE = ['none', 'clock', 'clock', 'clock', 'clock', 'clock', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale',
  'clock', 'clock', 'clock', 'scale', 'scale', 'future', 'none'];   // 16b: beat 19 (question): the future clock fades (0-0.3 s) before the card

/** {big, small} for a duration in seconds. */
export function fmtElapsed(s) {
  if (s < 3600) { const m = Math.floor(s / 60), ss = Math.floor(s % 60); return { big: `${m}:${String(ss).padStart(2, '0')}`, small: 'MIN : SEC' }; }
  if (s < 2 * 86400) { const h = Math.floor(s / 3600); return { big: `${h} ${h === 1 ? 'HOUR' : 'HOURS'}`, small: '' }; }
  if (s < 14 * 86400) { const d = Math.floor(s / 86400); return { big: `${d} DAYS`, small: '' }; }
  if (s < 8 * 7 * 86400) { const w = Math.floor(s / (7 * 86400)); return { big: `${w} WEEKS`, small: '' }; }
  if (s < YEAR) { const mo = Math.floor(s / (YEAR / 12)); return { big: `${mo} MONTHS`, small: '' }; }
  const y = Math.floor(s / YEAR);
  return { big: `${L.fmt(y)} ${y === 1 ? 'YEAR' : 'YEARS'}`, small: '' };
}
function fmtYears(y) {
  if (y < 1) return '0 YEARS';
  if (y < 1e6) return `${L.fmt(Math.floor(y))} YEARS`;
  if (y < 1e9) return `${L.fmt(Math.floor(y / 1e6))} MILLION YEARS`;
  return `${L.fmt(y / 1e9, 1)} BILLION YEARS`;
}
const fmtLen = (m) => (m >= 1e9 ? `${L.fmt(m / 1e9)} million km` : m >= 1000 ? `${L.fmt(m / 1000)} km` : `${L.fmt(m)} m`);

function beatOf(v) { return Math.min(v.beat, HUD_MODE.length - 1); }
/** 0..1 visibility of a HUD mode now: sequential swap at beat changes (out 0-0.3 s, in 0.3-0.75 s). */
export function hudK(v, mode) {
  const b = beatOf(v), t = v.t;
  const cur = HUD_MODE[b] === mode, prev = b > 0 && HUD_MODE[b - 1] === mode;
  if (cur && (prev || b === 0)) return 1;
  if (cur) return L.ease.outCubic(L.prog(t, 0.3, 0.45));
  if (prev) return 1 - L.ease.inCubic(L.prog(t, 0, 0.3));
  return 0;
}

function readout(c, big, small, k) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha = k;
  c.shadowColor = 'rgba(2,4,12,0.7)';
  c.shadowBlur = 14;
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  c.font = L.font(L.fitSize(c, big, 560, 64, 700, L.FONT.din), 700, L.FONT.din);
  c.fillStyle = '#fff';
  c.fillText(big, W - 64, 300 + (1 - k) * 10);
  c.font = L.font(20, 600, L.FONT.body);
  c.fillStyle = 'rgba(220,214,236,0.85)';
  L.trackedText(c, small, W - 64, 334, 2.5, 'right');
  c.restore();
}

function scaleReadout(c, v, k) {
  if (k <= 0) return;
  const len = niceLen(v.cam.mpp * 150), px = len / v.cam.mpp;
  const x1 = W - 64, x0 = x1 - px, y = 300;
  c.save();
  c.globalAlpha = k;
  c.shadowColor = 'rgba(2,4,12,0.7)';
  c.shadowBlur = 10;
  c.strokeStyle = 'rgba(235,230,245,0.9)';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(x0, y - 9); c.lineTo(x0, y); c.lineTo(x1, y); c.lineTo(x1, y - 9); c.stroke();
  c.font = L.font(30, 700, L.FONT.din);
  c.fillStyle = '#fff';
  c.textAlign = 'right';
  c.fillText(fmtLen(len), x1, y - 16);
  c.font = L.font(18, 600, L.FONT.body);
  c.fillStyle = 'rgba(220,214,236,0.6)';
  L.trackedText(c, 'TRUE SCALE', x1, y + 30, 3, 'right');
  c.restore();
}

export function drawHud(c, vReal) {
  // 16b: the top bar eases in at the cut from the cold open (the preroll has no HUD) instead of popping on; its
  // timecode / progress line run on real (video) time
  c.save();
  c.globalAlpha *= L.ease.outCubic(L.prog(vReal.gt, vReal.tl.scenes[0].start, 0.45));
  topBar(c, vReal, ACCENT);
  c.restore();
  const v = film(vReal);      // the readouts on film time
  const kc = hudK(v, 'clock');
  if (kc > 0) {
    const e = fmtElapsed(elapsedAt(v.gt));
    readout(c, e.big, `${e.small ? e.small + '  ·  ' : ''}SINCE THE SUN COLLAPSED`, kc);
  }
  scaleReadout(c, v, hudK(v, 'scale'));
  const kf = hudK(v, 'future');
  if (kf > 0) readout(c, fmtYears(futureYears(v.gt)), 'FROM TODAY', kf);
}
export const cues = (tl) => beatCues(tl, { gain: 0.16, pitch: 0.8 });
