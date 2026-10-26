// Beat 14 — "Now, the strangest part."
// Near-silence and a slow pull: the 100 W glow has gone, the glass body sits quietly... then, one by one, tiny sparks
// of renewal start to blink inside it (a cell being replaced). No label: the sparks are the hook for the reveal.
//
// This file also holds the SHARED REVEAL KIT for beats 14-18 (all owned by builder 17D):
//   TT              global times of the VO words the reveal syncs to (from build/timeline.json, caption weighting)
//   drawSparks      the renewal sparks inside the body (drawn every frame from beat 14 on, by this scene)
//   VESSELS / drawVessels, drawGut   the blood network and the gut (lit by s17, kept by s18)
//   drawCounter     the odometer counter of cells replaced since the clock started (s16, s18)
//   watchRing       the pulse ring around the stopwatch that ties the counter to the clock (s16, s18)
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, P, SIZE, bodyPath, clockTime } from '../env.js';

// ------------------------------------------------------------------ timing (global seconds)
export const TT = {
  b14: 63.92, b15: 66.312, b16: 71.287, b17: 76.624, b18: 81.979, end: 89.298,
  strangest: 64.69, part: 65.23,
  replace: 67.32, three: 68.12, billion: 69.17, cells15: 70.19,
  onePct: 71.99, almost: 73.61, four: 74.01, everySec: 75.08,
  blood: 77.17, gut: 77.75, inAbout: 78.74, months: 79.18, isNew: 80.85,
  byEnd: 82.13, video: 83.05, youre: 84.06, person: 85.19, voEnd: 86.3,
};

const lg = Math.log;
const WARM = [255, 236, 226];
export const FRESH = [255, 178, 182];   // "new" blood: a paler, brighter accent

// ------------------------------------------------------------------ the blood network (world metres, front view)
// Main arteries only, as smooth polylines running AWAY from the heart (the flow pulses follow the point order).
export const VESSELS = [
  // aorta: up out of the heart, over the arch, down the spine to the bifurcation
  [[0.03, -1.31], [0.022, -1.37], [0.004, -1.405], [-0.016, -1.392], [-0.014, -1.33], [-0.01, -1.2], [-0.007, -1.06], [0, -0.945]],
  // iliac, femoral, popliteal, tibial (both legs)
  [[0, -0.945], [-0.048, -0.895], [-0.084, -0.8], [-0.092, -0.64], [-0.088, -0.5], [-0.082, -0.35], [-0.077, -0.18], [-0.073, -0.06]],
  [[0, -0.945], [0.048, -0.895], [0.084, -0.8], [0.092, -0.64], [0.088, -0.5], [0.082, -0.35], [0.077, -0.18], [0.073, -0.06]],
  // carotids up the neck into the head
  [[-0.006, -1.4], [-0.02, -1.47], [-0.026, -1.55], [-0.03, -1.62], [-0.042, -1.68]],
  [[0.01, -1.402], [0.022, -1.47], [0.026, -1.55], [0.03, -1.62], [0.042, -1.68]],
  // the person's left arm (viewer's right, hanging)
  [[0.012, -1.405], [0.08, -1.428], [0.15, -1.43], [0.192, -1.39], [0.206, -1.25], [0.215, -1.1], [0.226, -0.97], [0.236, -0.85], [0.24, -0.74]],
  // the person's right arm (viewer's left): down to the elbow, then the forearm forward to the wrist
  [[-0.016, -1.4], [-0.08, -1.428], [-0.15, -1.43], [-0.188, -1.39], [-0.204, -1.26], [-0.21, -1.145], [-0.17, -1.112], [-0.13, -1.092], [-0.1, -1.076]],
  // gut and kidney branches
  [[-0.009, -1.12], [0.018, -1.07], [0.045, -1.03], [0.058, -0.98]],
  [[-0.008, -1.08], [-0.03, -1.03], [-0.05, -0.99]],
  [[-0.01, -1.16], [-0.04, -1.155], [-0.065, -1.145]],
  [[-0.01, -1.16], [0.025, -1.155], [0.058, -1.145]],
];
const SEGS = (() => {
  const out = [];
  let tot = 0;
  for (const pl of VESSELS) for (let i = 0; i < pl.length - 1; i++) {
    const [ax, ay] = pl[i], [bx, by] = pl[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    out.push({ ax, ay, bx, by, len, acc: tot });
    tot += len;
  }
  return { out, tot };
})();

/** Smooth polyline through world points (screen space), drawn up to fraction f of its points. */
function polyPath(c, v, pl, f = 1) {
  const pts = pl.map(([x, y]) => [v.wx(x), v.wy(y)]);
  const n = (pts.length - 1) * L.clamp(f);
  if (n <= 0) return;
  const at = (s) => { const i = Math.min(pts.length - 2, Math.floor(s)), u = s - i; return [L.lerp(pts[i][0], pts[i + 1][0], u), L.lerp(pts[i][1], pts[i + 1][1], u)]; };
  c.moveTo(pts[0][0], pts[0][1]);
  const whole = Math.floor(n);
  for (let i = 1; i < whole; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const e = at(n);
  c.lineTo(e[0], e[1]);
}

// ------------------------------------------------------------------ the gut
// Small intestine: a coiled tube filling the lower belly; the colon frames it like an inverted U.
const SMALL_GUT = (() => {
  const pts = [];
  const rows = 6, y0 = -1.052, dy = 0.022;
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * dy;
    const hw = 0.088 * Math.sqrt(Math.max(0.25, 1 - ((y + 0.997) / 0.075) ** 2));
    const n = 9;
    for (let j = 0; j <= n; j++) {
      const u = r % 2 ? 1 - j / n : j / n;
      const x = -hw + 2 * hw * u;
      pts.push([x, y + 0.007 * Math.sin(u * 13 + r * 1.7) + (j === 0 || j === n ? 0.004 * (r % 2 ? -1 : 1) : 0)]);
    }
  }
  return pts;
})();
const COLON = [[-0.035, -0.87], [-0.1, -0.875], [-0.12, -0.95], [-0.124, -1.05], [-0.105, -1.092], [-0.04, -1.098], [0.04, -1.098],
  [0.105, -1.092], [0.124, -1.05], [0.12, -0.95], [0.098, -0.885], [0.05, -0.862]];

/** The gut, lit by k (0..1): a dark tube with a glowing lining and a slow peristaltic shimmer. */
export function drawGut(c, v, k) {
  if (k <= 0.002) return;
  const px = (m, a, b) => L.clamp(v.ws(m), a, b);
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  // tube bodies
  c.globalAlpha = k;
  for (const [pl, w] of [[COLON, 0.026], [SMALL_GUT, 0.017]]) {
    c.beginPath(); polyPath(c, v, pl);
    c.strokeStyle = 'rgba(58,12,24,0.88)'; c.lineWidth = px(w, 2, 40); c.stroke();
    c.strokeStyle = L.rgba(ACCENT, 0.22); c.lineWidth = px(w * 0.75, 1.5, 30); c.stroke();
  }
  // the lining glows (additive)
  c.globalCompositeOperation = 'lighter';
  c.shadowColor = L.rgba(ACCENT, 0.9); c.shadowBlur = 14;
  for (const [pl, w] of [[COLON, 0.007], [SMALL_GUT, 0.005]]) {
    c.beginPath(); polyPath(c, v, pl);
    c.strokeStyle = L.rgba(ACCENT, 0.55); c.lineWidth = px(w, 1, 8); c.stroke();
  }
  c.shadowBlur = 0;
  // peristalsis: soft bright beads drifting along the small intestine
  const step = px(0.03, 8, 60);
  c.setLineDash([step * 0.22, step * 0.78]);
  c.lineDashOffset = -v.gt * step * 0.55;
  c.beginPath(); polyPath(c, v, SMALL_GUT);
  c.strokeStyle = L.rgba(WARM, 0.5); c.lineWidth = px(0.006, 1, 7); c.stroke();
  c.setLineDash([]);
  c.restore();
}

/**
 * The blood network. draw: 0..1 how far it has drawn out from the heart. k: brightness.
 * wave: {x, y, r} world circle inside which the blood is "new" (fresh colour), or null.
 */
const HEAD_VESSELS = new Set([3, 4]);   // the carotids (headK dims them under a label over the head)
export function drawVessels(c, v, { draw = 1, k = 1, wave = null, headK = 1 }) {
  if (k <= 0.002 || draw <= 0) return;
  const w = L.clamp(v.ws(0.0034), 1, 4);
  const net = (col, a, lw, blur) => {
    c.strokeStyle = L.rgba(col, a); c.lineWidth = lw;
    c.shadowColor = L.rgba(col, 0.9); c.shadowBlur = blur;
    for (const head of [false, true]) {
      if (head && headK <= 0.01) break;
      c.beginPath();
      for (let i = 0; i < VESSELS.length; i++) {
        if (HEAD_VESSELS.has(i) !== head) continue;
        const f = L.clamp(draw * 1.6 - (i === 0 ? 0 : 0.35 + 0.05 * (i % 4)));   // the aorta first, then the branches
        polyPath(c, v, VESSELS[i], f);
      }
      if (head) c.strokeStyle = L.rgba(col, a * headK);
      c.stroke();
    }
  };
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.globalCompositeOperation = 'lighter';
  net([200, 30, 52], 0.42 * k, w * 1.5, 8);
  net(ACCENT, 0.45 * k, w * 0.55, 0);
  if (wave && wave.r > 0) {
    c.save();
    c.beginPath(); c.arc(v.wx(wave.x), v.wy(wave.y), Math.max(0, v.ws(wave.r)), 0, Math.PI * 2); c.clip();
    net(FRESH, 0.5 * k, w * 1.2, 10);
    net(WARM, 0.32 * k, w * 0.45, 0);
    c.restore();
  }
  // flow: small bright pulses running away from the heart
  const step = L.clamp(v.ws(0.07), 20, 90);
  c.setLineDash([step * 0.06, step * 0.94]);
  c.lineDashOffset = -v.gt * step * 1.3;
  net(WARM, 0.4 * k, w * 1.1, 6);
  c.setLineDash([]);
  c.restore();
}

// ------------------------------------------------------------------ renewal sparks
const POOL = 1400;
const POOL0 = 520;                // the steady pool; the rest only joins for the peak around "billion"
const SPARKS = (() => {
  const r = L.rng(14140), out = [];
  for (let i = 0; i < POOL; i++) {
    const per = 1.3 + r() * 1.5;
    const c = r();
    out.push({ per, off: r() * per, cat: c < 0.3 ? 'gut' : c < 0.62 ? 'blood' : 'body', hero: r() < 0.13, seed: (r() * 1e9) | 0, rank: r() });
  }
  return out;
})();
// body regions for 'body' sparks: [cx, cy, rx, ry, weight] ellipses / [ax, ay, bx, by, rad, weight] limb lines
const REGIONS = [
  ['e', 0, -1.22, 0.15, 0.26, 0.38], ['e', 0, -1.63, 0.06, 0.09, 0.09],
  ['l', -0.09, -0.88, -0.078, -0.08, 0.045, 0.14], ['l', 0.09, -0.88, 0.078, -0.08, 0.045, 0.14],
  ['l', 0.19, -1.4, 0.238, -0.72, 0.03, 0.08], ['l', -0.19, -1.4, -0.21, -1.14, 0.03, 0.04],
  ['l', -0.21, -1.13, -0.1, -1.075, 0.022, 0.04],
];
const REG_W = REGIONS.reduce((a, g) => a + g[g.length - 1], 0);
function samplePos(cat, r) {
  if (cat === 'gut') {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    return [Math.cos(a) * d * 0.108, -0.985 + Math.sin(a) * d * 0.09];
  }
  if (cat === 'blood') {
    let s = r() * SEGS.tot, seg = SEGS.out[0];
    for (const g of SEGS.out) { if (g.acc <= s) seg = g; else break; }
    const u = L.clamp((s - seg.acc) / seg.len);
    return [L.lerp(seg.ax, seg.bx, u) + (r() - 0.5) * 0.008, L.lerp(seg.ay, seg.by, u) + (r() - 0.5) * 0.008];
  }
  let s = r() * REG_W, g = REGIONS[0];
  for (const q of REGIONS) { s -= q[q.length - 1]; if (s <= 0) { g = q; break; } }
  if (g[0] === 'e') { const a = r() * Math.PI * 2, d = Math.sqrt(r()); return [g[1] + Math.cos(a) * d * g[3], g[2] + Math.sin(a) * d * g[4]]; }
  const u = r(), a = r() * Math.PI * 2, d = Math.sqrt(r()) * g[5];
  return [L.lerp(g[1], g[3], u) + Math.cos(a) * d, L.lerp(g[2], g[4], u) + Math.sin(a) * d * 0.4];
}

// sprites (pre-rendered once; drawing stays a pure function of time)
let DOT = null, STAR = null;
function sprites() {
  if (DOT) return;
  DOT = new OffscreenCanvas(64, 64);
  let c = DOT.getContext('2d');
  let g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,248,240,1)'); g.addColorStop(0.1, 'rgba(255,215,210,0.95)');
  g.addColorStop(0.3, L.rgba(ACCENT, 0.4)); g.addColorStop(1, L.rgba(ACCENT, 0));
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  STAR = new OffscreenCanvas(160, 160);
  c = STAR.getContext('2d');
  g = c.createRadialGradient(80, 80, 0, 80, 80, 40);
  g.addColorStop(0, 'rgba(255,250,244,1)'); g.addColorStop(0.12, 'rgba(255,220,214,0.9)');
  g.addColorStop(0.4, L.rgba(ACCENT, 0.35)); g.addColorStop(1, L.rgba(ACCENT, 0));
  c.fillStyle = g; c.fillRect(0, 0, 160, 160);
  // a 4-point flare: two thin tapered streaks
  for (const rot of [0, Math.PI / 2]) {
    c.save(); c.translate(80, 80); c.rotate(rot);
    const lg2 = c.createLinearGradient(-80, 0, 80, 0);
    lg2.addColorStop(0, 'rgba(255,200,200,0)'); lg2.addColorStop(0.5, 'rgba(255,245,240,0.95)'); lg2.addColorStop(1, 'rgba(255,200,200,0)');
    c.fillStyle = lg2;
    c.beginPath(); c.moveTo(-80, 0); c.quadraticCurveTo(0, -2.2, 80, 0); c.quadraticCurveTo(0, 2.2, -80, 0); c.fill();
    c.restore();
  }
}

/** How many of the pool are live at gt (0..1), and the per-category gains. */
function sparkState(gt) {
  const ramp1 = 0.05 * L.ease.inOutCubic(L.prog(gt, TT.part - 0.2, 1.6));                     // a trickle on beat 14
  const ramp2 = 0.95 * L.ease.inOutCubic(L.prog(gt, TT.replace - 0.3, TT.billion - TT.replace + 0.4)); // the spread
  const frac = ramp1 + ramp2;
  // the peak: the extra pool floods in on "three hundred thirty billion", holds, then thins to a lasting half
  const peak = L.ease.inOutCubic(L.prog(gt, TT.three, TT.billion - TT.three + 0.1))
    * (1 - 0.5 * L.ease.inOutCubic(L.prog(gt, TT.cells15 + 0.4, 2.2)));
  // a short hit on the lock (decays over about 1 s)
  const pulse = gt >= TT.billion + 0.05 ? Math.exp(-(gt - TT.billion - 0.05) / 0.38) : 0;
  // beat 17: the eye goes to blood and gut; beat 18 brings everyone back
  const focus = L.ease.inOutCubic(L.prog(gt, TT.b17 + 0.1, 0.9)) * (1 - L.ease.inOutCubic(L.prog(gt, TT.byEnd + 0.4, 1.2)));
  return { frac, peak, pulse, gain: { body: 1 - 0.7 * focus, blood: 1 + 0.1 * focus, gut: 1 + 0.1 * focus } };
}

// the first hand-placed sparks of beat 14 (one at a time, each with a soft blip)
export const FIRST = [
  { t: TT.b14 + 0.55, x: 0.055, y: -1.21 },
  { t: TT.strangest + 0.3, x: -0.085, y: -0.6 },
  { t: TT.part + 0.22, x: 0.02, y: -1.62 },
  { t: TT.part + 0.62, x: -0.03, y: -0.99 },
];

function firstSpark(c, v, s, u) {
  if (u < 0 || u > 1.6) return;
  const a = L.smoothstep(L.clamp(u / 0.08)) * Math.exp(-u / 0.7);
  const x = v.wx(s.x), y = v.wy(s.y);
  const base = L.clamp(v.ws(0.09), 40, 110);
  c.globalAlpha = a;
  const sz = base * (0.7 + 0.5 * a);
  c.drawImage(STAR, x - sz, y - sz, sz * 2, sz * 2);
  const cs = sz * 0.45;                                   // a brighter core so the first sparks read at body scale
  c.drawImage(DOT, x - cs, y - cs, cs * 2, cs * 2);
  // a thin ring that opens out (a cell has just been made)
  const rr = base * 0.25 + base * 0.55 * L.ease.outCubic(L.clamp(u / 1.1));
  c.globalAlpha = 1;
  c.strokeStyle = L.rgba(ACCENT, 0.7 * (1 - L.clamp(u / 1.1)));
  c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, Math.max(0, rr), 0, Math.PI * 2); c.stroke();
}

/** All the renewal sparks for this frame (world space, clipped to the body). */
export function drawSparks(c, v, boost = 0) {
  const gt = v.gt;
  if (gt < TT.b14 || v.cam.mpp < 3e-4) return;
  sprites();
  const { frac, peak, pulse, gain } = sparkState(gt);
  const base = L.clamp(v.ws(0.028), 16, 34) * (1 + 0.35 * pulse);
  const hit = 1.6 * pulse;
  c.save();
  c.beginPath(); bodyPath(c, v); c.clip();
  c.globalCompositeOperation = 'lighter';
  for (const f of FIRST) firstSpark(c, v, f, gt - f.t);
  const live = frac * POOL0 + peak * (POOL - POOL0);
  for (let i = 0; i < POOL; i++) {
    const s = SPARKS[i];
    const on = L.clamp(live - i);             // spark i joins as the pool grows (fades in over one unit)
    if (on <= 0) break;
    const tt = gt + s.off;
    const n = Math.floor(tt / s.per), u = tt - n * s.per;
    if (u > 1.0) continue;
    const env = L.smoothstep(L.clamp(u / 0.07)) * Math.exp(-u / (0.2 + 0.1 * peak));
    const gutK = s.cat === 'gut' ? (i >= POOL0 ? 0.25 : 1) : 1;   // the gut is small: the peak pool spreads to the body
    const a = env * on * gain[s.cat] * gutK * (1 + boost + (s.cat === 'gut' ? 0.3 : 1) * hit);
    if (a < 0.02) continue;
    const r = L.rng(s.seed + n * 7919);
    const [wx, wy] = samplePos(s.cat, r);
    const x = v.wx(wx), y = v.wy(wy);
    if (x < -40 || x > L.W + 40 || y < -40 || y > L.H + 40) continue;
    c.globalAlpha = Math.min(1, a);
    if (s.hero) {
      const sz = base * (1.05 + 0.5 * env);
      c.drawImage(STAR, x - sz, y - sz, sz * 2, sz * 2);
    } else {
      const sz = base * (0.5 + 0.4 * env) * (s.cat === 'body' ? 0.85 : 1);
      c.drawImage(DOT, x - sz, y - sz, sz * 2, sz * 2);
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ the counter (odometer)
/** gt snapped to its 30 fps frame: motion-blur sub-frames then agree on the counter's digits (crisp, not smeared). */
export const frameTime = (gt) => Math.round(gt * L.FPS) / L.FPS;

const fmtInt = (n) => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * Odometer counter: n (float), centred at x, baseline y. Digits roll when the digit below them wraps.
 * lines: [{text, k, color}] small tracked caps under it. k: 0..1 entrance.
 */
export function drawCounter(c, { x, y, n, size = 116, k = 1, lines = [], accent = ACCENT, beat = 0 }) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  const str = fmtInt(n);
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4);
  c.textBaseline = 'alphabetic';
  c.font = L.font(size, 800, L.FONT.display);
  const dw = c.measureText('0').width * 1.02, cw = c.measureText(',').width * 0.9;
  const total = [...str].reduce((a, ch) => a + (ch === ',' ? cw : dw), 0);
  // rule line, like bigLabel
  const ruleW = 90 * e;
  c.fillStyle = L.rgba(accent, 0.9);
  c.fillRect(x - ruleW / 2, y - size * 0.92 - 26, ruleW, 4);
  // a soft thump on each stopwatch second
  const sc = 1 + 0.025 * beat;
  c.translate(x, y - size * 0.36); c.scale(sc, sc); c.translate(-x, -(y - size * 0.36));
  const h = size * 0.9;
  let cx = x - total / 2;
  const digits = str.replace(/,/g, '').length;
  // true carry odometer: the millions digit rolls on its own fraction (last 20 %); every higher digit rolls ONLY while
  // all digits below it (down to the millions) read 9, and then shares the millions digit's roll
  const DIG = [], ROLL = [];
  for (let j = 0; j < digits; j++) {
    DIG[j] = Math.floor(n / Math.pow(10, j)) % 10;
    if (j < 6) ROLL[j] = 0;
    else if (j === 6) ROLL[j] = L.ease.inOutCubic(L.clamp((((n / 1e6) % 1) - 0.8) / 0.2));
    else ROLL[j] = DIG[j - 1] === 9 ? ROLL[j - 1] : 0;
  }
  let di = 0;
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18;
  for (const ch of str) {
    if (ch === ',') {
      c.fillStyle = L.rgba(accent, 0.8);
      c.fillText(',', cx, y);
      cx += cw;
      continue;
    }
    const j = digits - 1 - di;                       // power of ten of this digit
    const d = DIG[j], roll = ROLL[j];
    // staggered entrance: each digit rises in 40 ms after the one on its left
    const ek = L.ease.outCubic(L.clamp(k * 1.6 - di * 0.05));
    const lift = (1 - ek) * 34;
    const low = j < 6 ? 0.82 : 1;                    // the blur-fast low digits sit back a touch
    c.save();
    c.beginPath(); c.rect(cx - 4, y - size * 0.8, dw + 8, size * 0.9); c.clip();
    c.fillStyle = L.rgba(accent, low * ek);
    c.fillText(String(d), cx + dw * 0.01, y - roll * h + lift);
    if (roll > 0) c.fillText(String((d + 1) % 10), cx + dw * 0.01, y + (1 - roll) * h + lift);
    c.restore();
    cx += dw;
    di++;
  }
  c.restore();
  c.save();
  c.textBaseline = 'alphabetic';
  let ly = y + 52;
  for (const ln of lines) {
    const lk = L.clamp(ln.k ?? 1);
    if (lk > 0) {
      const le = L.ease.outCubic(lk);
      c.globalAlpha = L.clamp(lk * 1.4) * L.clamp(k * 1.4);
      c.font = L.font(ln.size ?? 30, 600, L.FONT.body);
      c.fillStyle = L.rgba(ln.color ?? [205, 215, 230], 0.95);
      c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 8;
      L.trackedText(c, ln.text.toUpperCase(), x, ly + (1 - le) * 18, 3, 'center');
    }
    ly += (ln.size ?? 30) + 14;
  }
  c.restore();
}

/** Thump envelope on each whole stopwatch second (1 at the tick, decaying). */
export const secondBeat = (gt, tl) => { const ct = clockTime(gt, tl); return ct <= 0 ? 0 : Math.exp(-(ct % 1) * 7); };

/** A ring that pulses around the stopwatch on every second (ties the counter to the clock). */
export function watchRing(c, v, k) {
  if (k <= 0.002) return;
  const x = v.wx(P.watch.x), y = v.wy(P.watch.y), R = Math.max(10, v.ws(SIZE.watchR) * 1.25);
  const ph = clockTime(v.gt, v.tl) % 1;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = L.rgba(ACCENT, 0.75 * k); c.lineWidth = 2;
  c.shadowColor = L.rgba(ACCENT, 1); c.shadowBlur = 10;
  c.beginPath(); c.arc(x, y, Math.max(0, R), 0, Math.PI * 2); c.stroke();
  // the pulse: a ring that opens out each second
  const pr = R * (1 + 1.4 * L.ease.outCubic(ph));
  c.strokeStyle = L.rgba(ACCENT, 0.6 * k * (1 - ph)); c.lineWidth = 1.5; c.shadowBlur = 0;
  c.beginPath(); c.arc(x, y, Math.max(0, pr), 0, Math.PI * 2); c.stroke();
  c.restore();
  L.lightBlob(c, x, y, R * 2.2, ACCENT, 0.18 * k * (0.6 + 0.4 * Math.exp(-ph * 6)));
}

// ------------------------------------------------------------------ the scene
export default {
  beat: 14,
  chapter: null,
  captions: true,
  layer: 3,                       // sparks sit over the organs (heart, lungs) and the hand
  cues(d) {
    const b = TT.b14;
    // near-silence: only the first sparks speak, softly
    return [
      { t: 0.05, name: 'swell', gain: 0.12, pitch: 0.7 },
      ...FIRST.map((f, i) => ({ t: f.t - b, name: 'blip', gain: 0.16 + 0.02 * i, pitch: [1.7, 1.45, 1.9, 1.6][i] })),
      { t: d - 0.6, name: 'shimmer', gain: 0.14, pitch: 1.2 },
    ];
  },
  drawWorld(c, v) {
    drawSparks(c, v);
  },
  drawOverlay() {},
};
