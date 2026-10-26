// Environment for "The Heaviest Spoon in the Universe" (Zoom Out 30): deep-space backdrop, the neutron star renderer,
// the teaspoon, the night city, the neutron lattice, HUD and transition cues. Scenes import the helpers from here.
import * as L from '../../../engine/runtime/lib.js';
import { topBar, scaleBar } from '../../../engine/runtime/kit.js';
import { R, SPOON, SPOON_ANG, DOLLOP, B, PH, at as camAt } from './camera.js';

const { W, H } = L;
export { R, SPOON, SPOON_ANG, DOLLOP, B, PH };
export const ACCENT = [120, 180, 255];
export const PROTON = [255, 138, 92];
export const ELECTRON = [150, 245, 235];
export const NAVY = [4, 8, 20];
export const GAP = [7, 14, 36];           // the dark between packed neutrons (beat-3 backdrop = the dollop's inside)

// ------------------------------------------------------------------ timing helpers
/** phrase j of the scene's own line, in seconds from the scene's beat start */
export function phrase(v, j, edge = 'start') {
  const i = v.index ?? v.beat;
  return PH(i, j, edge)(v.tl) - v.tl.scenes[i].start;
}
export const phraseGt = (tl, i, j, edge = 'start') => PH(i, j, edge)(tl);
/** estimated global start of word k of phrase j of line i (same spoken-length weights as the captions) */
export function wordGt(tl, i, j, k) {
  const ln = tl.lines[i], ph = (ln.phrases ?? [ln])[j];
  const words = ph.text.toUpperCase().split(/\s+/);
  // real word starts from the voice alignment (timeline "words") when they line up with the text
  if (ph.words && ph.words.length === words.length) return k < words.length ? ph.words[k][0] : ph.end;
  const spokenLen = (w) => {
    const d = (w.match(/\d/g) || []).join('');
    if (!d) return /^KM\W*$/.test(w) ? 10 : w.replace(/\W/g, '').length;
    const core = d.replace(/0{3,}$/, ''), z = d.length - core.length;
    return core.length * 4 + (z >= 3 ? 8 : 0) + (w.includes('%') ? 7 : 0);
  };
  const wts = words.map((w) => spokenLen(w) + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
  const tot = wts.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let q = 0; q < Math.min(k, words.length); q++) acc += wts[q];
  return ph.start + (ph.end - ph.start) * acc / tot;
}

// ------------------------------------------------------------------ sprites / caches (deterministic, built once)
let DITHER = null;
function ditherTile() {
  if (DITHER) return DITHER;
  const n = 128, g = new OffscreenCanvas(n, n), gc = g.getContext('2d');
  const img = gc.createImageData(n, n), r = L.rng(91);
  for (let i = 0; i < n * n; i++) {
    const v = 128 + (r() - 0.5) * 7;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  gc.putImageData(img, 0, 0);
  return (DITHER = g);
}

const STARS = (() => {
  const out = [];
  for (let layer = 0; layer < 3; layer++) {
    const r = L.rng(400 + layer);
    const pts = [];
    for (let i = 0; i < 150; i++) pts.push({ x: (r() * 2 - 1) * 1250, y: (r() * 2 - 1) * 1500, s: 0.5 + r() * r() * 2.2, ph: r() * 6.28, warm: r() });
    out.push(pts);
  }
  return out;
})();

let REMNANT = null;
/** supernova remnant: a filamentary shell (red-magenta outside, teal inside), faint, pre-rendered once */
function remnant() {
  if (REMNANT) return REMNANT;
  const S = 1500, g = new OffscreenCanvas(S, S), c = g.getContext('2d');
  const r = L.rng(77), cx = S / 2, cy = S / 2;
  // diffuse glow
  const dg = c.createRadialGradient(cx, cy, 120, cx, cy, 700);
  dg.addColorStop(0, 'rgba(60,120,170,0.10)');
  dg.addColorStop(0.55, 'rgba(90,70,140,0.10)');
  dg.addColorStop(0.8, 'rgba(160,60,110,0.12)');
  dg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = dg; c.fillRect(0, 0, S, S);
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (let i = 0; i < 1500; i++) {
    const a0 = r() * Math.PI * 2;
    const shell = r();
    const rad = 380 + shell * 300 + 30 * L.noise1(a0 * 3, 4) + 20 * L.noise1(a0 * 11, 5);
    const len = 0.04 + r() * 0.16;
    const col = shell > 0.55 ? L.mix([235, 80, 120], [255, 140, 110], r()) : L.mix([70, 200, 210], [120, 170, 255], r());
    c.strokeStyle = L.rgba(col, 0.05 + r() * 0.12);
    c.lineWidth = 0.8 + r() * 2.2;
    c.beginPath();
    for (let s = 0; s <= 10; s++) {
      const a = a0 + (len * s) / 10;
      const rr = rad + 22 * L.noise1(a * 7 + i, 9) + 10 * Math.sin(a * 23 + i);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.92;
      s ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  // a few radial "fingers"
  for (let i = 0; i < 160; i++) {
    const a = r() * Math.PI * 2, r0 = 300 + r() * 200, r1 = r0 + 60 + r() * 160;
    c.strokeStyle = L.rgba(L.mix([90, 180, 230], [220, 90, 130], r()), 0.04 + r() * 0.06);
    c.lineWidth = 1 + r() * 2;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.92);
    c.quadraticCurveTo(cx + Math.cos(a + 0.05) * (r0 + r1) / 2, cy + Math.sin(a + 0.05) * (r0 + r1) / 2 * 0.92, cx + Math.cos(a + 0.02) * r1, cy + Math.sin(a + 0.02) * r1 * 0.92);
    c.stroke();
  }
  return (REMNANT = g);
}

let RFIL = null;
/** a bright filament of the remnant's inner shell, left of and below the label slot: offset from the shell centre (px) */
export function remnantFilament() {
  if (RFIL) return RFIL;
  const img = remnant(), S = img.width, sc = 1.05;
  const d = img.getContext('2d').getImageData(0, 0, S, S).data;
  let best = -1, bx = 0, by = 0;
  for (let oy = -330; oy <= -190; oy += 3) {
    for (let ox = -360; ox <= -110; ox += 3) {
      const x = Math.round(S / 2 + ox / sc), y = Math.round(S / 2 + oy / sc);
      let sum = 0;
      for (let q = -2; q <= 2; q++) for (let p = -2; p <= 2; p++) { const i = ((y + q) * S + (x + p)) * 4; sum += d[i] + d[i + 1] + d[i + 2]; }
      if (sum > best) { best = sum; bx = ox; by = oy; }
    }
  }
  return (RFIL = { dx: bx, dy: by });
}

let CITY = null;
export const CITY_KM = 64;                  // the pre-rendered city covers 64 × 64 km
const CITY_PX = 2560;                       // 25 m per px
/** a generic city at night seen from orbit: street grid, ring roads, avenues, a river, parks */
function city() {
  if (CITY) return CITY;
  const S = CITY_PX, g = new OffscreenCanvas(S, S), c = g.getContext('2d');
  const m = S / (CITY_KM * 1000);                       // px per metre
  const cx = S / 2, cy = S / 2;
  const r = L.rng(2024);
  c.fillStyle = 'rgb(8,11,18)'; c.fillRect(0, 0, S, S);
  // density: dense core, fading out by ≈ 22–27 km (ragged edge)
  const dens = (x, y) => {
    const d = Math.hypot(x - cx, y - cy) / m, a = Math.atan2(y - cy, x - cx);
    const edge = 21000 + 4000 * L.noise1(a * 2.2, 3) + 2000 * L.noise1(a * 7, 4);
    return L.clamp(1 - (d - 4000) / (edge - 4000)) * (0.55 + 0.45 * L.clamp(1 - d / 9000)) + 0.0;
  };
  // land tint: faint warm glow of the urban area
  const lg = c.createRadialGradient(cx, cy, 0, cx, cy, 24000 * m);
  lg.addColorStop(0, 'rgba(70,52,34,0.55)'); lg.addColorStop(0.5, 'rgba(40,32,26,0.4)'); lg.addColorStop(1, 'rgba(10,12,18,0)');
  c.fillStyle = lg; c.fillRect(0, 0, S, S);
  // river: a meander across west → east
  const river = [];
  for (let i = 0; i <= 80; i++) {
    const x = (i / 80) * S;
    const y = cy + (1800 + 2600 * Math.sin(i / 80 * 5.2 + 0.6) + 900 * L.noise1(i / 7, 8)) * m;
    river.push([x, y]);
  }
  // districts: neighbourhoods of different brightness and tint (downtown, residential, industrial)
  const district = (x, y) => {
    const u = (x - cx) / m, w = (y - cy) / m;
    return 0.55 + 0.45 * L.noise1(u / 2600 + 0.3 * L.noise1(w / 3100, 12), 11) * L.noise1(w / 2300 + 7.1, 13) + 0.25 * L.noise1((u + w) / 1500, 14);
  };
  const ang = 0.21, ca = Math.cos(ang), sa = Math.sin(ang);
  const toPx = (px, py) => [cx + (px * ca - py * sa) * m, cy + (px * sa + py * ca) * m];
  // city blocks: lit rectangles between the streets, brighter downtown, darker in the quiet districts
  {
    const step = 300, n = Math.ceil((CITY_KM * 1000) / step);
    for (let j = -n / 2; j < n / 2; j++) {
      for (let i = -n / 2; i < n / 2; i++) {
        const u0 = i * step + 30, w0 = j * step + 30, sz = step - 60;
        const [mx, my] = toPx(u0 + sz / 2, w0 + sz / 2);
        const d = dens(mx, my);
        if (d < 0.04) continue;
        const dk = district(mx, my);
        const a = L.clamp(d * dk) * (0.1 + 0.22 * r());
        if (a < 0.01) continue;
        const col = dk > 0.85 ? [255, 214, 160] : dk < 0.45 ? [150, 160, 190] : [240, 178, 118];
        c.fillStyle = L.rgba(col, a);
        c.beginPath();
        [[u0, w0], [u0 + sz, w0], [u0 + sz, w0 + sz], [u0, w0 + sz]].forEach(([px, py], q) => { const [x, y] = toPx(px, py); q ? c.lineTo(x, y) : c.moveTo(x, y); });
        c.closePath(); c.fill();
      }
    }
  }
  // streets: a rotated grid (block 180 m in the core, 300 m outside), lit by density
  c.lineCap = 'round';
  const street = (x0, y0, x1, y1, w, a, col = [255, 190, 120]) => { c.strokeStyle = L.rgba(col, a); c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  for (const [step, wid, amax] of [[300, 1.0, 0.42], [180, 0.8, 0.3]]) {
    const n = Math.ceil((CITY_KM * 1000) / step);
    for (let dir = 0; dir < 2; dir++) {
      for (let i = -n / 2; i <= n / 2; i++) {
        // draw each line in short segments so it follows the density
        const off = i * step;
        for (let s = -n / 2; s < n / 2; s++) {
          const u0 = s * step, u1 = u0 + step;
          const pts = [[u0, off], [u1, off]].map(([u, w]) => (dir ? [w, u] : [u, w]));
          const [[ax, ay], [bx, by]] = pts.map(([px, py]) => toPx(px, py));
          const d = dens((ax + bx) / 2, (ay + by) / 2) * L.clamp(district((ax + bx) / 2, (ay + by) / 2));
          const lim = step === 180 ? Math.max(0, d - 0.55) / 0.45 : d;
          if (lim < 0.04 || r() < 0.12) continue;
          street(ax, ay, bx, by, wid, amax * lim * (0.6 + 0.4 * r()));
        }
      }
    }
  }
  // block lights: speckle
  for (let i = 0; i < 160000; i++) {
    const x = r() * S, y = r() * S, d = dens(x, y) * L.clamp(district(x, y));
    if (r() > d) continue;
    c.fillStyle = L.rgba(L.mix([255, 200, 130], [255, 240, 210], r()), 0.25 + 0.6 * r() * d);
    const s = 0.7 + r() * 1.3;
    c.fillRect(x, y, s, s);
  }
  // parks: dark patches
  for (let i = 0; i < 14; i++) {
    const a = r() * 6.28, d = (2000 + r() * 15000) * m, rr = (400 + r() * 900) * m;
    c.fillStyle = 'rgba(10,16,13,0.7)';
    c.beginPath(); c.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr, rr * (0.6 + r() * 0.4), r() * 3, 0, 6.28); c.fill();
  }
  // ring roads + radial avenues (brighter, orange)
  c.save();
  c.shadowColor = 'rgba(255,170,90,0.5)'; c.shadowBlur = 4;
  for (const rr of [5200, 11500, 19000]) {
    c.strokeStyle = `rgba(255,178,100,${rr > 15000 ? 0.22 : 0.32})`; c.lineWidth = rr > 15000 ? 1.6 : 2;
    c.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * 6.283, q = rr * (1 + 0.06 * L.noise1(a * 3, rr));
      const x = cx + Math.cos(a) * q * m, y = cy + Math.sin(a) * q * m * 0.94;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * 6.283 + 0.2 + 0.15 * r();
    c.strokeStyle = 'rgba(255,175,95,0.26)'; c.lineWidth = 1.5;
    c.beginPath();
    for (let s = 0; s <= 30; s++) {
      const d = 800 + (s / 30) * 23000, aa = a + 0.05 * L.noise1(s / 6, i);
      const x = cx + Math.cos(aa) * d * m, y = cy + Math.sin(aa) * d * m;
      s ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  c.restore();
  // river on top: dark water with a faint sheen, bridges as bright ticks
  c.strokeStyle = 'rgba(70,95,140,0.35)'; c.lineWidth = 760 * m; c.lineJoin = 'round';   // lit embankments
  c.beginPath(); river.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  c.strokeStyle = 'rgb(5,9,20)'; c.lineWidth = 620 * m;
  c.beginPath(); river.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  c.strokeStyle = 'rgba(90,125,180,0.3)'; c.lineWidth = 1.4;
  c.beginPath(); river.forEach(([x, y], i) => (i ? c.lineTo(x, y - 40 * m) : c.moveTo(x, y - 40 * m))); c.stroke();
  for (let i = 8; i < 72; i += 3) {
    const [x, y] = river[i], d = dens(x, y);
    if (d < 0.25) continue;
    c.strokeStyle = `rgba(255,200,140,${0.5 * d})`; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x, y - 260 * m); c.lineTo(x + 30 * m, y + 260 * m); c.stroke();
  }
  return (CITY = g);
}
/** draw the city (centred on the world origin) at alpha k */
export function drawCity(c, v, k) {
  if (k <= 0) return;
  const img = city();
  const half = (CITY_KM * 1000) / 2;
  const x0 = v.wx(-half), y0 = v.wy(-half), s = v.ws(CITY_KM * 1000);
  c.save();
  c.globalAlpha *= k;
  c.imageSmoothingQuality = 'high';
  c.drawImage(img, x0, y0, s, s);
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.55; c.drawImage(img, x0, y0, s, s); c.restore();
  // feather the city's square edge into space
  const fg = c.createRadialGradient(v.wx(0), v.wy(0), v.ws(22000), v.wx(0), v.wy(0), v.ws(31000));
  fg.addColorStop(0, 'rgba(4,8,20,0)'); fg.addColorStop(1, 'rgba(4,8,20,1)');
  c.fillStyle = fg;
  c.fillRect(Math.max(-10, x0), Math.max(-10, y0), Math.min(W + 20, s), Math.min(H + 20, s));
  c.restore();
}

// particle sprites (shaded spheres) -----------------------------------------------------------------------
const SPR = {};
export function sphereSprite(kind) {
  if (SPR[kind]) return SPR[kind];
  const n = 160, g = new OffscreenCanvas(n, n), c = g.getContext('2d');
  const col = kind === 'p' ? [[255, 228, 205], [255, 140, 96], [168, 58, 40]] : [[232, 244, 255], [128, 178, 255], [34, 66, 150]];
  const gr = c.createRadialGradient(n * 0.38, n * 0.34, n * 0.02, n * 0.5, n * 0.5, n * 0.5);
  gr.addColorStop(0, L.rgba(col[0])); gr.addColorStop(0.45, L.rgba(col[1])); gr.addColorStop(0.92, L.rgba(col[2])); gr.addColorStop(1, L.rgba(col[2], 0));
  c.fillStyle = gr; c.beginPath(); c.arc(n / 2, n / 2, n / 2, 0, 6.29); c.fill();
  // rim light from below (the glow of the surrounding matter)
  const rim = c.createRadialGradient(n * 0.55, n * 0.75, n * 0.3, n * 0.5, n * 0.5, n * 0.5);
  rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(0.85, L.rgba(kind === 'p' ? [255, 170, 120] : [120, 190, 255], 0.0)); rim.addColorStop(0.97, L.rgba(kind === 'p' ? [255, 190, 150] : [150, 210, 255], 0.35)); rim.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = rim; c.fillRect(0, 0, n, n);
  return (SPR[kind] = g);
}
/** a particle (proton 'p' / neutron 'n' / mix 0..1 toward neutron) of diameter d at (x, y) */
export function particle(c, x, y, d, toN = 1, alpha = 1) {
  if (d <= 0.5 || alpha <= 0) return;
  c.save();
  c.globalAlpha *= alpha;
  if (toN < 1) c.drawImage(sphereSprite('p'), x - d / 2, y - d / 2, d, d);
  if (toN > 0) { c.globalAlpha *= toN; c.drawImage(sphereSprite('n'), x - d / 2, y - d / 2, d, d); }
  c.restore();
}

// ------------------------------------------------------------------ the neutron lattice (hex packing)
export const LAT_END = 56;          // lattice spacing (px) at the beat 3 → 4 hand-over
/** hex-packed neutrons around (ox, oy) with spacing sp, within the clip the caller sets; fn(i,j,x,y) → alpha */
let LAT_AVG = null;
/** the lattice's average colour (sprite over the dark gap, by area): what a too-fine lattice should read as */
function latAvg() {
  if (LAT_AVG) return LAT_AVG;
  const spr = sphereSprite('n'), n = spr.width;
  const d = spr.getContext('2d').getImageData(0, 0, n, n).data;
  let r = 0, g = 0, b = 0, a = 0;
  for (let i = 0; i < d.length; i += 4) { const al = d[i + 3] / 255; r += d[i] * al; g += d[i + 1] * al; b += d[i + 2] * al; a += al; }
  const cover = a / (n * n), sq = 0.98 * 0.98 / 0.8660254;   // sprite area share × (sphere disc ÷ hex cell)
  const f = cover * sq;
  return (LAT_AVG = [0, 1, 2].map((i) => L.lerp(GAP[i], [r, g, b][i] / a, f)));
}
/** hex-packed neutrons around (ox, oy) with spacing sp, within the clip the caller sets; fn(i,j,x,y) → alpha.
 *  Below ≈ 16 px spacing the spheres fade into their average colour (no moiré as the lattice shrinks). */
export function drawLattice(c, ox, oy, sp, { alpha = 1, fn = null, bounds = [0, 0, W, H] } = {}) {
  if (alpha <= 0) return;
  const [bx0, by0, bx1, by1] = bounds;
  const sk = L.smoothstep(L.clamp((sp - 7) / 9));
  if (sk < 1 && !fn) {
    c.save();
    c.globalAlpha *= alpha * (1 - sk);
    c.fillStyle = L.rgba(latAvg());
    c.fillRect(bx0 - 2, by0 - 2, bx1 - bx0 + 4, by1 - by0 + 4);
    c.restore();
  }
  if (sp < 1.2 || sk <= 0) return;
  const rh = sp * 0.8660254;
  const j0 = Math.floor((by0 - oy) / rh) - 1, j1 = Math.ceil((by1 - oy) / rh) + 1;
  const spr = sphereSprite('n'), d = sp * 0.98;
  c.save();
  c.globalAlpha *= alpha * (fn ? 1 : sk);
  const ga = c.globalAlpha;
  for (let j = j0; j <= j1; j++) {
    const y = oy + j * rh, xo = ox + (j & 1 ? sp / 2 : 0);
    const i0 = Math.floor((bx0 - xo) / sp) - 1, i1 = Math.ceil((bx1 - xo) / sp) + 1;
    for (let i = i0; i <= i1; i++) {
      const x = xo + i * sp;
      const a = fn ? fn(i, j, x, y) : 1;
      if (a <= 0.003) continue;
      c.globalAlpha = ga * a;
      c.drawImage(spr, x - d / 2, y - d / 2, d, d);
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ neutron star
const SPIN_SLOW = 0.12;   // rev/s (stylised; the real thing is far faster)
const SPIN_FAST = 1.15;   // rev/s, drawn with heavy motion trails in beat 5
/** fast-spin weight (0..1): beat 5 only */
export function fastK(gt, tl) {
  return L.smoothstep(L.prog(gt, tl.scenes[5].start - 0.2, 0.8)) * (1 - L.smoothstep(L.prog(gt, tl.scenes[6].start - 0.3, 0.8)));
}
/** spin phase (radians), continuous: integrates the rate */
export function spinPhase(gt, tl) {
  let extra = 0;
  const a = tl.scenes[5].start - 0.4, b = Math.min(gt, tl.scenes[6].start + 0.8);
  if (b > a) {
    const n = 120, h = (b - a) / n;
    for (let i = 0; i < n; i++) extra += fastK(a + (i + 0.5) * h, tl) * h;
  }
  return 2 * Math.PI * (SPIN_SLOW * gt + (SPIN_FAST - SPIN_SLOW) * extra);
}
/** top-down (city) weight */
export function aboveK(gt, tl) {
  return L.smoothstep(L.prog(gt, PH(2, 1, 'start', -0.2)(tl), 0.8)) * (1 - L.smoothstep(L.prog(gt, tl.scenes[3].start + 0.7, 0.3)));   // gone once the beat-3 backdrop is opaque
}
/** state of the star's dress (field lines, beams) over the film */
export function starState(gt, tl) {
  const sc = tl.scenes;
  const reveal = L.smoothstep(L.prog(gt, sc[1].start + 0.6, 1.2));
  const above = aboveK(gt, tl);
  const surf = L.smoothstep(L.prog(gt, sc[6].start - 0.3, 0.8)) * (1 - L.smoothstep(L.prog(gt, sc[7].start - 0.2, 0.8)));
  const field = reveal * (1 - above);
  const beams = reveal * (1 - above) * (1 - surf * 0.85);
  return { phase: spinPhase(gt, tl), field, beams, fast: fastK(gt, tl), above };
}

const MAG_A = (32 * Math.PI) / 180;   // magnetic axis tilt from the spin axis
const VIEW_X = (14 * Math.PI) / 180;  // spin axis tipped toward the viewer
const ROLL = (-10 * Math.PI) / 180;   // screen roll
// field lines in the magnetic frame (mag axis = +y): r = Lsin²θ
const FIELD = (() => {
  const out = [];
  for (const Lr of [1.7, 2.5, 3.7]) {
    for (let k = 0; k < 8; k++) {
      const psi = (k / 8) * Math.PI * 2 + Lr;
      const th0 = Math.asin(Math.sqrt(1 / Lr));
      const pts = [];
      for (let s = 0; s <= 56; s++) {
        const th = L.lerp(th0, Math.PI - th0, s / 56);
        const rr = Lr * Math.sin(th) ** 2, rho = rr * Math.sin(th);
        pts.push([rho * Math.cos(psi), rr * Math.cos(th), rho * Math.sin(psi)]);
      }
      out.push({ Lr, pts });
    }
  }
  return out;
})();
const SURF = (() => {   // surface granulation points on the unit sphere (body frame)
  const r = L.rng(5), out = [];
  for (let i = 0; i < 46; i++) {
    const u = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - u * u);
    out.push({ p: [s * Math.cos(a), u, s * Math.sin(a)], sz: 0.08 + r() * 0.12, br: r() });
  }
  return out;
})();
/** body frame → screen-normalised (x right, y up, z to viewer) */
function xf(p, phase) {
  let [x, y, z] = p;
  // spin about y
  const cs = Math.cos(phase), sn = Math.sin(phase);
  [x, z] = [x * cs + z * sn, -x * sn + z * cs];
  // tip toward viewer (about x)
  const cg = Math.cos(VIEW_X), sg = Math.sin(VIEW_X);
  [y, z] = [y * cg - z * sg, y * sg + z * cg];
  // roll
  const cr = Math.cos(ROLL), sr = Math.sin(ROLL);
  [x, y] = [x * cr - y * sr, x * sr + y * cr];
  return [x, y, z];
}
/** magnetic frame → body frame (rotate the +y axis down by MAG_A about z) */
function m2b([x, y, z]) {
  const c = Math.cos(-MAG_A), s = Math.sin(-MAG_A);
  return [x * c - y * s, x * s + y * c, z];
}

function beam(c, cx, cy, r, m, len, a, wide = 1) {
  // m: screen-normalised axis direction (x right, y up, z to viewer)
  const lx = m[0], ly = -m[1];
  const pl = Math.hypot(lx, ly);
  const bx = cx + lx * r, by = cy + ly * r;
  if (pl > 0.05) {
    const dx = lx / pl, dy = ly / pl, px = -dy, py = dx;
    const Lp = len * r * pl;
    const w0 = r * 0.07 * wide, w1 = Lp * 0.11 * wide;
    const g = c.createLinearGradient(bx, by, bx + dx * Lp, by + dy * Lp);
    g.addColorStop(0, `rgba(235,245,255,${0.9 * a})`);
    g.addColorStop(0.18, `rgba(160,205,255,${0.5 * a})`);
    g.addColorStop(0.6, `rgba(110,160,255,${0.18 * a})`);
    g.addColorStop(1, 'rgba(90,140,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(bx + px * w0, by + py * w0);
    c.lineTo(bx + dx * Lp + px * w1, by + dy * Lp + py * w1);
    c.lineTo(bx + dx * Lp - px * w1, by + dy * Lp - py * w1);
    c.lineTo(bx - px * w0, by - py * w0);
    c.closePath(); c.fill();
    // bright core line
    const g2 = c.createLinearGradient(bx, by, bx + dx * Lp * 0.7, by + dy * Lp * 0.7);
    g2.addColorStop(0, `rgba(255,255,255,${0.8 * a})`); g2.addColorStop(1, 'rgba(200,225,255,0)');
    c.fillStyle = g2;
    c.beginPath();
    c.moveTo(bx + px * w0 * 0.3, by + py * w0 * 0.3);
    c.lineTo(bx + dx * Lp * 0.7 + px * w1 * 0.15, by + dy * Lp * 0.7 + py * w1 * 0.15);
    c.lineTo(bx + dx * Lp * 0.7 - px * w1 * 0.15, by + dy * Lp * 0.7 - py * w1 * 0.15);
    c.lineTo(bx - px * w0 * 0.3, by - py * w0 * 0.3);
    c.closePath(); c.fill();
  }
  // looking down the beam: a flare at the pole
  if (m[2] > 0) L.lightBlob(c, bx, by, Math.max(0, r * (0.4 + 1.6 * m[2] ** 4)), [200, 225, 255], a * 0.6 * m[2] ** 2);
}

// beams + field lines go through a scratch layer so they can be dimmed where text sits (HUD, captions, labels)
let BL = null;
function beamLayer() { if (!BL) BL = new OffscreenCanvas(W, H); return BL; }
/** draw fn(lc) additively, masked: dimmed in the HUD band, the caption band and any o.avoid rects */
function masked(c, avoid, fn) {
  const lay = beamLayer(), lc = lay.getContext('2d');
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalAlpha = 1;
  lc.globalCompositeOperation = 'source-over';
  lc.clearRect(0, 0, W, H);
  lc.globalCompositeOperation = 'lighter';
  fn(lc);
  lc.globalCompositeOperation = 'destination-out';
  lc.globalAlpha = 1;
  let g = lc.createLinearGradient(0, 0, 0, 360);
  g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(0.7, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  lc.fillStyle = g; lc.fillRect(0, 0, W, 360);
  g = lc.createLinearGradient(0, 1330, 0, 1580);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.25, 'rgba(0,0,0,0.75)'); g.addColorStop(0.75, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  lc.fillStyle = g; lc.fillRect(0, 1330, W, 250);
  for (const r of avoid) {
    if (!(r.a > 0)) continue;
    // feathered rect: its blurred shadow does the cutting (the shape itself is drawn off-canvas)
    lc.shadowColor = `rgba(0,0,0,${Math.min(1, r.a)})`; lc.shadowBlur = 36; lc.shadowOffsetX = 20000;
    lc.fillStyle = '#000'; lc.fillRect(r.x - 20000, r.y, r.w, r.h);
    lc.shadowColor = 'transparent'; lc.shadowOffsetX = 0;
  }
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'lighter';
  c.drawImage(lay, 0, 0);
  c.restore();
}

// fine crust texture (body frame), used when the star is big on screen
const CRUST = (() => {
  const r = L.rng(55), out = [];
  for (let i = 0; i < 420; i++) {
    const u = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - u * u);
    out.push({ p: [s * Math.cos(a), u, s * Math.sin(a)], sz: 0.006 + r() * r() * 0.03, br: r() });
  }
  return out;
})();

/**
 * Draw the neutron star at screen (cx, cy), radius r px.
 * o: { phase, field 0..1, beams 0..1, fast 0..1, alpha, glow, body 0..1 (disc opacity), outline 0..1, avoid: [{x,y,w,h,a}] }
 * Big on screen (r ≳ 300 px) the bright body gives way to a darker crust with a bright limb only, so a frame-filling
 * star never floods the frame (mean luma stays well under 90) and captions over it stay readable.
 */
export function drawStar(c, cx, cy, r, o = {}) {
  const { phase = 0, field = 1, beams = 1, fast = 0, alpha = 1, glow = 1, body = 1, outline = 0, avoid = [] } = o;
  if (r < 0.3 || alpha <= 0) return;
  if (cx + r * 6 < -50 || cx - r * 6 > W + 50 || cy + r * 6 < -50 || cy - r * 6 > H + 50) return;
  // far bigger than the frame: cull when the disc misses the frame (huge arcs misrender)
  const dist = Math.hypot(cx - W / 2, cy - H / 2);
  if (r > 20000 && dist - r > 1200) return;
  const crust = L.smoothstep(L.clamp((r - 260) / 400));
  c.save();
  c.globalAlpha *= alpha;
  c.globalCompositeOperation = 'lighter';
  // halo
  const hk = L.clamp(1 - (r - 4000) / 16000) * (1 - 0.7 * crust);   // no flat blue flood when the star is far bigger than the frame
  L.lightBlob(c, cx, cy, Math.max(0, r * 5.5), [70, 120, 255], 0.28 * glow * hk);
  L.lightBlob(c, cx, cy, Math.max(0, r * 2.3), [150, 200, 255], 0.45 * glow * hk);
  const mb = m2b([0, 1, 0]);
  const axes = [xf(mb, phase), xf(mb.map((q) => -q), phase)];
  const big = r > 2500;
  // field lines + beams behind the body
  const drawField = (cc, front) => {
    if (field <= 0.01 || big || r < 6) return;
    cc.lineWidth = Math.max(1, Math.min(2.4, r / 110));
    for (const fl of FIELD) {
      const pts = fl.pts.map((p) => xf(m2b(p), phase));
      cc.beginPath();
      let pen = false;
      for (const [x, y, z] of pts) {
        const hidden = z < 0 && x * x + y * y < 1;
        const vis = front ? z >= 0 || x * x + y * y >= 1 : z < 0;
        if (!vis || hidden) { pen = false; continue; }
        const sx = cx + x * r, sy = cy - y * r;
        pen ? cc.lineTo(sx, sy) : cc.moveTo(sx, sy);
        pen = true;
      }
      cc.strokeStyle = `rgba(140,190,255,${(front ? 0.34 : 0.14) * field * (fl.Lr > 3 ? 0.75 : 1) * (1 + 0.6 * crust)})`;
      if (crust > 0.05) { cc.shadowColor = 'rgba(110,170,255,0.9)'; cc.shadowBlur = 10 * crust; }
      cc.stroke();
      cc.shadowColor = 'transparent';
    }
  };
  const drawBeams = (cc, front) => {
    if (beams <= 0.01 || big) return;
    for (const m of axes) {
      if ((m[2] >= 0) !== front) continue;
      if (fast > 0.01) {
        // motion trail: the beam smeared over the last ≈ 70° of its sweep
        const N = 14;
        for (let k = N; k >= 1; k--) {
          const ph = phase - (k / N) * 1.2 * fast;
          const mm = axes[0] === m ? xf(mb, ph) : xf(mb.map((q) => -q), ph);
          beam(cc, cx, cy, r, mm, 6, beams * 0.16 * fast * (1 - k / (N + 1)), 1.1);
        }
      }
      beam(cc, cx, cy, r, m, 6, beams * (1 - 0.35 * fast));
    }
  };
  const ga = c.globalAlpha;
  const dress = !big && r >= 6 && (field > 0.01 || beams > 0.01);
  if (dress) masked(c, avoid, (lc) => {
    lc.globalAlpha = ga;
    drawField(lc, false);
    drawBeams(lc, false);
    // swept hourglass (fast spin): the beams' cone averaged over a turn
    if (fast > 0.01 && beams > 0.01 && !big) {
      for (let k = 0; k < 24; k++) {
        const ph = (k / 24) * Math.PI * 2;
        beam(lc, cx, cy, r, xf(mb, ph), 5.5, beams * fast * 0.045, 0.9);
        beam(lc, cx, cy, r, xf(mb.map((q) => -q), ph), 5.5, beams * fast * 0.045, 0.9);
      }
    }
  });
  // body
  c.globalCompositeOperation = 'source-over';
  if (body > 0) {
    c.save();
    c.globalAlpha *= body;
    const bg = c.createRadialGradient(cx - r * 0.28, cy - r * 0.32, r * 0.02, cx, cy, r);
    const col = (a, b) => L.rgba(L.mix(a, b, crust));
    bg.addColorStop(0, col([248, 252, 255], [70, 104, 178]));
    bg.addColorStop(0.35, col([205, 226, 255], [44, 72, 142]));
    bg.addColorStop(0.75, col([118, 166, 252], [34, 58, 122]));
    bg.addColorStop(0.95, col([96, 146, 250], [70, 108, 200]));
    bg.addColorStop(1, col([170, 210, 255], [160, 200, 255]));
    c.fillStyle = bg;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    // surface granulation (rotates with the spin; smeared into streaks when fast)
    if (!big && r > 8) {
      c.save();
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
      for (const s of SURF) {
        const [x, y, z] = xf(s.p, phase);
        if (z <= 0.05) continue;
        const sx = cx + x * r, sy = cy - y * r, rr = s.sz * r;
        const col2 = s.br > 0.5 ? [255, 255, 255] : [60, 110, 230];
        const a = (s.br > 0.5 ? 0.22 : 0.16) * z;
        if (fast > 0.3) {
          // streak along the spin direction
          c.strokeStyle = L.rgba(col2, a * 0.8);
          c.lineWidth = rr * 0.6;
          c.lineCap = 'round';
          c.beginPath();
          for (let q = 0; q <= 8; q++) {
            const [x2, y2, z2] = xf(s.p, phase - q * 0.12 * fast);
            if (z2 <= 0) break;
            const px = cx + x2 * r, py = cy - y2 * r;
            q ? c.lineTo(px, py) : c.moveTo(px, py);
          }
          c.stroke();
        } else {
          const g = c.createRadialGradient(sx, sy, 0, sx, sy, Math.max(0.1, rr));
          g.addColorStop(0, L.rgba(col2, a)); g.addColorStop(1, L.rgba(col2, 0));
          c.fillStyle = g;
          c.fillRect(sx - rr, sy - rr, 2 * rr, 2 * rr);
        }
      }
      // fine crust texture: bright and dark mottling, foreshortened toward the limb
      if (crust > 0.02) {
        for (const s of CRUST) {
          const [x, y, z] = xf(s.p, phase);
          if (z <= 0.02) continue;
          const sx = cx + x * r, sy = cy - y * r;
          if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;
          const rr = s.sz * r;
          const bright = s.br > 0.55;
          const g = c.createRadialGradient(sx, sy, 0, sx, sy, Math.max(0.1, rr));
          g.addColorStop(0, bright ? `rgba(150,195,255,${0.32 * crust * z})` : `rgba(8,16,40,${0.35 * crust * z})`);
          g.addColorStop(1, bright ? 'rgba(150,195,255,0)' : 'rgba(8,16,40,0)');
          c.fillStyle = g;
          c.save(); c.translate(sx, sy); c.scale(1, Math.max(0.2, z)); c.translate(-sx, -sy);
          c.fillRect(sx - rr, sy - rr, 2 * rr, 2 * rr);
          c.restore();
        }
      }
      // magnetic-pole hot spots
      for (const m of axes) if (m[2] > 0) L.lightBlob(c, cx + m[0] * r, cy - m[1] * r, Math.max(0, r * 0.3), [255, 255, 255], 0.55 * m[2] * (1 - 0.5 * crust));
      c.restore();
    }
    c.restore();
  }
  // thin bright crust (the limb)
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = `rgba(225,240,255,${0.9 * Math.max(body, outline)})`;
  c.lineWidth = Math.max(1.2, Math.min(r * 0.025, 14)) * (body > 0.5 ? 1 : 0.6);
  c.shadowColor = 'rgba(150,200,255,0.95)';
  c.shadowBlur = Math.min(40, Math.max(6, r * 0.08));
  c.beginPath(); c.arc(cx, cy, Math.max(0, r - c.lineWidth / 2), 0, Math.PI * 2); c.stroke();
  c.restore();
  if (dress) masked(c, avoid, (lc) => {
    lc.globalAlpha = ga;
    drawField(lc, true);
    drawBeams(lc, true);
  });
  c.restore();
}

// ------------------------------------------------------------------ teaspoon (local metres; bowl centre at origin, +x toward the handle)
const BOWL_A = 0.0225, BOWL_B = 0.0158;
function bowlPath(c, sc = 1, dy = 0) {
  // egg: a slightly pointier tip (−x)
  c.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
    const x = BOWL_A * cs, y = BOWL_B * sn * (1 - 0.08 * Math.max(0, -cs) + 0.05 * cs);
    i ? c.lineTo(x * sc, y * sc + dy) : c.moveTo(x * sc, y * sc + dy);
  }
  c.closePath();
}
function handlePath(c, dy = 0) {
  const x0 = BOWL_A * 0.8;
  c.beginPath();
  c.moveTo(x0, -0.0056 + dy);
  c.bezierCurveTo(0.031, -0.0024 + dy, 0.048, -0.0026 + dy, 0.07, -0.0041 + dy);
  c.bezierCurveTo(0.09, -0.0057 + dy, 0.105, -0.0071 + dy, 0.1135, -0.0067 + dy);
  c.bezierCurveTo(0.1205, -0.0062 + dy, 0.1215, 0.0062 + dy, 0.1135, 0.0067 + dy);
  c.bezierCurveTo(0.105, 0.0071 + dy, 0.09, 0.0057 + dy, 0.07, 0.0041 + dy);
  c.bezierCurveTo(0.048, 0.0026 + dy, 0.031, 0.0024 + dy, x0, 0.0056 + dy);
  c.closePath();
}
const warm = (col) => [col[0] + 7, col[1] + 3, col[2] - 3];
const steel = (stops, g) => { for (const [p, col, a = 1] of stops) g.addColorStop(p, L.rgba(warm(col), a)); return g; };
/** dollop ellipse (local metres, relative to the bowl centre) */
export const DOL = { x: -0.0015, y: 0.0006, a: 0.0136, b: 0.0096 };
/**
 * Draw the teaspoon: polished steel under a soft top key light, a cool rim from the star below, holding a glowing
 * dollop of neutron-star matter. s = px per metre; (sx, sy) = bowl centre on screen. innerK/inner(c): the dollop is
 * drawn by `inner` (screen space, clipped to the dollop) for the lattice hand-over; innerK hides the plain dollop.
 */
export function drawSpoon(c, sx, sy, s, { alpha = 1, gt = 0, innerK = 0, inner = null } = {}) {
  if (alpha <= 0) return;
  const len = 0.14 * s;
  if (len < 1.5) return;
  c.save();
  c.globalAlpha *= alpha;
  const cosA = Math.cos(SPOON_ANG), sinA = Math.sin(SPOON_ANG);
  const dx = sx + (DOL.x * cosA - DOL.y * sinA) * s, dy = sy + (DOL.x * sinA + DOL.y * cosA) * s;
  const ra = DOL.a * s, rb = DOL.b * s;
  // the dollop's light spilling into space behind the spoon
  c.save(); c.globalCompositeOperation = 'lighter';
  L.lightBlob(c, dx, dy, Math.max(6, ra * 4.5), [60, 110, 255], 0.32);
  c.restore();
  const tr = () => { c.translate(sx, sy); c.rotate(SPOON_ANG); c.scale(s, s); };
  if (len > 14) {
    c.save(); tr();
    const T = 0.0012;   // metal thickness seen at the edge
    const px = 1 / s;   // one screen pixel in local metres
    // ---- handle: a soft contact shadow under it (no hard edge line), then the polished top face
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = Math.max(2, 0.004 * s); c.shadowOffsetY = Math.max(1, 0.0016 * s);
    handlePath(c);
    c.fillStyle = 'rgb(40,43,50)'; c.fill();
    c.restore();
    handlePath(c);
    c.fillStyle = steel([[0, [52, 55, 62]], [0.14, [96, 100, 108]], [0.3, [205, 208, 214]], [0.37, [250, 250, 250]], [0.45, [150, 154, 162]], [0.6, [64, 67, 74]], [0.8, [46, 49, 56]], [0.92, [96, 122, 162]], [1, [70, 78, 92]]], c.createLinearGradient(0, -0.0072, 0, 0.0072));
    c.fill();
    c.save(); c.clip();
    // lengthwise: the key light hot spot along the upper face, darker at the neck and the far end
    const lg = c.createLinearGradient(0.018, 0, 0.122, 0);
    lg.addColorStop(0, 'rgba(8,10,16,0.55)'); lg.addColorStop(0.25, 'rgba(8,10,16,0.1)'); lg.addColorStop(0.55, 'rgba(255,250,240,0.10)');
    lg.addColorStop(0.8, 'rgba(8,10,16,0.0)'); lg.addColorStop(1, 'rgba(8,10,16,0.45)');
    c.fillStyle = lg; c.fillRect(0.01, -0.01, 0.12, 0.02);
    // the dollop's blue light on the neck
    const nb = c.createRadialGradient(0.012, 0, 0, 0.012, 0, 0.03);
    nb.addColorStop(0, 'rgba(110,170,255,0.45)'); nb.addColorStop(1, 'rgba(110,170,255,0)');
    c.fillStyle = nb; c.fillRect(0.01, -0.01, 0.05, 0.02);
    c.restore();
    // crisp specular line
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.00035; c.lineCap = 'round';
    c.shadowColor = 'rgba(255,255,255,0.8)'; c.shadowBlur = 6;
    c.beginPath(); c.moveTo(0.04, -0.0017); c.bezierCurveTo(0.06, -0.0024, 0.085, -0.0034, 0.108, -0.0042); c.stroke();
    c.restore();
    // ---- bowl, outside: the back of the bowl peeks below the front rim — dark steel catching the star's cool light
    bowlPath(c, 1, T * 1.7);
    c.fillStyle = steel([[0, [20, 22, 28]], [0.78, [30, 33, 41]], [0.93, [74, 98, 150]], [1, [44, 54, 80]]], c.createLinearGradient(0, -BOWL_B, 0, BOWL_B + T * 1.7));
    c.fill();
    // ---- bowl, inside: a deep polished hollow (no flat floor, no inner ring)
    bowlPath(c, 0.99);
    c.save();
    c.clip();
    // depth: dark at the deepest point (it mirrors the black sky), brightening up the walls toward the rim
    c.save();
    c.translate(0.0012, 0.0016); c.scale(1, BOWL_B / BOWL_A);
    const dg = c.createRadialGradient(0, 0, 0, 0, 0, BOWL_A * 1.02);
    dg.addColorStop(0, 'rgb(16,18,24)'); dg.addColorStop(0.45, 'rgb(26,29,37)'); dg.addColorStop(0.72, 'rgb(52,56,66)');
    dg.addColorStop(0.9, 'rgb(104,109,120)'); dg.addColorStop(1, 'rgb(160,165,174)');
    c.fillStyle = dg; c.fillRect(-BOWL_A * 1.2, -BOWL_A * 1.2, BOWL_A * 2.4, BOWL_A * 2.4);
    c.restore();
    // the far wall (under the far rim) turns away from the key light: shadowed
    const fw = c.createLinearGradient(0, -BOWL_B, 0, BOWL_B * 0.15);
    fw.addColorStop(0, 'rgba(6,8,14,0.85)'); fw.addColorStop(0.55, 'rgba(6,8,14,0.4)'); fw.addColorStop(1, 'rgba(6,8,14,0)');
    c.fillStyle = fw; c.fillRect(-0.03, -0.02, 0.06, 0.04);
    // the near wall faces the key light: a bright curved band hugging the front rim
    c.save();
    c.translate(0, -BOWL_B * 0.95); c.scale(BOWL_A / BOWL_B, 1);
    const cb = c.createRadialGradient(0, 0, BOWL_B * 1.45, 0, 0, BOWL_B * 2.0);
    cb.addColorStop(0, 'rgba(255,252,246,0)'); cb.addColorStop(0.45, 'rgba(255,252,246,0.55)'); cb.addColorStop(0.7, 'rgba(255,252,246,0.92)');
    cb.addColorStop(0.86, 'rgba(230,234,240,0.5)'); cb.addColorStop(1, 'rgba(200,206,216,0)');
    c.globalCompositeOperation = 'screen';
    c.fillStyle = cb; c.fillRect(-BOWL_B * 2.2, -BOWL_B * 0.5, BOWL_B * 4.4, BOWL_B * 3);
    c.restore();
    // the key light's own reflection: a small soft glint high on the left wall
    c.save();
    c.globalCompositeOperation = 'screen';
    c.translate(-0.0125, -0.0062); c.rotate(-0.55); c.scale(1, 0.32);
    const kg = c.createRadialGradient(0, 0, 0, 0, 0, 0.0052);
    kg.addColorStop(0, 'rgba(255,255,255,0.85)'); kg.addColorStop(0.5, 'rgba(255,255,255,0.25)'); kg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = kg; c.fillRect(-0.006, -0.006, 0.012, 0.012);
    c.restore();
    // the starfield, mirrored faintly in the walls
    c.save();
    c.globalCompositeOperation = 'screen';
    for (const [ax, ay, sz, a] of SPOON_STARS) {
      c.fillStyle = `rgba(225,235,255,${a})`;
      c.beginPath(); c.arc(ax * BOWL_A, ay * BOWL_B, Math.max(px * 0.8, sz), 0, Math.PI * 2); c.fill();
    }
    c.restore();
    // the dollop's cool light filling the hollow around it
    const bl = c.createRadialGradient(DOL.x, DOL.y, DOL.b * 0.8, DOL.x, DOL.y, BOWL_A * 1.1);
    bl.addColorStop(0, 'rgba(120,175,255,0.6)'); bl.addColorStop(0.45, 'rgba(90,150,255,0.18)'); bl.addColorStop(1, 'rgba(90,150,255,0)');
    c.globalCompositeOperation = 'screen';
    c.fillStyle = bl; c.fillRect(-0.03, -0.02, 0.06, 0.04);
    c.restore();
    // ---- rim: a thin polished edge, bright toward the key light and the front, with the dollop's glow on it
    c.save();
    bowlPath(c, 0.995);
    c.lineWidth = Math.max(px * 1.2, 0.0007);
    const eg = c.createLinearGradient(-BOWL_A * 0.6, -BOWL_B, BOWL_A * 0.3, BOWL_B);
    eg.addColorStop(0, 'rgba(250,250,252,0.95)'); eg.addColorStop(0.35, 'rgba(150,156,166,0.75)'); eg.addColorStop(0.62, 'rgba(120,126,136,0.7)');
    eg.addColorStop(0.85, 'rgba(240,244,250,0.95)'); eg.addColorStop(1, 'rgba(190,215,255,0.9)');
    c.strokeStyle = eg; c.stroke();
    c.globalCompositeOperation = 'lighter';
    const rg = c.createRadialGradient(DOL.x, DOL.y, 0, DOL.x, DOL.y, BOWL_A * 1.05);
    rg.addColorStop(0, 'rgba(110,165,255,0.45)'); rg.addColorStop(1, 'rgba(110,165,255,0.08)');
    c.strokeStyle = rg; c.lineWidth = Math.max(px * 1.6, 0.0009); c.stroke();
    c.restore();
    c.restore();
  }
  // ---- the dollop: a dense, glowing mound sitting in the hollow (screen space; its own orientation)
  if (ra > 1.2) {
    c.save();
    c.translate(dx, dy); c.rotate(SPOON_ANG);
    const plain = 1 - innerK;
    // soft contact shadow where the mound meets the steel (feathered, no ring)
    if (len > 14 && plain > 0) {
      c.save();
      c.scale(1, rb / ra);
      const cs = c.createRadialGradient(0, rb * 0.08 * ra / rb, ra * 0.9, 0, rb * 0.08 * ra / rb, ra * 1.18);
      cs.addColorStop(0, `rgba(10,20,50,${0.55 * plain})`); cs.addColorStop(1, 'rgba(10,20,50,0)');
      c.fillStyle = cs; c.fillRect(-ra * 1.3, -ra * 1.3, ra * 2.6, ra * 2.6);
      c.restore();
    }
    if (plain > 0) {
      // elliptical gradient space: the mound's edge feathers out into the steel
      c.save();
      c.scale(1, rb / ra);
      c.beginPath(); c.arc(0, 0, ra * 1.03, 0, Math.PI * 2);
      const g = c.createRadialGradient(-ra * 0.18, -ra * 0.3, 0, 0, 0, ra * 1.03);
      g.addColorStop(0, L.rgba([255, 255, 255], plain));
      g.addColorStop(0.22, L.rgba([228, 242, 255], plain));
      g.addColorStop(0.55, L.rgba([140, 188, 255], plain));
      g.addColorStop(0.82, L.rgba([66, 112, 236], plain));
      g.addColorStop(0.93, L.rgba([92, 142, 250], 0.75 * plain));
      g.addColorStop(1, L.rgba([92, 142, 250], 0));
      c.fillStyle = g; c.fill();
      // form: the mound turns away from the key light toward the lower right
      c.beginPath(); c.arc(0, 0, ra * 0.97, 0, Math.PI * 2);
      c.save(); c.clip();
      const sh = c.createLinearGradient(-ra * 0.5, -ra * 0.7, ra * 0.6, ra * 0.9);
      sh.addColorStop(0, 'rgba(20,40,120,0)'); sh.addColorStop(0.55, 'rgba(20,40,120,0)'); sh.addColorStop(1, `rgba(20,40,120,${0.45 * plain})`);
      c.fillStyle = sh; c.fillRect(-ra, -ra, ra * 2, ra * 2);
      c.restore();
      c.restore();
      // slow churning plasma on the surface (deterministic)
      if (ra > 10) {
        c.save();
        c.beginPath(); c.ellipse(0, 0, ra * 0.96, rb * 0.96, 0, 0, Math.PI * 2); c.clip();
        c.globalCompositeOperation = 'lighter';
        const r = L.rng(17);
        for (let i = 0; i < 14; i++) {
          const a0 = r() * 6.283, d0 = Math.sqrt(r()) * 0.7, sp = 0.15 + r() * 0.25;
          const a = a0 + gt * sp, px = Math.cos(a) * d0 * ra, py = Math.sin(a) * d0 * rb;
          const rr = ra * (0.12 + r() * 0.16);
          const bg = c.createRadialGradient(px, py, 0, px, py, rr);
          bg.addColorStop(0, `rgba(235,245,255,${0.08 * plain})`); bg.addColorStop(1, 'rgba(235,245,255,0)');
          c.fillStyle = bg; c.fillRect(px - rr, py - rr, rr * 2, rr * 2);
        }
        // specular glint of the key light on the mound
        c.save(); c.translate(-ra * 0.3, -rb * 0.48); c.scale(1, 0.45);
        const sg = c.createRadialGradient(0, 0, 0, 0, 0, ra * 0.32);
        sg.addColorStop(0, `rgba(255,255,255,${0.9 * plain})`); sg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = sg; c.fillRect(-ra * 0.32, -ra * 0.32, ra * 0.64, ra * 0.64);
        c.restore();
        c.restore();
      }
    }
    if (inner && innerK > 0) {
      c.save();
      c.beginPath(); c.ellipse(0, 0, ra, rb, 0, 0, Math.PI * 2);
      c.clip();
      c.rotate(-SPOON_ANG); c.translate(-dx, -dy);
      inner(c);
      c.restore();
    }
    c.restore();
    // a soft bloom over the dollop only
    if (innerK < 1) {
      c.save(); c.globalCompositeOperation = 'lighter';
      L.lightBlob(c, dx, dy, Math.max(4, ra * 1.5), [150, 200, 255], 0.22 * (1 - innerK));
      c.restore();
    }
  } else {
    c.save(); c.globalCompositeOperation = 'lighter';
    L.lightBlob(c, dx, dy, 10, [220, 235, 255], 0.9);
    c.restore();
  }
  c.restore();
}
// faint starfield reflections in the bowl (unit-bowl coords, radius m, alpha)
const SPOON_STARS = (() => {
  const r = L.rng(303), out = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.283, d = 0.72 + r() * 0.24;
    out.push([Math.cos(a) * d, Math.sin(a) * d, 0.00006 + r() * r() * 0.00012, 0.25 + r() * 0.45]);
  }
  return out;
})();
export function dollopScreen(v) {
  const cs = Math.cos(SPOON_ANG), sn = Math.sin(SPOON_ANG);
  return { x: v.wx(SPOON.x + DOL.x * cs - DOL.y * sn), y: v.wy(SPOON.y + DOL.x * sn + DOL.y * cs) };
}

// ------------------------------------------------------------------ background
export function remnantK(gt, tl) {
  const sc = tl.scenes;
  const a = L.smoothstep(L.prog(gt, PH(1, 1)(tl) - 0.2, 1.4)) * (1 - L.smoothstep(L.prog(gt, PH(2, 1)(tl) - 0.2, 0.8)));
  const b = 0.55 * L.smoothstep(L.prog(gt, sc[5].start, 1.2));
  return Math.max(a, b);
}
export function drawBackground(c, v) {
  const g0 = c.createRadialGradient(W / 2, H * 0.47, 60, W / 2, H * 0.5, H * 0.8);
  g0.addColorStop(0, 'rgb(11,18,38)'); g0.addColorStop(0.55, 'rgb(6,11,26)'); g0.addColorStop(1, 'rgb(3,5,14)');
  c.fillStyle = g0; c.fillRect(0, 0, W, H);
  c.save();
  c.globalAlpha = 0.5;
  c.fillStyle = c.createPattern(ditherTile(), 'repeat');
  c.globalCompositeOperation = 'overlay';
  c.fillRect(0, 0, W, H);
  c.restore();
  // zoom-parallax starfield: three layers that scale with log(zoom) and cross-fade as they wrap
  const u0 = -Math.log(v.cam.mpp) * 0.11;
  // zoom speed (nats/s): fast pull-outs streak the stars toward the centre
  const zs = Math.log(camAt(v.gt + 0.03, v.tl).mpp / camAt(v.gt - 0.03, v.tl).mpp) / 0.06;
  const streak = L.clamp(Math.abs(zs) / 12) * Math.sign(zs);
  c.save();
  for (let l = 0; l < 3; l++) {
    let f = u0 + l / 3; f -= Math.floor(f);
    const sc = 0.45 * Math.pow(3.2, f);
    const la = Math.pow(Math.sin(Math.PI * f), 0.8);
    for (const s of STARS[l]) {
      const x = W / 2 + s.x * sc, y = H / 2 + s.y * sc;
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      const tw = 0.55 + 0.45 * Math.sin(v.gt * 1.3 + s.ph);
      const col = L.rgba(s.warm > 0.8 ? [255, 225, 200] : [215, 228, 255], la * (0.25 + 0.5 * tw) * Math.min(1, s.s));
      if (Math.abs(streak) > 0.05) {
        // a streak from where the star was a moment ago (outward for a pull-out)
        const q = 1 + 0.35 * streak;
        c.strokeStyle = col; c.lineWidth = Math.max(0.8, s.s * 1.1); c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, y); c.lineTo(W / 2 + (x - W / 2) * q, H / 2 + (y - H / 2) * q); c.stroke();
      } else {
        c.fillStyle = col;
        c.beginPath(); c.arc(x, y, Math.max(0.4, s.s * (0.7 + 0.5 * f)), 0, Math.PI * 2); c.fill();
      }
    }
  }
  c.restore();
  // supernova remnant (a giant star died here)
  const rk = remnantK(v.gt, v.tl);
  if (rk > 0.003) {
    const img = remnant();
    const sx = L.lerp(W / 2, v.wx(0), 0.12), sy = L.lerp(H * 0.46, v.wy(0), 0.12);
    const sz = 1500 * 1.05;
    c.save();
    c.globalAlpha = rk;
    c.globalCompositeOperation = 'lighter';
    c.drawImage(img, sx - sz / 2, sy - sz / 2, sz, sz);
    c.restore();
  }
}

/** 0..1 while a caption is on screen (beats 1–6; the hook and the question card have none) */
export function captionK(gt, tl) {
  let k = 0;
  for (let i = 1; i <= 6; i++) {
    for (const ph of tl.lines[i].phrases ?? [tl.lines[i]]) {
      k = Math.max(k, L.smoothstep(L.prog(gt, ph.start - 0.15, 0.15)) * (1 - L.smoothstep(L.prog(gt, ph.end + 0.3, 0.2))));
    }
  }
  return k;
}
/** 0..1 while the packed lattice fills the frame (beat 3 "packed" → the start of the beat-4 pull-out) */
export function latticeK(gt, tl) {
  return L.smoothstep(L.prog(gt, wordGt(tl, 3, 1, 7) - 0.3, 0.5)) * (1 - L.smoothstep(L.prog(gt, tl.scenes[4].start + 0.55, 0.45)));
}
export function drawForeground(c, v) {
  // a soft, wide-feathered dark band behind the captions while a caption is up AND the frame behind it is bright
  // (the star's disc / crust under the caption line, the city, the lattice)
  const tl = v.tl;
  const cy = v.wy(0), r = v.ws(R);
  const cover = r > 120 && Math.abs(1450 - cy) < r + 80 ? L.smoothstep(L.clamp((r - 120) / 240)) : 0;
  const k = captionK(v.gt, tl) * Math.max(cover, 0.75 * aboveK(v.gt, tl), latticeK(v.gt, tl));
  if (k <= 0.01) return;
  const g = c.createLinearGradient(0, 1290, 0, 1620);
  g.addColorStop(0, 'rgba(3,6,16,0)');
  g.addColorStop(0.22, `rgba(3,6,16,${0.42 * k})`);
  g.addColorStop(0.4, `rgba(3,6,16,${0.62 * k})`);
  g.addColorStop(0.6, `rgba(3,6,16,${0.62 * k})`);
  g.addColorStop(0.8, `rgba(3,6,16,${0.42 * k})`);
  g.addColorStop(1, 'rgba(3,6,16,0)');
  c.fillStyle = g; c.fillRect(0, 1290, W, 330);
}

/** the exact frame time of the frame being finished (drawHud runs right before the engine's chapter card) */
export let NOW = -1;
let TLREF = null;
export function drawHud(c, v) {
  NOW = v.gt; TLREF = v.tl;
  // a scrim keeps the top bar and the chapter card readable over the beams / glow; stronger over the bright lattice
  const lk = latticeK(v.gt, v.tl);
  const g = c.createLinearGradient(0, 0, 0, 390);
  g.addColorStop(0, `rgba(2,5,14,${0.6 + 0.25 * lk})`);
  g.addColorStop(0.72, `rgba(2,5,14,${0.62 * lk})`);
  g.addColorStop(1, 'rgba(2,5,14,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, 390);
  topBar(c, v, ACCENT);
  // true-scale bar while the city is up
  const k = L.smoothstep(L.prog(v.gt, PH(2, 1, 'start', 0.6)(v.tl), 0.5)) * (1 - L.smoothstep(L.prog(v.gt, v.tl.scenes[3].start - 0.35, 0.3)));
  if (k > 0) scaleBar(c, v, { k, note: 'TRUE SCALE' });
}
/**
 * chapter gate: false for the first `delay` s of `beat`. A scene's `get chapter()` returns null while closed, so a
 * fresh chapter card (no hand-over) first shows when its tile already carries its number (no empty tile).
 */
export function chapterGate(beat, delay) {
  return !(TLREF && NOW >= TLREF.scenes[beat].start - 0.02 && NOW < TLREF.scenes[beat].start + delay);
}

// Transition swishes sit in the silence BETWEEN lines, never on a word.
export const cues = (tl) => [...beatCues(tl),
  // the marshmallow: a low thud under "hits" (below the speech band), one soft bloom after it
  { t: wordGt(tl, 6, 1, 2) + 0.03, name: 'impact', gain: 0.3, pitch: 0.55 },
  { t: wordGt(tl, 6, 1, 2) + 0.1, name: 'bloom', gain: 0.12, pitch: 0.8 },
];
const beatCues = (tl) => tl.scenes.slice(1).map((s, j) => {
  const i = j + 1, a = tl.lines[i - 1].end, b = tl.lines[i].start, mid = (a + b) / 2;
  if (i === 1) return { t: a + 0.05, name: 'whoosh', gain: 0.26, pitch: 0.7 };
  if (i === 3) return { t: a + 0.08, name: 'dive', gain: 0.22, pitch: 0.9 };
  return { t: mid - 0.2, name: 'swish', gain: 0.18, pitch: 0.65 * (i % 2 ? 0.85 : 1) };
});

// ------------------------------------------------------------------ thumbnail stat plate
// thumbnail.json "stat30": {big, small, y}: our own plate, drawn over the engine's thumbnail design (window.__thumb is
// wrapped once): the number is fitted in full and there is no kicker rule without a kicker.
function drawThumbStat(c, st) {
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  const maxW = 860, pad = 44;
  const fs = L.fitSize(c, st.big, maxW - 2 * pad, st.size ?? 112, 800, L.FONT.display, 60);
  c.font = L.font(fs, 800, L.FONT.display);
  const bw = c.measureText(st.big).width;
  c.font = L.font(30, 700, L.FONT.body);
  c.letterSpacing = '3px';
  const sw = st.small ? c.measureText(st.small).width : 0;
  c.letterSpacing = '0px';
  const pw = Math.max(bw, sw) + 2 * pad;
  const capH = fs * 0.72;
  const ph = 46 + capH + (st.small ? 34 + 22 + 40 : 46);
  const px = W / 2 - pw / 2, py = st.y - ph / 2;
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 10;
  c.fillStyle = 'rgb(6,10,22)';
  L.roundRect(c, px, py, pw, ph, 24); c.fill();
  c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
  c.strokeStyle = L.rgba(ACCENT, 0.6); c.lineWidth = 2;
  L.roundRect(c, px, py, pw, ph, 24); c.stroke();
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  c.font = L.font(fs, 800, L.FONT.display);
  c.fillStyle = L.rgba(ACCENT);
  c.fillText(st.big, W / 2 - bw / 2, py + 46 + capH);
  if (st.small) {
    c.font = L.font(30, 700, L.FONT.body);
    c.fillStyle = 'rgba(235,232,225,0.92)';
    L.trackedText(c, st.small, W / 2, py + 46 + capH + 34 + 22, 3, 'center');
  }
  c.restore();
}
if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.__thumb && !window.__thumb.ep30) {
  const orig = window.__thumb;
  const wrapped = async (frame, mode, spec, sub) => {
    const url = await orig(frame, mode, spec, sub);
    if (!spec || !spec.stat30) return url;
    const cv = document.getElementById('c');
    drawThumbStat(cv.getContext('2d'), spec.stat30);
    return cv.toDataURL('image/png');
  };
  wrapped.ep30 = true;
  window.__thumb = wrapped;
}
