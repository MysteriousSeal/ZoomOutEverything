// Last Glacial Maximum ice sheets (~21 ka) as a lat/lon FIELD, sampled per pixel by env.js's globe raster.
// The outlines are the sourced margins (after Dyke 2004 / Ehlers & Gibbard 2004 / Hughes et al. 2016 DATED-1,
// simplified); from them we build, once at import, a 0.2° grid of distance-to-margin (km, chamfer distance on the
// sphere). The ice surface is then a Nye plastic-ice profile, h = 3.4 * sqrt(distance in m) metres (≈ 3.4 km at
// 1000 km in), so every sheet is a real dome: thick and bright over its divides, thinning and bluish-grey at its
// margin, with a feathered edge. Growing / retreating = moving the margin inward along that same field.
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

/**
 * Ice at (lat, lon) given per-sheet extents g[si] (0 none .. 1 full LGM): {a, t, gE, gN} or null.
 * a = coverage 0..1 (feathered margin), t = 0 margin .. 1 thick interior, gE/gN = surface slope (m/m) for shading.
 */
const out = { a: 0, t: 0, gE: 0, gN: 0 };
function bil(fx, fy) {
  fx = Math.min(N - 1.001, Math.max(0, fx)); fy = Math.min(N - 1.001, Math.max(0, fy));
  const j = fx | 0, i = fy | 0, w = fx - j, u = fy - i, o = i * N + j;
  const top = DIST[o] + (DIST[o + 1] - DIST[o]) * w, bot = DIST[o + N] + (DIST[o + N + 1] - DIST[o + N]) * w;
  return top + (bot - top) * u;
}
export function iceAt(lat, lon, g) {
  if (lat < 35) return null;
  const rho = (90 - lat) * KM, sl = Math.sin(lon * DEG), cl = Math.cos(lon * DEG);
  const fx = rho * sl / CELL + HALF - 0.5, fy = -rho * cl / CELL + HALF - 0.5;
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
  const dd = D - (1 - gs) * DMAX[si] * 1.02;                  // km in from the current margin
  if (dd <= 0) return null;
  out.a = L.smoothstep(L.clamp(dd / 12));
  out.t = L.clamp(dd / 800);
  // Nye profile slope: h = 3.4 sqrt(x m)  →  dh/dx = 1.7 / sqrt(x m); grid gradient (km/km) → east / north
  const slope = 1.7 / Math.sqrt(Math.max(20, dd) * 1000);
  // central differences of the bilinear field one cell apart: continuous across cell borders (no plaid)
  const dX = (bil(fx + 1, fy) - bil(fx - 1, fy)) / (2 * CELL), dY = (bil(fx, fy + 1) - bil(fx, fy - 1)) / (2 * CELL);
  // east = (cos λ, sin λ), north = (−sin λ, cos λ) in grid (x right, y down = away from... y = −ρ cos λ)
  out.gE = slope * (dX * cl + dY * sl);
  out.gN = slope * (-dX * sl + dY * cl);
  return out;
}
