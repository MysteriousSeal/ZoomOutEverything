// Beat 10 — "It makes two to three million red cells, | every single second."
// OWNS the MARROW WORLD at P.marrow (beats 10-11 and the pull-out of beat 12). Everything lives inside a world-space
// cut-away HOLE in the hip bone's cortex (radius HOLE_R around P.marrow), so the dive is a straight zoom through it:
//   1.1e-3 .. 5e-4 m/px  the hole opens in the iliac crest (s09 draws the bone surface around it)
//   5e-4  .. 5e-6        spongy bone: a trabecular lattice (a periodic Voronoi tile, mip-mapped pattern)
//   7e-6  .. 3e-7        the same lattice in vector form; the pore at P.marrow fills the frame with red marrow
//   1.1e-6 .. 1.2e-7     the focal plane: fat cells, an erythroblastic island, a sinusoid with flowing red cells;
//                        new red cells squeeze through the sinusoid wall, drop their nucleus and join the stream.
// Exports the stream/birth helpers for s11 (the hero cell born here at HERO is the one that ages in beat 11).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, P, microK } from '../env.js';
import { adapt } from '../legacy.js';

const { W, H } = L;
const UM = 1e-6;
export const HOLE_R = 0.014;                               // the cut-away in the cortex (world m)
const TR = { N: 10, S: 0.0007, RES: 1024 };                // trabecular tile: 10x10 pores of 0.7 mm (7 mm tile)
const MR = { T: 160 * UM, RES: 1024 };                     // marrow cell tile: 160 µm
export const SINUS = { w: 26 * UM, r: 17 * UM };           // sinusoid centreline (local y) + half-height
export const FLOW = 20 * UM;                               // m/s on screen (time-lapsed)
export const ISLAND = { u: -8 * UM, w: -17 * UM, r: 14 * UM };   // erythroblastic island (macrophage + ring)
const FAT = [[-40, -72, 25], [38, -62, 21], [-54, 74, 23], [44, 82, 27], [-98, -24, 26], [100, 8, 24], [5, -112, 22], [-20, 120, 24]];
export const BONE = [214, 200, 178];
const MARROW = [118, 20, 38];

// ------------------------------------------------------------------ local frame (metres relative to P.marrow)
export const lx = (v, u) => v.wx(P.marrow.x + u);
export const ly = (v, w) => v.wy(P.marrow.y + w);
/** Visible local rect (+ margin px). */
function view(v, m = 60) {
  const mpp = v.cam.mpp, ay = v.wy(v.cam.y);
  return {
    u0: v.cam.x - P.marrow.x + (-m - W / 2) * mpp, u1: v.cam.x - P.marrow.x + (W + m - W / 2) * mpp,
    w0: v.cam.y - P.marrow.y + (-m - ay) * mpp, w1: v.cam.y - P.marrow.y + (H + m - ay) * mpp,
  };
}

// ------------------------------------------------------------------ trabecular lattice (periodic jittered Voronoi)
const mod = (a, n) => ((a % n) + n) % n;
function jit(i, j) {
  const a = mod(i, TR.N), b = mod(j, TR.N);
  if (a === 0 && b === 0) return [0, 0];                   // the pore we dive into is centred on P.marrow
  const r = L.rng(a * 131 + b * 7919 + 17); r();
  return [(r() - 0.5) * 0.7, (r() - 0.5) * 0.7];
}
const seed = (i, j) => { const [a, b] = jit(i, j); return [(i + a) * TR.S, (j + b) * TR.S]; };
function halfT(i1, j1, i2, j2) {
  const a = mod(i1, TR.N) * TR.N + mod(j1, TR.N), b = mod(i2, TR.N) * TR.N + mod(j2, TR.N);
  if (a === 0 || b === 0) return TR.S * 0.06;              // the pore we dive into stays roomy
  const r = L.rng(Math.min(a, b) * 977 + Math.max(a, b) + 5); r();
  return TR.S * (0.06 + 0.075 * r());                      // strut half-thickness 42-95 µm
}
const NB = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
/** Pore polygon of seed (i,j): its Voronoi cell inset by the strut half-thickness (+ extra). World-local metres. */
function porePoly(i, j, extra = 0) {
  const [cx, cy] = seed(i, j);
  const B = TR.S * 1.6;
  let poly = [[cx - B, cy - B], [cx + B, cy - B], [cx + B, cy + B], [cx - B, cy + B]];
  for (const [di, dj] of NB) {
    const [kx, ky] = seed(i + di, j + dj);
    const dx = kx - cx, dy = ky - cy, d = Math.hypot(dx, dy), nx = dx / d, ny = dy / d;
    const lim = d / 2 - halfT(i, j, i + di, j + dj) - extra;
    const out = [];
    for (let q = 0; q < poly.length; q++) {
      const a = poly[q], b = poly[(q + 1) % poly.length];
      const fa = (a[0] - cx) * nx + (a[1] - cy) * ny - lim, fb = (b[0] - cx) * nx + (b[1] - cy) * ny - lim;
      if (fa <= 0) out.push(a);
      if ((fa <= 0) !== (fb <= 0)) { const s = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]); }
    }
    poly = out;
    if (poly.length < 3) return null;
  }
  return poly;
}

// ------------------------------------------------------------------ cached textures (deterministic, built once)
let TEX = null;
function mips(cv) {
  const out = [cv];
  let cur = cv;
  while (cur.width > 32) {
    const n = new OffscreenCanvas(cur.width / 2, cur.height / 2), g = n.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, n.width, n.height);
    out.push(n); cur = n;
  }
  return out;
}
function hashf(x, y, s) { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
function buildTrab() {
  const { N, S, RES } = TR, T = N * S, px = T / RES;
  const cv = new OffscreenCanvas(RES, RES), g = cv.getContext('2d');
  const img = g.createImageData(RES, RES), D = img.data;
  const FS = 60 * UM;
  for (let y = 0; y < RES; y++) {
    for (let x = 0; x < RES; x++) {
      const u = (x + 0.5) * px, w = (y + 0.5) * px;
      const ci = Math.round(u / S), cj = Math.round(w / S);
      let best = 1e9, bi = 0, bj = 0;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const [sx, sy] = seed(ci + di, cj + dj), d = (u - sx) ** 2 + (w - sy) ** 2;
        if (d < best) { best = d; bi = ci + di; bj = cj + dj; }
      }
      const [nx, ny] = seed(bi, bj);
      let m = 1e9, ht = S * 0.1;
      for (const [di, dj] of NB) {
        const [kx, ky] = seed(bi + di, bj + dj);
        const e = ((u - kx) ** 2 + (w - ky) ** 2 - best) / (2 * Math.hypot(kx - nx, ky - ny));
        const h = halfT(bi, bj, bi + di, bj + dj);
        if (e - h < m) { m = e - h; ht = h; }
      }
      // pore colour: marrow with cell speckle, fat droplets, occlusion near the struts
      const sp = hashf(Math.floor(u / (9 * UM)), Math.floor(w / (9 * UM)), 1);
      let col = L.mix(MARROW, [150, 40, 70], sp * 0.5).map((c) => c * (0.8 + 0.4 * hashf(x, y, 3)));
      const fi = Math.floor(u / FS), fj = Math.floor(w / FS);
      if (hashf(mod(fi, Math.round(T / FS)), mod(fj, Math.round(T / FS)), 7) < 0.22) {
        const fd = Math.hypot(u - (fi + 0.5) * FS, w - (fj + 0.5) * FS);
        if (fd < 24 * UM) col = L.mix(col, [232, 205, 150], 0.8 * L.smoothstep(L.clamp((24 * UM - fd) / (6 * UM))));
      }
      col = col.map((c) => c * (0.5 + 0.5 * L.smoothstep(L.clamp(m / (90 * UM)))));
      // strut: a rounded bony rod (brighter at its core), lamellar shimmer
      const s = L.clamp(-m / ht);
      const lam = 0.94 + 0.06 * Math.sin((m / UM) * 0.55 + hashf(bi, bj, 2) * 6);
      const bone = BONE.map((c) => c * (0.58 + 0.42 * Math.sqrt(s)) * lam);
      const a = L.smoothstep(L.clamp(0.5 - m / px));       // 1-px antialiased edge
      const o = (y * RES + x) * 4;
      D[o] = L.lerp(col[0], bone[0], a); D[o + 1] = L.lerp(col[1], bone[1], a); D[o + 2] = L.lerp(col[2], bone[2], a); D[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return mips(cv);
}
function cellSprite(kind, R = 64) {
  const cv = new OffscreenCanvas(R * 2, R * 2), g = cv.getContext('2d');
  g.translate(R, R);
  const r = R * 0.94;
  if (kind === 'rbc' || kind === 'rbcSoft') {
    if (kind === 'rbcSoft') g.filter = `blur(${R * 0.12}px)`;
    const rr = kind === 'rbcSoft' ? r * 0.8 : r;
    const gr = g.createRadialGradient(-rr * 0.08, -rr * 0.1, 0, 0, 0, rr);
    gr.addColorStop(0, 'rgb(214,92,96)'); gr.addColorStop(0.32, 'rgb(196,52,62)'); gr.addColorStop(0.62, 'rgb(158,18,36)');
    gr.addColorStop(0.86, 'rgb(176,28,44)'); gr.addColorStop(0.95, 'rgb(222,84,88)'); gr.addColorStop(1, 'rgba(160,20,40,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); g.fill();
    // specular rim (upper left) + soft inner shadow of the dimple
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,190,180,0.35)'; g.lineWidth = rr * 0.07;
    g.beginPath(); g.arc(0, 0, rr * 0.86, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
    return cv;
  }
  // nucleated marrow cells: cytoplasm + nucleus
  const P2 = {
    ery: { cyto: [[214, 120, 150], [170, 70, 110]], nuc: [86, 30, 96], nr: 0.5 },
    eryLate: { cyto: [[226, 110, 112], [184, 52, 70]], nuc: [70, 22, 60], nr: 0.34 },
    myelo: { cyto: [[232, 190, 205], [196, 140, 170]], nuc: [120, 70, 140], nr: 0.45 },
    lymph: { cyto: [[190, 160, 210], [150, 110, 175]], nuc: [74, 40, 110], nr: 0.7 },
  }[kind];
  const gr = g.createRadialGradient(-r * 0.25, -r * 0.3, 0, 0, 0, r);
  gr.addColorStop(0, L.rgba(P2.cyto[0])); gr.addColorStop(0.85, L.rgba(P2.cyto[1])); gr.addColorStop(1, L.rgba(P2.cyto[1], 0.0));
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  if (kind === 'myelo') {
    const q = L.rng(4);
    for (let i = 0; i < 40; i++) { const a = q() * 6.28, d = Math.sqrt(q()) * r * 0.85; g.fillStyle = `rgba(150,90,140,${0.25 + q() * 0.3})`; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.045, 0, 6.28); g.fill(); }
  }
  const nr = r * P2.nr, nx = kind === 'myelo' ? r * 0.15 : r * 0.08;
  const ng = g.createRadialGradient(nx - nr * 0.3, -nr * 0.35, 0, nx, 0, nr);
  ng.addColorStop(0, L.rgba(L.mix(P2.nuc, [255, 255, 255], 0.25))); ng.addColorStop(1, L.rgba(P2.nuc));
  g.fillStyle = ng; g.beginPath();
  if (kind === 'myelo') g.ellipse(nx, 0, nr, nr * 0.7, 0.5, 0, Math.PI * 2); else g.arc(nx, 0, nr, 0, Math.PI * 2);
  g.fill();
  // chromatin
  const q = L.rng(kind.length * 13);
  for (let i = 0; i < 14; i++) { const a = q() * 6.28, d = Math.sqrt(q()) * nr * 0.8; g.fillStyle = `rgba(30,6,30,${0.15 + q() * 0.25})`; g.beginPath(); g.arc(nx + Math.cos(a) * d, Math.sin(a) * d, nr * 0.13, 0, 6.28); g.fill(); }
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = 'rgba(255,220,230,0.22)'; g.lineWidth = r * 0.06;
  g.beginPath(); g.arc(0, 0, r * 0.9, Math.PI * 1.1, Math.PI * 1.65); g.stroke();
  return cv;
}
function buildMarrow() {
  const { T, RES } = MR, s = RES / T;
  const cv = new OffscreenCanvas(RES, RES), g = cv.getContext('2d');
  g.fillStyle = L.rgba([92, 14, 30]); g.fillRect(0, 0, RES, RES);
  const spr = { ery: cellSprite('ery'), eryLate: cellSprite('eryLate'), myelo: cellSprite('myelo'), lymph: cellSprite('lymph'), rbc: cellSprite('rbc') };
  const kinds = ['ery', 'eryLate', 'myelo', 'lymph', 'rbc', 'rbc', 'eryLate', 'myelo'];
  g.filter = 'blur(5px)';
  const q = L.rng(808);
  const n = 260;
  for (let i = 0; i < n; i++) {
    const x = q() * T, y = q() * T, kd = kinds[Math.floor(q() * kinds.length)];
    const rr = (kd === 'rbc' ? 3.7 : 4.2 + q() * 2.2) * UM * s, dim = 0.55 + q() * 0.4;
    g.globalAlpha = dim;
    for (const ox of [-RES, 0, RES]) for (const oy of [-RES, 0, RES]) {
      const X = x * s + ox, Y = y * s + oy;
      if (X < -rr * 1.2 || X > RES + rr * 1.2 || Y < -rr * 1.2 || Y > RES + rr * 1.2) continue;
      g.drawImage(spr[kd], X - rr, Y - rr, rr * 2, rr * 2);
    }
  }
  g.globalAlpha = 1; g.filter = 'none';
  return mips(cv);
}
export function tex() {
  if (!TEX) {
    TEX = {
      trab: buildTrab(), marrow: buildMarrow(),
      rbc: cellSprite('rbc'), rbcSoft: cellSprite('rbcSoft'),
      cells: [cellSprite('ery'), cellSprite('eryLate'), cellSprite('myelo'), cellSprite('lymph')],
      ery: cellSprite('ery'), eryLate: cellSprite('eryLate'),
    };
  }
  return TEX;
}
/** A pattern of mip chain `lv` whose tile spans `world` metres, aligned to P.marrow (local 0,0). */
function worldPattern(c, v, lv, world) {
  const mpp = v.cam.mpp;
  // the finest mip level that is not minified below ~0.7 (no shimmer while zooming)
  let i = 0;
  while (i < lv.length - 1 && world / (lv[i].width * mpp) < 0.7) i++;
  const img = lv[i], sc = world / (img.width * mpp);
  const p = c.createPattern(img, 'repeat');
  p.setTransform(new DOMMatrix([sc, 0, 0, sc, lx(v, 0), ly(v, 0)]));
  return p;
}

// ------------------------------------------------------------------ births (deterministic schedule)
// 17c: beat 10 is ~3.4 s (17: 4.75 s) and beat 11 (the hero ages) is cut, so the hero is born earlier, the label lands
// earlier and the 6 % push eases back out before the beat-14 pull-out
const HERO_T = 2.0, LABEL_T = 0.7;   // label in on "two to three million" (≈ 28.8 s), not after it
let BIRTHS = null, BT0 = null;
/** Birth events: {tc (global s), xw (local m), lane, a (start angle on the island ring)}. Event 0 is the hero. */
export function births(tl) {
  const t0 = tl.scenes[10].start + HERO_T;
  if (BIRTHS && BT0 === t0) return BIRTHS;
  BT0 = t0;
  const q = L.rng(1010);
  BIRTHS = [{ tc: t0, xw: -5 * UM, lane: SINUS.w - 2 * UM, a: Math.PI / 2 + 0.25 }];
  let t = t0 + 0.62;
  for (let n = 1; n < 34; n++) {
    BIRTHS.push({ tc: t, xw: (-34 + q() * 58) * UM, lane: SINUS.w + (q() - 0.5) * 20 * UM, a: Math.PI / 2 + (q() - 0.5) * 1.4 });
    t += 0.5 + q() * 0.3;
  }
  return BIRTHS;
}
const WALL_TOP = () => SINUS.w - SINUS.r;
/** Hero-birth focus 0..1: around the beat-10 hero squeezing through the wall, everything else dims. */
function heroFocus(v) {
  const tau = v.gt - births(v.tl)[0].tc;
  return L.ease.inOutCubic(L.prog(tau, -0.95, 0.5)) * (1 - L.ease.inOutCubic(L.prog(tau, 0.75, 0.6)));
}
/** A slow 6% push toward the hero's exit point in beat 10 (eased back out before beat 11 so s11 picks up cleanly). */
function heroPush(v) {
  const t = v.gt - v.tl.scenes[10].start;
  return 1 + 0.06 * L.ease.inOutCubic(L.prog(t, 1.1, 1.2)) * (1 - L.ease.inOutCubic(L.prog(t, 2.45, 0.85)));
}
/** Position + state of a birth at global time gt (local metres). */
export function birthState(b, gt) {
  const tau = gt - b.tc;
  const top = WALL_TOP();
  const s0 = [ISLAND.u + Math.cos(b.a) * ISLAND.r * 0.9, ISLAND.w + Math.sin(b.a) * ISLAND.r * 0.9];
  const entry = [b.xw, top - 5 * UM];
  if (tau < -1.5) return null;
  if (tau < -0.45) {
    const e = L.ease.inOutCubic(L.prog(tau, -1.5, 1.05));
    return { x: L.lerp(s0[0], entry[0], e), y: L.lerp(s0[1], entry[1], e), phase: 'walk', a: L.prog(tau, -1.5, 0.3), sq: 0, nuc: 1 };
  }
  if (tau < 0) {
    const p = L.prog(tau, -0.45, 0.45), e = L.ease.inOutCubic(p);
    return { x: b.xw, y: L.lerp(entry[1], top + 5.5 * UM, e), phase: 'squeeze', a: 1, sq: Math.sin(Math.PI * p), nuc: 1 - L.smoothstep(L.prog(p, 0.45, 0.5)), p };
  }
  const drift = FLOW * Math.max(0, tau - 0.35 * (1 - Math.exp(-tau / 0.35)));
  const y = L.lerp(top + 5.5 * UM, b.lane, L.ease.inOutCubic(L.prog(tau, 0, 1.0)));
  return { x: b.xw + drift, y, phase: 'flow', a: 1, sq: 0, nuc: 0, tau };
}

// ------------------------------------------------------------------ drawing: sprites
function drawRbc(c, img, x, y, r, rot, squash, alpha = 1) {
  if (r < 0.6 || alpha <= 0) return;
  c.save();
  c.globalAlpha *= alpha;
  c.translate(x, y); c.rotate(rot); c.scale(1, Math.max(0.12, squash));
  c.drawImage(img, -r, -r, r * 2, r * 2);
  c.restore();
}

// ------------------------------------------------------------------ the focal plane (inside the central pore)
function wallY(u, side) {   // local m: wavy sinusoid wall (side -1 top, +1 bottom)
  return SINUS.w + side * SINUS.r + 0.7 * UM * Math.sin(u / (13 * UM) + side * 1.7) + 0.5 * UM * Math.sin(u / (5.3 * UM) + side);
}
function drawFat(c, v, k0, vr) {
  for (const [n, [u, w, r]] of FAT.entries()) {
    // staggered and late (after the island + sinusoid), so they never read as a ring around the focal point
    const k = k0 * microK(v, 7.5e-7 - n * 0.45e-7, 3.4e-7 - n * 0.12e-7);
    if (k <= 0) continue;
    const U = u * UM, Wv = w * UM, R = r * UM;
    if (U + R < vr.u0 || U - R > vr.u1 || Wv + R < vr.w0 || Wv - R > vr.w1) continue;
    const x = lx(v, U), y = ly(v, Wv), rr = v.ws(R);
    c.save();
    c.globalAlpha = k * 0.62;
    c.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2, d = rr * (1 + 0.035 * Math.sin(a * 3 + u) + 0.02 * Math.sin(a * 5 + w + v.gt * 0.4));
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
    const g = c.createRadialGradient(x - rr * 0.3, y - rr * 0.35, rr * 0.05, x, y, rr);
    g.addColorStop(0, 'rgba(250,236,206,0.62)'); g.addColorStop(0.7, 'rgba(226,196,150,0.55)'); g.addColorStop(1, 'rgba(196,146,112,0.75)');
    c.fillStyle = g; c.fill();
    c.lineWidth = Math.max(1, v.ws(0.9 * UM)); c.strokeStyle = 'rgba(255,236,210,0.8)'; c.stroke();
    // the squeezed nucleus at the rim + a glassy highlight
    const na = u * 0.37;
    c.fillStyle = 'rgba(150,90,120,0.75)';
    c.beginPath(); c.ellipse(x + Math.cos(na) * rr * 0.9, y + Math.sin(na) * rr * 0.9, Math.max(0, rr * 0.13), Math.max(0, rr * 0.05), na + Math.PI / 2, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = 'rgba(255,255,240,0.22)'; c.lineWidth = Math.max(1, rr * 0.05);
    c.beginPath(); c.arc(x, y, Math.max(0, rr * 0.82), Math.PI * 1.1, Math.PI * 1.55); c.stroke();
    c.restore();
  }
}
function insideFat(u, w, pad) {
  for (const [fu, fw, r] of FAT) if (Math.hypot(u - fu * UM, w - fw * UM) < r * UM + pad) return true;
  return false;
}
function drawTissueCells(c, v, k, vr, T) {
  if (k <= 0) return;
  const SP = 12 * UM;
  const i0 = Math.floor(vr.u0 / SP), i1 = Math.ceil(vr.u1 / SP), j0 = Math.floor(vr.w0 / SP), j1 = Math.ceil(vr.w1 / SP);
  c.save();
  c.globalAlpha = k;
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const q = L.rng((i * 92821 + j * 68917 + 3) >>> 0);
      const u = (i + 0.2 + q() * 0.6) * SP, w = (j + 0.2 + q() * 0.6) * SP;
      if (q() < 0.3) continue;
      if (w > SINUS.w - SINUS.r - 6 * UM && w < SINUS.w + SINUS.r + 6 * UM) continue;
      if (insideFat(u, w, 4 * UM)) continue;
      if (Math.hypot(u - ISLAND.u, w - ISLAND.w) < ISLAND.r + 10 * UM) continue;
      const r = (4.2 + q() * 2.0) * UM;
      const img = T.cells[Math.floor(q() * 4)];
      const jx = L.noise1(v.gt * 0.5 + i * 3.1, j) * 0.6 * UM, jy = L.noise1(v.gt * 0.5 + j * 2.3, i) * 0.6 * UM;
      const x = lx(v, u + jx), y = ly(v, w + jy), rr = v.ws(r);
      c.globalAlpha = k * (0.5 + 0.3 * q());
      c.drawImage(img, x - rr, y - rr, rr * 2, rr * 2);
    }
  }
  c.restore();
}
function macrophagePath(c, x, y, r, t, seedv, reach = null) {
  c.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    let d = r * (1 + 0.12 * L.noise1(a * 1.6 + t * 0.35, seedv) + 0.06 * Math.sin(a * 5 + t * 0.8 + seedv));
    if (reach) d += reach.len * Math.pow(Math.max(0, Math.cos(a - reach.ang)), 6);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}
export function drawMacrophage(c, v, x, y, r, k, seedv = 3, reach = null) {
  if (k <= 0 || r < 1) return;
  c.save();
  c.globalAlpha *= k;
  macrophagePath(c, x, y, r, v.gt, seedv, reach);
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, 'rgba(246,222,226,0.72)'); g.addColorStop(1, 'rgba(206,160,186,0.55)');
  c.fillStyle = g; c.fill();
  c.lineWidth = Math.max(1, r * 0.035); c.strokeStyle = 'rgba(255,236,240,0.7)'; c.stroke();
  // kidney nucleus + a few vacuoles
  c.fillStyle = 'rgba(132,82,140,0.55)';
  c.beginPath(); c.ellipse(x + r * 0.15, y - r * 0.05, Math.max(0, r * 0.32), Math.max(0, r * 0.2), 0.6, 0, Math.PI * 2); c.fill();
  const q = L.rng(seedv * 31);
  for (let i = 0; i < 6; i++) {
    const a = q() * 6.28, d = r * (0.3 + q() * 0.45);
    c.fillStyle = `rgba(190,120,80,${0.25 + q() * 0.2})`;
    c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(0, r * (0.05 + q() * 0.05)), 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
function drawIsland(c, v, k, T) {
  const x = lx(v, ISLAND.u), y = ly(v, ISLAND.w), R = v.ws(ISLAND.r);
  if (x < -R * 2 || x > W + R * 2 || y < -R * 2 || y > H + R * 2) return;
  c.save();
  c.globalAlpha = k;
  // a faint nest glow: this is where red cells are made
  L.lightBlob(c, x, y, R * 2.4, [255, 130, 130], 0.2);
  drawMacrophage(c, v, x, y, v.ws(10 * UM), 1, 5);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3 + v.gt * 0.05;
    if (Math.abs(((a % 6.283) + 6.283) % 6.283 - Math.PI / 2) < 0.5) continue;      // the gap where cells leave
    const d = ISLAND.r * (0.95 + 0.08 * Math.sin(i * 2.1 + v.gt * 0.7));
    const img = i % 3 === 0 ? T.ery : T.eryLate;
    const rr = v.ws((4.9 + (i % 3) * 0.4) * UM);
    c.drawImage(img, lx(v, ISLAND.u + Math.cos(a) * d) - rr, ly(v, ISLAND.w + Math.sin(a) * d) - rr, rr * 2, rr * 2);
  }
  c.restore();
}
function drawSinus(c, v, k, vr, T, hideHero, holdHero = false) {
  const top = (u) => wallY(u, -1), bot = (u) => wallY(u, 1);
  if (SINUS.w + SINUS.r + 4 * UM < vr.w0 || SINUS.w - SINUS.r - 4 * UM > vr.w1) return;
  const N = 60, du = (vr.u1 - vr.u0) / N;
  c.save();
  c.globalAlpha = k;
  // lumen
  c.beginPath();
  for (let i = 0; i <= N; i++) { const u = vr.u0 + i * du; i ? c.lineTo(lx(v, u), ly(v, top(u))) : c.moveTo(lx(v, u), ly(v, top(u))); }
  for (let i = N; i >= 0; i--) { const u = vr.u0 + i * du; c.lineTo(lx(v, u), ly(v, bot(u))); }
  c.closePath();
  const g = c.createLinearGradient(0, ly(v, SINUS.w - SINUS.r), 0, ly(v, SINUS.w + SINUS.r));
  g.addColorStop(0, 'rgb(70,8,22)'); g.addColorStop(0.5, 'rgb(122,26,40)'); g.addColorStop(1, 'rgb(58,6,18)');
  c.fillStyle = g; c.fill();
  c.save(); c.clip();
  // the stream: 4 lanes on a lattice drifting downstream
  const SP = 10.5 * UM, shift = FLOW * v.gt;
  const rbcR = v.ws(3.75 * UM);
  for (let lane = 0; lane < 4; lane++) {
    const lw = SINUS.w + (lane - 1.5) * 8.6 * UM;
    const i0 = Math.floor((vr.u0 - shift) / SP) - 1, i1 = Math.ceil((vr.u1 - shift) / SP) + 1;
    for (let i = i0; i <= i1; i++) {
      const q = L.rng((i * 7331 + lane * 1913 + 77) >>> 0);
      if (q() < 0.14) continue;
      const u = i * SP + shift + (q() - 0.5) * 4 * UM + lane * 2.6 * UM;
      const w = lw + (q() - 0.5) * 2.4 * UM + L.noise1(v.gt * 0.6 + i, lane) * 0.8 * UM;
      const ph = q() * 6.28, sp = 0.5 + q() * 0.9;
      const squash = 0.25 + 0.75 * Math.abs(Math.cos(ph + v.gt * sp));
      const dim = lane === 0 || lane === 3 ? 0.82 : 1;
      drawRbc(c, T.rbc, lx(v, u), ly(v, w), rbcR * (0.95 + q() * 0.1), q() * 3.14 + v.gt * 0.2 * (q() - 0.5), squash, dim);
    }
  }
  c.restore();
  // walls: endothelium with flattened nuclei
  c.lineWidth = Math.max(1, v.ws(1.5 * UM));
  c.strokeStyle = 'rgba(240,170,176,0.8)';
  for (const side of [-1, 1]) {
    c.beginPath();
    for (let i = 0; i <= N; i++) { const u = vr.u0 + i * du, y = ly(v, wallY(u, side)); i ? c.lineTo(lx(v, u), y) : c.moveTo(lx(v, u), y); }
    c.stroke();
    const NS = 31 * UM;
    for (let n = Math.floor(vr.u0 / NS); n <= Math.ceil(vr.u1 / NS); n++) {
      const u = n * NS + (side > 0 ? 13 * UM : 0);
      c.fillStyle = 'rgba(196,118,156,0.85)';
      c.beginPath(); c.ellipse(lx(v, u), ly(v, wallY(u, side) - side * 0.8 * UM), Math.max(0, v.ws(5.5 * UM)), Math.max(0, v.ws(1.5 * UM)), 0, 0, Math.PI * 2); c.fill();
    }
  }
  // births: precursors walk to the wall, squeeze through, drop the nucleus, join the stream
  for (const [n, b] of births(v.tl).entries()) {
    if (n === 0 && (hideHero || holdHero)) continue;
    drawBirth(c, v, b, T, n === 0);
  }
  c.restore();
}
export function drawBirth(c, v, b, T, hero = false) {
  const s = birthState(b, v.gt);
  if (!s) return;
  const tau = v.gt - b.tc;
  const hs = hero ? 1 + 0.4 * (1 - L.smoothstep(L.prog(tau, 0.9, 0.9))) : 1;   // the hero reads 1.4x, settling before beat 11
  const x = lx(v, s.x), y = ly(v, s.y), r = v.ws(3.9 * UM) * hs;
  if (x < -100 || x > W + 100 || y < -100 || y > H + 100) return;
  if (s.phase === 'flow' && s.tau > 9) return;
  c.save();
  c.globalAlpha *= s.a;
  if (s.phase === 'walk' || s.phase === 'squeeze') {
    // squeezing through the wall: narrow and tall, the nucleus left behind (sprite cross-fades to a red cell)
    const sq = s.sq;
    c.translate(x, y);
    c.scale(1 - 0.42 * sq, 1 + 0.38 * sq);
    c.globalAlpha *= s.nuc;
    c.drawImage(T.eryLate, -r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
    c.globalAlpha = s.a * (1 - s.nuc);
    if (s.nuc < 1) c.drawImage(T.rbc, -r, -r, r * 2, r * 2);
  } else {
    const rot = 0.4 + (s.tau ?? 0) * 0.5, squash = 0.35 + 0.65 * Math.abs(Math.cos((s.tau ?? 0) * 1.1 + b.xw * 1e5));
    drawRbc(c, T.rbc, x, y, r, rot, squash);
    if (hero && s.tau < 2.5) L.lightBlob(c, x, y, r * 2.4, ACCENT, 0.18 * (1 - L.prog(s.tau, 1.2, 1.3)));
  }
  c.restore();
  // the extruded nucleus: stays above the wall, drifts back to the island's macrophage and fades
  const top = WALL_TOP();
  if (tau > -0.2 && tau < 1.6) {
    const e = L.ease.inOutCubic(L.prog(tau, 0.1, 1.4));
    const nx = L.lerp(b.xw, ISLAND.u + 4 * UM, e), ny = L.lerp(top - 2.6 * UM, ISLAND.w + 6 * UM, e);
    const na = L.prog(tau, -0.2, 0.2) * (1 - L.prog(tau, 1.0, 0.6));
    c.save();
    c.globalAlpha *= na;
    const nr = v.ws(2.1 * UM) * (hero ? 1.4 : 1);
    const ng = c.createRadialGradient(lx(v, nx) - nr * 0.3, ly(v, ny) - nr * 0.3, 0, lx(v, nx), ly(v, ny), nr);
    ng.addColorStop(0, 'rgb(130,70,140)'); ng.addColorStop(1, 'rgb(60,18,60)');
    c.fillStyle = ng; c.beginPath(); c.arc(lx(v, nx), ly(v, ny), Math.max(0, nr), 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // the birth sparkle on the wall
  if (tau > -0.08 && tau < 0.7) {
    const p = L.prog(tau, -0.08, 0.78), a = Math.pow(1 - p, 2) * (hero ? 1 : 0.75);
    const sx = lx(v, b.xw), sy = ly(v, top), R = v.ws((hero ? 12 : 8) * UM) * L.ease.outCubic(p);
    c.save();
    c.globalCompositeOperation = 'lighter';
    L.lightBlob(c, sx, sy, Math.max(1, R * 1.4), [255, 200, 190], 0.5 * a);
    // a soft ring + a 4-point star flare (tapered, not a crosshair)
    c.strokeStyle = `rgba(255,225,215,${0.45 * a})`; c.lineWidth = Math.max(1, v.ws(0.5 * UM));
    c.beginPath(); c.arc(sx, sy, Math.max(0, R), 0, Math.PI * 2); c.stroke();
    const sl = R * 0.75 * (0.6 + 0.4 * (1 - p)), sw = Math.max(1, v.ws(0.5 * UM));
    c.fillStyle = `rgba(255,240,232,${0.9 * a})`;
    c.beginPath(); c.ellipse(sx, sy, Math.max(0, sl), sw, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(sx, sy, sw, Math.max(0, sl * 0.8), 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // the hero's ring pulse (≈ 80-100 px across, on the 'ping'): THIS is the moment a new cell enters the blood
  if (hero && tau > -0.05 && tau < 1.1) {
    const sx = lx(v, b.xw), sy = ly(v, top);
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const [lag, amp] of [[0, 1], [0.18, 0.55]]) {
      const p = L.prog(tau, -0.05 + lag, 0.95);
      if (p <= 0 || p >= 1) continue;
      const a = Math.pow(1 - p, 1.6) * amp, rr = L.lerp(10, 50, L.ease.outCubic(p));
      c.strokeStyle = `rgba(255,214,204,${0.85 * a})`; c.lineWidth = L.lerp(4, 1.2, p);
      c.beginPath(); c.arc(sx, sy, Math.max(0, rr), 0, Math.PI * 2); c.stroke();
    }
    const pa = Math.pow(1 - L.prog(tau, -0.05, 1.0), 2);
    L.lightBlob(c, sx, sy, 72, [255, 170, 160], 0.4 * pa);
    c.restore();
  }
}
function drawBokeh(c, v, k, T) {
  // near-plane red cells, out of focus, drifting faster than the stream (parallax)
  const cyc = 420 * UM;
  for (let i = 0; i < 4; i++) {
    const q = L.rng(4040 + i * 17);
    const u0 = q() * cyc, w = (-90 + q() * 200) * UM, r = (12 + q() * 8) * UM;
    const u = ((u0 + v.gt * FLOW * 1.7) % cyc) - cyc / 2 + v.cam.x - P.marrow.x;
    const x = lx(v, u), y = ly(v, w), rr = v.ws(r);
    if (x < -rr || x > W + rr) continue;
    drawRbc(c, T.rbcSoft, x, y, rr, q() * 3, 0.5 + 0.4 * Math.abs(Math.cos(v.gt * 0.4 + i)), 0.32 * k);
  }
}

// ------------------------------------------------------------------ the hole: bone cut-away with the lattice inside
/** Rim wobble of the cut-away, periodic in a (the noise is cross-faded over the turn so the outline has no seam). */
function holeWobble(a) {
  const T = Math.PI * 2, f = a / T;
  const n = (b) => 0.045 * L.noise1(b * 2.2, 9) + 0.02 * L.noise1(b * 7, 4);
  return 1 + n(a) * (1 - f) + n(a - T) * f;
}
function holePath(c, v, R) {
  const x = lx(v, 0), y = ly(v, 0);
  c.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const d = v.ws(R * holeWobble(a));
    i ? c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d) : c.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  c.closePath();
}
function polyPath(c, v, poly) {
  c.moveTo(lx(v, poly[0][0]), ly(v, poly[0][1]));
  for (let i = 1; i < poly.length; i++) c.lineTo(lx(v, poly[i][0]), ly(v, poly[i][1]));
  c.closePath();
}
function drawVectorLattice(c, v, k, kF, T, hideHero) {
  const mpp = v.cam.mpp, vr = view(v, 40);
  c.save();
  c.globalAlpha *= k;
  // struts: the bone between the pores
  const g = c.createRadialGradient(W / 2, H * 0.46, 50, W / 2, H / 2, H * 0.8);
  g.addColorStop(0, L.rgba(BONE)); g.addColorStop(1, L.rgba(BONE.map((x) => x * 0.62)));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // lamellae: faint growth lines across the bone (only once they are ≥ 10 px apart)
  const kl = microK(v, 2.2e-6, 1.2e-6);
  c.strokeStyle = `rgba(120,96,70,${0.07 * kl})`; c.lineWidth = Math.max(1, 6 * UM / mpp);
  const LS = 22 * UM;
  for (let n = Math.floor(vr.w0 / LS); kl > 0 && n <= Math.ceil(vr.w1 / LS); n++) {
    c.beginPath();
    for (let i = 0; i <= 24; i++) {
      const u = vr.u0 + (vr.u1 - vr.u0) * i / 24, w = n * LS + 6 * UM * Math.sin(u / (90 * UM) + n * 0.7);
      i ? c.lineTo(lx(v, u), ly(v, w)) : c.moveTo(lx(v, u), ly(v, w));
    }
    c.stroke();
  }
  const pat = worldPattern(c, v, T.marrow, MR.T);
  const RND = 48 * UM;
  const i0 = Math.floor(vr.u0 / TR.S) - 1, i1 = Math.ceil(vr.u1 / TR.S) + 1, j0 = Math.floor(vr.w0 / TR.S) - 1, j1 = Math.ceil(vr.w1 / TR.S) + 1;
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const poly = porePoly(i, j, RND);
      if (!poly) continue;
      let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
      for (const [px, py] of poly) { bx0 = Math.min(bx0, px); bx1 = Math.max(bx1, px); by0 = Math.min(by0, py); by1 = Math.max(by1, py); }
      if (bx1 + RND < vr.u0 || bx0 - RND > vr.u1 || by1 + RND < vr.w0 || by0 - RND > vr.w1) continue;
      const lw = 2 * RND / mpp;
      c.lineJoin = 'round';
      // strut shading: darker toward each pore (a rounded rod), then a bright bony lip right at the edge
      c.beginPath(); polyPath(c, v, poly);
      c.strokeStyle = 'rgba(96,74,56,0.2)'; c.lineWidth = lw + 2 * Math.max(2, 60 * UM / mpp); c.stroke();
      c.strokeStyle = 'rgba(96,74,56,0.22)'; c.lineWidth = lw + 2 * Math.max(1, 30 * UM / mpp); c.stroke();
      c.strokeStyle = 'rgba(255,246,230,0.6)'; c.lineWidth = lw + Math.max(2, 14 * UM / mpp); c.stroke();
      // the pore: marrow (rounded by stroking with the same pattern)
      c.fillStyle = pat; c.strokeStyle = pat; c.lineWidth = lw;
      c.fill(); c.stroke();
      // inner occlusion: dark falloff inside the pore edge
      c.save();
      c.beginPath(); polyPath(c, v, poly); c.clip();
      c.strokeStyle = 'rgba(30,2,8,0.35)'; c.lineWidth = Math.max(2, 50 * UM / mpp); c.stroke();
      c.strokeStyle = 'rgba(30,2,8,0.3)'; c.lineWidth = Math.max(2, 20 * UM / mpp); c.stroke();
      if (i === 0 && j === 0 && kF > 0) drawFocal(c, v, kF, T, hideHero);
      c.restore();
    }
  }
  c.restore();
}
function drawFocal(c, v, kF, T, hideHero) {
  const vr = view(v, 80);
  drawFat(c, v, kF, vr);
  drawTissueCells(c, v, kF * microK(v, 5.5e-7, 2.6e-7), vr, T);
  drawIsland(c, v, kF, T);
  const foc = hideHero ? 0 : heroFocus(v);
  drawSinus(c, v, kF, vr, T, hideHero, foc > 0);
  if (foc > 0) {
    // spotlight: dim everything not involved in the hero birth by ~30%, then the hero on top
    const b = births(v.tl)[0], ex = lx(v, b.xw), ey = ly(v, WALL_TOP() - 4 * UM);
    const sg = c.createRadialGradient(ex, ey, 110, ex, ey, 300);
    sg.addColorStop(0, 'rgba(16,2,8,0)'); sg.addColorStop(1, `rgba(16,2,8,${0.34 * foc * kF})`);
    c.fillStyle = sg; c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha *= kF; drawBirth(c, v, b, T, true); c.restore();
  }
  // depth: the island + sinusoid band stays bright, the rest falls off
  const fx = lx(v, 0), fy = ly(v, 6 * UM), fr = v.ws(95 * UM);
  const vg = c.createRadialGradient(fx, fy, fr * 0.35, fx, fy, fr);
  vg.addColorStop(0, 'rgba(20,2,8,0)'); vg.addColorStop(1, `rgba(20,2,8,${0.5 * kF})`);
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  drawBokeh(c, v, kF * microK(v, 4e-7, 2e-7), T);
}

/** Visibility of the marrow world in time (beats 10 → 12). */
function timeK(v) {
  const tl = v.tl, a = tl.scenes[10].start - 0.15, b = tl.scenes[14].end;   // 17c: the pull-out is beat 14
  return v.gt >= a && v.gt <= b ? 1 : 0;
}

export const SCENE = {
  beat: 10,
  chapter: { num: '10', title: 'The factory', sub: 'new red cells, made in the marrow' },
  captions: true,
  layer: 4,
  cues(d) {
    const out = [
      { t: 0.0, name: 'dive', gain: 0.42, pitch: 0.85 },
      { t: 0.75, name: 'creak', gain: 0.14, pitch: 0.7 },
      { t: 1.35, name: 'bubbles', gain: 0.22, pitch: 0.75 },
      { t: LABEL_T, name: 'tick', gain: 0.3, pitch: 1.0 },
      { t: HERO_T, name: 'ping', gain: 0.3, pitch: 1.2 },
      { t: HERO_T + 0.02, name: 'shimmer', gain: 0.14, pitch: 1.3 },
    ];
    // the birth rhythm on "every single second"
    births({ scenes: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { start: 0 }] }).slice(1).forEach((b, i) => {
      if (b.tc < d - 0.1) out.push({ t: b.tc, name: 'blip', gain: 0.1 + 0.03 * (i % 2), pitch: 1.3 + 0.15 * (i % 3) });
    });
    return out;
  },
  drawWorld(c, v) {
    if (!timeK(v)) return;
    const mpp = v.cam.mpp;
    // on beat 12's fast pull-out the opening dissolves with s09's bone surface (17b port: gone by 2e-5 m/px, matching s09's widened bone dissolve)
    const kHole = v.gt > v.tl.scenes[12].start - 0.05 ? microK(v, 1.2e-4, 2e-5) : microK(v, 1.15e-3, 5e-4);
    if (kHole <= 0) return;
    const x = lx(v, 0), y = ly(v, 0), R = v.ws(HOLE_R);
    if (x + R * 1.2 < 0 || x - R * 1.2 > W || y + R * 1.2 < 0 || y - R * 1.2 > H) return;
    const T = tex();
    const kVec = microK(v, 7e-6, 4.5e-6);
    const kF = microK(v, 1.15e-6, 4.6e-7);
    const hideHero = v.gt >= v.tl.scenes[11].start;
    const covered = R > 1500;                       // the hole covers the whole frame
    const push = hideHero ? 1 : heroPush(v);
    c.save();
    if (push > 1) {
      const b = births(v.tl)[0], ex = lx(v, b.xw), ey = ly(v, WALL_TOP());
      c.translate(ex, ey); c.scale(push, push); c.translate(-ex, -ey);
    }
    c.globalAlpha = kHole;
    if (!covered) { holePath(c, v, HOLE_R); c.save(); c.clip(); }
    if (kVec < 1) {
      c.fillStyle = worldPattern(c, v, T.trab, TR.N * TR.S);
      c.fillRect(0, 0, W, H);
    }
    if (kVec > 0) drawVectorLattice(c, v, kVec, kF, T, hideHero);
    if (!covered) {
      // inner shadow under the cut edge + the cortex's cut face (a bevelled ring)
      const sh = c.createRadialGradient(x, y, R * 0.7, x, y, R * 1.02);
      sh.addColorStop(0, 'rgba(20,0,6,0)'); sh.addColorStop(1, 'rgba(20,0,6,0.7)');
      c.fillStyle = sh; c.fillRect(x - R * 1.1, y - R * 1.1, R * 2.2, R * 2.2);
      c.restore();
      c.save();
      const rg = c.createLinearGradient(x - R, y - R, x + R, y + R);
      rg.addColorStop(0, 'rgb(250,238,214)'); rg.addColorStop(0.5, L.rgba(BONE)); rg.addColorStop(1, 'rgb(120,98,80)');
      // annulus via even-odd
      const ring = new Path2D();
      const add = (RR) => {
        for (let i = 0; i <= 72; i++) {
          const a = (i / 72) * Math.PI * 2;
          const d = v.ws(RR * holeWobble(a));
          i ? ring.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d) : ring.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
        }
        ring.closePath();
      };
      add(HOLE_R * 1.075); add(HOLE_R);
      c.fillStyle = rg; c.fill(ring, 'evenodd');
      c.restore();
      // the marrow's glow through the opening when it is still small
      const far = microK(v, 4e-5, 2e-4);
      if (far > 0) L.lightBlob(c, x, y, R * 2.2, ACCENT, 0.22 * far);
    }
    c.restore();
    // a soft dark band behind the HUD (chapter subtitle, scale note) once the marrow fills the frame
    // (also over the pale ilium surface during the dive, where the cream bone would wash out the HUD)
    const kb = Math.max(covered ? kVec * kHole : 0, kHole * microK(v, 6e-4, 2.5e-4));
    if (kb > 0) {
      const tg = c.createLinearGradient(0, 0, 0, 380);
      tg.addColorStop(0, `rgba(14,2,6,${0.5 * kb})`); tg.addColorStop(0.65, `rgba(14,2,6,${0.36 * kb})`); tg.addColorStop(1, 'rgba(14,2,6,0)');
      c.fillStyle = tg; c.fillRect(0, 0, W, 380);
    }
  },
  drawOverlay(c, v) {
    const k = v.k * L.ease.outCubic(L.prog(v.t, LABEL_T, 0.45));
    if (k <= 0) return;
    c.save();
    c.globalAlpha = L.clamp(k * 1.3);
    c.translate(540, 420); c.scale(1, 0.42);
    const g = c.createRadialGradient(0, 0, 20, 0, 0, 520);
    g.addColorStop(0, 'rgba(14,2,6,0.7)'); g.addColorStop(0.6, 'rgba(14,2,6,0.4)'); g.addColorStop(1, 'rgba(14,2,6,0)');   // firmer backing over the marrow dive (17b)
    c.fillStyle = g; c.fillRect(-540, -520, W, 1040);
    c.restore();
    L.bigLabel(c, { x: 540, y: 440, big: '2–3 MILLION', small: 'new red cells every second', k, accent: ACCENT, align: 'center', size: 104 });
  },
};

// 17c: 17 beat 10 plays as a 17c beat on the legacy timeline (legacy.js); chapter renumbered
export default adapt(SCENE, 10, { chapter: { num: '08', title: 'The factory', sub: 'new red cells, made in the marrow' } });
