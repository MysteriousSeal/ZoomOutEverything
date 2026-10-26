// Last Glacial Maximum ice sheets (~21 ka) as a lat/lon FIELD, sampled per pixel by env.js's globe raster.
// The outlines are the sourced margins (after Dyke 2004 / Ehlers & Gibbard 2004 / Hughes et al. 2016 DATED-1,
// simplified); from them we build, once at import, a 0.2° grid of distance-to-margin (km, chamfer distance on the
// sphere). env.js paints the sheets as flat, matte snow (km-thick ice reads flat at globe scale: no slope shading),
// with a thin bluer margin zone, subtle surface texture and a crisp, pixel-wide edge. Growing / retreating = moving
// the margin inward along that same field, with a lobate, uneven front (erosion from the margins, not a rescale).
import * as L from '../../../engine/runtime/lib.js';

export const SHEETS = [
  {
    name: 'laurentide', delay: 0,
    pts: [[47.4, -122.6], [48.6, -125.8], [52, -131.2], [55, -134.8], [58.5, -138.5], [60.3, -143], [61.4, -148],
      [62.6, -142], [64.6, -137], [67.8, -135.5], [69.4, -131], [70.6, -125], [73.6, -123.5], [76.4, -119], [78.4, -108],
      [80.6, -96], [82.2, -82], [81.6, -69], [78.6, -73], [75.6, -77], [72.4, -73], [69.6, -66], [66.6, -61.5],
      [62.6, -61], [58.6, -59.5], [55, -56.5], [51.6, -53.8], [47.4, -52.4], [45, -59.5], [43.4, -65.4], [41.6, -69.4],
      [40.9, -72.6], [41.2, -75.4], [41.7, -78.0], [41.0, -80.4], [39.9, -82.8], [40.7, -84.6], [39.6, -86.1],
      [39.2, -87.7], [40.6, -89.1], [42.4, -89.7], [43.7, -90.7], [44.7, -92.1], [43.6, -93.0], [41.6, -93.6],
      [43.4, -94.9], [44.9, -96.1], [42.9, -97.3], [45.4, -99.0], [47.1, -102.8], [48.4, -107.6], [48.9, -112.6],
      [48.1, -116.8], [47.3, -120.4]],
  },
  {
    name: 'greenland', delay: 0.25,
    pts: [[59.4, -43.6], [60.6, -49], [64.2, -53.8], [67.8, -56.4], [70.6, -57.6], [73.6, -59.2], [76, -67.5],
      [78.6, -73.5], [81.6, -64], [83.6, -41], [82.6, -21], [80.2, -12.5], [76.2, -14.5], [72.2, -18], [69, -22],
      [66, -33], [63, -39.5]],
  },
  {
    // Fennoscandian + British-Irish + Barents-Kara. In England the margin stops around the Midlands / north Wales
    // (~52.5-53.5°N), so the south of England and the dry Channel stay ice-free.
    name: 'fennoscandian', delay: 0.15,
    pts: [[52.2, -10.6], [54.0, -11.6], [56.5, -10.2], [58.8, -8.2], [61.0, -3.6], [62.5, 1.0], [64.5, 5.0],
      [67.5, 9.6], [70.5, 14.0], [72.6, 16.6], [75.6, 13.2], [79.0, 10.0], [80.8, 20.0], [81.3, 35.0], [81.3, 55.0],
      [80.0, 70.0], [77.0, 77.0], [74.0, 73.0], [71.5, 68.0], [69.5, 62.0], [68.0, 56.0], [66.5, 48.0], [65.0, 43.0],
      [63.5, 40.0], [61.5, 37.0], [59.5, 34.0], [57.5, 31.0], [55.3, 29.6], [55.9, 27.6], [54.3, 25.6], [54.8, 23.6], [53.8, 21.0],
      [52.3, 19.6], [53.1, 18.4], [52.4, 16.6], [52.9, 14.7], [52.3, 13.2], [53.2, 10.5], [53.6, 8.0], [54.6, 6.0], [55.0, 3.5],
      [54.4, 1.2], [53.7, 0.1], [53.1, -0.9], [52.7, -2.2], [52.6, -3.4], [52.3, -4.3], [52.1, -6.2], [52.0, -8.4]],
  },
];

// densify: closed Catmull-Rom through the vertices + a gentle two-octave wobble along the normal (lobate margins)
for (const S of SHEETS) {
  const P = S.pts, n = P.length, SUB = 8, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let s = 0; s < SUB; s++) {
      const t = s / SUB, t2 = t * t, t3 = t2 * t;
      const f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  const m = out.length, seed = S.name.length * 31 + 7;
  S.fine = out.map(([la, lo], i) => {
    const [la0, lo0] = out[(i - 1 + m) % m], [la1, lo1] = out[(i + 1) % m];
    const cl = Math.cos(la * Math.PI / 180);
    const tx = (lo1 - lo0) * cl, ty = la1 - la0, h = Math.hypot(tx, ty) || 1;
    const w = 0.35 * L.noise1(i * 0.11, seed) + 0.15 * L.noise1(i * 0.37, seed + 3);   // degrees
    return [la + (-tx / h) * w, lo + (ty / h) * w / Math.max(0.2, cl)];
  });
}

// ------------------------------------------------------------------ the field
// A north-polar azimuthal-equidistant grid (km, 15 km cells, out to 34°N), so distances are isotropic everywhere:
// x = ρ sin λ, y = −ρ cos λ with ρ = (90° − lat) × 111.2 km.
const CELL = 15, RMAX = (90 - 34) * 111.2, N = Math.ceil(2 * RMAX / CELL), HALF = N / 2;
const KM = 111.2, DEG = Math.PI / 180;
/** distance to the margin (km, smoothed), 0 outside */
export const DIST = new Float32Array(N * N);
/** the sheet each cell belongs to (−1 = none) */
export const SID = new Int8Array(N * N).fill(-1);
/** the largest distance-to-margin of each sheet (km): the dome */
export const DMAX = SHEETS.map(() => 1);
const toXY = (la, lo) => { const r = (90 - la) * KM; return [r * Math.sin(lo * DEG), -r * Math.cos(lo * DEG)]; };

{
  // rasterise each sheet (scanline crossings per grid row, polygon in projected km)
  SHEETS.forEach((S, si) => {
    const P = S.fine.map(([la, lo]) => toXY(la, lo)), n = P.length;
    for (let r = 0; r < N; r++) {
      const y = (r + 0.5 - HALF) * CELL;
      const xs = [];
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = P[i], [xj, yj] = P[j];
        if ((yi > y) !== (yj > y)) xs.push(xi + (xj - xi) * (y - yi) / (yj - yi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil(xs[k] / CELL + HALF - 0.5)), c1 = Math.min(N - 1, Math.floor(xs[k + 1] / CELL + HALF - 0.5));
        for (let c = c0; c <= c1; c++) if (SID[r * N + c] < 0) SID[r * N + c] = si;
      }
    }
  });
  // chamfer distance (5-7-11 weights: within ~2% of Euclidean), in km
  const INF = 1e9, w1 = CELL, w2 = CELL * 1.4, w3 = CELL * Math.sqrt(5);
  for (let i = 0; i < N * N; i++) DIST[i] = SID[i] >= 0 ? INF : 0;
  const fwd = [[0, -1, w1], [-1, -1, w2], [-1, 0, w1], [-1, 1, w2], [-1, -2, w3], [-2, -1, w3], [-2, 1, w3], [-1, 2, w3]];
  const pass = (list, r0, r1, dr, c0, c1, dc) => {
    for (let r = r0; r !== r1; r += dr) for (let c = c0; c !== c1; c += dc) {
      const o = r * N + c;
      let d = DIST[o];
      if (d === 0) continue;
      for (const [ar, ac, w] of list) {
        const rr = r + ar * dr, cc = c + ac * dc;
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
        const q = DIST[rr * N + cc] + w;
        if (q < d) d = q;
      }
      DIST[o] = d;
    }
  };
  pass(fwd, 0, N, 1, 0, N, 1);
  pass(fwd, N - 1, -1, -1, N - 1, -1, -1);
  for (let i = 0; i < N * N; i++) if (SID[i] >= 0) DIST[i] -= CELL * 0.5;
  // round the medial-axis creases into smooth divides: 4 box passes (σ ≈ 4 cells ≈ 60 km)
  const tmp = new Float32Array(N * N), RB = 3;
  for (let it = 0; it < 4; it++) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      let acc = 0, m = 0;
      for (let k = Math.max(0, c - RB); k <= Math.min(N - 1, c + RB); k++) { acc += DIST[r * N + k]; m++; }
      tmp[r * N + c] = acc / m;
    }
    for (let c = 0; c < N; c++) for (let r = 0; r < N; r++) {
      let acc = 0, m = 0;
      for (let k = Math.max(0, r - RB); k <= Math.min(N - 1, r + RB); k++) { acc += tmp[k * N + c]; m++; }
      DIST[r * N + c] = acc / m;
    }
  }
  for (let i = 0; i < N * N; i++) {
    DIST[i] = Math.max(0, DIST[i] - 8);
    if (DIST[i] > 0 && SID[i] < 0) {
      for (let k = 1; k <= 4 && SID[i] < 0; k++) for (const o of [i - k, i + k, i - k * N, i + k * N]) if (o >= 0 && o < N * N && SID[o] >= 0) { SID[i] = SID[o]; break; }
    }
    if (SID[i] >= 0) DMAX[SID[i]] = Math.max(DMAX[SID[i]], DIST[i]);
  }
}

/** 2-D value noise in [-1, 1] (integer-hash lattice, smoothstep interpolation): deterministic, cheap. */
function hash2(i, j) {
  let n = Math.imul(i, 374761393) + Math.imul(j, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n & 0xffff) / 32767.5 - 1;
}
function vnoise(x, y) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, w = y - j;
  const su = u * u * (3 - 2 * u), sw = w * w * (3 - 2 * w);
  const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
  return (a + (b - a) * su) * (1 - sw) + (c + (d - c) * su) * sw;
}

/** Value noise sampled on a rotated, offset lattice (each octave at its own angle, so no axis-aligned edges). */
function rnoise(x, y, scale, ang, ox, oy) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return vnoise((x * c - y * s) / scale + ox, (x * s + y * c) / scale + oy);
}

/**
 * Ice at (lat, lon) given per-sheet extents g[si] (0 none .. 1 full LGM): {a, t, tex} or null.
 *   a   = coverage 0..1: a crisp edge, feathered over `featherKm` (about one screen pixel, so it stays sharp close in);
 *   t   = 0 at the margin .. 1 a few pixels inside (the thin, bluer margin);
 *   dome = 0 at the margin .. 1 some 400 km in (broad brightening towards the domes, for volume without facets);
 *   gs  = this sheet's current extent (0..1);
 *   rim = 1 within a few pixels of the edge (a slightly darker ice cliff that defines the margin);
 *   tex = subtle surface texture in [-1, 1] (broad undulation + fine wind-glaze), for a matte snow albedo.
 * Growing / retreating moves the margin along the distance field, but with a lobate, uneven front (value noise
 * scaled by how far the sheet is from full extent), so a retreating sheet erodes back irregularly from its margins
 * and breaks into remnants over its domes instead of shrinking as one scaled shape. No slope shading: km-thick ice
 * reads flat at globe scale, so there are no facet ridges along the medial axis.
 */
const out = { a: 0, t: 0, dome: 0, rim: 0, tex: 0, gs: 0 };
export function iceAt(lat, lon, g, featherKm = 6) {
  if (lat < 35) return null;
  const rho = (90 - lat) * KM, sl = Math.sin(lon * DEG), cl = Math.cos(lon * DEG);
  const X = rho * sl, Y = -rho * cl;                          // km on the polar plane
  const fx = X / CELL + HALF - 0.5, fy = Y / CELL + HALF - 0.5;
  if (fx < 0 || fy < 0 || fx >= N - 1 || fy >= N - 1) return null;
  const j = fx | 0, i = fy | 0, w = fx - j, u = fy - i;
  const o0 = i * N + j, o1 = o0 + 1, o2 = o0 + N, o3 = o2 + 1;
  const si = SID[o0] >= 0 ? SID[o0] : SID[o1] >= 0 ? SID[o1] : SID[o2] >= 0 ? SID[o2] : SID[o3];
  if (si < 0) return null;
  const gs = g[si];
  if (gs <= 0) return null;
  const a0 = DIST[o0], a1 = DIST[o1], a2 = DIST[o2], a3 = DIST[o3];
  const top = a0 + (a1 - a0) * w, bot = a2 + (a3 - a2) * w;
  const D = top + (bot - top) * u;
  if (D <= 2) return null;
  // lobate front: three octaves of noise; small at full extent (lobate margins), large while growing/retreating
  const n = 0.5 * rnoise(X, Y, 420, 0.61, 3.7, -1.3) + 0.28 * rnoise(X, Y, 150, 2.03, 17.3, -4.1) +
    0.14 * rnoise(X, Y, 48, 1.17, -9.7, 31.9) + 0.08 * rnoise(X, Y, 14, 2.71, 5.5, 8.8);
  const amp = (5 + 380 * Math.sin(Math.PI * Math.min(1, gs) * 0.999) * (1 - 0.3 * gs)) * Math.min(1, D / 30);
  // the margin sits on the D = 7 km iso-line, inside the smooth part of the field (not on its clamped-to-zero floor,
  // whose iso-lines follow the 15 km grid and would show as stair steps close in)
  const dd = D - 7 - (1 - gs) * DMAX[si] * 1.02 + amp * n;  // km in from the current margin
  if (dd <= 0) return null;
  // the feather is one pixel in distance on the ground; the (smoothed) field can be shallow near the margin, so
  // convert it to field units with the local slope of D (bilinear cell gradient), or the edge would go soft close in
  const gx = ((a1 - a0) * (1 - u) + (a3 - a2) * u) / CELL, gy = ((a2 - a0) * (1 - w) + (a3 - a1) * w) / CELL;
  const f = Math.max(0.05, featherKm * Math.max(0.04, Math.hypot(gx, gy)));
  out.a = dd >= f ? 1 : L.smoothstep(dd / f);
  out.gs = gs;
  out.t = Math.min(1, dd / (5 * f));
  out.dome = L.smoothstep(L.clamp(dd / 420));
  out.rim = dd < 2.5 * f ? 1 - dd / (2.5 * f) : 0;
  out.tex = 0.55 * rnoise(X, Y, 60, 0.4, 3.1, 7.7) + 0.3 * rnoise(X, Y, 18, 1.9, 0, 0) + 0.15 * rnoise(X, Y, 5, 2.6, 1.3, 2.2);
  return out;
}
