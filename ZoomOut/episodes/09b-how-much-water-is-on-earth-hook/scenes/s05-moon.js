// Beat 5 — "That's less than half the width of the Moon."
// The real Moon's near side (3,474 km, true scale) fades in beside the water ball. A dashed half-way line splits
// the Moon, then a dashed copy of the ball glides into the Moon's left half: it fits with room to spare.
// The Moon and the ghost fade out as the camera pulls back in beat 6.
// Exports drawMoon() / drawGhost() so the cold open (p-cold.js) can repaint the Moon over the half-way line.
import * as L from '../../../../engine/runtime/lib.js';
import { ALL, MOON_CMP } from '../camera.js';
import { SUN_DIR } from '../env.js';

const DEG = Math.PI / 180;
const T_DRAW = [0.25, 0.9];    // the Moon fades in
const T_HALF = 1.15;           // half-way line
const T_GHOST = [1.35, 1.0];   // ghost ball glides into the Moon
const T_LABEL = 1.1;

// ghost target: centred in the Moon's left half (the half facing the ball), with room to spare
const GX = MOON_CMP.x - MOON_CMP.d / 4;

export function fadeOut(v) { return 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.35, 0.5)); }
// the ghost and half-way line leave a touch ahead of the Moon body
function leadFade(v) { return 1 - L.prog(v.t, v.d - 0.45, 0.4); }

// ================================================================== the Moon's near side (rendered once, then scaled)
// Built from real selenography: every mare is a set of elliptical lobes at its true selenographic position and size
// (lat, lon, E-W half-width, N-S half-width in degrees of arc), merged with a smooth union and given ragged,
// domain-warped edges and their own albedo. Highlands carry a dense crater population (named craters at their real
// positions + a seeded power-law population, sparse on the maria), and the young rayed craters (Tycho, Copernicus,
// Kepler, Aristarchus, Proclus, …) throw patchy great-circle ray systems. Lit from the upper left like the water
// ball (SUN_DIR), with a Lommel-Seeliger lunar law (the flat look of a near-full Moon) and gentle limb darkening.

// [lat, lon, a (E-W), b (N-S), rot°]; albedo per mare; tint (r, g, b multipliers)
const MARIA = [
  { n: 'Imbrium', alb: 0.335, tint: [0.99, 0.99, 1.0], lobes: [[33, -16, 16, 16, 0], [44.5, -31.5, 5, 4.2, 0], [24, -27, 8, 7, 0], [40, -6, 7, 5, 0]] },
  { n: 'Palus Putredinis', alb: 0.37, lobes: [[26, 0.5, 4, 3, 0]] },
  { n: 'Serenitatis', alb: 0.375, ring: 0.07, tint: [1.0, 0.99, 0.97], lobes: [[28, 17.5, 10.5, 10, 0]] },
  { n: 'Lacus Somniorum', alb: 0.43, lobes: [[37.5, 29, 6, 4, 10], [42, 32, 3.5, 2.5, 0]] },
  { n: 'Lacus Mortis', alb: 0.42, lobes: [[45, 27, 3, 2.5, 0]] },
  { n: 'Tranquillitatis', alb: 0.285, tint: [0.95, 0.97, 1.03], lobes: [[8.5, 31, 9.5, 8, 0], [15, 23, 4.5, 4, 0], [2, 24, 5.5, 4.5, 0], [-3.5, 28, 4, 3, 0], [12, 38, 5, 5, 0], [4, 41, 5, 4.5, 0], [14, 43, 3, 3, 0]] },
  { n: 'Palus Somni', alb: 0.47, lobes: [[14.5, 45, 3.2, 2.8, 0]] },
  { n: 'Crisium', alb: 0.29, tint: [0.97, 0.98, 1.02], lobes: [[17, 59, 9.2, 6.8, 0]] },
  { n: 'Fecunditatis', alb: 0.355, tint: [1.0, 0.99, 0.98], lobes: [[-4, 51, 6.5, 6.5, 0], [-12, 50, 5.5, 6.5, 0], [-1, 56, 4.5, 4, 0], [-16, 53.5, 4, 4, 0], [-5, 45.5, 3.5, 4, 0]] },
  { n: 'Nectaris', alb: 0.36, lobes: [[-15.2, 35.2, 5.2, 5.4, 0], [-21, 33.5, 3, 2.5, 0]] },
  { n: 'Sinus Asperitatis', alb: 0.37, lobes: [[-5, 26.5, 3.5, 3, 0]] },
  { n: 'Vaporum', alb: 0.34, lobes: [[13.3, 3.6, 4.4, 3.4, 15], [16.5, -0.5, 2.6, 1.8, 0], [10.5, 7.5, 2.2, 1.6, 0]] },
  { n: 'Sinus Medii', alb: 0.42, lobes: [[2.4, 1.7, 4.2, 2.6, -10], [0.5, -4.5, 2.6, 1.8, 0]] },
  { n: 'Sinus Aestuum', alb: 0.32, lobes: [[11, -8.5, 4.6, 3.0, 10], [13, -14, 2.6, 1.8, 0], [8, -4.5, 2.2, 1.6, 0]] },
  { n: 'Insularum', alb: 0.41, lobes: [[6, -26, 8, 6.5, 0], [9, -35, 6, 5, 0], [1, -18, 6, 4.5, 0], [-3, -33, 5, 4, 0], [12, -18, 3.5, 2.2, 0]] },
  { n: 'Cognitum', alb: 0.4, lobes: [[-10, -23, 7, 5.5, 0], [-4, -28, 5, 4, 0]] },
  { n: 'Nubium', alb: 0.395, lobes: [[-20, -15, 8.5, 6.5, 0], [-26, -19, 6, 4.5, 0], [-14, -11, 5, 4, 0], [-22, -8, 3.5, 3, 0]] },
  { n: 'Humorum', alb: 0.33, lobes: [[-24.4, -38.6, 6.2, 6.4, 0]] },
  { n: 'Palus Epidemiarum', alb: 0.42, lobes: [[-31.5, -28, 4, 2.2, 0]] },
  { n: 'Procellarum', alb: 0.35, tint: [1.0, 0.99, 0.975], lobes: [
    [46, -55, 7, 6, 0], [53, -58, 5, 4, 0], [38, -46, 7.5, 7, 0], [33, -61, 8, 8, 0], [19, -58, 11, 9, 0],
    [14, -45, 8.5, 7, 0], [5, -56, 10, 8.5, 0], [-3, -49, 8.5, 7, 0], [-8, -41, 6, 5, 0], [11, -69, 6, 8, 0], [25, -70, 5.5, 6.5, 0],
    [-11, -53, 5, 4, 0], [30, -38, 6, 5, 0], [0, -64, 5, 5, 0]] },
  { n: 'Frigoris', alb: 0.405, lobes: [
    [55, -42, 6, 2.6, -8], [56.5, -31, 6, 2.4, 0], [57.5, -20, 6, 2.2, 4], [58, -9, 6, 2.0, 0], [57.5, 2, 6, 2.4, 0],
    [56.5, 13, 6, 2.8, -4], [56, 24, 6, 3.0, 0], [57, 35, 5, 2.6, 6], [58.5, 44, 4, 2.0, 0]] },
  { n: 'Humboldtianum', alb: 0.36, lobes: [[57, 81, 4, 3.5, 0]] },
  { n: 'Marginis', alb: 0.38, lobes: [[13, 86, 4.5, 5, 0]] },
  { n: 'Smythii', alb: 0.36, lobes: [[1.3, 87, 5, 5, 0]] },
  { n: 'Undarum', alb: 0.37, lobes: [[7, 69, 3, 2.5, 0]] },
  { n: 'Spumans', alb: 0.37, lobes: [[1, 65, 2.5, 2, 0]] },
  { n: 'Australe', alb: 0.39, lobes: [[-42, 88, 5, 5, 0], [-48, 80, 3, 3, 0], [-36, 82, 2.5, 2.5, 0]] },
  { n: 'Grimaldi', alb: 0.25, lobes: [[-5.2, -68.6, 2.5, 2.6, 0]] },
  { n: 'Riccioli', alb: 0.3, lobes: [[-3.3, -74.6, 1.3, 1.8, 0]] },
  { n: 'Crüger', alb: 0.3, lobes: [[-16.7, -66.8, 1.0, 1.0, 0]] },
];
// highland islands carved out of the maria: [lat, lon, a, b]
const HOLES = [[26, -50.5, 3.6, 2.6], [-2, -38, 1.6, 1.4], [14.3, -18, 6.5, 1.3]];   // Aristarchus plateau, Kepler's highland, Montes Carpatus

// named craters: [lat, lon, radius°, depth factor, floor: 0 bright | -1 dark | 1 mare-flooded, fresh 0..1]
const NAMED = [
  [-43.3, -11.2, 1.42, 1, 0, 1], [9.6, -20.1, 1.55, 1, 0, 0.9], [8.1, -38, 0.52, 1, 0, 0.9], [23.7, -47.4, 0.66, 1, 0, 1],
  [51.6, -9.4, 1.65, 0.45, -1, 0], [-58.4, -14.4, 3.7, 0.5, 0, 0], [-9.3, -1.9, 2.5, 0.35, 1, 0], [-13.4, -3.2, 1.8, 0.5, 0, 0],
  [-18.2, -1.9, 1.6, 0.6, 0, 0.2], [-11.2, 4, 2.1, 0.45, 0, 0], [-11.4, 26.4, 1.65, 0.8, 0, 0.4], [-13.2, 24, 1.6, 0.55, 0, 0],
  [-18, 23.6, 1.65, 0.5, 0, 0], [-8.9, 61, 2.2, 0.8, 0, 0.3], [-25.3, 60.4, 3, 0.6, 0, 0.1], [-50, -6.2, 2.7, 0.45, 0, 0],
  [-49.5, -21.7, 2.4, 0.5, 0, 0], [-44.3, -55.3, 3.7, 0.35, -1, 0], [-17.6, -40, 1.8, 0.5, 1, 0], [-20.7, -22.2, 1.0, 0.9, 0, 0.3],
  [29.7, -4, 1.4, 0.4, 1, 0], [50.2, 17.4, 1.4, 0.8, 0, 0.2], [44.3, 16.3, 1.1, 0.7, 0, 0.1], [31.8, 29.9, 1.6, 0.35, 1, 0],
  [14.5, -11.3, 0.95, 0.9, 0, 0.1], [14.5, 9.1, 0.64, 0.8, 0, 0.5], [16.3, 16, 0.44, 0.8, 0, 0.8], [16.1, 46.8, 0.46, 0.9, 0, 1],
  [-32.5, 54.2, 1.2, 0.7, 0, 0.3], [-36, 60.6, 2.2, 0.5, 0, 0], [-45.4, 40.3, 3.3, 0.35, 0, 0], [-33, 1, 2.2, 0.45, 0, 0],
  [-25.5, -2.3, 1.9, 0.45, 0, 0], [-5.1, 5.2, 2.3, 0.3, 0, 0], [-6, -17, 1.6, 0.25, 1, 0], [-29.8, -13.5, 1.7, 0.4, 1, 0],
  [2.2, -67.6, 1.9, 0.4, 0, 0], [53.6, 57, 2.1, 0.4, -1, 0], [46.7, 44.4, 1.45, 0.6, 0, 0], [46.7, 39.1, 1.2, 0.6, 0, 0],
  [27.7, 55.5, 2.1, 0.5, 0, 0], [34.5, 56.7, 1.4, 0.6, 0, 0], [-16.3, 61.6, 2.4, 0.4, 0, 0], [-29.7, 32.2, 1.4, 0.7, 0, 0],
  [-21.5, 33.2, 2.0, 0.2, 1, 0], [63.5, -63, 2, 0.7, 0, 0], [73.4, -10.1, 0.85, 0.8, 0, 0.8], [72.1, -32.4, 1.2, 0.6, 0, 0],
  [-0.4, 32.7, 0.12, 1, 0, 1], [-1.9, 47.6, 0.2, 1, 0, 1], [-24.5, -63.9, 0.3, 1, 0, 1], [8.1, -77.6, 0.7, 0.9, 0, 0.9],
  [-32.8, 51.6, 0.3, 1, 0, 1], [-33.5, 59, 0.35, 1, 0, 1], [61.8, 50.3, 0.5, 0.9, 0, 0.8], [-26.4, -16.1, 0.5, 0.8, 0, 0.5],
  [-56.7, 1.1, 1.6, 0.4, 0, 0], [-62.9, -24.7, 2.5, 0.35, 0, 0], [-52, 34, 2.2, 0.4, 0, 0], [-38, 25.6, 1.4, 0.5, 0, 0],
];
// ray systems: crater index into NAMED, ray count, length range (deg), width (deg), strength, nimbus (deg), sector [az0, az1] or null
const RAYS = [
  { c: 0, n: 26, len: [8, 40], w: 0.85, k: 0.38, nim: 4.2, long: [[20, 78], [-58, 55], [125, 50], [62, 48]] },   // Tycho
  { c: 1, n: 34, len: [4, 17], w: 1.5, k: 0.17, nim: 4.2, soft: 1 },              // Copernicus
  { c: 2, n: 24, len: [3, 11], w: 1.1, k: 0.15, nim: 3.0, soft: 1 },              // Kepler
  { c: 3, n: 16, len: [3, 9], w: 0.9, k: 0.17, nim: 2.6, soft: 1 },              // Aristarchus
  { c: 27, n: 10, len: [3, 9], w: 0.45, k: 0.18, nim: 1.4, sector: [-95, 175] },   // Proclus (the famous fan; Palus Somni lies in its ray-free zone)
  { c: 46, n: 14, len: [3, 11], w: 0.5, k: 0.15, nim: 1.6 },                // Anaxagoras
  { c: 52, n: 10, len: [3, 9], w: 0.45, k: 0.14, nim: 1.2 },                // Stevinus A
  { c: 53, n: 10, len: [3, 10], w: 0.45, k: 0.14, nim: 1.2 },               // Furnerius A
  { c: 51, n: 9, len: [3, 8], w: 0.45, k: 0.14, nim: 1.2 },                 // Olbers A
  { c: 50, n: 7, len: [2.5, 6], w: 0.4, k: 0.13, nim: 1.0 },                // Byrgius A
  { c: 54, n: 8, len: [2, 6], w: 0.4, k: 0.12, nim: 1.0 },                  // Thales
  { c: 49, n: 2, len: [6, 8], w: 0.35, k: 0.16, nim: 0.6, fixed: [-88, -96] },  // Messier A's comet-tail pair
  { c: 26, n: 6, len: [1.5, 4], w: 0.35, k: 0.12, nim: 1.0 },               // Menelaus
  { c: 48, n: 6, len: [1.5, 4], w: 0.35, k: 0.12, nim: 1.0 },               // Censorinus
];

// ---- fast seeded value noise (3D, integer hash)
function h3(i, j, k, s) {   // murmur-style sequential mixing (no lattice correlations between seeds)
  let h = Math.imul(s + 0x2545f491, 0x9e3779b1);
  h = Math.imul(h ^ i, 0xcc9e2d51); h = (h << 15) | (h >>> 17);
  h = Math.imul(h ^ j, 0x1b873593); h = (h << 13) | (h >>> 19);
  h = Math.imul(h ^ k, 0xe6546b64);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vn3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf); zf = zf * zf * (3 - 2 * zf);
  const a = h3(xi, yi, zi, s), b = h3(xi + 1, yi, zi, s), c = h3(xi, yi + 1, zi, s), d = h3(xi + 1, yi + 1, zi, s);
  const e = h3(xi, yi, zi + 1, s), f = h3(xi + 1, yi, zi + 1, s), g = h3(xi, yi + 1, zi + 1, s), hh = h3(xi + 1, yi + 1, zi + 1, s);
  const x0 = a + (b - a) * xf, x1 = c + (d - c) * xf, x2 = e + (f - e) * xf, x3 = g + (hh - g) * xf;
  const y0 = x0 + (x1 - x0) * yf, y1 = x2 + (x3 - x2) * yf;
  return y0 + (y1 - y0) * zf;
}
function fbm3(x, y, z, oct, s) {
  let a = 0, amp = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { a += amp * vn3(x * f, y * f, z * f, s + i); tot += amp; amp *= 0.5; f *= 2.03; }
  return a / tot;
}
const n1 = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return h3(i, s, 7, 3) * (1 - u) + h3(i + 1, s, 7, 3) * u; };
const ss = (a, b, x) => { const t = L.clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const unit = (la, lo) => [Math.cos(la * DEG) * Math.sin(lo * DEG), Math.sin(la * DEG), Math.cos(la * DEG) * Math.cos(lo * DEG)];

let MOON_CV = null;
export function moonTexture() {
  if (MOON_CV) return MOON_CV;
  const N = 1024, R = N / 2 - 2, NN = N * N;
  const PX = new Float32Array(NN), PY = new Float32Array(NN), PZ = new Float32Array(NN), IN = new Uint8Array(NN);
  const LAT = new Float32Array(NN), LON = new Float32Array(NN);
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const X = (px + 0.5 - N / 2) / R, Y = (N / 2 - py - 0.5) / R, r2 = X * X + Y * Y, o = py * N + px;
    if (r2 > (1 + 1.5 / R) ** 2) continue;
    const s = r2 > 0.999999 ? 0.999999 / Math.sqrt(r2) : 1;
    const x = X * s, y = Y * s, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    PX[o] = x; PY[o] = y; PZ[o] = z; IN[o] = 1;
    LAT[o] = Math.asin(y) / DEG; LON[o] = Math.atan2(x, z) / DEG;
  }

  // ---- 1. maria: smooth union of lobes per mare, warped + ragged edges
  const MARE = new Float32Array(NN), MALB = new Float32Array(NN), TR = new Float32Array(NN), TB = new Float32Array(NN);
  const lobes = [];
  MARIA.forEach((m, mi) => m.lobes.forEach(([la, lo, a, b, rot]) => lobes.push({ mi, la, lo, a, b, cr: Math.cos(rot * DEG), sr: Math.sin(rot * DEG) })));
  const field = new Float32Array(MARIA.length);
  for (let o = 0; o < NN; o++) {
    if (!IN[o]) continue;
    const x = PX[o], y = PY[o], z = PZ[o];
    // domain warp (~1.6° at two scales): mare shorelines are lobate and embayed, never geometric
    const wx = (fbm3(x * 2.6 + 11, y * 2.6, z * 2.6, 3, 1) - 0.5) * 7 + (fbm3(x * 8, y * 8, z * 8 + 4, 3, 5) - 0.5) * 3.2;
    const wy = (fbm3(x * 2.6, y * 2.6 + 7, z * 2.6, 3, 9) - 0.5) * 7 + (fbm3(x * 8 + 2, y * 8, z * 8, 3, 13) - 0.5) * 3.2;
    const la = LAT[o] + wy, lo = LON[o] + wx / Math.max(0.25, Math.cos(LAT[o] * DEG));
    const cl = Math.cos(la * DEG);
    field.fill(-9);
    for (const q of lobes) {
      const dy = la - q.la, dx = (lo - q.lo) * cl;
      if (Math.abs(dy) > q.b * 2.2 + 4 || Math.abs(dx) > q.a * 2.2 + 4) continue;
      const u = dx * q.cr + dy * q.sr, w = -dx * q.sr + dy * q.cr;
      const d = Math.sqrt((u / (q.a * 1.15)) ** 2 + (w / (q.b * 1.15)) ** 2);
      const f = 1 - d, fo = field[q.mi];
      // smooth max so neighbouring lobes flow into one outline
      field[q.mi] = fo < -8 ? f : Math.max(f, fo) + Math.log(1 + Math.exp(-6 * Math.abs(f - fo))) / 6;
    }
    let hole = 0;
    for (const [hla, hlo, ha, hb] of HOLES) {
      if (ha <= 0) continue;
      const d = Math.hypot((lo - hlo) * cl / ha, (la - hla) / hb);
      hole = Math.max(hole, 1 - ss(0.75, 1.15, d));
    }
    const edgeN = (fbm3(x * 22, y * 22, z * 22, 3, 21) - 0.5) * 0.36 + (fbm3(x * 70, y * 70, z * 70, 2, 25) - 0.5) * 0.14;
    let mm = 0, aw = 0, ab = 0, tr = 0, tb = 0;
    for (let i = 0; i < MARIA.length; i++) {
      if (field[i] < -0.4) continue;
      const k = ss(-0.17, 0.11, field[i] + edgeN);   // wide, soft shorelines: real maria fade into the highlands
      const M = MARIA[i];
      let a = M.alb;
      if (M.ring) a -= M.ring * ss(0.3, 0.0, field[i] + edgeN);   // Serenitatis: darker border, paler centre
      // albedo weights are soft (exp of the field), so neighbouring maria blend without visible lobe outlines
      const wgt = Math.exp(7 * Math.min(0.6, field[i]));
      mm = Math.max(mm, k); aw += wgt; ab += wgt * a;
      tr += wgt * (M.tint ? M.tint[0] : 1); tb += wgt * (M.tint ? M.tint[2] : 1);
    }
    mm *= 1 - hole * 0.85;
    MARE[o] = mm;
    // internal mottling: lava flows of different ages give every mare light and dark patches
    MALB[o] = (aw > 0 ? ab / aw : 0.36) + (fbm3(x * 9 + 3, y * 9, z * 9, 4, 41) - 0.5) * 0.09;
    TR[o] = aw > 0 ? tr / aw : 1; TB[o] = aw > 0 ? tb / aw : 1;
  }

  // ---- 2. craters: height field + albedo, stamped through their bounding boxes
  const H = new Float32Array(NN), A = new Float32Array(NN);
  const rnd = L.rng(31337);
  const craters = NAMED.map(([la, lo, r, dep, floor, fresh]) => ({ la, lo, r, dep, floor, fresh, named: true }));
  for (let i = 0; i < 6000; i++) {
    const r = 0.06 + Math.pow(rnd(), 4) * 2.0;            // power law: lots of small, few large
    const la = Math.asin(rnd() * 2 - 1) / DEG, lo = rnd() * 196 - 98;
    const [x, y, z] = unit(la, lo);
    if (z < 0.02) continue;
    const px = Math.round(N / 2 + x * R), py = Math.round(N / 2 - y * R), o = py * N + px;
    const onMare = MARE[o] || 0;
    if (rnd() < onMare * (r > 0.5 ? 0.97 : 0.8)) continue;   // maria are young: few craters, almost no big ones
    craters.push({ la, lo, r, dep: 0.6 + rnd() * 0.5, floor: 0, fresh: rnd() < 0.12 ? 0.3 + rnd() * 0.5 : rnd() * 0.1 });
  }
  for (const q of craters) {
    const [cx, cy, cz] = unit(q.la, q.lo);
    if (cz < -0.05) continue;
    const D = q.r * DEG, rpx = D * R;
    const ext = q.r * (q.fresh > 0.5 ? 2.2 : 1.5) * DEG * R + 3;
    const x0 = Math.max(0, Math.floor(N / 2 + cx * R - ext)), x1 = Math.min(N - 1, Math.ceil(N / 2 + cx * R + ext));
    const y0 = Math.max(0, Math.floor(N / 2 - cy * R - ext)), y1 = Math.min(N - 1, Math.ceil(N / 2 - cy * R + ext));
    // relief scale: big old basins are shallow and flat-floored; small ones are bowls
    const depth = D * (q.r > 1.2 ? 0.018 : 0.04) * q.dep * (q.fresh > 0.5 ? 1.8 : 1);
    const flat = q.r > 0.9 ? 0.55 : 0.15;
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      const o = py * N + px;
      if (!IN[o]) continue;
      const dt = PX[o] * cx + PY[o] * cy + PZ[o] * cz;
      const ang = Math.acos(Math.min(1, dt));
      const f = ang / D;
      if (f > (q.fresh > 0.5 ? 2.2 : 1.5)) continue;
      let h;
      if (f < 1) {
        const ff = f < flat ? 0 : (f - flat) / (1 - flat);
        h = -depth * (1 - ff * ff) + depth * 0.3 * Math.exp(-(((f - 1) / 0.12) ** 2));
      } else h = depth * 0.3 * Math.exp(-(((f - 1) / 0.14) ** 2)) + depth * 0.05 * Math.exp(-(f - 1) * 3);
      H[o] += h;
      let da = 0;
      if (f < 1) {
        if (q.floor === -1) da -= 0.2 * ss(0.95, 0.7, f);
        else if (q.floor === 1) da -= 0.12 * ss(0.95, 0.7, f) * (1 - MARE[o]);
        da += 0.28 * q.fresh * ss(1.05, 0.6, f);
      } else da += 0.16 * q.fresh * Math.exp(-(f - 1) * 2.4);     // bright ejecta halo
      A[o] += da;
    }
  }
  // Tycho's dark collar of impact melt, just outside the rim
  {
    const [cx, cy, cz] = unit(-43.3, -11.2);
    for (let o = 0; o < NN; o++) {
      if (!IN[o]) continue;
      const ang = Math.acos(Math.min(1, PX[o] * cx + PY[o] * cy + PZ[o] * cz)) / DEG;
      if (ang < 3.6) A[o] -= 0.16 * ss(1.3, 1.55, ang) * ss(3.2, 1.9, ang);
    }
  }

  // ---- 3. ray systems
  const RAYK = new Float32Array(NN);
  for (const rs of RAYS) {
    const q = NAMED[rs.c];
    const [cx, cy, cz] = unit(q[0], q[1]);
    const east = [Math.cos(q[1] * DEG), 0, -Math.sin(q[1] * DEG)];
    const north = [-Math.sin(q[0] * DEG) * Math.sin(q[1] * DEG), Math.cos(q[0] * DEG), -Math.sin(q[0] * DEG) * Math.cos(q[1] * DEG)];
    const rr = L.rng(1000 + rs.c * 17);
    const rays = [];
    for (let i = 0; i < rs.n; i++) {
      let az;
      if (rs.fixed) az = rs.fixed[i % rs.fixed.length];
      else if (rs.sector) az = L.lerp(rs.sector[0], rs.sector[1], (i + rr() * 0.8) / rs.n);
      else az = (i + (rr() - 0.5) * 2.2) / rs.n * 360;    // irregular spacing: no comb of parallel stripes
      const len = L.lerp(rs.len[0], rs.len[1], Math.pow(rr(), 2));
      rays.push({ az: az * DEG, len, w: rs.w * (0.6 + rr() * 0.8), k: 0.6 + rr() * 0.6, seed: (rr() * 1e4) | 0, off: (rr() - 0.5) * 0.8 });
      if (rr() < 0.45) rays.push({ az: (az + (rr() - 0.5) * 6) * DEG, len: len * (0.5 + rr() * 0.4), w: rs.w * 0.5, k: 0.5, seed: (rr() * 1e4) | 0, off: 0 });
    }
    for (const [az, len] of rs.long ?? []) rays.push({ az: az * DEG, len, w: rs.w * 1.1, k: 1.0, seed: (rr() * 1e4) | 0, off: 0 });
    rays.forEach((r) => { r.ph = h3(r.seed, 5, 9, 1) * 10; });   // per-ray phase: noise knots never line up into rings
    const maxLen = Math.max(...rays.map((r) => r.len)) + 2;
    const rim = q[2];
    for (let o = 0; o < NN; o++) {
      if (!IN[o]) continue;
      const x = PX[o], y = PY[o], z = PZ[o];
      const dt = x * cx + y * cy + z * cz;
      const ang = Math.acos(Math.min(1, dt)) / DEG;
      if (ang > maxLen) continue;
      const tx = x - cx * dt, ty = y - cy * dt, tz = z - cz * dt;
      const az = Math.atan2(tx * east[0] + ty * east[1] + tz * east[2], tx * north[0] + ty * north[1] + tz * north[2]);
      let acc = 0;
      const softP = rs.soft ? ss(0.38, 0.72, fbm3(x * 34 + rs.c, y * 34, z * 34, 3, 71)) * (0.5 + 0.5 * vn3(x * 90, y * 90, z * 90, 73)) : 0;
      for (const r of rays) {
        if (ang > r.len) continue;
        let da = az - r.az; da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
        if (Math.abs(da) > 1.2) continue;
        const lat = ang * Math.sin(da) - r.off * (ang / r.len);
        const w = r.w * (0.7 + 0.9 * ang / r.len) * (0.7 + 0.6 * n1(ang * 0.5 + r.ph, r.seed + 3));
        if (Math.abs(lat) > w * 3) continue;
        const patch = rs.soft
          ? softP   // feathery, broken up by surface-fixed noise (no banding along the rays)
          : (0.35 + 0.65 * ss(0.2, 0.7, n1(ang * 0.9 + r.ph, r.seed))) * (0.75 + 0.25 * n1(ang * 1.1 + r.ph, r.seed + 1));
        const taper = Math.pow(1 - ang / r.len, 1.15) * ss(rim * 0.9, rim * 2.2, ang);
        acc = 1 - (1 - acc) * (1 - r.k * Math.exp(-((lat / w) ** 2)) * patch * taper);
      }
      const nim = Math.exp(-((ang / rs.nim) ** 2) * 1.4) * ss(rim * 0.95, rim * 1.6, ang) + (ang < rim ? 0.9 : 0);
      RAYK[o] = 1 - (1 - RAYK[o]) * (1 - L.clamp(rs.k * 2.6) * L.clamp(acc + 0.85 * nim));
    }
  }

  // ---- 4. shade
  let sx = SUN_DIR.x, sy = -SUN_DIR.y, sz = 2.4;   // near-full Moon (the familiar face), light still from the upper left const sn = Math.hypot(sx, sy, sz); sx /= sn; sy /= sn; sz /= sn;
  const cv = new OffscreenCanvas(N, N), g = cv.getContext('2d');
  const img = g.createImageData(N, N), Dd = img.data;
  for (let py = 1; py < N - 1; py++) for (let px = 1; px < N - 1; px++) {
    const o = py * N + px;
    if (!IN[o]) continue;
    const x = PX[o], y = PY[o], z = PZ[o];
    const mare = MARE[o];
    // albedo: mottled highlands (brighter in the rugged south), maria with their own tone and subtle internal flows
    const mot = fbm3(x * 5 + 3, y * 5, z * 5, 4, 41) - 0.5, fine = vn3(x * 160, y * 160, z * 160, 47) - 0.5;
    const high = 0.66 + 0.16 * mot + 0.04 * Math.max(0, -y) + 0.05 * fine;
    const flow = fbm3(x * 4.5, y * 4.5 + 2, z * 4.5, 4, 53) - 0.5, flow2 = fbm3(x * 16, y * 16, z * 16, 3, 57) - 0.5;
    const mal = MALB[o] * (1 + 0.8 * flow + 0.3 * flow2 + 0.05 * fine);
    let alb = high + (mal - high) * mare + A[o] * (1 - 0.5 * mare);
    alb += 0.5 * RAYK[o] * (0.8 + 0.4 * mare);
    // perturbed normal from the crater height field + low relief (highlands are rough, maria smooth)
    const hx = (H[o + 1] - H[o - 1]) * 0.5 * R, hy = (H[o - N] - H[o + N]) * 0.5 * R;
    const rough = (1 - 0.8 * mare) * 0.03;
    const ex = 0.02;
    const r0 = fbm3(x * 14, y * 14, z * 14, 3, 61);
    const gx = (fbm3((x + ex) * 14, y * 14, z * 14, 3, 61) - r0) / ex * rough, gy = (fbm3(x * 14, (y + ex) * 14, z * 14, 3, 61) - r0) / ex * rough;
    let nx = x - (hx + gx) * z, ny = y - (hy + gy) * z, nz = z + (hx + gx) * x + (hy + gy) * y;
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const mu0 = nx * sx + ny * sy + nz * sz, mu0s = x * sx + y * sy + z * sz, mu = Math.max(0.02, z);
    // Lommel-Seeliger on the smooth sphere, relief as a Lambert ratio; soft terminator
    const ls = mu0s > 0 ? 2 * mu0s / (mu0s + mu) : 0;
    const relief = mu0s > 0.02 ? L.clamp(Math.max(0, mu0) / mu0s, 0, 1.8) : (mu0 > 0 ? 1 : 0);
    const term = ss(-0.02, 0.12, mu0s);
    const limb = 0.8 + 0.2 * Math.sqrt(z);
    let I = alb * L.lerp(1, relief, 0.55) * Math.min(1.3, ls) * 0.66 * limb * term;
    I = I / (1 + I * 0.35) * 1.3;      // gentle shoulder: bright rays don't clip
    const v = 255 * L.clamp(I);
    const tr = L.lerp(1, TR[o], mare), tb = L.lerp(1, TB[o], mare);
    Dd[o * 4] = Math.min(255, v * 1.0 * tr); Dd[o * 4 + 1] = v * 0.982; Dd[o * 4 + 2] = Math.min(255, v * 0.955 * tb);
    const X = (px + 0.5 - N / 2) / R, Y = (N / 2 - py - 0.5) / R;
    Dd[o * 4 + 3] = 255 * L.clamp((1 - Math.hypot(X, Y)) * R + 0.5);
  }
  g.putImageData(img, 0, 0);
  MOON_CV = { cv, N, R };
  return MOON_CV;
}

/** The Moon body (fades in with `draw` 0..1, overall alpha `a`). halo: the faint sunlit glow around it. */
export function drawMoon(c, v, a, draw, halo = true) {
  const cx = v.wx(MOON_CMP.x), cy = v.wy(MOON_CMP.y), r = v.ws(MOON_CMP.d / 2);
  if (cx + r < -10 || cx - r > L.W + 10) return;
  // the whole lit body fades (and settles) in — no outline first
  const k = L.ease.outCubic(L.clamp(draw * 1.25));
  if (k <= 0) return;
  const tex = moonTexture();
  c.save();
  c.globalAlpha *= a * k;
  if (halo) L.lightBlob(c, cx + SUN_DIR.x * r * 0.2, cy + SUN_DIR.y * r * 0.2, r * 1.25, [200, 205, 215], 0.07);
  const s = r / tex.R * (0.97 + 0.03 * k);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(tex.cv, cx - tex.N / 2 * s, cy - tex.N / 2 * s, tex.N * s, tex.N * s);
  c.restore();
}

/** The dashed ghost of the water ball gliding into the Moon's left half. */
export function drawGhost(ctx, v, a) {
  const gk = L.prog(v.t, T_GHOST[0], T_GHOST[1]);
  if (gk <= 0) return;
  const e = L.ease.inOutCubic(gk);
  const gx = L.lerp(ALL.x, GX, e), gy = ALL.y - Math.sin(Math.PI * e) * 0.18e6;
  const sx = v.wx(gx), sy = v.wy(gy), gr = v.ws(ALL.d / 2);
  const settle = 1 + 0.05 * Math.sin(L.prog(v.t, T_GHOST[0] + T_GHOST[1], 0.6) * Math.PI * 2) * (1 - L.prog(v.t, T_GHOST[0] + T_GHOST[1], 0.6));
  ctx.save();
  ctx.globalAlpha *= a * L.clamp(gk * 4);
  L.lightBlob(ctx, sx, sy, gr * 1.4, v.accent, 0.12);
  ctx.fillStyle = L.rgba(v.accent, 0.1 + 0.08 * L.clamp((gk - 0.8) * 5));
  ctx.strokeStyle = L.rgba(v.accent, 0.95);
  ctx.lineWidth = 2.5;
  ctx.setLineDash([12, 8]);
  ctx.lineDashOffset = -v.t * 20;
  ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, gr * settle), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
export const moonDraw = (v) => L.prog(v.t, T_DRAW[0], T_DRAW[1]);

export default {
  beat: 5,
  chapter: { num: '05', title: 'Versus the Moon', sub: 'Moon: 3,474 km across' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: T_DRAW[0] + 0.05, name: 'riser', gain: 0.2, pitch: 0.9 },
      { t: T_LABEL + 0.05, name: 'impact', gain: 0.3, pitch: 0.8 },
      { t: T_HALF + 0.05, name: 'tick', gain: 0.28, pitch: 1.0 },
      { t: T_GHOST[0], name: 'swish', gain: 0.26, pitch: 1.1 },
      { t: T_GHOST[0] + T_GHOST[1] - 0.05, name: 'ping', gain: 0.24, pitch: 1.3 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < 0 || v.t > v.d + 1) return;
    const a = fadeOut(v);
    if (a <= 0) return;
    drawMoon(ctx, v, a, moonDraw(v));
    const cx = v.wx(MOON_CMP.x), cy = v.wy(MOON_CMP.y), r = v.ws(MOON_CMP.d / 2);
    // half-way line, drawn top to bottom
    const hk = L.ease.inOutCubic(L.prog(v.t, T_HALF, 0.5));
    if (hk > 0) {
      ctx.save();
      ctx.globalAlpha *= a * leadFade(v);
      ctx.strokeStyle = 'rgba(215,222,235,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 9]);
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy - r + 2 * r * hk); ctx.stroke();
      ctx.restore();
    }
    drawGhost(ctx, v, a * leadFade(v));
  },

  drawOverlay(ctx, v) {
    // fades with the Moon (no ghost of the label once the Moon has gone)
    const k = L.enter(v.t, T_LABEL, 0.55) * v.k * fadeOut(v);
    if (k <= 0) return;
    // dark backing so the label reads cleanly where Earth's limb arc passes behind it
    ctx.save();
    ctx.globalAlpha = L.clamp(k * 1.2);
    ctx.translate(L.W / 2, 432);
    ctx.scale(1, 0.4);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 470);
    g.addColorStop(0, 'rgba(2,4,10,0.9)');
    g.addColorStop(0.6, 'rgba(2,4,10,0.78)');
    g.addColorStop(1, 'rgba(2,4,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 470, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    L.bigLabel(ctx, { x: L.W / 2, y: 470, big: '< ½ the Moon', small: 'Moon 3,474 km · water 1,385 km', k, accent: v.accent, align: 'center' });
  },
};
