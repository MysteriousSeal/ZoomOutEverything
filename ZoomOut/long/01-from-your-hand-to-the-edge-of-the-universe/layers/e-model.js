// Builder E: one deterministic universe of galaxies for the cosmos layer (lf 23 → 28).
//
// Units here are MILLIONS OF LIGHT-YEARS (Mly), world frame (x right, y down, origin = us). Positions are Float32.
//
// The universe is a single density field, sampled at several LEVELS of detail. Each level is a set of points spread
// over a disc around us; the levels partition space radially (a smooth "partition of unity"), so the finer level sits in
// the middle and coarser ones outside it, and every level samples the SAME field. A point of level k stands for
// 1 / RHO_k Mly² of galaxies, so the surface brightness is continuous from one level to the next.
//
// The field: a multi-scale Voronoi cosmic web (walls/filaments on cell edges, clusters at the vertices) built on
// jittered grids: big cells (~230 Mly voids), small cells (~75 Mly, groups and thin sub-filaments), a ~1.1 Gly
// "super" web that modulates the density (great walls / supercluster complexes), real nearby groups and clusters
// at their true projected positions (Virgo, Fornax, Centaurus, Hydra, Norma/Great Attractor, Shapley,
// Perseus–Pisces...), a few filaments converging on the Great Attractor, and the early-universe fade toward the edge.
import * as L from '../../../../engine/runtime/lib.js';
import { LY, gal, LANIAKEA, R_OBS, ANDROMEDA } from '../camera.js';

export const MLY = 1e6 * LY;
export const ROBS = R_OBS / MLY;                      // 46,500 Mly
const G = (l, b, d) => { const p = gal(l, b, d * MLY); return [p.x / MLY, p.y / MLY]; };
export const GA = [LANIAKEA.x / MLY, LANIAKEA.y / MLY];   // the Great Attractor (Laniakea's heart)
export const VIRGO = G(283.8, 74.4, 54);
export const LG_R = 3.6;                              // the Local Group's clear zone (builder D draws it until lf 24.4)

// ------------------------------------------------------------------ hashing / noise
export function hash(a, b, s) {
  let n = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  n = Math.imul(n ^ (n >>> 15), 2246822519);
  n ^= n >>> 13;
  return (n >>> 0) / 4294967296;
}
const hyp = (a, b) => Math.sqrt(a * a + b * b);
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
function vnoise(x, s) {           // 1D value noise in [0,1]
  const i = Math.floor(x), f = x - i;
  return L.lerp(hash(i, 7, s), hash(i + 1, 7, s), f * f * (3 - 2 * f));
}

function vn2(x, y, s) {           // 2D value noise in [0,1]
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), w = fy * fy * (3 - 2 * fy);
  const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
}
/** Smooth domain warp (bends every wall and filament the same way at every level). */
const WP = { x: 0, y: 0 };
function warp(g, x, y, sign = 1) {
  const t = g.tab || table(g), N = g.N, S = g.S, A = S * (g.S > 500 ? 0.55 : 0.42) * sign;
  const fx0 = x / S - 0.5, fy0 = y / S - 0.5;
  const i = Math.floor(fx0), j = Math.floor(fy0), fx = fx0 - i, fy = fy0 - j;
  const u = fx * fx * (3 - 2 * fx), w = fy * fy * (3 - 2 * fy);
  const q00 = ((j + g.off) * N + i + g.off) * 4, q10 = q00 + 4, q01 = q00 + N * 4, q11 = q01 + 4;
  const ox = t[q00 + 2] + (t[q10 + 2] - t[q00 + 2]) * u + (t[q01 + 2] - t[q00 + 2]) * w + (t[q00 + 2] - t[q10 + 2] - t[q01 + 2] + t[q11 + 2]) * u * w - 0.5;
  const oy = t[q00 + 3] + (t[q10 + 3] - t[q00 + 3]) * u + (t[q01 + 3] - t[q00 + 3]) * w + (t[q00 + 3] - t[q10 + 3] - t[q01 + 3] + t[q11 + 3]) * u * w - 0.5;
  WP.x = x + ox * A; WP.y = y + oy * A;
}
/** Inverse of warp (fixed-point, 2 iterations). */
function unwarp(g, x, y) {
  let px = x, py = y;
  for (let k = 0; k < 2; k++) { warp(g, px, py); px += x - WP.x; py += y - WP.y; }
  WP.x = px; WP.y = py;
}

// ------------------------------------------------------------------ jittered-grid Voronoi
function mkGrid(S, salt) { return { S, salt, tab: null, N: 0, off: 0 }; }
/** Per-cell table: [seed x, seed y, warp x, warp y] (pure functions of the cell; built once, replaces hashing). */
function table(g) {
  if (g.tab) return g.tab;
  const N = Math.ceil((ROBS * 2.3) / g.S) + 6, off = N >> 1, t = new Float32Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const ci = i - off, cj = j - off, q = (j * N + i) * 4;
    t[q] = (ci + 0.1 + 0.8 * hash(ci, cj, g.salt)) * g.S;
    t[q + 1] = (cj + 0.1 + 0.8 * hash(ci, cj, g.salt + 1)) * g.S;
    t[q + 2] = hash(ci, cj, g.salt + 5);
    t[q + 3] = hash(ci, cj, g.salt + 6);
  }
  g.N = N; g.off = off; g.tab = t;
  return t;
}
const BIG = mkGrid(230, 101), SMALL = mkGrid(76, 202), SUPER = mkGrid(540, 303);
// scratch: nearest three seeds
const NB = { d: [0, 0, 0], x: [0, 0, 0], y: [0, 0, 0], id: [0, 0, 0] };
function nearest3(g, px, py) {
  const t = g.tab || table(g), N = g.N, S = g.S, ci = Math.floor(px / S), cj = Math.floor(py / S);
  let d0 = Infinity, d1 = Infinity, d2 = Infinity, x0 = 0, y0 = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0, i0 = 0, i1 = 0, i2 = 0;
  for (let j = cj - 1; j <= cj + 1; j++) {
    const row = (j + g.off) * N + g.off;
    for (let i = ci - 1; i <= ci + 1; i++) {
      const q = (row + i) * 4, sx = t[q], sy = t[q + 1];
      const dx = sx - px, dy = sy - py, d = dx * dx + dy * dy;
      if (d < d2) {
        const id = row + i;
        if (d < d1) {
          d2 = d1; x2 = x1; y2 = y1; i2 = i1;
          if (d < d0) { d1 = d0; x1 = x0; y1 = y0; i1 = i0; d0 = d; x0 = sx; y0 = sy; i0 = id; }
          else { d1 = d; x1 = sx; y1 = sy; i1 = id; }
        } else { d2 = d; x2 = sx; y2 = sy; i2 = id; }
      }
    }
  }
  NB.d[0] = d0; NB.d[1] = d1; NB.d[2] = d2; NB.x[0] = x0; NB.x[1] = x1; NB.x[2] = x2; NB.y[0] = y0; NB.y[1] = y1; NB.y[2] = y2;
  NB.id[0] = i0; NB.id[1] = i1; NB.id[2] = i2;
}
/** Signed distance from (px,py) to the bisector of its two nearest seeds (≥ 0), i.e. to the nearest cell wall. */
function wallDist(g, px, py) {
  warp(g, px, py); px = WP.x; py = WP.y;
  nearest3(g, px, py);
  const dx = NB.x[1] - NB.x[0], dy = NB.y[1] - NB.y[0], len = hyp(dx, dy);
  return ((px - (NB.x[0] + NB.x[1]) / 2) * dx + (py - (NB.y[0] + NB.y[1]) / 2) * dy) / len * -1 + 0;
}
function pairHash(a, b, s) { return a < b ? hash(a, b, s) : hash(b, a, s); }
function triHash(a, b, c, s) {
  let t;
  if (a > b) { t = a; a = b; b = t; }
  if (b > c) { t = b; b = c; c = t; }
  if (a > b) { t = a; a = b; b = t; }
  return hash(hash(a, b, s) * 4294967296 | 0, c, s + 9);
}

// ------------------------------------------------------------------ real structures (projected onto the map)
// [x, y, galaxies, core radius (Mly), warm]: true galactic positions; richness is only a relative weight.
export const CLUSTERS = [
  { name: 'virgo', p: VIRGO, n: 1500, a: 1.8 },
  { name: 'fornax', p: G(236.7, -53.6, 62), n: 260, a: 1.2 },
  { name: 'centaurus', p: G(302.4, 21.6, 170), n: 700, a: 2.4 },
  { name: 'hydra', p: G(269.6, 26.5, 160), n: 420, a: 2.0 },
  { name: 'norma', p: GA, n: 1100, a: 2.8 },
  { name: 'shapley', p: G(312.0, 31.0, 650), n: 3200, a: 9 },
  { name: 'perseus', p: G(150.6, -13.3, 240), n: 900, a: 2.6 },
  { name: 'antlia', p: G(273.0, 19.1, 130), n: 160, a: 1.4 },
  { name: 'pavo', p: G(332.3, -23.6, 190), n: 260, a: 1.8 },
  { name: 'sc0', p: [57, 54], n: 380, a: 1.6 },
  { name: 'sc1', p: [45, 45], n: 160, a: 1.2 }, { name: 'sc2', p: [70, 64], n: 300, a: 1.4 },
  { name: 'sc3', p: [66, 43], n: 110, a: 1.0 }, { name: 'sc4', p: [49, 62], n: 90, a: 1.0 }, { name: 'sc5', p: [80, 56], n: 140, a: 1.2 },
];
export const GROUP_TAG = [5.6, -6.0];   // a small nearby group (unnamed) used for the beat-26 'GROUP' tag
export const GROUPS = [   // nearby groups, true projected positions (dwarfs + a few big galaxies each)
  { p: GROUP_TAG, n: 30, a: 0.45 },
  { p: G(142.1, 40.9, 11.7), n: 34, a: 0.45 },   // M81 group
  { p: G(309.5, 19.4, 12.4), n: 30, a: 0.45 },   // Centaurus A group
  { p: G(314.6, 32.0, 15.0), n: 16, a: 0.4 },    // M83
  { p: G(138.2, 10.6, 10.7), n: 18, a: 0.4 },    // IC 342 / Maffei
  { p: G(102.0, 59.8, 22.7), n: 16, a: 0.45 },   // M101
  { p: G(234.4, 57.0, 35.0), n: 32, a: 0.6 },    // Leo I
  { p: G(95.7, 11.7, 25.0), n: 12, a: 0.4 },     // NGC 6946
  { p: G(150.2, 79.0, 26.0), n: 22, a: 0.6 },    // Canes Venatici II-ish
  { p: G(200.0, -60.0, 30.0), n: 14, a: 0.5 },
];
// the "supercluster" complex shown on beat 26's phrase "superclusters" (a chain of groups and clusters inside Laniakea)
export const SC_HINT = [58, 56];
export const SC_PARTS = [[50, 47], [69, 63], [64, 41], [47, 66], [78, 50]];
// filaments converging on the Great Attractor ([from, to, galaxies per Mly, sigma Mly])
const v2 = (a, b, k) => [L.lerp(a[0], b[0], k), L.lerp(a[1], b[1], k)];
export const SPOKES = [
  [[0, 0], VIRGO, 3.2, 0.66],                      // the Local Sheet toward Virgo
  [VIRGO, CLUSTERS[7].p, 2.4, 1.21],
  [CLUSTERS[7].p, GA, 2.6, 1.43],
  [VIRGO, [40, 50], 2.0, 1.32], [[40, 50], SC_HINT, 2.6, 1.32], [SC_HINT, CLUSTERS[2].p, 2.4, 1.43],
  [CLUSTERS[2].p, GA, 3.2, 1.43],
  [CLUSTERS[3].p, CLUSTERS[7].p, 2.0, 1.32],
  [CLUSTERS[8].p, GA, 2.6, 1.65],
  [GA, CLUSTERS[5].p, 2.0, 2.75],
  [[45, 45], [57, 54], 2.2, 1.0], [[57, 54], [70, 64], 2.2, 1.1], [[66, 43], [57, 54], 1.4, 0.9], [[49, 62], [45, 45], 1.2, 0.9], [[80, 56], [70, 64], 1.4, 0.9], [[66, 43], [80, 56], 1.0, 1.0],
  [CLUSTERS[1].p, CLUSTERS[3].p, 1.4, 1.65],
  [[-60, 30], CLUSTERS[1].p, 1.2, 1.65], [[150, -20], GA, 1.6, 1.93], [[-40, -70], [0, 0], 1.0, 1.38],
  [[0, 0], [-70, 10], 1.2, 1.38], [SC_HINT, [110, 20], 1.8, 1.38],
];
// planted features for the cosmic-web labels (beat 28), well inside the frame at the web's hold
export const WEB_VOID = { p: [-2450, -1350], r: 175 };
export const WEB_WALL = { a: [1300, -2300], c: [2150, -2350], b: [2750, -1600], sigma: 11 };
export const WEB_NODE = { p: [2150, 1450], n: 0, a: 9 };

// ------------------------------------------------------------------ the sampler
const TWO_PI = Math.PI * 2;
function gauss(r) { return Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(TWO_PI * r()); }
/** Super-web modulation (0.3 … 1.45): great walls and supercluster complexes on a ~1.1 Gly scale. */
function superMod(x, y) {
  warp(SUPER, x, y);
  const wx = WP.x, wy = WP.y;
  nearest3(SUPER, wx, wy);
  const dx = NB.x[1] - NB.x[0], dy = NB.y[1] - NB.y[0], len = hyp(dx, dy);
  const d = Math.abs((wx - (NB.x[0] + NB.x[1]) / 2) * dx + (wy - (NB.y[0] + NB.y[1]) / 2) * dy) / len;
  const s = pairHash(NB.id[0], NB.id[1], 313);
  const w = 0.03 + 1.42 * (0.12 + 0.88 * s * s) * Math.exp(-((d / (44 + 58 * s)) ** 2));
  const vd = hyp(x - WEB_VOID.p[0], y - WEB_VOID.p[1]);
  return w * smooth((vd - WEB_VOID.r * 0.7) / (WEB_VOID.r * 0.45)) * (1 + 0.5 * Math.exp(-(((vd - WEB_VOID.r * 1.15) / 30) ** 2)));
}
/** Very large-scale modulation (~2.5 Gly): some regions hold the great walls, others are quieter (0.25 … 1). */
function mega(x, y) {
  const v = 0.6 * vn2(x / 2600, y / 2600, 911) + 0.4 * vn2(x / 1100, y / 1100, 912);
  return 0.22 + 0.78 * smooth((v - 0.25) / 0.55);
}
/** Early-universe homogenisation toward the edge (0 near, 1 far). */
export const ACC = 0.2;                 // mean acceptance of webSample (measured), keeps levels consistent
const homog = (r) => smooth((r - 17000) / 16000) * 0.75;

// output scratch
const OUT = { x: 0, y: 0, kind: 0 };   // kind: 0 filament, 1 node/cluster, 2 small filament, 3 group, 4 field
/** One attempt: pull a uniform point (x, y) onto the web. Returns false when rejected. */
function webSample(r, x, y, R) {
  const rad = hyp(x, y);
  let m = r();
  const hz = homog(rad);
  if (hz > 0 && r() < hz) {             // far away: the web dissolves into a smooth early universe
    if (r() > ACC) return false;
    OUT.x = x; OUT.y = y; OUT.kind = 5;
    return true;
  }
  if (m < 0.05) {                       // rich clusters at the super-web's vertices (the bright knots)
    warp(SUPER, x, y); const wx = WP.x, wy = WP.y;
    nearest3(SUPER, wx, wy);
    const ax = NB.x[0], ay = NB.y[0], bx = NB.x[1], by = NB.y[1], cx = NB.x[2], cy = NB.y[2];
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(D) < 1e-6) return false;
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D, uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D;
    if ((ux - wx) ** 2 + (uy - wy) ** 2 > (SUPER.S * 1.1) ** 2) return false;
    const rich = triHash(NB.id[0], NB.id[1], NB.id[2], 77);
    if (r() * 0.42 > (0.05 + 0.95 * rich * rich * rich) * mega(ux, uy)) return false;
    unwarp(SUPER, ux, uy); const vx = WP.x, vy = WP.y;
    if (vx * vx + vy * vy < 650 * 650) return false;      // keep our own neighbourhood as it is
    const a = 2.5 + 6 * rich, uu = r() * 0.94, rp = a * Math.sqrt(uu / (1 - uu)), th = r() * TWO_PI;
    OUT.x = vx + rp * Math.cos(th); OUT.y = vy + rp * Math.sin(th); OUT.kind = 1;
    return true;
  }
  if (m < 0.22) {                       // the long filaments of the super-web, joining the knots
    warp(SUPER, x, y); x = WP.x; y = WP.y;
    nearest3(SUPER, x, y);
    const ax = NB.x[0], ay = NB.y[0], bx = NB.x[1], by = NB.y[1];
    const dx = bx - ax, dy = by - ay, len = hyp(dx, dy), nx = dx / len, ny = dy / len;
    const d = (x - (ax + bx) / 2) * nx + (y - (ay + by) / 2) * ny;
    const qx = x - d * nx, qy = y - d * ny;
    if ((qx - NB.x[2]) ** 2 + (qy - NB.y[2]) ** 2 < (qx - ax) ** 2 + (qy - ay) ** 2) return false;
    const s = pairHash(NB.id[0], NB.id[1], 313);
    const u = qx * -ny + qy * nx, clump = vnoise(u / 22, (s * 7919) | 0);
    unwarp(SUPER, qx, qy); const fx = WP.x, fy = WP.y;
    const rr = fx * fx + fy * fy;
    if (rr < 450 * 450) return false;                     // our neighbourhood is curated (Virgo, Laniakea)
    if (r() * 0.42 > (0.14 + 0.86 * s * s * s) * (0.45 + 0.55 * clump) * mega(fx, fy) * smooth((Math.sqrt(rr) - 450) / 450)) return false;
    const g = gauss(r) * (4 + 5 * (1 - s));
    OUT.x = fx + nx * g; OUT.y = fy + ny * g; OUT.kind = 0;
    return true;
  }
  if (m < 0.5) {                        // big walls / filaments
    warp(BIG, x, y); x = WP.x; y = WP.y;
    nearest3(BIG, x, y);
    const ax = NB.x[0], ay = NB.y[0], bx = NB.x[1], by = NB.y[1];
    const dx = bx - ax, dy = by - ay, len = hyp(dx, dy), nx = dx / len, ny = dy / len;
    const d = (x - (ax + bx) / 2) * nx + (y - (ay + by) / 2) * ny;
    const qx = x - d * nx, qy = y - d * ny;
    const cx = NB.x[2], cy = NB.y[2];
    if ((qx - cx) ** 2 + (qy - cy) ** 2 < (qx - ax) ** 2 + (qy - ay) ** 2) return false;   // past a vertex
    const s = pairHash(NB.id[0], NB.id[1], 77);
    const strength = 0.06 + 0.94 * s * s * s;
    const u = qx * -ny + qy * nx;
    const clump = vnoise(u / 16, (s * 9973) | 0);
    unwarp(BIG, qx, qy); const fx = WP.x, fy = WP.y;
    const u0 = r() * 0.42, a0 = strength * (0.25 + 0.75 * clump * clump);
    if (u0 > a0 || u0 > a0 * superMod(fx, fy) / 1.45) return false;
    const sig = (2.6 + 4.5 * (1 - s)) * (0.6 + 0.8 * vnoise(u / 40, 3));
    const g = gauss(r) * sig;
    OUT.x = fx + nx * g; OUT.y = fy + ny * g; OUT.kind = 0;
    return true;
  }
  if (m < 0.6) {                        // clusters at the big web's vertices
    warp(BIG, x, y); x = WP.x; y = WP.y;
    nearest3(BIG, x, y);
    const ax = NB.x[0], ay = NB.y[0], bx = NB.x[1], by = NB.y[1], cx = NB.x[2], cy = NB.y[2];
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(D) < 1e-6) return false;
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D;
    const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D;
    if ((ux - x) ** 2 + (uy - y) ** 2 > (BIG.S * 1.1) ** 2) return false;
    const rich = triHash(NB.id[0], NB.id[1], NB.id[2], 55);
    const rr = rich ** 3;
    unwarp(BIG, ux, uy); const vx = WP.x, vy = WP.y;
    // Virgo dominates its neighbourhood, and there is no big cluster next to the Local Group
    if ((vx - VIRGO[0]) ** 2 + (vy - VIRGO[1]) ** 2 < 32 * 32 || vx * vx + vy * vy < 26 * 26) return false;
    const u0 = r() * 0.42, a0 = 0.1 + 0.9 * rr;
    if (u0 > a0 || u0 > a0 * superMod(vx, vy) / 1.45) return false;
    const a = 1.6 + 5.5 * rr, uu = (r() * 0.94), rp = a * Math.sqrt(uu / (1 - uu)), th = r() * TWO_PI;
    OUT.x = vx + rp * Math.cos(th); OUT.y = vy + rp * Math.sin(th); OUT.kind = 1;
    return true;
  }
  if (m < 0.82) {                       // small cells: thin sub-filaments, strongest near the big walls
    const dB = Math.abs(wallDist(BIG, x, y));
    warp(SMALL, x, y); x = WP.x; y = WP.y;
    nearest3(SMALL, x, y);
    const ax = NB.x[0], ay = NB.y[0], bx = NB.x[1], by = NB.y[1];
    const dx = bx - ax, dy = by - ay, len = hyp(dx, dy), nx = dx / len, ny = dy / len;
    const d = (x - (ax + bx) / 2) * nx + (y - (ay + by) / 2) * ny;
    const qx = x - d * nx, qy = y - d * ny;
    if ((qx - NB.x[2]) ** 2 + (qy - NB.y[2]) ** 2 < (qx - ax) ** 2 + (qy - ay) ** 2) return false;
    const s = pairHash(NB.id[0], NB.id[1], 91);
    const near = 0.18 + 0.82 * Math.exp(-((dB / (0.24 * BIG.S)) ** 2));
    unwarp(SMALL, qx, qy); const fx = WP.x, fy = WP.y;
    const u0 = r() * 0.42, a0 = (0.1 + 0.9 * s * s) * near;
    if (u0 > a0 || u0 > a0 * (0.08 + 0.92 * superMod(fx, fy) / 1.45)) return false;
    const g = gauss(r) * (1.3 + 1.6 * (1 - s));
    OUT.x = fx + nx * g; OUT.y = fy + ny * g; OUT.kind = 2;
    return true;
  }
  if (m < 0.845) {                      // groups: the small web's vertices
    warp(SMALL, x, y); x = WP.x; y = WP.y;
    nearest3(SMALL, x, y);
    const ax = NB.x[0], ay = NB.y[0], bx = NB.x[1], by = NB.y[1], cx = NB.x[2], cy = NB.y[2];
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(D) < 1e-6) return false;
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D;
    const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D;
    if ((ux - x) ** 2 + (uy - y) ** 2 > (SMALL.S * 1.1) ** 2) return false;
    const rich = triHash(NB.id[0], NB.id[1], NB.id[2], 66);
    unwarp(SMALL, ux, uy); const vx = WP.x, vy = WP.y;
    const dB = Math.abs(wallDist(BIG, vx, vy));
    const near = 0.1 + 0.9 * Math.exp(-((dB / (0.3 * BIG.S)) ** 2));
    const u0 = r() * 0.42, a0 = (0.1 + 0.9 * rich * rich) * near;
    if (u0 > a0 || u0 > a0 * (0.1 + 0.9 * superMod(vx, vy) / 1.45)) return false;
    const a = 1.2 + 2.2 * rich, uu = (r() * 0.92), rp = a * Math.sqrt(uu / (1 - uu)), th = r() * TWO_PI;
    OUT.x = vx + rp * Math.cos(th); OUT.y = vy + rp * Math.sin(th); OUT.kind = 3;
    return true;
  }
  // field galaxies: sparse, rarer deep inside voids (and the smooth early universe far away)
  if (hz < 0.5) {
    const dB = Math.abs(wallDist(BIG, x, y));
    const u0 = r() * 0.42, a0 = 0.1 + 0.9 * Math.exp(-((dB / (0.25 * BIG.S)) ** 2));
    if (u0 > a0 || u0 > a0 * superMod(x, y) / 1.45) return false;
    const vd = hyp(x - WEB_VOID.p[0], y - WEB_VOID.p[1]);
    if (vd < WEB_VOID.r * 0.8 && r() > 0.08) return false;
  }
  OUT.x = x; OUT.y = y; OUT.kind = 4;
  return true;
}

// ------------------------------------------------------------------ levels
// rho: points per Mly² (where the level is fully on). keep(r): the radial partition.
const ramp = (r, R) => 1 - smooth((r - 0.55 * R) / (0.45 * R));
export const LEVELS = [
  { name: 'L0', R: 700, rho: 0.45, seed: 12, galaxies: true },
  { name: 'L05', R: 3000, rho: 0.04, seed: 13 },
  { name: 'L1', R: 12500, rho: 0.0036, seed: 14 },
  { name: 'L15', R: 30000, rho: 0.0006, seed: 16 },
  { name: 'L2', R: ROBS, rho: 9e-5, seed: 15, edge: true },
];
function keepAt(k, r) {
  const Lv = LEVELS[k];
  let p = k === LEVELS.length - 1 ? (r < ROBS ? 1 : 0) : ramp(r, Lv.R);
  if (k > 0) p *= 1 - ramp(r, LEVELS[k - 1].R);
  return p;
}
/** Density boost toward the edge on the last level (finer grain as we look back in time). */
const edgeDens = (r) => 1 + 2.2 * smooth((r - 16000) / 24000);
/** Brightness of galaxies by distance: dims and fades out where the first galaxies formed (~0.75 R). */
export const edgeLum = (r) => 1 - 0.5 * smooth((r - 12000) / 18000) - 0.5 * smooth((r - 33000) / 10500);
/** Tint index shift by distance (redshift). */
const PAL = [
  [170, 198, 255],   // 0 blue-white (star-forming spirals)
  [222, 230, 255],   // 1 white
  [255, 238, 214],   // 2 warm white
  [255, 214, 165],   // 3 gold (ellipticals, cluster cores)
  [255, 176, 120],   // 4 orange (redshifted)
  [245, 128, 86],    // 5 red-orange (far)
  [150, 178, 255],   // 6 dwarf blue
];
export const PR = new Float32Array(PAL.map((c) => c[0] / 255));
export const PG = new Float32Array(PAL.map((c) => c[1] / 255));
export const PB = new Float32Array(PAL.map((c) => c[2] / 255));
export { PAL };

function tintFor(r, kind, rad) {
  let t;
  const u = r();
  if (kind === 1) t = u < 0.7 ? 3 : 2;
  else if (kind === 4) t = u < 0.55 ? 0 : 1;
  else t = u < 0.32 ? 0 : u < 0.62 ? 1 : u < 0.86 ? 2 : 3;
  const z = smooth((rad - 9000) / 26000);           // redshift with distance
  if (z > 0) { const s = Math.min(5, t + Math.round(z * 3.2 + (r() - 0.5) * 1.2)); t = Math.max(t, s); }
  return t;
}
/** Luminosity draw (mean ~1, long tail: a few giants, many faint). */
function lumDraw(r, kind) {
  const u = Math.max(1e-6, r());
  let l = Math.pow(-Math.log(u), 1.9) / 1.83;
  if (kind === 1) l *= 1.35;
  if (kind === 4) l *= 0.7;
  return l;
}

function alloc(n, galaxies) {
  return {
    n: 0, X: new Float32Array(n), Y: new Float32Array(n), Wt: new Float32Array(n), Cap: new Float32Array(n), T: new Uint8Array(n),
    S: galaxies ? new Float32Array(n) : null, M: galaxies ? new Uint8Array(n) : null,
  };
}
function push(o, x, y, w, cap, t, size = 0, morph = 0) {
  const i = o.n++;
  o.X[i] = x; o.Y[i] = y; o.Wt[i] = w; o.Cap[i] = cap; o.T[i] = t;
  if (o.S) { o.S[i] = size; o.M[i] = morph; }
}
/** Galaxy size (Mly, diameter) and morphology (0 spiral, 1 barred, 2 elliptical, 3 irregular, 4 dwarf). */
function galaxyShape(r, kind, lum, dwarf) {
  if (dwarf) return [0.004 + 0.012 * r() ** 2, r() < 0.6 ? 3 : 4];
  const ell = kind === 1 ? r() < 0.62 : r() < 0.18;
  const m = ell ? 2 : r() < 0.12 ? 3 : r() < 0.4 ? 1 : 0;
  const size = Math.min(0.32, (0.035 + 0.055 * Math.sqrt(lum)) * (0.75 + 0.5 * r()) * (m === 2 && kind === 1 ? 1.25 : 1));
  return [size, m];
}

/** Integral of keep(r)·dens(r) over the disc (for the expected point count). */
function keepIntegral(k, densFn) {
  const R = LEVELS[k].R, n = 2000;
  let s = 0;
  for (let i = 0; i < n; i++) { const r = (i + 0.5) / n * R; s += keepAt(k, r) * densFn(r) * TWO_PI * r * (R / n); }
  return s;
}

const cache = {};
/** Level k's point set (built once, on first use). */
export function level(k) {
  if (cache[k]) return cache[k];
  const Lv = LEVELS[k], r = L.rng(Lv.seed * 7919 + 3);
  const dens = Lv.edge ? edgeDens : () => 1;
  const dmax = Lv.edge ? 3.2 : 1;
  const target = Math.round(Lv.rho * keepIntegral(k, dens) / ACC);   // attempts
  const extra = estimateExtras(k);
  const o = alloc(Math.round(target * ACC * 1.25) + extra + 16, !!Lv.galaxies);
  const R = Lv.R, R2 = R * R;
  const cap0 = Lv.galaxies ? 1 : 0.85;
  let guard = 0;
  for (let att = 0; att < target && o.n < o.X.length - extra - 1;) {
    const rr = R * Math.sqrt(r()), th = r() * TWO_PI;
    const x = rr * Math.cos(th), y = rr * Math.sin(th);
    if (r() > keepAt(k, rr) * dens(rr) / dmax) continue;
    att++;
    if (!webSample(r, x, y, R)) continue;
    const px = OUT.x, py = OUT.y, rad = hyp(px, py);
    if (rad * rad > R2 || rad > ROBS * 0.995) continue;
    if (Lv.galaxies && rad < LG_R) continue;            // the Local Group is drawn separately
    const lum = lumDraw(r, OUT.kind);
    const el = edgeLum(rad);
    if (el <= 0.004) continue;
    const t = tintFor(r, OUT.kind, rad);
    const fuzz = OUT.kind >= 2 && OUT.kind <= 4 ? (k === 1 ? 0.6 : k >= 2 ? 0.35 : 1) : 1;   // finer detail fades on the coarse levels
    const w = fuzz * lum * el / (Lv.rho * dens(rad));
    if (Lv.galaxies) {
      const [size, m] = galaxyShape(r, OUT.kind, lum, false);
      push(o, px, py, w, 1.8 * cap0 * (0.3 + 0.7 * Math.min(2.2, Math.sqrt(lum))), t, size, m);
    } else push(o, px, py, w, cap0 * (0.35 + 0.65 * Math.min(2, Math.sqrt(lum))) * Math.max(0.25, el), t);
  }
  addExtras(k, o, r);
  shells(o, Lv.R * 1.02, L.rng(Lv.seed + 99));
  cache[k] = o;
  return o;
}

// clusters, groups, spokes and the planted wall: added to every level with the right weight
function extrasList() {
  const list = [];
  for (const c of CLUSTERS) list.push({ type: 'c', p: c.p, n: c.n, a: c.a });
  for (const g of GROUPS) list.push({ type: 'c', p: g.p, n: g.n, a: g.a, group: true });
  for (const [a, b, lam, sig] of SPOKES) list.push({ type: 'f', a, b, n: 9 * lam * hyp(b[0] - a[0], b[1] - a[1]), sig });
  const wl = hyp(WEB_WALL.b[0] - WEB_WALL.a[0], WEB_WALL.b[1] - WEB_WALL.a[1]);
  list.push({ type: 'f', a: WEB_WALL.a, b: WEB_WALL.b, c: WEB_WALL.c, n: 330 * wl, sig: WEB_WALL.sigma, wall: true });
  list.push({ type: 'c', p: WEB_NODE.p, n: 70000, a: WEB_NODE.a });
  return list;
}
const REF_RHO = 0.45;   // L0 = one point per galaxy
function estimateExtras(k) {
  const f = LEVELS[k].rho / REF_RHO;
  let s = 0;
  for (const e of extrasList()) {
    const pts = e.type === 'c' ? [e.p] : [e.a, e.b, [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2]];
    const kk = Math.max(...pts.map((p) => Math.max(keepAt(k, hyp(p[0], p[1]) * 0.8), keepAt(k, hyp(p[0], p[1]) * 1.2), keepAt(k, hyp(p[0], p[1])))));
    s += e.n * f * 1.25 * Math.min(1, kk + 0.05) + 4;
  }
  return Math.ceil(s);
}
function addExtras(k, o, r) {
  const Lv = LEVELS[k], f = Lv.rho / REF_RHO;
  for (const e of extrasList()) {
    const pts = e.type === 'c' ? [e.p] : [e.a, e.b, [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2]];
    if (Math.max(...pts.map((p) => Math.max(keepAt(k, hyp(p[0], p[1]) * 0.8), keepAt(k, hyp(p[0], p[1]) * 1.2), keepAt(k, hyp(p[0], p[1]))))) <= 0) continue;
    let n = e.n * f;
    n = Math.floor(n) + (r() < n - Math.floor(n) ? 1 : 0);
    for (let i = 0; i < n; i++) {
      let x, y, kind;
      if (e.type === 'c') {
        const uu = (r() * 0.95), rp = e.a * Math.sqrt(uu / (1 - uu)), th = r() * TWO_PI;
        x = e.p[0] + rp * Math.cos(th); y = e.p[1] + rp * Math.sin(th); kind = e.group ? 3 : 1;
      } else {
        const t = r(), len = hyp(e.b[0] - e.a[0], e.b[1] - e.a[1]);
        const c = e.c ?? [(e.a[0] + e.b[0]) / 2 + (e.b[1] - e.a[1]) * 0.12, (e.a[1] + e.b[1]) / 2 - (e.b[0] - e.a[0]) * 0.12];
        const u1 = 1 - t, px = u1 * u1 * e.a[0] + 2 * u1 * t * c[0] + t * t * e.b[0], py = u1 * u1 * e.a[1] + 2 * u1 * t * c[1] + t * t * e.b[1];
        const tx = 2 * u1 * (c[0] - e.a[0]) + 2 * t * (e.b[0] - c[0]), ty = 2 * u1 * (c[1] - e.a[1]) + 2 * t * (e.b[1] - c[1]), tl = hyp(tx, ty);
        const nx = -ty / tl, ny = tx / tl;
        const clump = vnoise(t * len / (e.wall ? 45 : 14), 5 + (e.n | 0) % 7);
        if (r() > 0.15 + 0.85 * clump * clump) continue;
        const g = gauss(r) * e.sig * (0.6 + 0.8 * vnoise(t * len / 120, 9));
        x = px + nx * g; y = py + ny * g; kind = 0;
      }
      const rad = hyp(x, y);
      if (r() > keepAt(k, rad)) continue;
      if (Lv.galaxies && rad < LG_R) continue;
      const lum = lumDraw(r, kind), t = tintFor(r, kind, rad), el = edgeLum(rad);
      const w = lum * el / Lv.rho;
      if (o.n >= o.X.length) return;
      if (Lv.galaxies) {
        const [size, m] = galaxyShape(r, kind, lum, false);
        push(o, x, y, w, 1.8 * (0.3 + 0.7 * Math.min(2.2, Math.sqrt(lum))), t, size, m);
      } else push(o, x, y, w, 0.85 * (0.35 + 0.65 * Math.min(2, Math.sqrt(lum))), t);
    }
  }
}
/** Sort points into NS radial shells (each shell then shuffled on its own), so a frame only walks the shells it sees. */
const NS = 32;
function shells(o, R, r) {
  const n = o.n, sh = new Uint8Array(n), cnt = new Int32Array(NS + 1);
  for (let i = 0; i < n; i++) { const k = Math.min(NS - 1, Math.floor(hyp(o.X[i], o.Y[i]) / R * NS)); sh[i] = k; cnt[k + 1]++; }
  for (let k = 0; k < NS; k++) cnt[k + 1] += cnt[k];
  const start = cnt.slice(), pos = cnt.slice(0, NS);
  const perm = new Int32Array(n);
  for (let i = 0; i < n; i++) perm[pos[sh[i]]++] = i;
  const re = (A) => { if (!A) return A; const B = new A.constructor(A.length); for (let i = 0; i < n; i++) B[i] = A[perm[i]]; return B; };
  o.X = re(o.X); o.Y = re(o.Y); o.Wt = re(o.Wt); o.Cap = re(o.Cap); o.T = re(o.T); o.S = re(o.S); o.M = re(o.M);
  o.shellStart = start; o.shellR = R / NS; o.NS = NS;
  for (let k = 0; k < NS; k++) shuffleRange(o, start[k], start[k + 1], r);
}
function shuffleRange(o, a, b, r) {
  for (let i = b - 1; i > a; i--) {
    const j = a + ((r() * (i - a + 1)) | 0);
    let t = o.X[i]; o.X[i] = o.X[j]; o.X[j] = t;
    t = o.Y[i]; o.Y[i] = o.Y[j]; o.Y[j] = t;
    t = o.Wt[i]; o.Wt[i] = o.Wt[j]; o.Wt[j] = t;
    t = o.Cap[i]; o.Cap[i] = o.Cap[j]; o.Cap[j] = t;
    t = o.T[i]; o.T[i] = o.T[j]; o.T[j] = t;
    if (o.S) { t = o.S[i]; o.S[i] = o.S[j]; o.S[j] = t; t = o.M[i]; o.M[i] = o.M[j]; o.M[j] = t; }
  }
}
function shuffle(o, r) {
  for (let i = o.n - 1; i > 0; i--) {
    const j = (r() * (i + 1)) | 0;
    let t = o.X[i]; o.X[i] = o.X[j]; o.X[j] = t;
    t = o.Y[i]; o.Y[i] = o.Y[j]; o.Y[j] = t;
    t = o.Wt[i]; o.Wt[i] = o.Wt[j]; o.Wt[j] = t;
    t = o.Cap[i]; o.Cap[i] = o.Cap[j]; o.Cap[j] = t;
    t = o.T[i]; o.T[i] = o.T[j]; o.T[j] = t;
    if (o.S) { t = o.S[i]; o.S[i] = o.S[j]; o.S[j] = t; t = o.M[i]; o.M[i] = o.M[j]; o.M[j] = t; }
  }
}

// ------------------------------------------------------------------ nearby dwarfs (resolved at lf 23–24.4)
// Faint dwarfs and small galaxies within ~120 Mly, clumped around the same groups, clusters and filaments.
let dwarfCache = null;
export const DWARF_RHO = 0.9;
export function dwarfs() {
  if (dwarfCache) return dwarfCache;
  const R = 130, r = L.rng(4711);
  const target = Math.round(DWARF_RHO * Math.PI * 100 * 100);
  const o = alloc(target + 9000, true);
  let guard = 0;
  const keep = (rad) => 1 - smooth((rad - 85) / 45);
  while (o.n < target && guard++ < target * 40) {
    const rr = R * Math.sqrt(r()), th = r() * TWO_PI;
    const x = rr * Math.cos(th), y = rr * Math.sin(th);
    if (r() > keep(rr)) continue;
    if (!webSample(r, x, y, R)) continue;
    const px = OUT.x, py = OUT.y, rad = hyp(px, py);
    if (rad < LG_R) continue;
    const lum = 0.28 * lumDraw(r, 4);
    const [size, m] = galaxyShape(r, OUT.kind, lum, true);
    push(o, px, py, lum / DWARF_RHO, 1.8 * (0.12 + 0.3 * Math.min(1, lum * 4)), r() < 0.5 ? 6 : 1, size, m);
  }
  // dwarfs in the real groups and clusters
  for (const c of [...CLUSTERS, ...GROUPS]) {
    const rad0 = hyp(c.p[0], c.p[1]);
    if (rad0 > 130) continue;
    const n = Math.round(c.n * 1.6 * keep(rad0));
    for (let i = 0; i < n && o.n < o.X.length; i++) {
      const uu = (r() * 0.95), rp = c.a * 1.3 * Math.sqrt(uu / (1 - uu)), th = r() * TWO_PI;
      const x = c.p[0] + rp * Math.cos(th), y = c.p[1] + rp * Math.sin(th);
      if (hyp(x, y) < LG_R) continue;
      const lum = 0.28 * lumDraw(r, 4);
      const [size, m] = galaxyShape(r, 1, lum, true);
      push(o, x, y, lum / DWARF_RHO, 1.8 * (0.12 + 0.3 * Math.min(1, lum * 4)), r() < 0.5 ? 2 : 1, size, m);
    }
  }
  shells(o, 135, L.rng(4712));
  dwarfCache = o;
  return o;
}

// ------------------------------------------------------------------ the Local Group as dots (after builder D hands off)
const LGp = (p) => [p.x / MLY, p.y / MLY];
export const LOCAL_GROUP = [
  // [x, y, lum, tint, size Mly, morph]
  [0.026 * 0, 0, 2.4, 2, 0.1, 1],                          // the Milky Way (at us)
  [...LGp(ANDROMEDA), 3.0, 2, 0.22, 0],                    // Andromeda
  [...G(133.6, -31.3, 2.73), 0.6, 0, 0.06, 0],             // Triangulum
  [...G(280.5, -32.9, 0.16), 0.4, 0, 0.03, 3],             // LMC
];
export function _measureAcc(R0, R1, n = 200000) {
  const r = L.rng(5); let a = 0;
  for (let i = 0; i < n; i++) { const rr = Math.sqrt(R0 * R0 + (R1 * R1 - R0 * R0) * r()), th = r() * TWO_PI; if (webSample(r, rr * Math.cos(th), rr * Math.sin(th), R1)) a++; }
  return a / n;
}
