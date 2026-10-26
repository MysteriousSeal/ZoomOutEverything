// Shared REAL Earth renderer: true coastlines, relief, ice caps, ocean depth, terminator, city lights, atmosphere.
//
// Data: ../assets/etopo6.bin = NOAA ETOPO1 (ice surface) averaged to a 0.1° grid (3600 × 1800 Int16, row 0 = 90°N,
// column 0 = 180°W, metres). It is fetched once per page (top-level await) relative to THIS module, so the import
// works from any episode. Coarser mips (0.2°, 0.4°, 0.8°) are built lazily for small globes (no shimmering coasts).
//
// The globe is ray-cast per pixel (orthographic) into a small offscreen raster covering only the on-screen part of
// the disc (+ atmosphere), capped at `maxPixels`, then drawn with drawImage. Rasters are cached (LRU) by quantised
// parameters, so a static globe costs ~0 after the first frame. Everything is a pure function of the options.
//
//   import { drawEarth, project } from '../../../../engine/runtime/earth.js';   // from scenes/sNN-*.js
//   import { drawEarth, project } from '../../../engine/runtime/earth.js';      // from env.js / camera.js
//
//   drawEarth(c, { cx, cy, r, lon0: 10, lat0: 20, rot: 0, tilt: 0, style: 'day', sun: { lon: -30, lat: 10 } });
import * as L from './lib.js';

const DEG = Math.PI / 180;
const GW = 3600, GH = 1800;
const E0 = new Int16Array(await (await fetch(new URL('../assets/etopo6.bin', import.meta.url))).arrayBuffer());

// ------------------------------------------------------------------ elevation mips
const MIPS = [{ a: E0, w: GW, h: GH, inv: 10 }];   // inv = cells per degree
function mip(k) {
  for (let l = MIPS.length; l <= k; l++) {
    const s = MIPS[l - 1], w = s.w >> 1, h = s.h >> 1, a = new Int16Array(w * h);
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        const o = 2 * i * s.w + 2 * j;
        a[i * w + j] = (s.a[o] + s.a[o + 1] + s.a[o + s.w] + s.a[o + s.w + 1]) / 4;
      }
    }
    MIPS[l] = { a, w, h, inv: s.inv / 2 };
  }
  return MIPS[k];
}

/** Elevation in metres (bilinear, 0.1° grid) at lat/lon degrees. Negative = sea floor. Ice surface on ice sheets. */
export function elevation(lat, lon) {
  let fi = (90 - lat) * 10 - 0.5, fj = (lon + 180) * 10 - 0.5;
  fi = L.clamp(fi, 0, GH - 1.001);
  const i = Math.floor(fi), u = fi - i;
  fj = ((fj % GW) + GW) % GW;
  const j = Math.floor(fj), w = fj - j, j1 = (j + 1) % GW;
  const a = E0[i * GW + j], b = E0[i * GW + j1], c = E0[(i + 1) * GW + j], d = E0[(i + 1) * GW + j1];
  return (a * (1 - w) + b * w) * (1 - u) + (c * (1 - w) + d * w) * u;
}
/** True if (lat, lon) is above `seaLevel` metres (default: today's sea level). */
export const isLand = (lat, lon, seaLevel = 0) => elevation(lat, lon) > seaLevel;

/** Present-day ice sheets (for land points): Antarctica and Greenland (Baffin/Ellesmere stay bare, Iceland excluded). */
const greenlandWest = (lat) => (lat < 72 ? -58 : lat < 76 ? -67 : lat < 79 ? -74 : lat < 80.5 ? -68.5 : lat < 81.5 ? -66 : -61.5);
export const isIce = (lat, lon) => lat < -60 || (lat > 59.5 && lon > greenlandWest(lat) && lon < -10 && !(lon > -25.5 && lat < 66.8));

// ------------------------------------------------------------------ smooth value noise (deterministic)
function hash3(i, j, k, seed) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Smooth 3D value noise in [0, 1] (use on unit vectors: no polar pinching, no seam). */
function vnoise3(x, y, z, seed = 0) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = x - i, v = y - j, w = z - k;
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash3(i, j, k, seed), hash3(i + 1, j, k, seed), su), l(hash3(i, j + 1, k, seed), hash3(i + 1, j + 1, k, seed), su), sv),
    l(l(hash3(i, j, k + 1, seed), hash3(i + 1, j, k + 1, seed), su), l(hash3(i, j + 1, k + 1, seed), hash3(i + 1, j + 1, k + 1, seed), su), sv), sw);
}
const fbm3 = (x, y, z, f, seed) => 0.55 * vnoise3(x * f, y * f, z * f, seed) + 0.3 * vnoise3(x * f * 2.1, y * f * 2.1, z * f * 2.1, seed + 1)
  + 0.15 * vnoise3(x * f * 4.3, y * f * 4.3, z * f * 4.3, seed + 2);
/** atan2 approximation (|error| < 1e-5 rad). */
function fatan2(y, x) {
  const ax = x < 0 ? -x : x, ay = y < 0 ? -y : y;
  const a = (ax < ay ? ax : ay) / ((ax > ay ? ax : ay) || 1e-30), s = a * a;
  let r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;
  if (ay > ax) r = 1.57079637 - r;
  if (x < 0) r = 3.14159274 - r;
  return y < 0 ? -r : r;
}

// ------------------------------------------------------------------ biome (land albedo) grid, 0.5°
// Deserts / dry lands as soft ellipses: [lat, lon, sLat, sLon, weight].
const DRY = [
  [23, -6, 6, 14, 1.1], [22, 18, 6, 14, 1.15], [25, 30, 5, 6, 1], [15, 0, 2.5, 12, 0.3],     // Sahara, Sahel edge
  [23, 47, 6, 9, 1.05], [31, 60, 5, 9, 0.85], [27, 71, 3, 3, 0.7], [41, 62, 5, 12, 0.7],    // Arabia, Iran, Thar, Turan
  [39, 83, 3, 7, 1], [43, 104, 4, 11, 0.85], [34, 88, 4, 10, 0.55], [47, 70, 4, 14, 0.35],  // Taklamakan, Gobi, Tibet, steppe
  [8, 46, 4, 5, 0.65], [-25, 133, 7, 15, 1], [-23, 19, 5, 6, 0.75], [-21, 14, 6, 2.5, 0.7], // Horn, Australia, Kalahari, Namib
  [33, -112, 5, 6, 0.75], [28, -105, 4, 4, 0.55], [40, -116, 3, 4, 0.6], [40, -102, 6, 4, 0.3], // US SW, Chihuahua, Basin, Plains
  [-23, -70.2, 4.5, 1.6, 0.9], [-45, -69, 6, 3, 0.65], [-8, -39, 2.5, 2.5, 0.3], [36, 2, 2, 6, 0.3], // Atacama, Patagonia, Sertão, Maghreb
];
const ZONES = [[0, [36, 74, 36]], [9, [40, 78, 38]], [15, [84, 98, 52]], [24, [104, 108, 66]], [34, [82, 100, 56]],
  [44, [60, 92, 48]], [53, [40, 66, 40]], [61, [44, 62, 42]], [66, [76, 84, 64]], [72, [94, 96, 80]], [90, [118, 118, 110]]];
const SEMI = [168, 150, 100], DESERT = [214, 182, 128];
const BW = 720, BH = 360;
let BIO = null;
function biome() {
  if (BIO) return BIO;
  BIO = new Float32Array(BW * BH * 3);
  for (let i = 0; i < BH; i++) {
    const lat = 90 - (i + 0.5) * 0.5;
    for (let j = 0; j < BW; j++) {
      const lon = -180 + (j + 0.5) * 0.5;
      const [px, py, pz] = vec(lat, lon);
      const z = L.ramp(ZONES, L.clamp(Math.abs(lat) + (fbm3(px, py, pz, 5, 21) - 0.5) * 10, 0, 90));
      let dry = 0;
      for (const [a, b, sa, sb, wt] of DRY) {
        let db = lon - b; if (db > 180) db -= 360; if (db < -180) db += 360;
        const q = ((lat - a) / sa) ** 2 + (db / sb) ** 2;
        if (q < 9) dry += wt * Math.exp(-0.5 * q);
      }
      const n = fbm3(px, py, pz, 3.5, 7);
      dry = L.clamp(dry + (n - 0.5) * 0.6 * Math.min(1, dry * 2.5) + (fbm3(px, py, pz, 9, 31) - 0.5) * 0.25 * Math.min(1, dry * 4));
      let col = L.mix(z, SEMI, L.clamp(dry * 1.7));
      col = L.mix(col, DESERT, L.clamp((dry - 0.38) * 1.45));
      const m = 0.9 + 0.2 * fbm3(px, py, pz, 14, 3);
      const o = (i * BW + j) * 3;
      BIO[o] = col[0] * m; BIO[o + 1] = col[1] * m; BIO[o + 2] = col[2] * m;
    }
  }
  return BIO;
}

// ------------------------------------------------------------------ city lights grid, 0.25°
const CITIES = [
  [35.7, 139.7, 1.5], [34.7, 135.5, 1], [37.6, 127, 1.2], [39.9, 116.4, 1.2], [31.2, 121.5, 1.3], [23, 113.5, 1.4],
  [29.6, 106.5, 0.8], [30.7, 104.1, 0.8], [30.6, 114.3, 0.8], [34.3, 108.9, 0.6], [39.1, 117.2, 0.7], [41.8, 123.4, 0.6],
  [45.8, 126.6, 0.5], [34.7, 113.6, 0.7], [32.1, 118.8, 0.7], [25, 121.5, 0.8], [14.6, 121, 1], [-6.2, 106.8, 1.2],
  [-7.3, 112.7, 0.6], [13.8, 100.5, 1], [10.8, 106.7, 0.8], [21, 105.8, 0.7], [3.1, 101.7, 0.7], [1.35, 103.8, 0.7],
  [23.8, 90.4, 1], [22.6, 88.4, 1], [28.6, 77.2, 1.3], [19.1, 72.9, 1.2], [13, 77.6, 0.9], [13.1, 80.3, 0.8],
  [17.4, 78.5, 0.8], [23, 72.6, 0.7], [31.5, 74.3, 0.8], [24.9, 67, 0.9], [35.7, 51.4, 0.9], [33.3, 44.4, 0.6],
  [24.7, 46.7, 0.7], [25.2, 55.3, 0.7], [21.5, 39.2, 0.5], [41, 29, 1], [39.9, 32.9, 0.5], [30, 31.2, 1.1],
  [32.1, 34.8, 0.5], [55.8, 37.6, 1.2], [59.9, 30.3, 0.7], [50.5, 30.5, 0.6], [52.2, 21, 0.6], [52.5, 13.4, 0.7],
  [51.4, 7, 1], [52.4, 4.9, 0.7], [50.8, 4.4, 0.6], [48.9, 2.35, 1.1], [51.5, -0.1, 1.1], [53.5, -2.2, 0.6],
  [40.4, -3.7, 0.8], [41.4, 2.2, 0.6], [38.7, -9.1, 0.5], [41.9, 12.5, 0.6], [45.5, 9.2, 0.8], [48.1, 11.6, 0.5],
  [48.2, 16.4, 0.5], [47.5, 19, 0.5], [44.4, 26.1, 0.5], [38, 23.7, 0.5], [59.3, 18, 0.4], [55, 83, 0.4], [56.8, 60.6, 0.5],
  [6.5, 3.4, 1], [-4.3, 15.3, 0.6], [-26.2, 28, 0.9], [-1.3, 36.8, 0.5], [9, 38.7, 0.4], [15.6, 32.5, 0.4],
  [33.6, -7.6, 0.5], [36.8, 3, 0.5], [5.6, -0.2, 0.5], [-8.8, 13.2, 0.4], [-33.9, 18.4, 0.5], [-6.8, 39.3, 0.4],
  [40.7, -74, 1.5], [42.4, -71.1, 0.8], [40, -75.2, 0.8], [38.9, -77, 0.9], [41.9, -87.6, 1.2], [42.3, -83, 0.7],
  [43.7, -79.4, 0.9], [45.5, -73.6, 0.6], [33.7, -84.4, 0.8], [25.8, -80.2, 0.8], [29.8, -95.4, 0.9], [32.8, -96.8, 0.9],
  [39.7, -105, 0.6], [33.4, -112, 0.7], [34, -118.2, 1.3], [37.7, -122.2, 0.9], [47.6, -122.3, 0.7], [49.3, -123.1, 0.5],
  [45, -93.3, 0.5], [38.6, -90.2, 0.5], [19.4, -99.1, 1.2], [20.7, -103.3, 0.6], [25.7, -100.3, 0.6], [23.1, -82.4, 0.4],
  [4.7, -74.1, 0.8], [-12, -77, 0.8], [10.5, -66.9, 0.6], [-23.5, -46.6, 1.3], [-22.9, -43.2, 1], [-19.9, -43.9, 0.6],
  [-15.8, -47.9, 0.5], [-34.6, -58.4, 1.1], [-33.4, -70.6, 0.7], [-33.9, 151.2, 0.8], [-37.8, 145, 0.7],
  [-27.5, 153, 0.5], [-32, 115.9, 0.4], [-36.8, 174.8, 0.4],
];
// Diffuse populated regions: [lat, lon, sLat, sLon, amp].
const SPRAWL = [[38, -84, 5, 10, 0.5], [49, 6, 5, 9, 0.6], [24, 80, 7, 8, 0.55], [32, 115, 7, 7, 0.55], [35, 137, 2, 4, 0.5],
  [27, 31.2, 4, 0.7, 0.5], [-7, 110, 1, 4, 0.5], [44, 12, 2, 5, 0.4], [53, 30, 5, 12, 0.3], [-23, -46, 4, 5, 0.3]];
const LW = 1440, LH = 720;
let LIGHTS = null;
function lights() {
  if (LIGHTS) return LIGHTS;
  const g = new Float32Array(LW * LH);
  const splat = (lat, lon, sig, amp) => {
    const ci = (90 - lat) * 4, cj = (lon + 180) * 4, rad = Math.ceil(sig * 4 * 2.5);
    for (let di = -rad; di <= rad; di++) {
      const i = Math.round(ci) + di; if (i < 0 || i >= LH) continue;
      for (let dj = -rad; dj <= rad; dj++) {
        const j = ((Math.round(cj) + dj) % LW + LW) % LW;
        const q = ((i + 0.5 - ci) ** 2 + (Math.round(cj) + dj + 0.5 - cj) ** 2) / (16 * sig * sig);
        if (q < 6.25) g[i * LW + j] += amp * Math.exp(-0.5 * q);
      }
    }
  };
  const R = L.rng(4242);
  const gauss = () => { let s = 0; for (let k = 0; k < 4; k++) s += R(); return (s - 2) * 1.7; };
  for (const [lat, lon, w] of CITIES) {
    splat(lat, lon, 0.14 + 0.14 * w, 1.5 * w);
    const n = Math.round(55 * w);
    for (let k = 0; k < n; k++) {
      const s = 1 + 1.6 * w;
      splat(lat + gauss() * s * 0.7, lon + gauss() * s / Math.max(0.3, Math.cos(lat * DEG)), 0.11, 0.06 + 0.24 * R());
    }
  }
  for (const [a, b, sa, sb, amp] of SPRAWL) {
    for (let k = 0; k < 260 * sa * sb / 30; k++) {
      const lat = a + gauss() * sa, lon = b + gauss() * sb;
      splat(lat, lon, 0.15, amp * (0.2 + 0.8 * R()) * 0.5);
    }
  }
  for (let i = 0; i < LH; i++) {
    const lat = 90 - (i + 0.5) / 4;
    for (let j = 0; j < LW; j++) {
      const lon = -180 + (j + 0.5) / 4;
      const o = i * LW + j;
      g[o] = elevation(lat, lon) > -8 && !isIce(lat, lon) ? 1 - Math.exp(-g[o] * 1.1) : 0;
    }
  }
  LIGHTS = g;
  return g;
}

// ------------------------------------------------------------------ styles
function lut(stops, n, scale) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = L.ramp(stops, i * scale); a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
  return a;
}
const STYLES = {
  day: {
    ocean: [[0, [38, 104, 150]], [60, [28, 88, 140]], [200, [19, 66, 120]], [1000, [14, 48, 100]], [3000, [10, 36, 82]],
      [5000, [7, 27, 66]], [8000, [5, 18, 48]]],
    ice: [236, 242, 248], seaIce: [214, 226, 238], atm: [118, 176, 255], night: 0.035, relief: 1, lights: false, iceLine: [79, -68],
  },
  night: {
    ocean: [[0, [16, 30, 52]], [200, [10, 22, 42]], [3000, [6, 14, 30]], [8000, [4, 9, 22]]],
    land: [34, 38, 46], ice: [70, 80, 96], seaIce: [44, 52, 66], atm: [70, 116, 210], night: 0.6, relief: 0.8, lights: true,
    iceLine: [79, -68],
  },
  frozen: {
    ocean: [[0, [176, 196, 214]], [300, [160, 182, 204]], [3000, [140, 164, 190]], [8000, [126, 150, 180]]],
    land: [222, 228, 234], ice: [236, 242, 248], seaIce: null, atm: [190, 214, 255], night: 0.05, relief: 0.6, lights: false,
    iceLine: [0, 0],
  },
  flat: {
    ocean: [[0, [36, 96, 140]], [150, [24, 74, 122]], [1500, [18, 58, 104]], [8000, [14, 46, 90]]],
    land: [206, 192, 152], ice: [240, 244, 248], seaIce: null, atm: [120, 170, 235], night: 0.08, relief: 0.35, lights: false,
    iceLine: [90, -90], coast: [250, 246, 230],
  },
};
const LUTS = new Map();
function oceanLut(style, override) {
  const key = style + (override ? override.join(',') : '');
  let t = LUTS.get(key);
  if (!t) {
    const stops = override
      ? [[0, L.mix(override, [255, 255, 255], 0.16)], [200, override], [3000, override.map((x) => x * 0.72)], [8000, override.map((x) => x * 0.5)]]
      : STYLES[style].ocean;
    t = lut(stops, 801, 10);   // index = depth / 10 (to 8 km)
    LUTS.set(key, t);
  }
  return t;
}
const ROCK = [122, 110, 94], SNOW = [232, 234, 238];

// ------------------------------------------------------------------ view maths
/** Orientation basis for a view. lon0/lat0 = point at the disc centre, rot = spin (deg, + = Earth's real spin: features
 *  move to the right / east), tilt = clockwise screen roll (deg). Returns earth-frame unit vectors r (screen right),
 *  u (screen up), c (toward the viewer). Earth frame: x → (0°,0°), y → (0°,90°E), z → north pole. */
export function basis(view) {
  const lam = ((view.lon0 ?? 0) - (view.rot ?? 0)) * DEG, phi = (view.lat0 ?? 0) * DEG, t = (view.tilt ?? 0) * DEG;
  const cl = Math.cos(lam), sl = Math.sin(lam), cp = Math.cos(phi), sp = Math.sin(phi);
  const c = [cp * cl, cp * sl, sp], r0 = [-sl, cl, 0], u0 = [-sp * cl, -sp * sl, cp];
  const ct = Math.cos(t), st = Math.sin(t);
  return {
    r: [ct * r0[0] + st * u0[0], ct * r0[1] + st * u0[1], ct * r0[2] + st * u0[2]],
    u: [-st * r0[0] + ct * u0[0], -st * r0[1] + ct * u0[1], -st * r0[2] + ct * u0[2]],
    c,
  };
}
const vec = (lat, lon) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Screen position of (lat, lon) on a globe drawn with `view` ({cx, cy, r, lon0, lat0, rot, tilt}).
 *  Returns {x, y, z, visible}; z in [-1, 1] (> 0 = facing us). `alt` = height as a fraction of r (e.g. 0.02). */
export function project(lat, lon, view, alt = 0) {
  const b = basis(view);
  const p = vec(lat, lon), k = 1 + alt;
  const X = dot(p, b.r) * k, Y = dot(p, b.u) * k, Z = dot(p, b.c) * k;
  return { x: view.cx + X * view.r, y: view.cy - Y * view.r, z: Z, visible: Z > 0 };
}
/** Inverse of project: screen (x, y) → {lat, lon} on the visible hemisphere, or null off the disc. */
export function unproject(x, y, view) {
  const b = basis(view);
  const X = (x - view.cx) / view.r, Y = (view.cy - y) / view.r, rho2 = X * X + Y * Y;
  if (rho2 > 1) return null;
  const Z = Math.sqrt(1 - rho2);
  const px = X * b.r[0] + Y * b.u[0] + Z * b.c[0], py = X * b.r[1] + Y * b.u[1] + Z * b.c[1], pz = X * b.r[2] + Y * b.u[2] + Z * b.c[2];
  return { lat: Math.asin(L.clamp(pz, -1, 1)) / DEG, lon: Math.atan2(py, px) / DEG };
}
/** Trace a lat/lon polyline/polygon (pts = [[lat, lon], ...]) on the globe; long edges follow the curve, far-side points
 *  are pulled onto the limb. Call c.beginPath() first, then fill/stroke. */
export function geoPath(c, view, pts, close = true, step = 1.5) {
  const b = basis(view);
  let first = true;
  const put = (lat, lon) => {
    const p = vec(lat, lon);
    let X = dot(p, b.r), Y = dot(p, b.u);
    if (dot(p, b.c) < 0) { const n = Math.hypot(X, Y) || 1; X /= n; Y /= n; }
    const sx = view.cx + X * view.r, sy = view.cy - Y * view.r;
    if (first) { c.moveTo(sx, sy); first = false; } else c.lineTo(sx, sy);
  };
  const n = pts.length, last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const [a0, b0] = pts[i], [a1, b1] = pts[(i + 1) % n];
    let db = b1 - b0; if (db > 180) db -= 360; if (db < -180) db += 360;
    const k = Math.max(1, Math.ceil(Math.max(Math.abs(a1 - a0), Math.abs(db)) / step));
    for (let s = 0; s < k; s++) put(a0 + (a1 - a0) * (s / k), b0 + db * (s / k));
  }
  if (!close) put(pts[n - 1][0], pts[n - 1][1]);
  if (close) c.closePath();
}

// ------------------------------------------------------------------ raster cache
const CACHE = new Map();   // key -> {cv, x, y, w, h}  (LRU by insertion order)
const CACHE_MAX = 6;
let scratch = null;        // reusable ImageData
let rowPrev = new Float32Array(0);
export const stats = { renders: 0, hits: 0, lastMs: 0 };

const q = (x, s) => Math.round(x / s) * s;

/**
 * Draw the real Earth.
 * opts: cx, cy, r (px) · lon0, lat0 (centre of the view, deg) · rot (spin, deg) · tilt (screen roll, deg, clockwise)
 *   style: 'day' | 'night' | 'frozen' | 'flat'
 *   sun: {lon, lat} (subsolar point) or [x, y, z] (screen-space light: x right, y up, z toward viewer). Omitted = soft
 *        studio light from the upper left, no night side.
 *   lights: city lights on the night side (default: true for 'night', false otherwise; 0..1 = strength)
 *   ocean, land, ice: [r,g,b] overrides · seaLevel (m, default 0) · seaIce: 0..1 (Arctic/Antarctic pack, default 1)
 *   iceLine: [northLat, southLat] where sea ice starts (default per style) · relief (multiplier) · coast: [r,g,b] line
 *   atmosphere: true | false | 0..1 · alpha (0..1) · maxPixels (raster cap, default 1.1e6) · cache (default true)
 */
export function drawEarth(c, o) {
  const style = STYLES[o.style] ? o.style : 'day', S = STYLES[style];
  const r = o.r;
  if (!(r > 0.5)) return;
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  const atmK = o.atmosphere === false ? 0 : o.atmosphere === true || o.atmosphere == null ? 1 : +o.atmosphere;
  const atmW = atmK > 0 ? Math.max(0.03, 3 / r) : 0;
  const Re = r * (1 + atmW) + 1;

  // region of the canvas we must cover (device px if the transform is a pure translate/scale)
  const m = c.getTransform();
  const sc = Math.hypot(m.a, m.b) || 1;
  let x0, y0, x1, y1, fx, fy;
  const cw = c.canvas.width, ch = c.canvas.height;
  if (m.b === 0 && m.c === 0 && m.a === m.d) {
    const dcx = m.a * o.cx + m.e, dcy = m.d * o.cy + m.f, dR = Re * sc;
    x0 = Math.max(0, Math.floor(dcx - dR)); y0 = Math.max(0, Math.floor(dcy - dR));
    x1 = Math.min(cw, Math.ceil(dcx + dR)); y1 = Math.min(ch, Math.ceil(dcy + dR));
    if (x1 <= x0 || y1 <= y0) return;
    fx = dcx; fy = dcy;
  } else {
    // rotated/skewed transform: raster the whole disc in user space
    x0 = Math.floor(o.cx - Re); y0 = Math.floor(o.cy - Re); x1 = Math.ceil(o.cx + Re); y1 = Math.ceil(o.cy + Re); fx = o.cx; fy = o.cy;
  }
  const affine = !(m.b === 0 && m.c === 0 && m.a === m.d);
  const R = affine ? r : r * sc;               // radius in raster-space units (before the cap)
  const rw = x1 - x0, rh = y1 - y0;
  const maxPx = o.maxPixels ?? 1.1e6;
  const s = Math.min(1, Math.sqrt(maxPx / (rw * rh)));
  const W = Math.max(1, Math.round(rw * s)), H = Math.max(1, Math.round(rh * s));

  // quantise orientation so that repeats hit the cache (error < ~0.3 px at the limb)
  const qa = Math.min(0.1, (0.3 / Math.max(1, R)) / DEG);
  const view = { lon0: q(((o.lon0 ?? 0) - (o.rot ?? 0)), qa), lat0: q(o.lat0 ?? 0, qa), rot: 0, tilt: q(o.tilt ?? 0, qa) };
  let sunKey = '';
  if (o.sun) sunKey = Array.isArray(o.sun) ? o.sun.map((v) => q(v, 0.002)).join(',') : `${q(o.sun.lon, 0.1)},${q(o.sun.lat, 0.1)}`;
  const key = [style, view.lon0, view.lat0, view.tilt, q(R, 0.25), q(fx - x0, 0.25), q(fy - y0, 0.25), rw, rh, W, H, sunKey,
    o.lights ?? '', o.ocean ?? '', o.land ?? '', o.ice ?? '', o.seaLevel ?? 0, o.seaIce ?? '', o.iceLine ?? '', o.relief ?? '',
    o.coast ?? '', atmK].join('|');

  let ent = o.cache === false ? null : CACHE.get(key);
  if (ent) { CACHE.delete(key); CACHE.set(key, ent); stats.hits++; }
  else {
    const t0 = performance.now();
    ent = render(o, S, style, view, { x0, y0, rw, rh, W, H, s, cx: fx, cy: fy, R, atmW, atmK });
    stats.lastMs = performance.now() - t0; stats.renders++;
    if (o.cache !== false) {
      CACHE.set(key, ent);
      while (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
    }
  }
  c.save();
  if (!affine) c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha *= alpha;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(ent.cv, 0, 0, W, H, x0, y0, rw, rh);
  c.restore();
}

const cl = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
function render(o, S, style, view, g) {
  const { x0, y0, W, H, s, cx, cy, R, atmW, atmK } = g;
  const b = basis(view);
  const [rx, ry, rz] = b.r, [ux, uy, uz] = b.u, [vx, vy, vz] = b.c;

  // elevation level: the coarsest mip whose cell is still smaller than a pixel at the disc centre
  const degPx = 1 / (R * s) / DEG;
  let lev = 0; while (lev < 3 && 0.1 * 2 ** (lev + 1) <= degPx * 1.15) lev++;
  const M = mip(lev), EA = M.a, MW = M.w, MH = M.h, inv = M.inv;
  const cell = 111195 / inv;   // metres per cell (north-south)
  // magnified close-ups (a data cell spans several pixels): C1-smooth interpolation + fine coastline detail noise,
  // so the 0.1° grid never shows as blocks or diamond-shaped steps
  const cellPx = (1 / inv) / degPx;
  const mag = cl((cellPx - 1.5) / 6);
  const dAmp = 10 * mag, dF = inv * 57.3 * 1.6;   // small: larger amplitudes flip low coastal plains (< ~60 m) into speckled "sea"

  const OC = oceanLut(style, o.ocean);
  const BIO = S.land || o.land ? null : biome();
  const LAND = o.land || S.land;
  const ICE = o.ice || S.ice;
  const SEAICE = S.seaIce ? (o.ice ? L.mix(o.ice, S.seaIce, 0.5) : S.seaIce) : ICE;
  const relief = (o.relief ?? 1) * S.relief;
  const seaLevel = o.seaLevel ?? 0;
  const seaIceK = o.seaIce ?? 1;
  const [iceN, iceS] = o.iceLine ?? S.iceLine;
  const frozen = style === 'frozen';
  const coast = o.coast ?? S.coast ?? null;
  const lightK = o.lights === true ? 1 : o.lights === false ? 0 : o.lights != null ? +o.lights : S.lights ? 1 : 0;
  const LG = lightK > 0 ? lights() : null;
  const [ar, ag, ab] = S.atm;

  // sun in the earth frame (and in view space for the glint)
  let sun = null;
  if (o.sun) {
    if (Array.isArray(o.sun)) {
      const [a, bb, cc] = o.sun, n = Math.hypot(a, bb, cc) || 1;
      sun = [(a * rx + bb * ux + cc * vx) / n, (a * ry + bb * uy + cc * vy) / n, (a * rz + bb * uz + cc * vz) / n];
    } else sun = vec(o.sun.lat, o.sun.lon);
  }
  const sx_ = sun ? dot(sun, b.r) : -0.5, sy_ = sun ? dot(sun, b.u) : 0.55, sz_ = sun ? dot(sun, b.c) : 0.67;
  // half vector for the ocean glint (viewer = +z)
  let hx = sx_, hy = sy_, hz = sz_ + 1; const hn = Math.hypot(hx, hy, hz) || 1; hx /= hn; hy /= hn; hz /= hn;
  const nightMul = S.night;

  if (!scratch || scratch.width !== W || scratch.height !== H) scratch = new ImageData(W, H);
  const u32 = new Uint32Array(scratch.data.buffer);
  u32.fill(0);
  if (rowPrev.length < W) rowPrev = new Float32Array(W);
  rowPrev.fill(NaN);

  const Rp = R * s;                 // radius in raster px
  const ccx = (cx - x0) * s, ccy = (cy - y0) * s;
  const A = 1 + atmW, A2 = A * A;
  const edge = 1 / Rp;              // one raster pixel in unit-disc units
  const coastW = coast ? 1.1 : 0;

  for (let py = 0; py < H; py++) {
    const Y = (ccy - (py + 0.5)) / Rp, Y2 = Y * Y;
    if (Y2 > A2) { rowPrev.fill(NaN); continue; }
    const half = Math.sqrt(A2 - Y2) * Rp;
    const pxa = Math.max(0, Math.floor(ccx - half - 1)), pxb = Math.min(W - 1, Math.ceil(ccx + half + 1));
    let left = NaN;
    for (let px = 0; px < W; px++) {
      if (px < pxa || px > pxb) { rowPrev[px] = NaN; continue; }
      const X = ((px + 0.5) - ccx) / Rp;
      const rho2 = X * X + Y2;
      if (rho2 >= A2) { rowPrev[px] = NaN; left = NaN; continue; }
      const rho = Math.sqrt(rho2);
      const o4 = py * W + px;
      let outR = 0, outG = 0, outB = 0, outA = 0;

      // ---- planet
      const cov = rho < 1 - edge ? 1 : cl((1 - rho) * Rp + 0.5);
      if (cov > 0) {
        let Xn = X, Yn = Y;
        if (rho > 0.99999) { Xn = X / rho * 0.99999; Yn = Y / rho * 0.99999; }
        const Z = Math.sqrt(Math.max(0, 1 - Xn * Xn - Yn * Yn));
        const ex = Xn * rx + Yn * ux + Z * vx, ey = Xn * ry + Yn * uy + Z * vy, ez = Xn * rz + Yn * uz + Z * vz;
        const coslat = Math.sqrt(ex * ex + ey * ey);
        const lat = fatan2(ez, coslat) / DEG, lon = fatan2(ey, ex) / DEG;

        // bilinear elevation + gradient
        let fi = (90 - lat) * inv - 0.5; fi = fi < 0 ? 0 : fi > MH - 1.001 ? MH - 1.001 : fi;
        const i = fi | 0, u0 = fi - i, u = mag > 0 ? u0 * u0 * (3 - 2 * u0) : u0;
        let fj = (lon + 180) * inv - 0.5; if (fj < 0) fj += MW; if (fj >= MW) fj -= MW;
        const j = fj | 0, w0 = fj - j, w = mag > 0 ? w0 * w0 * (3 - 2 * w0) : w0, j1 = j + 1 === MW ? 0 : j + 1;
        const ea = EA[i * MW + j], eb = EA[i * MW + j1], ec = EA[(i + 1) * MW + j], ed = EA[(i + 1) * MW + j1];
        const top = ea + (eb - ea) * w, bot = ec + (ed - ec) * w;
        let e = top + (bot - top) * u;
        if (mag > 0 && Math.abs(e - seaLevel) < dAmp * 3) e += (vnoise3(ex * dF, ey * dF, ez * dF, 21) - 0.5 + 0.5 * (vnoise3(ex * dF * 2.7, ey * dF * 2.7, ez * dF * 2.7, 22) - 0.5)) * dAmp * 2;
        const gE = ((eb - ea) * (1 - u) + (ed - ec) * u) / (cell * (coslat > 0.3 ? coslat : 0.3));   // capped: 1/coslat blew polar relief up into meridional streaks
        const gN = -(bot - top) / cell;
        const d = e - seaLevel;
        const rel = (0.55 * gE - 0.45 * gN) * relief;   // light from the north-west

        // anti-aliased shoreline from the screen-space change of (elevation - sea level)
        const du = rowPrev[px], gr = (left === left ? Math.abs(d - left) : 0) + (du === du ? Math.abs(d - du) : 0) + 1e-3;
        rowPrev[px] = d; left = d;
        const land = cl(0.5 + d / gr);

        // land
        let lr = 0, lg = 0, lb = 0, wr = 0, wg = 0, wb = 0;
        if (land > 0) {
        const onIce = frozen || ((lat < -60 || lat > 59.5) && isIce(lat, lon));
        if (onIce) {
          lr = ICE[0]; lg = ICE[1]; lb = ICE[2];
          if (frozen) { const k = cl(e / 3000); lr += (250 - lr) * k * 0.6; lg += (252 - lg) * k * 0.6; lb += (255 - lb) * k * 0.6; }
        } else {
          if (BIO) {
            let bi = (90 - lat) * 2 - 0.5; bi = bi < 0 ? 0 : bi > BH - 1.001 ? BH - 1.001 : bi;
            let bj = (lon + 180) * 2 - 0.5; if (bj < 0) bj += BW; if (bj >= BW) bj -= BW;
            const i0 = bi | 0, fu = bi - i0, j0 = bj | 0, fw = bj - j0, j2 = j0 + 1 === BW ? 0 : j0 + 1;
            const p00 = (i0 * BW + j0) * 3, p01 = (i0 * BW + j2) * 3, p10 = p00 + BW * 3, p11 = p01 + BW * 3;
            const w00 = (1 - fu) * (1 - fw), w01 = (1 - fu) * fw, w10 = fu * (1 - fw), w11 = fu * fw;
            lr = BIO[p00] * w00 + BIO[p01] * w01 + BIO[p10] * w10 + BIO[p11] * w11;
            lg = BIO[p00 + 1] * w00 + BIO[p01 + 1] * w01 + BIO[p10 + 1] * w10 + BIO[p11 + 1] * w11;
            lb = BIO[p00 + 2] * w00 + BIO[p01 + 2] * w01 + BIO[p10 + 2] * w10 + BIO[p11 + 2] * w11;
          } else { lr = LAND[0]; lg = LAND[1]; lb = LAND[2]; }
          if (e > 1400) {
            const k = (e - 1400) / 2600 * (BIO ? 0.6 : 0.25); const kk = k > 0.6 ? 0.6 : k;
            lr += (ROCK[0] - lr) * kk; lg += (ROCK[1] - lg) * kk; lb += (ROCK[2] - lb) * kk;
          }
          if (e > 4600 && style !== 'night') {
            const k = cl((e - 4600) / 1400) * 0.8;
            lr += (SNOW[0] - lr) * k; lg += (SNOW[1] - lg) * k; lb += (SNOW[2] - lb) * k;
          }
        }
        const hs = 1 + cl(rel * (onIce ? 12 : 22), -0.35, 0.35);   // ice is smooth: a gentle relief gain
        lr *= hs; lg *= hs; lb *= hs;
        }

        // water
        if (land < 1) {
        const dep = d < 0 ? -d : 0;
        const k2 = Math.min(800, (dep / 10) | 0) * 3;
        wr = OC[k2]; wg = OC[k2 + 1]; wb = OC[k2 + 2];
        const wsh = 1 + cl(rel * 5, -0.18, 0.18);
        wr *= wsh; wg *= wsh; wb *= wsh;
        if (S.seaIce && seaIceK > 0 && (lat > iceN - 4 || lat < iceS + 4)) {
          const nz = vnoise3(ex * 9, ey * 9, ez * 9, 11) * 4.5 + vnoise3(ex * 40, ey * 40, ez * 40, 12) * 1.4 + vnoise3(ex * 160, ey * 160, ez * 160, 14) * 0.5;
          const k = (lat > 0 ? cl((lat - iceN + 3.2 - nz) / 1.1) : cl((iceS - lat + 3.2 - nz) / 1.1)) * seaIceK;   // feathered pack-ice edge
          if (k > 0) {
            const t = 0.9 + 0.1 * vnoise3(ex * 120, ey * 120, ez * 120, 13);
            wr += (SEAICE[0] * t - wr) * k; wg += (SEAICE[1] * t - wg) * k; wb += (SEAICE[2] * t - wb) * k;
          }
        }
        }

        let r = wr + (lr - wr) * land, gg = wg + (lg - wg) * land, bb = wb + (lb - wb) * land;
        if (coast) {
          const ln = cl(1 - Math.abs(d) / (gr * coastW)) * 0.55;
          r += (coast[0] - r) * ln; gg += (coast[1] - gg) * ln; bb += (coast[2] - bb) * ln;
        }

        // lighting
        const ndl = Xn * sx_ + Yn * sy_ + Z * sz_;           // view-space normal . light
        const limb = 0.72 + 0.28 * Math.sqrt(Z);
        if (sun) {
          const day = cl((ndl + 0.1) / 0.22); const dayS = day * day * (3 - 2 * day);
          const lit = ndl > 0 ? Math.sqrt(ndl) : 0;
          const dm = (0.4 + 0.66 * lit) * limb;
          // a warm band along the terminator
          const warm = cl(1 - Math.abs(ndl - 0.04) / 0.14) * 0.3 * dayS;
          let dr = r * dm, dg = gg * dm, db = bb * dm;
          dr += (dr * 1.35 + 18 - dr) * warm; dg += (dg * 0.95 - dg) * warm; db += (db * 0.7 - db) * warm;
          // ocean glint
          const water = 1 - land;
          if (water > 0 && style !== 'frozen') {
            const nh = Xn * hx + Yn * hy + Z * hz;
            if (nh > 0.95) { const sp = Math.pow(nh, 220) * 0.4 * water * dayS; dr += 210 * sp; dg += 220 * sp; db += 230 * sp; }
          }
          let nr = r * nightMul, ng = gg * nightMul, nb = bb * nightMul;
          if (LG) {
            let li = (90 - lat) * 4 - 0.5; li = li < 0 ? 0 : li > LH - 1.001 ? LH - 1.001 : li;
            let lj = (lon + 180) * 4 - 0.5; if (lj < 0) lj += LW; if (lj >= LW) lj -= LW;
            const a0 = li | 0, fu = li - a0, b0 = lj | 0, fw = lj - b0, b1 = b0 + 1 === LW ? 0 : b0 + 1;
            const lv = ((LG[a0 * LW + b0] * (1 - fw) + LG[a0 * LW + b1] * fw) * (1 - fu) + (LG[(a0 + 1) * LW + b0] * (1 - fw) + LG[(a0 + 1) * LW + b1] * fw) * fu) * lightK * land * limb;
            nr += 255 * lv; ng += 196 * lv; nb += 112 * lv;
          }
          r = nr + (dr - nr) * dayS; gg = ng + (dg - ng) * dayS; bb = nb + (db - nb) * dayS;
        } else {
          const sh = limb * (0.86 + 0.24 * (ndl > 0 ? ndl : 0));
          r *= sh; gg *= sh; bb *= sh;
          if (LG) {
            let li = (90 - lat) * 4 - 0.5; li = li < 0 ? 0 : li > LH - 1.001 ? LH - 1.001 : li;
            let lj = (lon + 180) * 4 - 0.5; if (lj < 0) lj += LW; if (lj >= LW) lj -= LW;
            const a0 = li | 0, fu = li - a0, b0 = lj | 0, fw = lj - b0, b1 = b0 + 1 === LW ? 0 : b0 + 1;
            const lv = ((LG[a0 * LW + b0] * (1 - fw) + LG[a0 * LW + b1] * fw) * (1 - fu) + (LG[(a0 + 1) * LW + b0] * (1 - fw) + LG[(a0 + 1) * LW + b1] * fw) * fu) * lightK * land * limb;
            r += 255 * lv; gg += 196 * lv; bb += 112 * lv;
          }
        }
        // atmospheric haze toward the limb (lit side only)
        if (atmK > 0) {
          const zz = 1 - Z, hz2 = zz * zz * zz * 0.55 * atmK;
          const lk = sun ? cl((ndl + 0.15) / 0.4) : 1;
          const h = hz2 * lk;
          r += (ar - r) * h; gg += (ag - gg) * h; bb += (ab - bb) * h;
        }
        outR = r; outG = gg; outB = bb; outA = cov;
      }

      // ---- atmosphere rim (outside the disc)
      if (atmK > 0 && rho > 1 - edge) {
        const t = cl(1 - (rho - 1) / atmW);
        let a = t * t * t * 0.85 * atmK;
        if (sun) {
          const nx = X / rho, ny = Y / rho;
          a *= cl((nx * sx_ + ny * sy_ + 0.25) / 0.6) * 0.95 + 0.05;
        } else a *= 0.8 + 0.2 * cl(-X * 0.6 + Y * 0.6 + 0.5);
        if (a > 0) {
          const ao = outA + a * (1 - outA);
          outR = (outR * outA + ar * a * (1 - outA)) / ao;
          outG = (outG * outA + ag * a * (1 - outA)) / ao;
          outB = (outB * outA + ab * a * (1 - outA)) / ao;
          outA = ao;
        }
      }
      if (outA <= 0) continue;
      const A8 = (outA * 255 + 0.5) | 0;
      u32[o4] = (A8 << 24) | ((outB < 0 ? 0 : outB > 255 ? 255 : outB) << 16) | ((outG < 0 ? 0 : outG > 255 ? 255 : outG) << 8)
        | (outR < 0 ? 0 : outR > 255 ? 255 : outR);
    }
  }
  const cv = new OffscreenCanvas(W, H);
  cv.getContext('2d').putImageData(scratch, 0, 0);
  return { cv };
}

/** Pre-build the lazy tables (biome, city lights, mips) so the first timed frame is not slow. */
export function warm() { biome(); lights(); mip(3); }
